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
/* eslint @typescript-eslint/no-explicit-any: 0 */
import { ApiService } from '@app/Shared/Services/Api.service';
import { AuthCredentials } from '@app/Shared/Services/AuthCredentials.service';
import { firstValueFrom, Observable, of } from 'rxjs';

const mockApi = {
  postCredentials: (_expr: string, _user: string, _pass: string): Observable<boolean> => of(true),
} as ApiService;
const postCredentialsSpy = jest.spyOn(mockApi, 'postCredentials');

describe('AuthCredentials.service', () => {
  let svc: AuthCredentials;
  beforeEach(() => {
    postCredentialsSpy.mockReset();
    svc = new AuthCredentials(() => mockApi);
  });

  it('does not retrieve credentials', async () => {
    const cred = await firstValueFrom(svc.getCredential('myTarget'));
    expect(cred).toBeUndefined();
    expect(postCredentialsSpy).not.toHaveBeenCalled();
  });

  it('POSTs credentials to API service', async () => {
    svc.setCredential('myTarget', 'foouser', 'foopass');
    expect(postCredentialsSpy).toHaveBeenCalled();
  });
});
