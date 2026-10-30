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
import { AsyncProfiler } from '@app/AsyncProfiler/AsyncProfiler';
import { AsyncProfilerStatus, Target } from '@app/Shared/Services/api.types';
import { defaultServices } from '@app/Shared/Services/Services';
import { cleanup, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { of } from 'rxjs';
import { render } from '../utils';

jest.mock('@app/TargetView/TargetView', () => {
  return {
    TargetView: jest.fn((props) => {
      return (
        <div>
          {props.pageTitle}
          {props.children}
        </div>
      );
    }),
  };
});

jest.mock('@app/AsyncProfiler/CreateAsyncProfilerSession', () => ({
  CreateAsyncProfilerSession: jest.fn((props: { onClose?: () => void }) => (
    <button onClick={props.onClose}>mock-create-async-profiler-session</button>
  )),
}));

const mockTarget: Target = {
  agent: true,
  connectUrl: 'service:jmx:rmi://someFooUrl',
  alias: 'fooTarget',
  labels: [],
  annotations: {
    cryostat: [],
    platform: [],
  },
};

const mockStatus: AsyncProfilerStatus = {
  status: 'STOPPED',
  availableEvents: {},
  currentProfile: undefined,
};

jest.spyOn(defaultServices.target, 'target').mockReturnValue(of(mockTarget));
jest.spyOn(defaultServices.api, 'isAsyncProfilerSupported').mockReturnValue(of(true));
jest.spyOn(defaultServices.api, 'getAsyncProfilerStatus').mockReturnValue(of(mockStatus));
jest.spyOn(defaultServices.api, 'getAsyncProfiles').mockReturnValue(of([]));
jest.spyOn(defaultServices.notificationChannel, 'messages').mockReturnValue(of());

describe('<AsyncProfiler />', () => {
  afterEach(cleanup);

  it('opens the Create modal when Create is clicked, and closes it', async () => {
    const { user, container } = render({
      routerConfigs: {
        routes: [
          {
            path: '/async-profiler',
            element: <AsyncProfiler />,
          },
        ],
      },
    });

    expect(screen.queryByText('mock-create-async-profiler-session')).not.toBeInTheDocument();

    // In jsdom the OverflowMenu always collapses into the kebab dropdown since it cannot measure real widths.
    const overflowToggle = container.querySelector('#async-profiles-toolbar .pf-v6-c-menu-toggle') as HTMLElement;
    expect(overflowToggle).toBeTruthy();
    await user.click(overflowToggle);

    const createButton = await screen.findByText('Create');
    await user.click(createButton);

    const mockForm = await screen.findByText('mock-create-async-profiler-session');
    expect(mockForm).toBeInTheDocument();
    expect(mockForm).toBeVisible();

    expect(screen.getByRole('dialog', { name: /create async profiler session/i })).toBeInTheDocument();

    await user.click(mockForm);

    expect(screen.queryByText('mock-create-async-profiler-session')).not.toBeInTheDocument();
  });
});
