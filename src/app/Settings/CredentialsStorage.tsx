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

import { getFromLocalStorage, saveToLocalStorage } from '@app/utils/LocalStorage';
import { Select, SelectOption, SelectVariant } from '@patternfly/react-core';
import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { UserSetting } from './Settings';

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
  category: 'SETTINGS.CATEGORIES.ADVANCED',
};
