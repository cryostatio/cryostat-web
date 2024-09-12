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
import { Target } from '@app/Shared/Services/api.types';
import { defaultServices } from '@app/Shared/Services/Services';
import { TargetSelect } from '@app/TargetView/TargetSelect';
import '@testing-library/jest-dom';
import { act, cleanup, screen } from '@testing-library/react';
import { of } from 'rxjs';
import { render, testT } from '../utils';

const mockFooConnectUrl = 'service:jmx:rmi://someFooUrl';
const mockBarConnectUrl = 'service:jmx:rmi://someBarUrl';

const CUSTOM_TARGET_REALM = 'Custom Targets';

const cryostatAnnotation = [
  {
    key: 'REALM',
    value: CUSTOM_TARGET_REALM,
  },
];
const mockFooTarget: Target = {
  agent: false,
  jvmId: 'abcd',
  connectUrl: mockFooConnectUrl,
  alias: 'fooTarget',
  labels: [],
  annotations: {
    cryostat: cryostatAnnotation,
    platform: [],
  },
};
const mockBarTarget: Target = { ...mockFooTarget, jvmId: 'efgh', connectUrl: mockBarConnectUrl, alias: 'barTarget' };

jest.mock('@app/Shared/Services/Target.service', () => ({
  ...jest.requireActual('@app/Shared/Services/Target.service'), // Require actual implementation of utility functions for Target
}));

jest
  .spyOn(defaultServices.targets, 'targets')
  .mockReturnValueOnce(of([mockFooTarget])) // contains the correct information
  .mockReturnValueOnce(of([mockFooTarget, mockBarTarget])) // renders dropdown of multiple discovered targets
  .mockReturnValue(of([mockFooTarget, mockBarTarget])); // other tests

jest.spyOn(defaultServices.settings, 'deletionDialogsEnabledFor').mockReturnValue(true);

describe('<TargetSelect />', () => {
  afterEach(cleanup);

  it('contains the correct information', async () => {
    render({
      routerConfigs: {
        routes: [
          {
            path: '/',
            element: <TargetSelect />,
          },
        ],
      },
    });

    expect(screen.getByText('Target JVM')).toBeInTheDocument();
    expect(screen.getByText(testT('TargetContextSelector.TOGGLE_PLACEHOLDER'))).toBeInTheDocument();
  });

  it('renders dropdown of multiple discovered targets', async () => {
    const { user } = render({
      routerConfigs: {
        routes: [
          {
            path: '/',
            element: <TargetSelect />,
          },
        ],
      },
    });

    await act(async () => {
      await user.click(screen.getByLabelText(testT('TargetContextSelector.TOGGLE_LABEL')));
    });

    [
      CUSTOM_TARGET_REALM,
      'fooTarget',
      'service:jmx:rmi://someFooUrl',
      'barTarget',
      'service:jmx:rmi://someBarUrl',
    ].forEach((str) => {
      const element = screen.getByText(str);
      expect(element).toBeInTheDocument();
      expect(element).toBeVisible();
    });
  });
});
