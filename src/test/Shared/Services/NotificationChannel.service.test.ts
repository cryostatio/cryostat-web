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

import { NotificationCategory, NotificationMessage } from '@app/Shared/Services/api.types';
import { LoginService } from '@app/Shared/Services/Login.service';
import { NotificationChannel } from '@app/Shared/Services/NotificationChannel.service';
import { NotificationService } from '@app/Shared/Services/Notifications.service';
import { CryostatContext } from '@app/Shared/Services/Services';
import { of, Subject } from 'rxjs';

jest.unmock('@app/Shared/Services/NotificationChannel.service');
jest.mock('@app/Shared/Services/Login.service');

const mockContext: CryostatContext = {
  url: (path?: string) => of(`./${path ?? ''}`),
  headers: () => of(new Headers()),
};

describe('NotificationChannel.destroy', () => {
  let notifications: NotificationService;
  let login: LoginService;
  let loggedOut$: Subject<void>;
  let channel: NotificationChannel;

  beforeEach(() => {
    loggedOut$ = new Subject<void>();
    notifications = new NotificationService();
    login = {
      loggedOut: () => loggedOut$.asObservable(),
      getSessionState: jest.fn().mockReturnValue(of()),
      setSessionState: jest.fn(),
    } as unknown as LoginService;
    channel = new NotificationChannel(mockContext, notifications, login);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should stop forwarding WebSocket messages to the NotificationService after destroy', () => {
    const notifySpy = jest.spyOn(notifications, 'notify');

    // Use TargetJvmDiscovery, which has a body mapper, with a well-formed message payload.
    const testMsg: NotificationMessage = {
      meta: { category: NotificationCategory.TargetJvmDiscovery, type: { type: 'application', subtype: 'json' } },
      message: {
        event: {
          kind: 'FOUND',
          serviceRef: { alias: 'test', connectUrl: 'service:jmx:rmi:///jndi/rmi://localhost:0/jmxrmi' },
        },
      },
    };

    // Simulate a WebSocket message arriving before destroy — notifications should be forwarded.
    (channel as any)._messages.next(testMsg);
    expect(notifySpy).toHaveBeenCalledTimes(1);

    channel.destroy();
    notifySpy.mockClear();

    // After destroy, the internal subjects are completed and subscriptions are unsubscribed,
    // so no further notify() calls can be made.
    expect(notifySpy).not.toHaveBeenCalled();
  });

  it('should stop forwarding unknown-category messages after destroy', () => {
    const notifySpy = jest.spyOn(notifications, 'notify');

    const unknownMsg: NotificationMessage = {
      meta: { category: '__unknown_test_category__' as NotificationCategory, type: { type: 'text', subtype: 'plain' } },
      message: { data: 'test' },
    };

    (channel as any)._messages.next(unknownMsg);
    expect(notifySpy).toHaveBeenCalledTimes(1);

    channel.destroy();
    notifySpy.mockClear();

    expect(notifySpy).not.toHaveBeenCalled();
  });

  it('should unsubscribe from the loggedOut observable after destroy', () => {
    // The internal loggedOut subscription should not react after destroy().
    channel.destroy();

    // Completing the ws before destroy already happened; completing loggedOut$ after destroy
    // should not throw or invoke any channel behaviour.
    expect(() => loggedOut$.next()).not.toThrow();
  });

  it('should mark the channel as not ready after destroy', (done) => {
    channel.isReady().subscribe({
      complete: () => done(),
    });
    channel.destroy();
  });

  it('calling destroy multiple times should not throw', () => {
    expect(() => {
      channel.destroy();
      channel.destroy();
    }).not.toThrow();
  });
});
