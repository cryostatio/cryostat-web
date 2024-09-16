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
import { of } from 'rxjs';
import { render, testT } from '../../utils';

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
    const { user } = render({
      routerConfigs: {
        routes: [
          {
            path: '/recordings',
            element: <DateTimeFilter onSubmit={onDateTimeSelect} />,
          },
        ],
      },
    });

    const calendarIcons = screen.getAllByRole('button', {
      name: testT('DatetimeFilter.ARIA_LABELS.TOGGLE_CALENDAR'),
    });

    expect(calendarIcons).toHaveLength(2);
    calendarIcons.forEach((icon) => {
      expect(icon).toBeInTheDocument();
      expect(icon).toBeVisible();
    });

    await act(async () => {
      await user.click(calendarIcons[0]);
    });

    const modal = await screen.findByRole('dialog');
    expect(modal).toBeInTheDocument();
    expect(modal).toBeVisible();

    const calendarContent = within(modal).getByText('DateTimePicker');
    expect(calendarContent).toBeInTheDocument();
    expect(calendarContent).toBeVisible();

    await act(async () => {
      await user.click(calendarIcons[0]);
    });

    expect(modal).not.toBeVisible();
  });

  it('should disable search icon when no date is entered', async () => {
    render({
      routerConfigs: {
        routes: [
          {
            path: '/recordings',
            element: <DateTimeFilter onSubmit={onDateTimeSelect} />,
          },
        ],
      },
    });

    const searchIcon = screen.getByRole('button', { name: testT('DatetimeFilter.ARIA_LABELS.SEARCH_BUTTON') });
    expect(searchIcon).toBeInTheDocument();
    expect(searchIcon).toBeVisible();
    expect(searchIcon).toBeDisabled();
  });

  it('should enable search icon when a valid date is entered', async () => {
    const { user } = render({
      routerConfigs: {
        routes: [
          {
            path: '/recordings',
            element: <DateTimeFilter onSubmit={onDateTimeSelect} />,
          },
        ],
      },
    });

    const dateInput = screen.getAllByLabelText(testT('DatetimeFilter.ARIA_LABELS.DATETIME_INPUT'))[0];
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
    const { user } = render({
      routerConfigs: {
        routes: [
          {
            path: '/recordings',
            element: <DateTimeFilter onSubmit={onDateTimeSelect} />,
          },
        ],
      },
    });

    const dateInputs = screen.getAllByLabelText(testT('DatetimeFilter.ARIA_LABELS.DATETIME_INPUT'));

    expect(dateInputs).toHaveLength(2);
    dateInputs.forEach((input) => {
      expect(input).toBeInTheDocument();
      expect(input).toBeVisible();
    });

    const fromInput = dateInputs[0];
    await act(async () => {
      await user.type(fromInput, '001/13/2023 25:13:60');
    });

    const searchIcon = screen.getByRole('button', { name: testT('DatetimeFilter.ARIA_LABELS.SEARCH_BUTTON') });
    expect(searchIcon).toBeInTheDocument();
    expect(searchIcon).toBeVisible();
    expect(searchIcon).toBeDisabled();

    const errorMessage = await screen.findByText(testT('DatetimeFilter.INVALID_DATE_TEXT'));
    expect(errorMessage).toBeInTheDocument();
    expect(errorMessage).toBeVisible();
  });

  it('should show error when upper limit is smaller than lower one', async () => {
    const { user } = render({
      routerConfigs: {
        routes: [
          {
            path: '/recordings',
            element: <DateTimeFilter onSubmit={onDateTimeSelect} />,
          },
        ],
      },
    });

    const dateInputs = screen.getAllByLabelText(testT('DatetimeFilter.ARIA_LABELS.DATETIME_INPUT'));
    expect(dateInputs).toHaveLength(2);
    dateInputs.forEach((input) => {
      expect(input).toBeInTheDocument();
      expect(input).toBeVisible();
    });

    const [fromInput, toInput] = dateInputs;

    await act(async () => {
      await user.type(fromInput, '2023-01-24T16:06:41.945Z');
      await user.type(toInput, '2023-01-23T16:06:41.945Z');
    });

    const searchIcon = screen.getByRole('button', { name: testT('DatetimeFilter.ARIA_LABELS.SEARCH_BUTTON') });
    expect(searchIcon).toBeInTheDocument();
    expect(searchIcon).toBeVisible();
    expect(searchIcon).toBeDisabled();

    const errorMessage = await screen.findByText(testT('DatetimeFilter.HELPER_TEXT.INVALID_UPPER_BOUND'));
    expect(errorMessage).toBeInTheDocument();
    expect(errorMessage).toBeVisible();
  });

  it('should update date time when date is entered and search icon is clicked', async () => {
    const { user } = render({
      routerConfigs: {
        routes: [
          {
            path: '/recordings',
            element: <DateTimeFilter onSubmit={onDateTimeSelect} />,
          },
        ],
      },
    });

    const dateInputs = screen.getAllByLabelText(testT('DatetimeFilter.ARIA_LABELS.DATETIME_INPUT'));
    expect(dateInputs).toHaveLength(2);
    dateInputs.forEach((input) => {
      expect(input).toBeInTheDocument();
      expect(input).toBeVisible();
    });

    const [fromInput, toInput] = dateInputs;

    await act(async () => {
      await user.type(fromInput, '2023-01-24T16:06:41.945Z');
      await user.type(toInput, '2023-01-25T16:06:41.945Z');
    });

    const searchIcon = screen.getByRole('button', { name: testT('DatetimeFilter.ARIA_LABELS.SEARCH_BUTTON') });
    expect(searchIcon).toBeInTheDocument();
    expect(searchIcon).toBeVisible();
    expect(searchIcon).not.toBeDisabled();

    await act(async () => {
      await user.click(searchIcon);
    });

    expect(onDateTimeSelect).toHaveBeenCalledTimes(1);
    expect(onDateTimeSelect).toHaveBeenCalledWith({
      from: new Date('2023-01-24T16:06:41.945Z'),
      to: new Date('2023-01-25T16:06:41.945Z'),
    });
  });
});
