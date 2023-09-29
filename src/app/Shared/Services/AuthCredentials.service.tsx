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
import { Locations } from '@app/Settings/Config/CredentialsStorage';
import { getFromLocalStorage } from '@app/utils/LocalStorage';
import { Observable, of } from 'rxjs';
import type { ApiService } from './Api.service';
import { Credential } from './service.types';

export class AuthCredentials {
  // TODO replace with Redux?
  private readonly store = new Map<string, Credential>();

  constructor(private readonly api: () => ApiService) {}

  setCredential(targetId: string, username: string, password: string): Observable<boolean> {
    const location = getFromLocalStorage('CREDENTIAL_LOCATION', Locations.BACKEND.key);
    switch (location) {
      case Locations.BACKEND.key:
        return this.api().postCredentials(`target.connectUrl == "${targetId}"`, username, password);
      case Locations.BROWSER_SESSION.key:
        this.store.set(targetId, { username, password });
        return of(true);
      default:
        console.warn('Unknown storage location', location);
        return of(false);
    }
  }

  getCredential(targetId: string): Observable<Credential | undefined> {
    const location = getFromLocalStorage('CREDENTIAL_LOCATION', Locations.BACKEND.key);
    switch (location) {
      case Locations.BACKEND.key:
        // if this is stored on the backend then Cryostat should be using those and not prompting us to request from the user
        return of(undefined);
      case Locations.BROWSER_SESSION.key:
        return of(this.store.get(targetId));
      default:
        console.warn('Unknown storage location', location);
        return of(undefined);
    }
  }
}
