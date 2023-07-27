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
import { getFromLocalStorage, saveToLocalStorage } from '@app/utils/LocalStorage';
import { firstValueFrom, Observable, of } from 'rxjs';

jest.mock('@app/utils/LocalStorage', () => {
  const map = new Map<any, any>();
  return {
    getFromLocalStorage: jest.fn((key: any, defaultValue: any): any => {
      if (map.has(key)) {
        return map.get(key);
      }
      return defaultValue;
    }),

    saveToLocalStorage: jest.fn((key: any, value: any): any => {
      map.set(key, value);
    }),
  };
});

const mockApi = {
  postCredentials: (_expr: string, _user: string, _pass: string): Observable<boolean> => of(true),
} as ApiService;
const postCredentialsSpy = jest.spyOn(mockApi, 'postCredentials');

describe('AuthCredentials.service', () => {
  let svc: AuthCredentials;
  beforeEach(() => {
    saveToLocalStorage('CREDENTIAL_LOCATION', undefined);
    postCredentialsSpy.mockReset();
    svc = new AuthCredentials(() => mockApi);
  });

  it('should not check storage on instantiation', () => {
    expect(getFromLocalStorage).not.toHaveBeenCalled();
  });

  describe('with invalid location selected in storage', () => {
    beforeEach(() => {
      saveToLocalStorage('CREDENTIAL_LOCATION', 'BAD_LOCATION');
    });

    it('retrieves undefined credentials from memory map', async () => {
      const cred = await firstValueFrom(svc.getCredential('myTarget'));
      expect(getFromLocalStorage).toHaveBeenCalled();
      expect(cred).toBeFalsy();
      expect(postCredentialsSpy).not.toHaveBeenCalled();
    });

    it('retrieves previously defined credentials from memory map', async () => {
      svc.setCredential('myTarget', 'foouser', 'foopass');
      expect(getFromLocalStorage).toHaveBeenCalledTimes(1);
      const cred = await firstValueFrom(svc.getCredential('myTarget'));
      expect(getFromLocalStorage).toHaveBeenCalledTimes(2);
      expect(cred).toBeUndefined();
      expect(postCredentialsSpy).not.toHaveBeenCalled();
    });
  });

  describe('with session selected in storage', () => {
    beforeEach(() => {
      saveToLocalStorage('CREDENTIAL_LOCATION', 'Session (Browser Memory)');
    });

    it('retrieves undefined credentials from memory map', async () => {
      const cred = await firstValueFrom(svc.getCredential('myTarget'));
      expect(getFromLocalStorage).toHaveBeenCalledTimes(1);
      expect(cred).toBeUndefined();
      expect(postCredentialsSpy).not.toHaveBeenCalled();
    });

    it('retrieves previously defined credentials from memory map', async () => {
      svc.setCredential('myTarget', 'foouser', 'foopass');
      expect(getFromLocalStorage).toHaveBeenCalledTimes(1);
      const cred = await firstValueFrom(svc.getCredential('myTarget'));
      expect(getFromLocalStorage).toHaveBeenCalledTimes(2);
      expect(cred).toBeDefined();
      expect(cred?.username).toEqual('foouser');
      expect(cred?.password).toEqual('foopass');
      expect(postCredentialsSpy).not.toHaveBeenCalled();
    });
  });

  describe('with backend selected in storage', () => {
    beforeEach(() => {
      saveToLocalStorage('CREDENTIAL_LOCATION', 'Backend');
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
});
