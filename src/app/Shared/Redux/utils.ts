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

import { getFromLocalStorage, LocalStorageKeyStrings } from '@app/utils/LocalStorage';

export const getPersistedState = <T>(key: LocalStorageKeyStrings, _version: string, defaultConfig: T): T => {
  const persisted = getFromLocalStorage<T>(key, defaultConfig);
  if (!persisted || persisted['_version'] !== _version) {
    return {
      ...defaultConfig,
      _version,
    };
  }
  return persisted;
};
