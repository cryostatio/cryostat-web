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
  debounceMs = 50,
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
    [authCredentialContext],
  );

  return [credential$, setCredential];
};
