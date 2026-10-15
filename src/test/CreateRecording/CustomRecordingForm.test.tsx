/*
 * Copyright The Cryostat Authors.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import { CustomRecordingForm } from '@app/CreateRecording/CustomRecordingForm';
import { authFailMessage } from '@app/ErrorView/types';
import { EventTemplate, AdvancedRecordingOptions, RecordingAttributes, Target } from '@app/Shared/Services/api.types';
import { FeatureLevel } from '@app/Shared/Services/service.types';
import { ServiceContext, Services, defaultServices } from '@app/Shared/Services/Services';
import { TargetService } from '@app/Shared/Services/Target.service';
import { screen, cleanup, act as doAct } from '@testing-library/react';
import { of, Subject } from 'rxjs';
import { render } from '../utils';

jest.mock('@patternfly/react-core', () => ({
  // Mock out tooltip for snapshot testing
  ...jest.requireActual('@patternfly/react-core'),
  Tooltip: ({ children }) => <>{children}</>,
}));

const mockNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

const mockConnectUrl = 'service:jmx:rmi://someUrl';
const mockTarget: Target = {
  agent: false,
  connectUrl: mockConnectUrl,
  alias: 'fooTarget',
  jvmId: 'foo',
  labels: [],
  annotations: { cryostat: [], platform: [] },
};

const mockAgentTarget: Target = {
  agent: true,
  connectUrl: 'http://agent-target:9977/api/v1',
  alias: 'agentTarget',
  jvmId: 'bar',
  labels: [],
  annotations: { cryostat: [], platform: [] },
};

const mockCustomEventTemplate: EventTemplate = {
  name: 'someEventTemplate',
  description: 'Some Description',
  provider: 'Cryostat',
  type: 'CUSTOM',
};

const mockRecordingOptions: AdvancedRecordingOptions = {
  maxAge: undefined,
  maxSize: 0,
};

const mockResponse: Response = {
  ok: true,
} as Response;

jest.spyOn(defaultServices.target, 'target').mockReturnValue(of(mockTarget));
jest.spyOn(defaultServices.api, 'getTargetEventTemplates').mockReturnValue(of([mockCustomEventTemplate]));
jest.spyOn(defaultServices.api, 'doGet').mockReturnValue(of(mockRecordingOptions));
jest.spyOn(defaultServices.api, 'isAsyncProfilerSupported').mockReturnValue(of(false));
jest.spyOn(defaultServices.settings, 'featureLevel').mockReturnValue(of(FeatureLevel.PRODUCTION));
jest.spyOn(defaultServices.settings, 'largeUi').mockReturnValue(of(false));

jest.spyOn(defaultServices.target, 'authFailure').mockReturnValue(of());

describe('<CustomRecordingForm />', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(defaultServices.target, 'target').mockReturnValue(of(mockTarget));
    jest.spyOn(defaultServices.api, 'getTargetEventTemplates').mockReturnValue(of([mockCustomEventTemplate]));
    jest.spyOn(defaultServices.api, 'doGet').mockReturnValue(of(mockRecordingOptions));
    jest.spyOn(defaultServices.api, 'isAsyncProfilerSupported').mockReturnValue(of(false));
    jest.spyOn(defaultServices.settings, 'featureLevel').mockReturnValue(of(FeatureLevel.PRODUCTION));
    jest.spyOn(defaultServices.settings, 'largeUi').mockReturnValue(of(false));
    jest.spyOn(defaultServices.target, 'authFailure').mockReturnValue(of());
  });

  afterEach(cleanup);

  it('renders correctly', async () => {
    const { container } = render({
      routerConfigs: { routes: [{ path: '/recordings', element: <CustomRecordingForm /> }] },
    });
    expect(container).toMatchSnapshot();
  });

  it('should create Recording when form is filled and create is clicked', async () => {
    const onSubmitSpy = jest.spyOn(defaultServices.api, 'createRecording').mockReturnValue(of(mockResponse));
    const { user } = render({
      routerConfigs: { routes: [{ path: '/recordings', element: <CustomRecordingForm /> }] },
    });

    const nameInput = screen.getByLabelText('Name *');
    expect(nameInput).toBeInTheDocument();
    expect(nameInput).toBeVisible();

    const templateSelect = screen.getByLabelText('Template *');
    expect(templateSelect).toBeInTheDocument();
    expect(templateSelect).toBeVisible();

    await user.type(nameInput, 'a_recording');
    await user.selectOptions(templateSelect, ['someEventTemplate']);

    const createButton = screen.getByRole('button', { name: /^create$/i });
    expect(createButton).toBeInTheDocument();
    expect(createButton).toBeVisible();

    expect(createButton).not.toBeDisabled();
    await user.click(createButton);

    expect(onSubmitSpy).toHaveBeenCalledTimes(1);
    expect(onSubmitSpy).toHaveBeenCalledWith({
      name: 'a_recording',
      events: 'template=someEventTemplate,type=CUSTOM',
      duration: undefined,
      archiveOnStop: true,
      replace: 'NEVER',
      advancedOptions: {
        maxAge: 0,
        maxSize: 52428800,
        toDisk: true,
      },
      metadata: {
        labels: [
          {
            key: 'autoanalyze',
            value: 'true',
          },
        ],
      },
      asprofEvents: undefined,
    } as RecordingAttributes);
    expect(mockNavigate).toHaveBeenCalledWith('..', { relative: 'path' });
  });

  it('should show correct helper texts in metadata label editor', async () => {
    const { user } = render({
      routerConfigs: {
        routes: [
          {
            path: '/recordings',
            element: <CustomRecordingForm />,
          },
        ],
      },
    });

    const metadataEditorToggle = screen.getByText('Show metadata options');
    expect(metadataEditorToggle).toBeInTheDocument();
    expect(metadataEditorToggle).toBeVisible();

    await user.click(metadataEditorToggle);

    const helperText = screen.getByText(/are set by Cryostat and will be overwritten if specifed\.$/);
    expect(helperText).toBeInTheDocument();
    expect(helperText).toBeVisible();
  });

  it('should show error view if failing to retrieve templates or Recording options', async () => {
    const subj = new Subject<void>();
    const mockTargetSvc = {
      target: () => of(mockTarget as Target),
      authFailure: () => subj.asObservable(),
    } as TargetService;
    const services: Services = {
      ...defaultServices,
      target: mockTargetSvc,
    };
    render({
      routerConfigs: {
        routes: [
          {
            path: '/recordings',
            element: <CustomRecordingForm />,
          },
        ],
      },
      providers: [{ kind: ServiceContext.Provider, instance: services }],
    });

    await doAct(async () => subj.next());

    const failTitle = screen.getByText('Error displaying Recording creation form');
    expect(failTitle).toBeInTheDocument();
    expect(failTitle).toBeVisible();

    const authFailText = screen.getByText(authFailMessage);
    expect(authFailText).toBeInTheDocument();
    expect(authFailText).toBeVisible();

    const retryButton = screen.getByText('Retry');
    expect(retryButton).toBeInTheDocument();
    expect(retryButton).toBeVisible();
  });

  it('should not show the async-profiler section at production feature level', async () => {
    render({
      routerConfigs: { routes: [{ path: '/recordings', element: <CustomRecordingForm /> }] },
    });

    expect(screen.queryByRole('switch', { name: /enable async-profiler/i })).not.toBeInTheDocument();
  });

  it('should disable the async-profiler toggle for a non-agent (JMX) target', async () => {
    jest.spyOn(defaultServices.settings, 'featureLevel').mockReturnValue(of(FeatureLevel.BETA));
    render({
      routerConfigs: { routes: [{ path: '/recordings', element: <CustomRecordingForm /> }] },
    });

    const toggle = screen.getByRole('switch', { name: /enable async-profiler/i });
    expect(toggle).toBeInTheDocument();
    expect(toggle).toBeDisabled();

    const helperText = screen.getByText('async-profiler is only supported for Agent-connected targets.');
    expect(helperText).toBeInTheDocument();
  });

  it('should disable the async-profiler toggle for an agent target where asprof is not detected', async () => {
    jest.spyOn(defaultServices.settings, 'featureLevel').mockReturnValue(of(FeatureLevel.BETA));
    jest.spyOn(defaultServices.target, 'target').mockReturnValue(of(mockAgentTarget));
    jest.spyOn(defaultServices.api, 'isAsyncProfilerSupported').mockReturnValue(of(false));

    render({
      routerConfigs: { routes: [{ path: '/recordings', element: <CustomRecordingForm /> }] },
    });

    const toggle = screen.getByRole('switch', { name: /enable async-profiler/i });
    expect(toggle).toBeInTheDocument();
    expect(toggle).toBeDisabled();

    const helperText = screen.getByText('async-profiler is not available on this target.');
    expect(helperText).toBeInTheDocument();
  });

  it('should enable the async-profiler toggle for an agent target with asprof detected', async () => {
    jest.spyOn(defaultServices.settings, 'featureLevel').mockReturnValue(of(FeatureLevel.BETA));
    jest.spyOn(defaultServices.target, 'target').mockReturnValue(of(mockAgentTarget));
    jest.spyOn(defaultServices.api, 'isAsyncProfilerSupported').mockReturnValue(of(true));
    jest.spyOn(defaultServices.api, 'getAsyncProfilerAvailableEvents').mockReturnValue(of([]));

    render({
      routerConfigs: { routes: [{ path: '/recordings', element: <CustomRecordingForm /> }] },
    });

    const toggle = screen.getByRole('switch', { name: /enable async-profiler/i });
    expect(toggle).toBeInTheDocument();
    expect(toggle).not.toBeDisabled();

    const helperText = screen.getByText('Augment this recording with async-profiler stack samples.');
    expect(helperText).toBeInTheDocument();
  });

  it('should show the event selector when the async-profiler toggle is enabled', async () => {
    jest.spyOn(defaultServices.settings, 'featureLevel').mockReturnValue(of(FeatureLevel.BETA));
    jest.spyOn(defaultServices.target, 'target').mockReturnValue(of(mockAgentTarget));
    jest.spyOn(defaultServices.api, 'isAsyncProfilerSupported').mockReturnValue(of(true));
    jest.spyOn(defaultServices.api, 'getAsyncProfilerAvailableEvents').mockReturnValue(of([]));

    const { user } = render({
      routerConfigs: { routes: [{ path: '/recordings', element: <CustomRecordingForm /> }] },
    });

    const toggle = screen.getByRole('switch', { name: /enable async-profiler/i });
    expect(toggle).not.toBeDisabled();

    expect(screen.queryByText('async-profiler events')).not.toBeInTheDocument();

    await user.click(toggle);

    expect(screen.getByText('async-profiler events')).toBeInTheDocument();
  });

  it('should include asprofEvents in the payload when the toggle is enabled', async () => {
    jest.spyOn(defaultServices.settings, 'featureLevel').mockReturnValue(of(FeatureLevel.BETA));
    jest.spyOn(defaultServices.target, 'target').mockReturnValue(of(mockAgentTarget));
    jest.spyOn(defaultServices.api, 'isAsyncProfilerSupported').mockReturnValue(of(true));
    jest.spyOn(defaultServices.api, 'getAsyncProfilerAvailableEvents').mockReturnValue(of([]));
    const onSubmitSpy = jest.spyOn(defaultServices.api, 'createRecording').mockReturnValue(of(mockResponse));

    const { user } = render({
      routerConfigs: { routes: [{ path: '/recordings', element: <CustomRecordingForm /> }] },
    });

    await user.type(screen.getByLabelText('Name *'), 'asprof_recording');
    await user.selectOptions(screen.getByLabelText('Template *'), ['someEventTemplate']);

    const toggle = screen.getByRole('switch', { name: /enable async-profiler/i });
    await user.click(toggle);

    await user.click(screen.getByRole('button', { name: /^create$/i }));

    expect(onSubmitSpy).toHaveBeenCalledTimes(1);
    const call = onSubmitSpy.mock.calls[0][0] as RecordingAttributes;
    expect(call.asprofEvents).toEqual([]);
  });
});
