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
import { CreateAsyncProfilerSession } from '@app/AsyncProfiler/CreateAsyncProfilerSession';
import { NotificationMessage, Target } from '@app/Shared/Services/api.types';
import { defaultServices } from '@app/Shared/Services/Services';
import { cleanup, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { of } from 'rxjs';
import { render } from '../utils';

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

const mockAvailableEvents = {
  jdk: ['jdk.ExecutionSample'],
};

const mockResponse: Response = {
  ok: true,
} as Response;

const mockNotificationMessage: NotificationMessage = {
  meta: {
    category: 'test',
    type: {
      type: 'test',
      subtype: 'test',
    },
  },
  message: {},
};

jest.spyOn(defaultServices.target, 'target').mockReturnValue(of(mockTarget));
jest.spyOn(defaultServices.api, 'getAsyncProfilerAvailableEvents').mockReturnValue(of(mockAvailableEvents));
jest.spyOn(defaultServices.api, 'getTargetActiveRecordings').mockReturnValue(of([]));
jest.spyOn(defaultServices.notificationChannel, 'messages').mockReturnValue(of(mockNotificationMessage));

describe('<CreateAsyncProfilerSession />', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(defaultServices.target, 'target').mockReturnValue(of(mockTarget));
    jest.spyOn(defaultServices.api, 'getAsyncProfilerAvailableEvents').mockReturnValue(of(mockAvailableEvents));
    jest.spyOn(defaultServices.api, 'getTargetActiveRecordings').mockReturnValue(of([]));
    jest.spyOn(defaultServices.notificationChannel, 'messages').mockReturnValue(of(mockNotificationMessage));
  });

  afterEach(cleanup);

  it('calls onClose when Cancel is clicked', async () => {
    const onClose = jest.fn();
    const { user } = render({
      routerConfigs: {
        routes: [{ path: '/async-profiler', element: <CreateAsyncProfilerSession onClose={onClose} /> }],
      },
    });

    const cancelButton = await screen.findByRole('button', { name: /^cancel$/i });
    await user.click(cancelButton);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('should start a profile when events and duration are filled and create is clicked', async () => {
    const onClose = jest.fn();
    const startSpy = jest.spyOn(defaultServices.api, 'startAsyncProfile').mockReturnValue(of(mockResponse));
    const { user } = render({
      routerConfigs: {
        routes: [{ path: '/async-profiler', element: <CreateAsyncProfilerSession onClose={onClose} /> }],
      },
    });

    const createButton = await screen.findByRole('button', { name: /^create$/i });
    expect(createButton).toBeDisabled();

    const addAllButton = await screen.findByRole('button', { name: /^add all$/i });
    await user.click(addAllButton);

    const periodInput = screen.getByLabelText('Duration Picker Period Input');
    await user.clear(periodInput);
    await user.type(periodInput, '30');

    expect(createButton).not.toBeDisabled();
    await user.click(createButton);

    expect(startSpy).toHaveBeenCalledTimes(1);
    expect(startSpy).toHaveBeenCalledWith(mockTarget, ['jdk.ExecutionSample'], 30);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('checks for conflicting recordings once on mount and once per notification, not doubled', async () => {
    // With duplicate effects removed: 1 call on mount + 1 per notification category (2) = 3 total.
    // With duplicates present it would be 6 (each effect pair fires independently).
    const recordingsSpy = jest.spyOn(defaultServices.api, 'getTargetActiveRecordings').mockReturnValue(of([]));
    render({
      routerConfigs: {
        routes: [{ path: '/async-profiler', element: <CreateAsyncProfilerSession /> }],
      },
    });

    await screen.findByRole('button', { name: /^cancel$/i });

    expect(recordingsSpy).toHaveBeenCalledTimes(3);
  });

  it('subscribes to recording notifications exactly once per category', async () => {
    const messagesSpy = jest.spyOn(defaultServices.notificationChannel, 'messages').mockReturnValue(of());
    render({
      routerConfigs: {
        routes: [{ path: '/async-profiler', element: <CreateAsyncProfilerSession /> }],
      },
    });

    await screen.findByRole('button', { name: /^cancel$/i });

    // One subscription for ActiveRecordingCreated, one for ActiveRecordingStopped — not doubled.
    expect(messagesSpy).toHaveBeenCalledTimes(2);
  });
});
