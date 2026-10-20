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
import { SessionState } from '@app/Shared/Services/service.types';
import { CryostatContext } from '@app/Shared/Services/Services';
import { of, Subject } from 'rxjs';

jest.unmock('@app/Shared/Services/NotificationChannel.service');
jest.mock('@app/Shared/Services/Login.service');

// Mutable state shared between the file-scope mock factory and the tests.
// Declared at module scope so the hoisted jest.mock() factory can close over it.
let capturedCloseObserver: { next: (evt: CloseEvent) => void } | undefined;

jest.mock('rxjs/webSocket', () => ({
  webSocket: (config: any) => {
    capturedCloseObserver = config.closeObserver;
    const sub = new Subject<any>();
    // Save the original complete before overriding to avoid infinite recursion.
    const originalComplete = sub.complete.bind(sub);
    sub.complete = () => {
      originalComplete();
      // Simulate the browser firing a close event synchronously when the
      // subject is completed, mirroring RxJS WebSocketSubject behaviour.
      capturedCloseObserver?.next({ code: 4999 } as unknown as CloseEvent);
    };
    return Object.assign(sub, { subscribe: jest.fn() });
  },
}));

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
    capturedCloseObserver = undefined;
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
    jest.useRealTimers();
  });

  it('should stop forwarding known-category WebSocket messages to the NotificationService after destroy', () => {
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

    // After destroy, subjects are completed. Pushing to a completed Subject is a no-op,
    // so no additional notify() calls can happen.
    (channel as any)._messages.next(testMsg);
    expect(notifySpy).toHaveBeenCalledTimes(1);
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

    (channel as any)._messages.next(unknownMsg);
    expect(notifySpy).toHaveBeenCalledTimes(1);
  });

  it('should unsubscribe from the loggedOut observable after destroy', () => {
    channel.destroy();

    // Emitting on loggedOut$ after destroy should not throw or invoke any channel behaviour.
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

  describe('with an active connection', () => {
    beforeEach(() => {
      jest.useFakeTimers();

      // Make getSessionState emit CREATING_USER_SESSION synchronously so the combineLatest
      // inside connect() can fire once the timer ticks.
      (login.getSessionState as jest.Mock).mockReturnValue(of(SessionState.CREATING_USER_SESSION));
      channel = new NotificationChannel(mockContext, notifications, login);
      channel.connect();

      // Advance the clock past the initial delay (timer(0, 5000)) to make combineLatest
      // emit its first value and create the WebSocket. advanceTimersByTime(0) ticks past
      // the zero-delay without draining the repeating 5 s interval.
      jest.advanceTimersByTime(0);

      expect(capturedCloseObserver).toBeDefined();
    });

    it('should invoke setSessionState when destroy() closes the WebSocket', () => {
      const setSessionStateSpy = login.setSessionState as jest.Mock;
      setSessionStateSpy.mockClear();

      channel.destroy();

      // destroy() calls setSessionState directly to reset the session state when a new
      // channel replaces the old one, ensuring the injected LoginService instance does
      // not receive stale state from a previous channel.
      expect(setSessionStateSpy).toHaveBeenCalledWith(SessionState.CREATING_USER_SESSION);
      // The guard in closeObserver prevents setSessionState from being called again when
      // the WebSocket close event fires.
      expect(setSessionStateSpy).toHaveBeenCalledTimes(1);
    });

    it('should invoke setSessionState when an unintentional close fires before destroy()', () => {
      const setSessionStateSpy = login.setSessionState as jest.Mock;
      setSessionStateSpy.mockClear();

      // Simulate an external close (code 4999 falls into the default branch → CREATING_USER_SESSION).
      capturedCloseObserver!.next({ code: 4999 } as unknown as CloseEvent);

      expect(setSessionStateSpy).toHaveBeenCalledWith(SessionState.CREATING_USER_SESSION);
    });
  });
});
