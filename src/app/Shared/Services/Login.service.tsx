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
import { Observable, ObservableInput, of, ReplaySubject } from 'rxjs';
import { fromFetch } from 'rxjs/fetch';
import { catchError, first, map, tap } from 'rxjs/operators';

export class LoginService {

  private readonly TOKEN_KEY: string = 'token';
  private readonly METHOD_KEY: string = 'method';
  private readonly token = new ReplaySubject<string>(1);
  private readonly authMethod = new ReplaySubject<string>(1);
  private readonly login = new ReplaySubject<boolean>(1);
  readonly authority: string;

  constructor() {
    let apiAuthority = process.env.CRYOSTAT_AUTHORITY;
    if (!apiAuthority) {
      apiAuthority = '';
    }
    this.authority = apiAuthority;
    this.token.next(this.getCacheItem(this.TOKEN_KEY));
    this.authMethod.next(this.getCacheItem(this.METHOD_KEY));
  }

  checkAuth(token: string, method: string): Observable<boolean> {

    token = this.useCacheItemIfAvailable(this.TOKEN_KEY, token);

    return fromFetch(`${this.authority}/api/v1/auth`, {
      credentials: 'include',
      mode: 'cors',
      method: 'POST',
      body: null,
      headers: this.getAuthHeaders(token, method),
    })
    .pipe(
      map(response => {
        if (!this.authMethod.isStopped) {
          this.authMethod.next(response.ok ? method : (response.headers.get('X-WWW-Authenticate') || ''));
        }
        return response.ok;
      }),
      catchError((e: Error): ObservableInput<boolean> => {
        window.console.error(JSON.stringify(e));
        this.authMethod.complete();
        return of(false);
      }),
      first(),
      tap(v => {
        if (v) {
          this.authMethod.next(method);
          this.authMethod.complete();
          this.token.next(token);
          this.setCacheItem(this.TOKEN_KEY, token);
          this.setCacheItem(this.METHOD_KEY, method);
        }
      })
    );
  }

  getToken(): Observable<string> {
    return this.token.asObservable();
  }

  getAuthHeaders(token: string, method: string): Headers {
    const headers = new window.Headers();
    if (!!token && !!method) {
      headers.set('Authorization', `${method} ${token}`)
    }

    return headers;
  }

  getAuthMethod(): Observable<string> {
    return this.authMethod.asObservable();
  }

  isAuthenticated(): boolean {
    return !!this.getCacheItem(this.TOKEN_KEY);
  }

  loggedIn(): Observable<boolean> {
    return this.login.asObservable();
  }

  setLoggedIn(isLoggedIn: boolean): void {
    if(isLoggedIn) {
      this.login.next(true);
    } else {
      this.removeCacheItem(this.TOKEN_KEY);
      this.token.next('');
      this.login.next(false);
    }
  }

  private getCacheItem(key: string): string {
    const item = sessionStorage.getItem(key);
    return (!!item) ? item : '';
  }

  private useCacheItemIfAvailable(key: string, defaultToken: string) {
    const cacheItem = this.getCacheItem(key);
    return (cacheItem) ? cacheItem : defaultToken;
  }

  private setCacheItem(key: string, token: string): void {
    try {
      sessionStorage.setItem(key, token);
    } catch (error) {
      console.error('Caching Failed', error.message);
      sessionStorage.clear();
    }
  }

  private removeCacheItem(key: string): void {
    sessionStorage.removeItem(key);
  }

}
