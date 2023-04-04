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
import { ThemeSetting } from '@app/Settings/SettingsUtils';
import { Theme } from '@app/Settings/Theme';
import { defaultServices } from '@app/Shared/Services/Services';
import { cleanup, screen, act, within } from '@testing-library/react';
import * as React from 'react';
import { of } from 'rxjs';
import { renderWithServiceContext, testT } from '../Common';

jest
  .spyOn(defaultServices.settings, 'theme')
  .mockReturnValueOnce(of(ThemeSetting.LIGHT))
  .mockReturnValueOnce(of(ThemeSetting.DARK));

describe('<Theme/>', () => {
  beforeEach(() => {
    jest.mocked(defaultServices.settings.setTheme).mockClear();
  });

  afterEach(cleanup);

  it('should show LIGHT as default', async () => {
    renderWithServiceContext(React.createElement(Theme.content, null));

    const lightOption = screen.getByText(testT('SETTINGS.THEME.LIGHT'));
    expect(lightOption).toBeInTheDocument();
    expect(lightOption).toBeVisible();
  });

  it('should set value to local storage when configured', async () => {
    const { user } = renderWithServiceContext(React.createElement(Theme.content, null));

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
