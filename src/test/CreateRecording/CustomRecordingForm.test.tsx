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
import { EventTemplate, AdvancedRecordingOptions, RecordingAttributes } from '@app/Shared/Services/api.types';
import { NotificationsContext, NotificationsInstance } from '@app/Shared/Services/Notifications.service';
import { ServiceContext, Services, defaultServices } from '@app/Shared/Services/Services';
import { TargetService } from '@app/Shared/Services/Target.service';
import { screen, cleanup, act as doAct } from '@testing-library/react';
import { createMemoryHistory } from 'history';
import * as React from 'react';
import { Router } from 'react-router-dom';
import renderer, { act } from 'react-test-renderer';
import { of, Subject } from 'rxjs';
import { renderWithServiceContextAndRouter } from '../Common';

jest.mock('@patternfly/react-core', () => ({
  // Mock out tooltip for snapshot testing
  ...jest.requireActual('@patternfly/react-core'),
  Tooltip: ({ children }) => <>{children}</>,
}));

const mockConnectUrl = 'service:jmx:rmi://someUrl';
const mockTarget = { connectUrl: mockConnectUrl, alias: 'fooTarget' };

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
jest
  .spyOn(defaultServices.api, 'doGet')
  .mockReturnValueOnce(of([mockCustomEventTemplate])) // renders correctly
  .mockReturnValueOnce(of(mockRecordingOptions))

  .mockReturnValueOnce(of([mockCustomEventTemplate])) // should create recording when form is filled and create is clicked
  .mockReturnValueOnce(of(mockRecordingOptions))

  .mockReturnValueOnce(of([mockCustomEventTemplate])) // should show correct helper texts in metadata label editor
  .mockReturnValueOnce(of(mockRecordingOptions));

jest.spyOn(defaultServices.target, 'authFailure').mockReturnValue(of());

const history = createMemoryHistory({ initialEntries: ['/recordings/create'] });

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useRouteMatch: () => ({ url: history.location.pathname }),
  useHistory: () => history,
}));

describe('<CustomRecordingForm />', () => {
  beforeEach(() => {
    history.go(-history.length);
  });

  afterEach(cleanup);

  it('renders correctly', async () => {
    let tree;
    await act(async () => {
      tree = renderer.create(
        <ServiceContext.Provider value={defaultServices}>
          <NotificationsContext.Provider value={NotificationsInstance}>
            <Router history={history}>
              <CustomRecordingForm />
            </Router>
          </NotificationsContext.Provider>
        </ServiceContext.Provider>,
      );
    });
    expect(tree.toJSON()).toMatchSnapshot();
  });

  it('should create recording when form is filled and create is clicked', async () => {
    const onSubmitSpy = jest.spyOn(defaultServices.api, 'createRecording').mockReturnValue(of(mockResponse));
    const { user } = renderWithServiceContextAndRouter(<CustomRecordingForm />);

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
      duration: 30,
      archiveOnStop: true,
      restart: false,
      advancedOptions: {
        maxAge: undefined,
        maxSize: 0,
        toDisk: true,
      },
      metadata: { labels: {} },
    } as RecordingAttributes);
  });

  it('should show correct helper texts in metadata label editor', async () => {
    const { user } = renderWithServiceContextAndRouter(<CustomRecordingForm />);

    const metadataEditorToggle = screen.getByText('Show metadata options');
    expect(metadataEditorToggle).toBeInTheDocument();
    expect(metadataEditorToggle).toBeVisible();

    await user.click(metadataEditorToggle);

    const helperText = screen.getByText(/are set by Cryostat and will be overwritten if specifed\.$/);
    expect(helperText).toBeInTheDocument();
    expect(helperText).toBeVisible();
  });

  it('should show error view if failing to retrieve templates or recording options', async () => {
    const subj = new Subject<void>();
    const mockTargetSvc = {
      target: () => of(mockTarget),
      authFailure: () => subj.asObservable(),
    } as TargetService;
    const services: Services = {
      ...defaultServices,
      target: mockTargetSvc,
    };
    renderWithServiceContextAndRouter(<CustomRecordingForm />, { services: services });

    await doAct(async () => subj.next());

    const failTitle = screen.getByText('Error displaying recording creation form');
    expect(failTitle).toBeInTheDocument();
    expect(failTitle).toBeVisible();

    const authFailText = screen.getByText(authFailMessage);
    expect(authFailText).toBeInTheDocument();
    expect(authFailText).toBeVisible();

    const retryButton = screen.getByText('Retry');
    expect(retryButton).toBeInTheDocument();
    expect(retryButton).toBeVisible();
  });
});
