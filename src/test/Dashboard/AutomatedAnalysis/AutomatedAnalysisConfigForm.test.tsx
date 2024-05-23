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
import { AutomatedAnalysisConfigForm } from '@app/Dashboard/AutomatedAnalysis/AutomatedAnalysisConfigForm';
import { EventTemplate } from '@app/Shared/Services/api.types';
import { AutomatedAnalysisRecordingConfig } from '@app/Shared/Services/service.types';
import { defaultServices } from '@app/Shared/Services/Services';
import '@testing-library/jest-dom';
import { cleanup, screen } from '@testing-library/react';
import { of } from 'rxjs';
import { render, testT } from '../../utils';

const mockTarget = {
  connectUrl: 'service:jmx:rmi://someUrl',
  alias: 'fooTarget',
  jvmId: 'foo',
  labels: [],
  annotations: { cryostat: [], platform: [] },
};

const mockTemplate1: EventTemplate = {
  name: 'template1',
  description: 'template1 description',
  provider: 'Cryostat',
  type: 'TARGET',
};

const mockTemplate2: EventTemplate = {
  name: 'template2',
  description: 'template2 description',
  provider: 'Cryostat',
  type: 'TARGET',
};

const mockAutomatedAnalysisRecordingConfig: AutomatedAnalysisRecordingConfig = {
  template: {
    name: 'template1',
    type: 'TARGET',
  },
  maxSize: 1048576,
  maxAge: 0,
};

jest.mock('@app/Shared/Services/Target.service', () => ({
  ...jest.requireActual('@app/Shared/Services/Target.service'), // Require actual implementation of utility functions for Target
}));

jest.mock('@app/utils/LocalStorage', () => {
  return {
    getFromLocalStorage: jest.fn((_key: string, _defaultValue: unknown): unknown => {
      return 'service:jmx:rmi://someUrl';
    }),
  };
});

jest.spyOn(defaultServices.api, 'doGet').mockReturnValue(of([mockTemplate1, mockTemplate2]));

jest
  .spyOn(defaultServices.settings, 'automatedAnalysisRecordingConfig')
  .mockReturnValue(mockAutomatedAnalysisRecordingConfig);

jest.spyOn(defaultServices.targets, 'targets').mockReturnValue(of([mockTarget]));

describe('<AutomatedAnalysisConfigForm />', () => {
  afterEach(cleanup);

  it('renders default view correctly', async () => {
    render({
      routerConfigs: {
        routes: [{ path: '/', element: <AutomatedAnalysisConfigForm /> }],
      },
    });

    expect(screen.getByText(/Current Configuration/i)).toBeInTheDocument();
    expect(screen.getByText('Template')).toBeInTheDocument();
    expect(screen.getByText(/maximum size \(b\)/i)).toBeInTheDocument();
    expect(screen.getByText(/maximum age \(s\)/i)).toBeInTheDocument();
  });

  it('renders editing drawer view correctly', async () => {
    const { user } = render({
      routerConfigs: {
        routes: [{ path: '/', element: <AutomatedAnalysisConfigForm useTitle /> }],
      },
    });

    expect(screen.getByText(/profiling recording configuration/i)).toBeInTheDocument(); // Form title

    await user.click(
      screen.getByRole('button', {
        name: /edit/i,
      }),
    ); // Edit button

    const templateSelect = screen.getByLabelText('Template *'); // Template select
    expect(templateSelect).toBeInTheDocument();
    expect(templateSelect).toBeVisible();
    expect(screen.getByText(/The Event Template to be applied to automated analysis recordings./i)).toBeInTheDocument();

    expect(screen.getByText(/the maximum size of recording data saved to disk./i)).toBeInTheDocument();

    expect(screen.getByText(/the maximum age of recording data stored to disk./i)).toBeInTheDocument();
  });

  it('renders editing settings view correctly', async () => {
    const { user } = render({
      routerConfigs: {
        routes: [{ path: '/', element: <AutomatedAnalysisConfigForm inlineForm /> }],
      },
    });

    expect(screen.queryByText(/profiling recording configuration/i)).not.toBeInTheDocument(); // Form title

    await user.click(screen.getByLabelText('Edit')); // Edit button

    const templateSelect = screen.getByLabelText('Template *'); // Template select
    expect(templateSelect).toBeInTheDocument();
    expect(templateSelect).toBeVisible();
    expect(screen.getByText(/The Event Template to be applied to automated analysis recordings./i)).toBeInTheDocument();

    expect(screen.getByText(/the maximum size of recording data saved to disk./i)).toBeInTheDocument();

    expect(screen.getByText(/the maximum age of recording data stored to disk./i)).toBeInTheDocument();
  });

  it('saves configuration', async () => {
    const setConfigRequestSpy = jest.spyOn(defaultServices.settings, 'setAutomatedAnalysisRecordingConfig');
    const { user } = render({
      routerConfigs: {
        routes: [{ path: '/', element: <AutomatedAnalysisConfigForm /> }],
      },
    });

    await user.click(
      screen.getByRole('button', {
        name: /edit/i,
      }),
    );

    const templateSelect = screen.getByRole('combobox', {
      name: /event template input/i,
    });

    const maxSizeInput = screen.getByRole('spinbutton', {
      name: /maximum size value/i,
    });

    const maxAgeInput = screen.getByRole('spinbutton', {
      name: /maximum age value/i,
    });

    expect(templateSelect).toHaveDisplayValue(['template1']);
    expect(maxAgeInput).toHaveValue(mockAutomatedAnalysisRecordingConfig.maxAge);
    expect(maxSizeInput).toHaveValue(mockAutomatedAnalysisRecordingConfig.maxSize);

    await user.selectOptions(templateSelect, ['template2']);
    await user.clear(maxSizeInput);
    await user.clear(maxAgeInput);
    await user.type(maxSizeInput, '100');
    await user.type(maxAgeInput, '100');

    const config = {
      template: {
        name: mockTemplate2.name,
        type: mockTemplate2.type,
      },
      maxSize: 100,
      maxAge: 100,
    };

    await user.click(
      screen.getByRole('button', {
        name: testT('AutomatedAnalysisConfigForm.SAVE_CHANGES'),
      }),
    );
    expect(setConfigRequestSpy).toHaveBeenCalledWith(config);
  });
});
