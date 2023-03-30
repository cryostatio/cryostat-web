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
import { AuthCredential } from '@app/AppLayout/CredentialAuthForm';
import { StreamOf } from '@app/utils/utils';
import * as React from 'react';
import { debounceTime, Subscription } from 'rxjs';

export const CredentialContext = React.createContext(new StreamOf<AuthCredential>({ username: '', password: '' }));

export interface TestRequest {
  id: string;
  targetUrl: string;
  data?: unknown;
}

// Each test request registers itself to test pool when initiated. When completed, remove itself from pool.
// Auth form will poll this pool for a set time to determine if form should is disabled.
export const TestPoolContext = React.createContext(new Set<TestRequest>());

export const useAuthCredential = (
  ignoreEmit?: boolean,
  debounceMs = 50
): [AuthCredential, (credential: AuthCredential) => void] => {
  const [credential$, setCredential$] = React.useState<AuthCredential>({ username: '', password: '' });
  const authCredentialContext = React.useContext(CredentialContext);

  React.useEffect(() => {
    let sub: Subscription | undefined;
    if (!ignoreEmit) {
      sub = authCredentialContext.get().pipe(debounceTime(debounceMs)).subscribe(setCredential$);
    }
    return () => sub && sub.unsubscribe();
  }, [setCredential$, authCredentialContext, debounceMs, ignoreEmit]);

  const setCredential = React.useCallback(
    (credential: AuthCredential) => {
      authCredentialContext.set(credential);
    },
    [authCredentialContext]
  );

  return [credential$, setCredential];
};
