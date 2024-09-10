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

import { DatetimeControl } from '@app/Settings/Config/DatetimeControl';
import { defaultServices } from '@app/Shared/Services/Services';
import { defaultDatetimeFormat, locales } from '@i18n/datetime';
import { act, cleanup, screen, waitFor, within } from '@testing-library/react';
import * as React from 'react';
import { of } from 'rxjs';
import { render, testT } from '../utils';

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
    render({
      routerConfigs: {
        routes: [
          {
            path: '/settings',
            element: React.createElement(DatetimeControl.content, null),
          },
        ],
      },
    });

    const selectedLocale = screen.getByText(defaultDatetimeFormat.dateLocale.name);
    expect(selectedLocale).toBeInTheDocument();
    expect(selectedLocale).toBeVisible();

    const selectedTimezone = screen.getByText('TimezonePicker');
    expect(selectedTimezone).toBeInTheDocument();
    expect(selectedTimezone).toBeVisible();
  });

  it('should show correct list of locales', async () => {
    const { user } = render({
      routerConfigs: {
        routes: [
          {
            path: '/settings',
            element: React.createElement(DatetimeControl.content, null),
          },
        ],
      },
    });

    const optionMenu = screen.getByLabelText(testT('SETTINGS.DATETIME_CONTROL.ARIA_LABELS.MENU_TOGGLE'));
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
    const { user } = render({
      routerConfigs: {
        routes: [
          {
            path: '/settings',
            element: React.createElement(DatetimeControl.content, null),
          },
        ],
      },
    });

    const optionMenu = screen.getByLabelText(testT('SETTINGS.DATETIME_CONTROL.ARIA_LABELS.MENU_TOGGLE'));
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

    await waitFor(() => expect(ul).not.toBeInTheDocument()); // Should close menu

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
