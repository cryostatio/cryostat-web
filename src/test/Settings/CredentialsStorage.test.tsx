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
import { CredentialsStorage, Locations } from '@app/Settings/CredentialsStorage';
import { getFromLocalStorage, saveToLocalStorage } from '@app/utils/LocalStorage';
import { cleanup, screen, waitFor, within } from '@testing-library/react';
import * as React from 'react';
import { renderDefault, testT } from '../Common';

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

const storageKey = 'CREDENTIAL_LOCATION';

describe('<CredentialsStorage/>', () => {
  afterEach(cleanup);

  it('defaults to Backend storage', async () => {
    renderDefault(React.createElement(CredentialsStorage.content, null));

    expect(getFromLocalStorage).toHaveBeenCalledTimes(1);
    expect(saveToLocalStorage).toHaveBeenCalledTimes(1);
    expect(saveToLocalStorage).lastCalledWith(storageKey, Locations.BACKEND.key);

    expect(screen.getByText(testT(Locations.BACKEND.titleKey))).toBeVisible();
    expect(screen.queryByText(testT(Locations.BROWSER_SESSION.titleKey))).toBeFalsy();
  });

  it.skip('sets value to local storage when dropdown is clicked', async () => {
    const { user } = renderDefault(React.createElement(CredentialsStorage.content, null));

    expect(getFromLocalStorage).toHaveBeenCalledTimes(1);
    expect(saveToLocalStorage).toHaveBeenCalledTimes(1);
    expect(saveToLocalStorage).lastCalledWith(storageKey, Locations.BACKEND.key);

    await user.click(screen.getByRole('button'));

    // the default is Backend storage. Click the dropdown and select Session (Browser Memory) to change selection
    const ul = await screen.findByRole('listbox');
    const browserSession = within(ul).getByText(testT(Locations.BROWSER_SESSION.titleKey));
    await user.click(browserSession);

    await waitFor(() => expect(ul).not.toBeVisible()); // expect selection menu to close after user clicks an option

    // expect the selection to be visible, the other not
    expect(screen.getByText(testT(Locations.BROWSER_SESSION.titleKey))).toBeVisible();
    expect(screen.queryByText(testT(Locations.BACKEND.titleKey))).toBeFalsy();

    expect(getFromLocalStorage).toHaveBeenCalledTimes(1);
    expect(saveToLocalStorage).toHaveBeenCalledTimes(2);
    expect(saveToLocalStorage).lastCalledWith(storageKey, Locations.BROWSER_SESSION.key);
  });
});
