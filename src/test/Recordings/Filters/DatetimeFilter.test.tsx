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
