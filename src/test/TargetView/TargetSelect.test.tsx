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
import { cleanup, screen } from '@testing-library/react';
import { of } from 'rxjs';
import { render } from '../utils';

const mockFooConnectUrl = 'service:jmx:rmi://someFooUrl';
const mockBarConnectUrl = 'service:jmx:rmi://someBarUrl';

const CUSTOM_TARGET_REALM = 'Custom Targets';

const cryostatAnnotation = {
  REALM: CUSTOM_TARGET_REALM,
};
const mockFooTarget: Target = {
  jvmId: 'abcd',
  connectUrl: mockFooConnectUrl,
  alias: 'fooTarget',
  annotations: {
    cryostat: cryostatAnnotation,
    platform: {},
  },
};
const mockBarTarget: Target = { ...mockFooTarget, jvmId: 'efgh', connectUrl: mockBarConnectUrl, alias: 'barTarget' };

jest.mock('@app/Shared/Services/Target.service', () => ({
  ...jest.requireActual('@app/Shared/Services/Target.service'), // Require actual implementation of utility functions for Target
}));

jest
  .spyOn(defaultServices.targets, 'targets')
  .mockReturnValueOnce(of([mockFooTarget])) // contains the correct information
  .mockReturnValueOnce(of([mockFooTarget])) // renders empty state when expanded
  .mockReturnValueOnce(of([mockFooTarget])) // renders serialized target when expanded
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
    expect(screen.getByText(`Select a target`)).toBeInTheDocument();
  });

  it('renders empty state when expanded', async () => {
    const { container, user } = render({
      routerConfigs: {
        routes: [
          {
            path: '/',
            element: <TargetSelect />,
          },
        ],
      },
    });

    expect(screen.getByText('Select a target')).toBeInTheDocument();

    const expandButton = screen.getByLabelText('Details');
    await user.click(expandButton);

    const articleElement = container.querySelector('article');
    expect(articleElement).toBeInTheDocument();
    expect(articleElement).toBeVisible();
    expect(screen.getByText(`No target selected`)).toBeInTheDocument();
    expect(screen.getByText(`No target selected`)).toBeVisible();
    expect(screen.getByText(`To view this content, select a JVM target.`)).toBeInTheDocument();
    expect(screen.getByText(`To view this content, select a JVM target.`)).toBeVisible();
  });

  it('renders serialized target when expanded', async () => {
    const { container, user } = render({
      routerConfigs: {
        routes: [
          {
            path: '/',
            element: <TargetSelect />,
          },
        ],
      },
    });

    // Select a target first
    await user.click(screen.getByLabelText('Options menu'));
    await user.click(screen.getByText('fooTarget (service:jmx:rmi://someFooUrl)'));

    const expandButton = screen.getByLabelText('Details');
    await user.click(expandButton);

    const codeElement = container.querySelector('code');
    expect(codeElement).toBeTruthy();
    expect(codeElement).toBeInTheDocument();
    expect(codeElement).toBeVisible();
    expect(codeElement?.textContent).toBeTruthy();
    const codeContent = codeElement?.textContent?.replace(/[\s]/g, '');
    expect(codeContent).toEqual(JSON.stringify(mockFooTarget, null, 0).replace(/[\s]/g, ''));
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

    await user.click(screen.getByLabelText('Options menu'));

    [
      CUSTOM_TARGET_REALM,
      'fooTarget (service:jmx:rmi://someFooUrl)',
      'barTarget (service:jmx:rmi://someBarUrl)',
    ].forEach((str) => {
      const element = screen.getByText(str);
      expect(element).toBeInTheDocument();
      expect(element).toBeVisible();
    });
  });
});
