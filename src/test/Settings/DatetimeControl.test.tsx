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

import { DatetimeControl } from '@app/Settings/DatetimeControl';
import { defaultServices } from '@app/Shared/Services/Services';
import { defaultDatetimeFormat, locales } from '@i18n/datetime';
import { act, cleanup, screen, within } from '@testing-library/react';
import * as React from 'react';
import { of } from 'rxjs';
import { renderWithServiceContext, testT } from '../Common';

jest.mock('@app/DateTimePicker/TimezonePicker', () => ({
  TimezonePicker: (_) => <>TimezonePicker</>,
}));

jest.spyOn(defaultServices.settings, 'datetimeFormat').mockReturnValue(of(defaultDatetimeFormat));

describe('<DatetimeControl/>', () => {
  beforeEach(() => {
    jest.mocked(defaultServices.settings.setDatetimeFormat).mockReset();
    locales.forEach((l) => jest.mocked(l.load).mockReset());
  });

  afterEach(cleanup);

  it('should show selections correctly', async () => {
    renderWithServiceContext(React.createElement(DatetimeControl.content, null));

    const selectedLocale = screen.getByText(defaultDatetimeFormat.dateLocale.name);
    expect(selectedLocale).toBeInTheDocument();
    expect(selectedLocale).toBeVisible();

    const selectedTimezone = screen.getByText('TimezonePicker');
    expect(selectedTimezone).toBeInTheDocument();
    expect(selectedTimezone).toBeVisible();
  });

  it('should show correct list of locales', async () => {
    const { user } = renderWithServiceContext(React.createElement(DatetimeControl.content, null));

    const optionMenu = screen.getByLabelText('Options menu');
    expect(optionMenu).toBeInTheDocument();
    expect(optionMenu).toBeVisible();

    await act(async () => {
      await user.click(optionMenu);
    });

    const ul = screen.getByLabelText(testT('SETTINGS.DATETIME_CONTROL.ARIA_LABELS.LOCALE_SELECT'));
    expect(ul).toBeInTheDocument();
    expect(ul).toBeVisible();

    locales.forEach((l) => {
      const option = within(ul).getByText(l.name);
      expect(option).toBeInTheDocument();
      expect(option).toBeVisible();
    });
  });

  it('should update datetime format and load locale when locale is selected', async () => {
    const { user } = renderWithServiceContext(React.createElement(DatetimeControl.content, null));

    const optionMenu = screen.getByLabelText('Options menu');
    expect(optionMenu).toBeInTheDocument();
    expect(optionMenu).toBeVisible();

    await act(async () => {
      await user.click(optionMenu);
    });

    const ul = screen.getByLabelText(testT('SETTINGS.DATETIME_CONTROL.ARIA_LABELS.LOCALE_SELECT'));
    expect(ul).toBeInTheDocument();
    expect(ul).toBeVisible();

    const option = within(ul).getByText(locales[1].name); // French
    expect(option).toBeInTheDocument();
    expect(option).toBeVisible();

    await act(async () => {
      await user.click(option);
    });

    expect(defaultServices.settings.setDatetimeFormat).toHaveBeenCalledTimes(1);
    expect(defaultServices.settings.setDatetimeFormat).toHaveBeenCalledWith({
      ...defaultDatetimeFormat,
      dateLocale: {
        key: locales[1].key,
        name: locales[1].name,
      },
    });
  });
});
