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
import { Base64 } from 'js-base64';
import { combineLatest, Observable, ObservableInput, of, ReplaySubject } from 'rxjs';
import { fromFetch } from 'rxjs/fetch';
import { catchError, concatMap, debounceTime, distinctUntilChanged, first, map, tap } from 'rxjs/operators';
import { ApiV2Response } from './Api.service';
import { Credential, AuthCredentials } from './AuthCredentials.service';
import { isQuotaExceededError } from './Report.service';
import { SettingsService } from './Settings.service';
import { TargetService } from './Target.service';

export enum SessionState {
  NO_USER_SESSION,
  CREATING_USER_SESSION,
  USER_SESSION,
}

export enum AuthMethod {
  BASIC = 'Basic',
  BEARER = 'Bearer',
  NONE = 'None',
  UNKNOWN = '',
}

export class LoginService {
  private readonly TOKEN_KEY: string = 'token';
  private readonly USER_KEY: string = 'user';
  private readonly AUTH_METHOD_KEY: string = 'auth_method';
  private readonly token = new ReplaySubject<string>(1);
  private readonly authMethod = new ReplaySubject<AuthMethod>(1);
  private readonly logout = new ReplaySubject<void>(1);
  private readonly username = new ReplaySubject<string>(1);
  private readonly sessionState = new ReplaySubject<SessionState>(1);
  readonly authority: string;

  constructor(
    private readonly target: TargetService,
    private readonly authCredentials: AuthCredentials,
    private readonly settings: SettingsService
  ) {
    this.authority = process.env.CRYOSTAT_AUTHORITY || '';
    this.token.next(this.getCacheItem(this.TOKEN_KEY));
    this.username.next(this.getCacheItem(this.USER_KEY));
    this.authMethod.next(this.getCacheItem(this.AUTH_METHOD_KEY) as AuthMethod);
    this.sessionState.next(SessionState.NO_USER_SESSION);
    this.queryAuthMethod();
  }

  queryAuthMethod(): void {
    this.checkAuth('', '').subscribe(() => {
      // check auth once at component load to query the server's auth method
    });
  }

  checkAuth(token: string, method: string, rememberMe = true): Observable<boolean> {
    token = Base64.encodeURL(token || this.getTokenFromUrlFragment());
    token = token || this.getCachedEncodedTokenIfAvailable();

    if (this.hasBearerTokenUrlHash()) {
      method = AuthMethod.BEARER;
    }

    if (!method) {
      method = this.getCacheItem(this.AUTH_METHOD_KEY);
    }

    return fromFetch(`${this.authority}/api/v2.1/auth`, {
      credentials: 'include',
      mode: 'cors',
      method: 'POST',
      body: null,
      headers: this.getAuthHeaders(token, method),
    }).pipe(
      concatMap((response) => {
        this.updateAuthMethod(response.headers.get('X-WWW-Authenticate') || '');

        if (response.status === 302) {
          const redirectUrl = response.headers.get('X-Location');

          if (redirectUrl) {
            window.location.replace(redirectUrl);
          }
        }

        return response.json();
      }),
      first(),
      tap((jsonResp: AuthV2Response) => {
        if (jsonResp.meta.status === 'OK') {
          this.decideRememberCredentials(token, jsonResp.data.result.username, rememberMe);
          this.sessionState.next(SessionState.CREATING_USER_SESSION);
        }
      }),
      map((jsonResp: AuthV2Response) => {
        return jsonResp.meta.status === 'OK';
      }),
      catchError((e: Error): ObservableInput<boolean> => {
        window.console.error(JSON.stringify(e, Object.getOwnPropertyNames(e)));
        this.authMethod.complete();
        return of(false);
      })
    );
  }

  getAuthHeaders(token: string, method: string, jmxCredential?: Credential): Headers {
    const headers = new window.Headers();
    if (!!token && !!method) {
      headers.set('Authorization', `${method} ${token}`);
    } else if (method === AuthMethod.NONE) {
      headers.set('Authorization', AuthMethod.NONE);
    }
    if (jmxCredential) {
      const basic = `${jmxCredential.username}:${jmxCredential.password}`;
      headers.set('X-JMX-Authorization', `Basic ${Base64.encode(basic)}`);
    }
    return headers;
  }

  getHeaders(): Observable<Headers> {
    return combineLatest([
      this.getToken(),
      this.getAuthMethod(),
      this.target.target().pipe(
        map((target) => target.connectUrl),
        concatMap((connect) => this.authCredentials.getCredential(connect))
      ),
    ]).pipe(
      map((parts: [string, AuthMethod, Credential | undefined]) => this.getAuthHeaders(parts[0], parts[1], parts[2])),
      first()
    );
  }

  getToken(): Observable<string> {
    return this.token.asObservable();
  }

  getAuthMethod(): Observable<AuthMethod> {
    return this.authMethod
      .asObservable()
      .pipe(distinctUntilChanged(), debounceTime(this.settings.webSocketDebounceMs()));
  }

  getUsername(): Observable<string> {
    return this.username.asObservable();
  }

  getSessionState(): Observable<SessionState> {
    return this.sessionState
      .asObservable()
      .pipe(distinctUntilChanged(), debounceTime(this.settings.webSocketDebounceMs()));
  }

  loggedOut(): Observable<void> {
    return this.logout.asObservable();
  }

