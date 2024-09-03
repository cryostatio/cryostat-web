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

import { LoginService } from '@app/Shared/Services/Login.service';
import { SessionState } from '@app/Shared/Services/service.types';
import { SettingsService } from '@app/Shared/Services/Settings.service';
import { firstValueFrom, of, timeout } from 'rxjs';
import { fromFetch } from 'rxjs/fetch';

jest.mock('rxjs/fetch', () => {
  return {
    fromFetch: jest.fn((_url: unknown, _opts: unknown): unknown => undefined),
  };
});

jest.unmock('@app/Shared/Services/Login.service');

describe('Login.service', () => {
  const mockFromFetch = fromFetch as jest.Mock;
  let svc: LoginService;

  describe('setLoggedOut', () => {
    let settingsSvc: SettingsService;
    let saveLocation: Location;

    beforeAll(() => {
      // Redirection is unimplemented in JSDOM, and cannot by spied on
      saveLocation = window.location;
      const locationMock = {
        ...saveLocation,
        replace: jest.fn(),
      } as Location;
      Object.defineProperty(window, 'location', {
        value: locationMock,
        writable: true,
      });
    });

    afterAll(() => {
      // Restore the original location
      Object.defineProperty(window, 'location', {
        value: saveLocation,
        writable: false,
      });
    });

    beforeEach(() => {
      settingsSvc = new SettingsService();
      (settingsSvc.webSocketDebounceMs as jest.Mock).mockReturnValue(0);
    });

    afterEach(() => {
      sessionStorage.clear();
      jest.resetAllMocks();
      jest.restoreAllMocks();
    });

    beforeEach(async () => {
      const initAuthResp = createResponse(401, false, new Headers({ 'X-WWW-Authenticate': 'Basic' }), {
        meta: {
          type: 'text/plain',
          status: 'Unauthorized',
        },
        data: {
          reason: 'HTTP Authorization Failure',
        },
      });
      const authResp = createResponse(200, true, new Headers({ 'X-WWW-Authenticate': 'Basic' }), {
        meta: {
          type: 'application/json',
          status: 'OK',
        },
        data: {
          result: {
            username: 'user',
          },
        },
      });
      const logoutResp = createResponse(200, true);
      mockFromFetch
        .mockReturnValueOnce(of(initAuthResp))
        .mockReturnValueOnce(of(authResp))
        .mockReturnValueOnce(of(logoutResp));
      window.location.href = 'https://example.com/';
      location.href = window.location.href;
      svc = new LoginService(settingsSvc);
    });

    it('should emit true', async () => {
      const result = await firstValueFrom(svc.setLoggedOut());
      expect(result).toBeTruthy();
    });

    it('should make expected API calls', async () => {
      await firstValueFrom(svc.setLoggedOut());
      expect(mockFromFetch).toHaveBeenCalledTimes(2);
      expect(mockFromFetch).toHaveBeenNthCalledWith(1, `./api/v4/auth`, {
        credentials: 'include',
        mode: 'cors',
        method: 'POST',
        body: null,
      });
      expect(mockFromFetch).toHaveBeenNthCalledWith(2, `./api/v4/logout`, {
        credentials: 'include',
        mode: 'cors',
        method: 'POST',
        body: null,
      });
    });

    it('should emit logged-out', async () => {
      await firstValueFrom(svc.setLoggedOut());
      await firstValueFrom(svc.loggedOut().pipe(timeout({ first: 1000 })));
    });

    it('should reset session state', async () => {
      const beforeState = await firstValueFrom(svc.getSessionState());
      expect(beforeState).toEqual(SessionState.CREATING_USER_SESSION);
      await firstValueFrom(svc.setLoggedOut());
      const afterState = await firstValueFrom(svc.getSessionState());
      expect(afterState).toEqual(SessionState.NO_USER_SESSION);
    });

    it('should redirect to login page', async () => {
      await firstValueFrom(svc.setLoggedOut());
      expect(window.location.href).toEqual('/');
    });
  });
});

function createResponse(status: number, ok: boolean, headers?: Headers, jsonBody?: any): Response {
  return {
    status: status,
    ok: ok,
    headers: headers,
    json: () => Promise.resolve(jsonBody),
  } as Response;
}
