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

import { ApiService } from '@app/Shared/Services/Api.service';
import { LoginService } from '@app/Shared/Services/Login.service';
import { NotificationService } from '@app/Shared/Services/Notifications.service';
import { SessionState } from '@app/Shared/Services/service.types';
import { SettingsService } from '@app/Shared/Services/Settings.service';
import { TargetService } from '@app/Shared/Services/Target.service';
import { firstValueFrom, of, timeout } from 'rxjs';
import { createMemoryHistory, MemoryHistory } from 'history';

jest.unmock('@app/Shared/Services/Login.service');
jest.mock('@app/Shared/Services/Api.service');
jest.spyOn(history, 'replaceState');

describe('Login.service', () => {
  let svc: LoginService;

  describe('setLoggedOut', () => {
    let apiSvc: ApiService;
    let settingsSvc: SettingsService;
    let history: MemoryHistory;

    beforeEach(() => {
      history = createMemoryHistory();
      apiSvc = new ApiService(
        {
          headers: () => of(new Headers()),
          url: (p) => of(`./${p}`),
        },
        {} as TargetService,
        {} as NotificationService,
      );
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
      jest
        .spyOn(apiSvc, 'sendRequest')
        .mockReturnValue(
          of({
            ok: true,
            json: new Promise((resolve) => resolve(initAuthResp)),
          } as unknown as Response),
        )
        .mockReturnValue(
          of({
            ok: true,
            json: new Promise((resolve) => resolve(authResp)),
          } as unknown as Response),
        )
        .mockReturnValue(
          of({
            ok: true,
            json: new Promise((resolve) => resolve(logoutResp)),
          } as unknown as Response),
        );
      history.push('/somepath');
      svc = new LoginService(history, apiSvc, settingsSvc);
    });

    it('should emit true', async () => {
      const logoutResp = createResponse(200, true);
      jest.spyOn(apiSvc, 'sendRequest').mockReturnValue(
        of({
          ok: true,
          json: new Promise((resolve) => resolve(logoutResp)),
        } as unknown as Response),
      );
      const result = await firstValueFrom(svc.setLoggedOut());
      expect(result).toBeTruthy();
    });

    it('should make expected API calls', async () => {
      expect(apiSvc.sendRequest).toHaveBeenCalledTimes(0);
      svc.checkAuth();
      expect(apiSvc.sendRequest).toHaveBeenCalledTimes(1);
      expect(apiSvc.sendRequest).toHaveBeenNthCalledWith(1, 'v4', 'auth', {
        credentials: 'include',
        mode: 'cors',
        method: 'POST',
        body: null,
      });
      await firstValueFrom(svc.setLoggedOut());
      expect(apiSvc.sendRequest).toHaveBeenCalledTimes(2);
      expect(apiSvc.sendRequest).toHaveBeenNthCalledWith(2, 'v4', 'logout', {
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
      expect(history.location.pathname).toEqual('/somepath');
      await firstValueFrom(svc.setLoggedOut());
      expect(history.location.pathname).toEqual('/');
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