  setLoggedOut(): Observable<boolean> {
    return combineLatest([this.getToken(), this.getAuthMethod()]).pipe(
      first(),
      concatMap((parts) => {
        const token = parts[0];
        const method = parts[1];

        // Call the logout backend endpoint
        const resp = fromFetch(`${this.authority}/api/v2.1/logout`, {
          credentials: 'include',
          mode: 'cors',
          method: 'POST',
          body: null,
          headers: this.getAuthHeaders(token, method),
        });
        return combineLatest([of(method), resp]);
      }),
      concatMap(([method, response]) => {
        if (method === AuthMethod.BEARER) {
          // Assume Bearer method means OpenShift
          const redirectUrl = response.headers.get('X-Location');
          // On OpenShift, the backend logout endpoint should respond with a redirect
          if (response.status !== 302 || !redirectUrl) {
            throw new Error('Could not find OAuth logout endpoint');
          }
          return this.openshiftLogout(redirectUrl);
        }
        return of(response).pipe(
          map((response) => response.ok),
          tap(() => {
            this.resetSessionState();
            this.resetAuthMethod();
            this.navigateToLoginPage();
          })
        );
      }),
      catchError((e: Error): ObservableInput<boolean> => {
        window.console.error(JSON.stringify(e, Object.getOwnPropertyNames(e)));
        return of(false);
      })
    );
  }

  private openshiftLogout(logoutUrl: string): Observable<boolean> {
    // Query the backend auth endpoint. On OpenShift, without providing a
    // token, this should return a redirect to OpenShift's OAuth login.
    const resp = fromFetch(`${this.authority}/api/v2.1/auth`, {
      credentials: 'include',
      mode: 'cors',
      method: 'POST',
      body: null,
    });

    return resp.pipe(
      first(),
      map((response) => {
        // Fail if we don't get a valid redirect URL for the user to log
        // back in.
        const loginUrlString = response.headers.get('X-Location');
        if (response.status !== 302 || !loginUrlString) {
          throw new Error('Could not find OAuth login endpoint');
        }

        const loginUrl = new URL(loginUrlString);
        if (!loginUrl) {
          throw new Error(`OAuth login endpoint is invalid: ${loginUrlString}`);
        }
        return loginUrl;
      }),
      tap(() => {
        this.resetSessionState();
        this.resetAuthMethod();
      }),
      map((loginUrl) => {
        // Create a hidden form to submit to the OAuth server's
        // logout endpoint. The "then" parameter will redirect back
        // to the login/authorize endpoint once logged out.
        const form = document.createElement('form');
        form.id = 'logoutForm';
        form.action = logoutUrl;
        form.method = 'POST';

        const input = document.createElement('input');
        // The OAuth server is strict about valid redirects. Convert
        // the result from our auth response into a relative URL.
        input.value = `${loginUrl.pathname}${loginUrl.search}`;
        input.name = 'then';
        input.type = 'hidden';

        form.appendChild(input);
        document.body.appendChild(form);

        form.submit();
        return true;
      })
    );
  }

  setSessionState(state: SessionState): void {
    this.sessionState.next(state);
  }

  private resetSessionState(): void {
    this.token.next(this.getCacheItem(this.TOKEN_KEY));
    this.username.next(this.getCacheItem(this.USER_KEY));
    this.logout.next();
    this.sessionState.next(SessionState.NO_USER_SESSION);
  }

  private resetAuthMethod(): void {
    this.authMethod.next(AuthMethod.UNKNOWN);
    this.removeCacheItem(this.AUTH_METHOD_KEY);
  }

  private navigateToLoginPage(): void {
    const url = new URL(window.location.href.split('#')[0]);
    window.location.href = url.pathname.match(/\/settings/i) ? '/' : url.pathname;
  }

  private getTokenFromUrlFragment(): string {
    const matches = location.hash.match(new RegExp('access_token' + '=([^&]*)'));
    return matches ? matches[1] : '';
  }

  private hasBearerTokenUrlHash(): boolean {
    const matches = location.hash.match('token_type=Bearer');
    return !!matches;
  }

  private getCachedEncodedTokenIfAvailable(): string {
    return this.getCacheItem(this.TOKEN_KEY);
  }

  private decideRememberCredentials(token: string, username: string, rememberMe: boolean): void {
    this.token.next(token);
    this.username.next(username);

    if (rememberMe && !!token) {
      this.setCacheItem(this.TOKEN_KEY, token);
      this.setCacheItem(this.USER_KEY, username);
    } else {
      this.removeCacheItem(this.TOKEN_KEY);
      this.removeCacheItem(this.USER_KEY);
    }
  }

  private updateAuthMethod(method: string): void {
    let validMethod = method as AuthMethod;

    if (!Object.values(AuthMethod).includes(validMethod)) {
      validMethod = AuthMethod.UNKNOWN;
    }

    this.authMethod.next(validMethod);
    this.setCacheItem(this.AUTH_METHOD_KEY, validMethod);
  }

  private getCacheItem(key: string): string {
    const item = sessionStorage.getItem(key);
    return item ? item : '';
  }

  private setCacheItem(key: string, token: string): void {
    try {
      sessionStorage.setItem(key, token);
    } catch (err) {
      if (isQuotaExceededError(err)) {
        console.error('Caching Failed', err.message);
        sessionStorage.clear();
      } else {
        console.error('Caching Failed', 'sessionStorage is not available');
      }
    }
  }

  private removeCacheItem(key: string): void {
    sessionStorage.removeItem(key);
  }
}

interface AuthV2Response extends ApiV2Response {
  data: {
    result: {
      username: string;
    };
  };
}
