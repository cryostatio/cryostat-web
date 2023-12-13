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
import { Observable, ObservableInput, of, ReplaySubject } from 'rxjs';
import { fromFetch } from 'rxjs/fetch';
import { catchError, concatMap, debounceTime, distinctUntilChanged, first, map, tap } from 'rxjs/operators';
import { SessionState } from './service.types';
import type { SettingsService } from './Settings.service';

export class LoginService {
  private readonly logout = new ReplaySubject<void>(1);
  private readonly username = new ReplaySubject<string>(1);
  private readonly sessionState = new ReplaySubject<SessionState>(1);
  readonly authority: string;

  constructor(private readonly settings: SettingsService) {
    this.authority = process.env.CRYOSTAT_AUTHORITY || '.';
    this.username.next('user' /*TODO get this from X-Forwarded headers: this.getCacheItem(this.USER_KEY)*/);
    this.sessionState.next(SessionState.CREATING_USER_SESSION);
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
    return fromFetch(`${this.authority}/api/v2.1/logout`, {
      credentials: 'include',
      mode: 'cors',
      method: 'POST',
      body: null,
    }).pipe(
      concatMap((response) => {
        return of(response).pipe(
          map((response) => response.ok),
          tap(() => {
            this.resetSessionState();
            this.navigateToLoginPage();
          }),
        );
      }),
      catchError((e: Error): ObservableInput<boolean> => {
        window.console.error(JSON.stringify(e, Object.getOwnPropertyNames(e)));
        return of(false);
      }),
    );
  }

  // FIXME either remove this or determine if it's still needed when deployed in openshift and when using the openshift-oauth-proxy
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
      }),
    );
  }

  setSessionState(state: SessionState): void {
    this.sessionState.next(state);
  }

  private resetSessionState(): void {
    this.logout.next();
    this.sessionState.next(SessionState.NO_USER_SESSION);
  }

  private navigateToLoginPage(): void {
    const url = new URL(window.location.href.split('#')[0]);
    window.location.href = url.pathname.match(/\/settings/i) ? '/' : url.pathname;
  }
}
