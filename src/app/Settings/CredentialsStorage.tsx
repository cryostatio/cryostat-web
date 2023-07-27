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

import { getFromLocalStorage, saveToLocalStorage } from '@app/utils/LocalStorage';
import { Select, SelectOption, SelectVariant } from '@patternfly/react-core';
import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { SettingTab, UserSetting } from './SettingsUtils';

export interface Location {
  key: string;
  titleKey: string;
  descriptionKey: string;
}

export class Locations {
  static readonly BROWSER_SESSION: Location = {
    key: 'Session (Browser Memory)',
    titleKey: 'SETTINGS.CREDENTIALS_STORAGE.BROWSER_SESSION.TITLE',
    descriptionKey: 'SETTINGS.CREDENTIALS_STORAGE.BROWSER_SESSION.DESCRIPTION',
  };
  static readonly BACKEND: Location = {
    key: 'Backend',
    titleKey: 'SETTINGS.CREDENTIALS_STORAGE.BACKEND.TITLE',
    descriptionKey: 'SETTINGS.CREDENTIALS_STORAGE.BACKEND.DESCRIPTION',
  };
}

const locations = [Locations.BROWSER_SESSION, Locations.BACKEND];

const getLocation = (key: string): Location => {
  for (const l of locations) {
    if (l.key === key) {
      return l;
    }
  }
  return Locations.BACKEND;
};

const Component = () => {
  const [t] = useTranslation();
  const [isExpanded, setExpanded] = React.useState(false);
  const [selection, setSelection] = React.useState(Locations.BACKEND.key);

  const handleSelect = React.useCallback(
    (_, selection) => {
      const location = getLocation(selection.value);
      setSelection(location.key);
      setExpanded(false);
      saveToLocalStorage('CREDENTIAL_LOCATION', selection.value);
    },
    [setSelection, setExpanded]
  );

  React.useEffect(() => {
    handleSelect(undefined, { value: getFromLocalStorage('CREDENTIAL_LOCATION', Locations.BACKEND.key) });
  }, [handleSelect]);

  return (
    <>
      <Select
        variant={SelectVariant.single}
        isFlipEnabled={true}
        menuAppendTo="parent"
        onToggle={setExpanded}
        onSelect={handleSelect}
        isOpen={isExpanded}
        selections={{
          ...{ value: selection },
          toString: () => t(getLocation(selection).titleKey),
          compareTo: (val) => val.value === selection,
        }}
      >
        {locations.map(({ key, titleKey, descriptionKey }) => (
          <SelectOption
            key={titleKey}
            value={{
              ...{ value: key },
              toString: () => t(titleKey),
              compareTo: (val) => val.value === key,
            }}
            description={t(descriptionKey)}
          />
        ))}
      </Select>
    </>
  );
};

export const CredentialsStorage: UserSetting = {
  titleKey: 'SETTINGS.CREDENTIALS_STORAGE.TITLE',
  descConstruct: {
    key: 'SETTINGS.CREDENTIALS_STORAGE.DESCRIPTION',
    parts: [<Link key={0} to="/security" />],
  },
  content: Component,
  category: SettingTab.ADVANCED,
};
