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
import { catchError, concatMap, debounceTime, distinctUntilChanged, finalize, map, tap } from 'rxjs/operators';
import { ApiService } from './Api.service';
import { SessionState } from './service.types';
import type { SettingsService } from './Settings.service';

export class LoginService {
  private readonly logout = new ReplaySubject<void>(1);
  private readonly username = new ReplaySubject<string>(1);
  private readonly sessionState = new ReplaySubject<SessionState>(1);

  constructor(
    private readonly api: ApiService,
    private readonly settings: SettingsService,
  ) {
    this.sessionState.next(SessionState.CREATING_USER_SESSION);
  }

  checkAuth(): void {
    this.api
      .sendRequest('v4', 'auth', {
        credentials: 'include',
        mode: 'cors',
        method: 'POST',
        body: null,
      })
      .pipe(
        concatMap((response) => {
          let gapAuth = response?.headers?.get('Gap-Auth');
          if (gapAuth) {
            return new Promise<any>((r) => r({ username: gapAuth } as any));
          }
          return response.json();
        }),
        catchError(() => of({ username: '' } as any)),
      )
      .subscribe((v) => {
        this.username.next(v?.username ?? '');
      });
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
    return this.api
      .sendRequest('v4', 'logout', {
        credentials: 'include',
        mode: 'cors',
        method: 'POST',
        body: null,
      })
      .pipe(
        concatMap((response) => {
          return of(response).pipe(
            map((response) => response.ok),
            tap(() => this.resetSessionState()),
          );
        }),
        catchError((e: Error): ObservableInput<boolean> => {
          window.console.error(JSON.stringify(e, Object.getOwnPropertyNames(e)));
          return of(false);
        }),
        finalize(() => this.navigateToLoginPage()),
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
    window.location.href = '/';
  }
}
