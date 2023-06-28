/*
 * Copyright The Cryostat Authors
 *
 * The Universal Permissive License (UPL), Version 1.0
 *
 * Subject to the condition set forth below, permission is hereby granted to any
 * person obtaining a copy of this software, associated documentation and/or data
 * (collectively the "Software"), free of charge and under any and all copyright
 * rights in the Software, and any and all patent rights owned or freely
 * licensable by each licensor hereunder covering either (i) the unmodified
 * Software as contributed to or provided by such licensor, or (ii) the Larger
 * Works (as defined below), to deal in both
 *
 * (a) the Software, and
 * (b) any piece of software and/or hardware listed in the lrgrwrks.txt file if
 * one is included with the Software (each a "Larger Work" to which the Software
 * is contributed by such licensors),
 *
 * without restriction, including without limitation the rights to copy, create
 * derivative works of, display, perform, and distribute the Software and make,
 * use, sell, offer for sale, import, export, have made, and have sold the
 * Software and the Larger Work(s), and to sublicense the foregoing rights on
 * either these or other terms.
 *
 * This license is subject to the following condition:
 * The above copyright notice and either this complete permission notice or at
 * a minimum a reference to the UPL must be included in all copies or
 * substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

import { AuthMethod, LoginService, SessionState } from '@app/Shared/Services/Login.service';
import { TargetService } from '@app/Shared/Services/Target.service';
import { AuthCredentials } from '@app/Shared/Services/AuthCredentials.service';
import { ApiV2Response } from '@app/Shared/Services/Api.service';
import { SettingsService } from '@app/Shared/Services/Settings.service';
import { firstValueFrom, of, timeout } from 'rxjs';
import { fromFetch } from 'rxjs/fetch';

jest.mock('rxjs/fetch', () => {
  return {
    fromFetch: jest.fn((url: any, opts: any): any => {}),
  };
});

jest.unmock('@app/Shared/Services/Login.service');

describe('Login.service', () => {
  const mockFromFetch = fromFetch as jest.Mock;
  let svc: LoginService;

  describe('setLoggedOut', () => {
    let authCreds: AuthCredentials;
    let targetSvc: TargetService;
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
      authCreds = {} as AuthCredentials;
      targetSvc = {} as TargetService;
      settingsSvc = new SettingsService();
      (settingsSvc.webSocketDebounceMs as jest.Mock).mockReturnValue(0);
    });

    afterEach(() => {
      sessionStorage.clear();
    });

    describe('with Basic AuthMethod', () => {
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
        const token = 'user:d74ff0ee8da3b9806b18c877dbf29bbde50b5bd8e4dad7a3a725000feb82e8f1';
        window.location.href = 'https://example.com/';
        location.href = window.location.href;
        svc = new LoginService(targetSvc, authCreds, settingsSvc);
        await expect(firstValueFrom(svc.checkAuth(token, AuthMethod.BASIC))).resolves.toBeTruthy();
      });

      it('should emit true', async () => {
        const result = await firstValueFrom(svc.setLoggedOut());
        expect(result).toBeTruthy();
      });

      it('should make expected API calls', async () => {
        await firstValueFrom(svc.setLoggedOut());
        expect(mockFromFetch).toHaveBeenCalledTimes(3);
        expect(mockFromFetch).toHaveBeenNthCalledWith(2, `/api/v2.1/auth`, {
          credentials: 'include',
          mode: 'cors',
          method: 'POST',
          body: null,
          headers: new Headers({
            Authorization: `Basic dXNlcjpkNzRmZjBlZThkYTNiOTgwNmIxOGM4NzdkYmYyOWJiZGU1MGI1YmQ4ZTRkYWQ3YTNhNzI1MDAwZmViODJlOGYx`,
          }),
        });
        expect(mockFromFetch).toHaveBeenNthCalledWith(3, `/api/v2.1/logout`, {
          credentials: 'include',
          mode: 'cors',
          method: 'POST',
          body: null,
          headers: new Headers({
            Authorization: `Basic dXNlcjpkNzRmZjBlZThkYTNiOTgwNmIxOGM4NzdkYmYyOWJiZGU1MGI1YmQ4ZTRkYWQ3YTNhNzI1MDAwZmViODJlOGYx`,
          }),
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

      it('should reset the auth method', async () => {
        await firstValueFrom(svc.setLoggedOut());
        await expect(firstValueFrom(svc.getAuthMethod())).resolves.toEqual(AuthMethod.UNKNOWN);
      });

      it('should redirect to login page', async () => {
        await firstValueFrom(svc.setLoggedOut());
        expect(window.location.href).toEqual('/');
      });
    });

    describe('with Bearer AuthMethod', () => {
      let authResp: Response;
      let logoutResp: Response;
      let authRedirectResp: Response;
      let submitSpy: jest.SpyInstance;

      beforeEach(async () => {
        authResp = createResponse(200, true, new Headers({ 'X-WWW-Authenticate': 'Bearer' }), {
          meta: {
            type: 'application/json',
            status: 'OK',
          },
          data: {
            result: {
              username: 'kube:admin',
            },
          },
        });
        logoutResp = createResponse(
          302,
          true,
          new Headers({
            'X-Location': 'https://oauth-server.example.com/logout',
            'access-control-expose-headers': 'Location',
          })
        );
        authRedirectResp = createResponse(
          302,
          true,
          new Headers({
            'X-Location':
              'https://oauth-server.example.com/oauth/authorize?client_id=system%3Aserviceaccount%3Amy-namespace%3Amy-cryostat&response_type=token&response_mode=fragment&scope=user%3Acheck-access+role%3Acryostat-operator-oauth-client%3Amy-namespace',
            'access-control-expose-headers': 'Location',
          }),
          {
            meta: {
              type: 'application/json',
              status: 'Found',
            },
            data: {
              result: undefined,
            },
          }
        );
        // Submit is unimplemented in JSDOM
        submitSpy = jest.spyOn(HTMLFormElement.prototype, 'submit').mockImplementation();

        mockFromFetch.mockReturnValueOnce(of(authResp));
        const token = 'sha256~helloworld';
        window.location.href = 'https://example.com/#token_type=Bearer&access_token=' + token;
        location.hash = 'token_type=Bearer&access_token=' + token;
        svc = new LoginService(targetSvc, authCreds, settingsSvc);
        await expect(firstValueFrom(svc.getAuthMethod())).resolves.toEqual(AuthMethod.BEARER);
        expect(mockFromFetch).toBeCalledTimes(1);
      });

      describe('with no errors', () => {
        beforeEach(async () => {
          mockFromFetch.mockReturnValueOnce(of(logoutResp)).mockReturnValueOnce(of(authRedirectResp));
        });

        it('should emit true', async () => {
          const result = await firstValueFrom(svc.setLoggedOut());
          expect(result).toBeTruthy();
        });

        it('should make expected API calls', async () => {
          await firstValueFrom(svc.setLoggedOut());
          expect(mockFromFetch).toHaveBeenCalledTimes(3);
          expect(mockFromFetch).toHaveBeenNthCalledWith(1, `/api/v2.1/auth`, {
            credentials: 'include',
            mode: 'cors',
            method: 'POST',
            body: null,
            headers: new Headers({
              Authorization: `Bearer c2hhMjU2fmhlbGxvd29ybGQ`,
            }),
          });
          expect(mockFromFetch).toHaveBeenNthCalledWith(2, `/api/v2.1/logout`, {
            credentials: 'include',
            mode: 'cors',
            method: 'POST',
            body: null,
            headers: new Headers({
              Authorization: `Bearer c2hhMjU2fmhlbGxvd29ybGQ`,
            }),
          });
          expect(mockFromFetch).toHaveBeenNthCalledWith(3, `/api/v2.1/auth`, {
            credentials: 'include',
            mode: 'cors',
            method: 'POST',
            body: null,
          });
        });

        it('should submit a form to the OAuth server', async () => {
          await firstValueFrom(svc.setLoggedOut());
          const rawForm = document.getElementById('logoutForm');
          expect(rawForm).toBeInTheDocument();
          expect(rawForm).toBeInstanceOf(HTMLFormElement);
          const form = rawForm as HTMLFormElement;
          expect(form.action).toEqual('https://oauth-server.example.com/logout');
          expect(form.method.toUpperCase()).toEqual('POST');

          expect(form.childElementCount).toBe(1);
          const rawInput = form.firstChild;
          expect(rawInput).toBeInstanceOf(HTMLInputElement);
          const input = rawInput as HTMLInputElement;
          expect(input.value).toEqual(
            '/oauth/authorize?client_id=system%3Aserviceaccount%3Amy-namespace%3Amy-cryostat&response_type=token&response_mode=fragment&scope=user%3Acheck-access+role%3Acryostat-operator-oauth-client%3Amy-namespace'
          );
          expect(input.name).toEqual('then');
          expect(input.type).toEqual('hidden');

          expect(document.body).toContainElement(form);
          expect(submitSpy).toHaveBeenCalled();
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

        it('should reset the auth method', async () => {
          await firstValueFrom(svc.setLoggedOut());
          await expect(firstValueFrom(svc.getAuthMethod())).resolves.toEqual(AuthMethod.UNKNOWN);
        });
      });

      describe('with errors', () => {
        let logSpy: jest.SpyInstance;
        beforeEach(() => {
          logSpy = jest.spyOn(window.console, 'error').mockImplementation();
        });

        describe('backend logout returns non-302 response', () => {
          beforeEach(() => {
            const badLogoutResp = createResponse(
              200,
              true,
              new Headers({
                'X-Location': 'https://oauth-server.example.com/logout',
                'access-control-expose-headers': 'Location',
              })
            );
            mockFromFetch.mockReturnValueOnce(of(badLogoutResp)).mockReturnValueOnce(of(authRedirectResp));
          });

          it('should fail to log out', async () => {
            const result = await firstValueFrom(svc.setLoggedOut());
            expect(result).toBeFalsy();
            expect(logSpy).toHaveBeenCalledWith(
              expect.stringContaining('"message":"Could not find OAuth logout endpoint"')
            );
          });
        });

        describe('backend logout returns 302 response without X-Location header', () => {
          beforeEach(() => {
            const badLogoutResp = createResponse(
              302,
              true,
              new Headers({
                'access-control-expose-headers': 'Location',
              })
            );
            mockFromFetch.mockReturnValueOnce(of(badLogoutResp)).mockReturnValueOnce(of(authRedirectResp));
          });

          it('should fail to log out', async () => {
            const result = await firstValueFrom(svc.setLoggedOut());
            expect(result).toBeFalsy();
            expect(logSpy).toHaveBeenCalledWith(
              expect.stringContaining('"message":"Could not find OAuth logout endpoint"')
            );
          });
        });

        describe('backend auth returns non-302 response', () => {
          beforeEach(() => {
            const badAuthRedirectResp = createResponse(
              200,
              true,
              new Headers({
                'X-Location':
                  'https://oauth-server.example.com/oauth/authorize?client_id=system%3Aserviceaccount%3Amy-namespace%3Amy-cryostat&response_type=token&response_mode=fragment&scope=user%3Acheck-access+role%3Acryostat-operator-oauth-client%3Amy-namespace',
                'access-control-expose-headers': 'Location',
              }),
              {
                meta: {
                  type: 'application/json',
                  status: 'OK',
                },
                data: {
                  result: undefined,
                },
              }
            );
            mockFromFetch.mockReturnValueOnce(of(logoutResp)).mockReturnValueOnce(of(badAuthRedirectResp));
          });

          it('should fail to log out', async () => {
            const result = await firstValueFrom(svc.setLoggedOut());
            expect(result).toBeFalsy();
            expect(logSpy).toHaveBeenCalledWith(
              expect.stringContaining('"message":"Could not find OAuth login endpoint"')
            );
          });
        });

        describe('backend auth returns 302 response without X-Location header', () => {
          beforeEach(() => {
            const badAuthRedirectResp = createResponse(
              302,
              true,
              new Headers({
                'access-control-expose-headers': 'Location',
              }),
              {
                meta: {
                  type: 'application/json',
                  status: 'Found',
                },
                data: {
                  result: undefined,
                },
              }
            );
            mockFromFetch.mockReturnValueOnce(of(logoutResp)).mockReturnValueOnce(of(badAuthRedirectResp));
          });

          it('should fail to log out', async () => {
            const result = await firstValueFrom(svc.setLoggedOut());
            expect(result).toBeFalsy();
            expect(logSpy).toHaveBeenCalledWith(
              expect.stringContaining('"message":"Could not find OAuth login endpoint"')
            );
          });
        });
      });
    });
  });
});

function createResponse(status: number, ok: boolean, headers?: Headers, jsonBody?: ApiV2Response): Response {
  return {
    status: status,
    ok: ok,
    headers: headers,
    json: () => Promise.resolve(jsonBody),
  } as Response;
}
