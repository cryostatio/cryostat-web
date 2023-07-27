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

import { DateTimePickerProps } from '@app/DateTimePicker/DateTimePicker';
import { DateTimeFilter } from '@app/Recordings/Filters/DatetimeFilter';
import { defaultServices } from '@app/Shared/Services/Services';
import { defaultDatetimeFormat } from '@i18n/datetime';
import { act, cleanup, screen, within } from '@testing-library/react';
import React from 'react';
import { of } from 'rxjs';
import { renderDefault, testT } from '../../Common';

jest.mock('@app/DateTimePicker/DateTimePicker', () => ({
  DateTimePicker: (_: DateTimePickerProps) => <>DateTimePicker</>,
}));

jest.spyOn(defaultServices.settings, 'datetimeFormat').mockReturnValue(of(defaultDatetimeFormat));

const onDateTimeSelect = jest.fn((_date) => undefined);

describe('<DatetimeFilter/>', () => {
  beforeEach(() => {
    jest.mocked(onDateTimeSelect).mockReset();
  });

  afterEach(cleanup);

  it('should toggle calendar when calendar icon is clicked', async () => {
    const { user } = renderDefault(<DateTimeFilter onSubmit={onDateTimeSelect} />);

    const calendarIcon = screen.getByRole('button', {
      name: testT('DatetimeFilter.ARIA_LABELS.TOGGLE_CALENDAR'),
    });
    expect(calendarIcon).toBeInTheDocument();
    expect(calendarIcon).toBeVisible();

    await act(async () => {
      await user.click(calendarIcon);
    });

    const modal = await screen.findByRole('dialog');
    expect(modal).toBeInTheDocument();
    expect(modal).toBeVisible();

    const calendarContent = within(modal).getByText('DateTimePicker');
    expect(calendarContent).toBeInTheDocument();
    expect(calendarContent).toBeVisible();

    await act(async () => {
      await user.click(calendarIcon);
    });

    expect(modal).not.toBeVisible();
  });

  it('should disable search icon when no date is entered', async () => {
    renderDefault(<DateTimeFilter onSubmit={onDateTimeSelect} />);

    const searchIcon = screen.getByRole('button', { name: testT('DatetimeFilter.ARIA_LABELS.SEARCH_BUTTON') });
    expect(searchIcon).toBeInTheDocument();
    expect(searchIcon).toBeVisible();
    expect(searchIcon).toBeDisabled();
  });

  it('should enable search icon when a valid date is entered', async () => {
    const { user } = renderDefault(<DateTimeFilter onSubmit={onDateTimeSelect} />);

    const dateInput = screen.getByLabelText(testT('DatetimeFilter.ARIA_LABELS.DATETIME_INPUT'));
    expect(dateInput).toBeInTheDocument();
    expect(dateInput).toBeVisible();

    await act(async () => {
      await user.type(dateInput, '2023-01-24T16:06:41.945Z');
    });

    const searchIcon = screen.getByRole('button', { name: testT('DatetimeFilter.ARIA_LABELS.SEARCH_BUTTON') });
    expect(searchIcon).toBeInTheDocument();
    expect(searchIcon).toBeVisible();
    expect(searchIcon).not.toBeDisabled();
  });

  it('should show error when an invalid date is entered', async () => {
    const { user } = renderDefault(<DateTimeFilter onSubmit={onDateTimeSelect} />);

    const dateInput = screen.getByLabelText(testT('DatetimeFilter.ARIA_LABELS.DATETIME_INPUT'));
    expect(dateInput).toBeInTheDocument();
    expect(dateInput).toBeVisible();

    await act(async () => {
      await user.type(dateInput, '001/13/2023 25:13:60');
    });

    const searchIcon = screen.getByRole('button', { name: testT('DatetimeFilter.ARIA_LABELS.SEARCH_BUTTON') });
    expect(searchIcon).toBeInTheDocument();
    expect(searchIcon).toBeVisible();
    expect(searchIcon).toBeDisabled();

    const errorMessage = await screen.findByText(testT('DatetimeFilter.INVALID_DATE_TEXT'));
    expect(errorMessage).toBeInTheDocument();
    expect(errorMessage).toBeVisible();
  });

  it('should update date time when date is entered and search icon is clicked', async () => {
    const { user } = renderDefault(<DateTimeFilter onSubmit={onDateTimeSelect} />);

    const dateInput = screen.getByLabelText(testT('DatetimeFilter.ARIA_LABELS.DATETIME_INPUT'));
    expect(dateInput).toBeInTheDocument();
    expect(dateInput).toBeVisible();

    await act(async () => {
      await user.type(dateInput, '2023-01-24T16:06:41.945Z');
    });

    const searchIcon = screen.getByRole('button', { name: testT('DatetimeFilter.ARIA_LABELS.SEARCH_BUTTON') });
    expect(searchIcon).toBeInTheDocument();
    expect(searchIcon).toBeVisible();
    expect(searchIcon).not.toBeDisabled();

    await act(async () => {
      await user.click(searchIcon);
    });

    expect(onDateTimeSelect).toHaveBeenCalledTimes(1);
    expect(onDateTimeSelect).toHaveBeenCalledWith('2023-01-24T16:06:41.945Z');
  });
});
