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
import { catchError, concatMap, first, map, tap } from 'rxjs/operators';

export class LoginService {

  private readonly TOKEN_KEY: string = 'token';
  private readonly METHOD_KEY: string = 'method';
  private readonly USER_KEY: string = 'user';
  private readonly token = new ReplaySubject<string>(1);
  private readonly authMethod = new ReplaySubject<string>(1);
  private readonly logout = new ReplaySubject<void>(1);
  private readonly username = new ReplaySubject<string>(1);
  private readonly authenticated = new ReplaySubject<boolean>(1);
  readonly authority: string;

  constructor() {
    let apiAuthority = process.env.CRYOSTAT_AUTHORITY;
    if (!apiAuthority) {
      apiAuthority = '';
    }
    this.authority = apiAuthority;
    this.token.next(this.getCacheItem(this.TOKEN_KEY));
    this.authMethod.next(this.getCacheItem(this.METHOD_KEY));
    this.username.next(this.getCacheItem(this.USER_KEY));
    this.authenticated.next(false);
  }

  checkAuth(token: string, method: string): Observable<boolean> {

    token = this.useCacheItemIfAvailable(this.TOKEN_KEY, token);

    return fromFetch(`${this.authority}/api/v2.1/auth`, {
      credentials: 'include',
      mode: 'cors',
      method: 'POST',
      body: null,
      headers: this.getAuthHeaders(token, method),
    })
    .pipe(
      concatMap(response => {
        if (!this.authMethod.isStopped) {
          this.authMethod.next(response.ok ? method : (response.headers.get('X-WWW-Authenticate') || ''));
        }
        return response.json();
      }),
      first(),
      tap((jsonResp: AuthV2Response) => {
        if(jsonResp.meta.status === 'OK') {
          this.completeAuthMethod(method);
          this.setUsername(jsonResp.data.result.username);
          this.token.next(token);
          this.authenticated.next(true);
        }
      }),
      map((jsonResp: AuthV2Response) => {
        return jsonResp.meta.status === 'OK';
      }),
      catchError((e: Error): ObservableInput<boolean> => {
        window.console.error(JSON.stringify(e));
        this.authMethod.complete();
        return of(false);
      }),
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

  getUsername(): Observable<string> {
    return this.username.asObservable();
  }

  isAuthenticated(): Observable<boolean> {
    return this.authenticated.asObservable();
  }

  loggedOut(): Observable<void> {
    return this.logout.asObservable();
  }

  setLoggedOut(): void {
    this.removeCacheItem(this.USER_KEY);
    this.forgetToken();
    this.token.next('');
    this.username.next('');
    this.logout.next();
    this.authenticated.next(false);
  }

  rememberToken(token: string): void {
    this.setCacheItem(this.TOKEN_KEY, token);
  }

  forgetToken(): void {
    this.removeCacheItem(this.TOKEN_KEY);
  }

  private setUsername(username: string): void {
    this.setCacheItem(this.USER_KEY, username);
    this.username.next(username);
  }

  private completeAuthMethod(method: string): void {
    this.authMethod.next(method);
    this.setCacheItem(this.METHOD_KEY, method);
    this.authMethod.complete();
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
      console.error('Caching Failed', (error as any).message);
      sessionStorage.clear();
    }
  }

  private removeCacheItem(key: string): void {
    sessionStorage.removeItem(key);
  }

}

interface ApiResponse {
  meta: Meta;
  data: Object;
}

interface Meta {
  status: string;
  type: string;
}

interface AuthV2Response extends ApiResponse {
  data: AuthResult;
}
interface AuthResult {
  result: Username;
}

interface Username {
  username: string;
}
