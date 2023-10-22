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

import { Theme } from '@app/Settings/Config/Theme';
import { ThemeSetting } from '@app/Settings/types';
import { defaultServices } from '@app/Shared/Services/Services';
import { cleanup, screen, act, within } from '@testing-library/react';
import * as React from 'react';
import { of } from 'rxjs';
import { mockMediaQueryList, render, testT } from '../utils';

jest
  .spyOn(defaultServices.settings, 'themeSetting')
  .mockReturnValueOnce(of(ThemeSetting.LIGHT))
  .mockReturnValueOnce(of(ThemeSetting.DARK));

jest.spyOn(defaultServices.settings, 'media').mockReturnValue(of(mockMediaQueryList));

describe('<Theme/>', () => {
  beforeEach(() => {
    jest.mocked(defaultServices.settings.setThemeSetting).mockClear();
  });

  afterEach(cleanup);

  it('should show LIGHT as default', async () => {
    render({
      routerConfigs: {
        routes: [
          {
            path: '/settings',
            element: React.createElement(Theme.content, null),
          },
        ],
      },
    });

    const lightOption = screen.getByText(testT('SETTINGS.THEME.LIGHT'));
    expect(lightOption).toBeInTheDocument();
    expect(lightOption).toBeVisible();
  });

  it('should set value to local storage when configured', async () => {
    const { user } = render({
      routerConfigs: {
        routes: [
          {
            path: '/settings',
            element: React.createElement(Theme.content, null),
          },
        ],
      },
    });

    const themeSelect = screen.getByLabelText('Options menu');
    expect(themeSelect).toBeInTheDocument();
    expect(themeSelect).toBeVisible();

    await act(async () => {
      await user.click(themeSelect);
    });

    const ul = screen.getByRole('listbox');
    expect(ul).toBeInTheDocument();
    expect(ul).toBeVisible();

    const option = within(ul).getByText(testT('SETTINGS.THEME.DARK'));
    expect(option).toBeInTheDocument();
    expect(option).toBeVisible();

    await act(async () => {
      await user.click(option);
    });

    expect(ul).not.toBeInTheDocument(); // Should close menu

    const darkOption = screen.getByText(testT('SETTINGS.THEME.DARK'));
    expect(darkOption).toBeInTheDocument();
    expect(darkOption).toBeVisible();

    const lightOption = screen.queryByText(testT('SETTINGS.THEME.LIGHT'));
    expect(lightOption).not.toBeInTheDocument();
  });
});
