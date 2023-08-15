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

import { DateTimePicker } from '@app/DateTimePicker/DateTimePicker';
import { defaultServices } from '@app/Shared/Services/Services';
import dayjs, { defaultDatetimeFormat } from '@i18n/datetime';
import { cleanup, screen, within } from '@testing-library/react';
import * as React from 'react';
import { of } from 'rxjs';
import { renderWithServiceContext, testT } from '../Common';

const onSelect = jest.fn((_: Date) => undefined);
const onDismiss = jest.fn();

const prefilledDate = new Date('14 Sep 2022 00:00:00');

jest.spyOn(defaultServices.settings, 'datetimeFormat').mockReturnValue(of(defaultDatetimeFormat));

describe('<DateTimePicker/>', () => {
  beforeEach(() => {
    jest.mocked(onSelect).mockReset();
    jest.mocked(onDismiss).mockReset();
  });

  afterEach(cleanup);

  it('should show date tab as default', async () => {
    renderWithServiceContext(
      <DateTimePicker prefilledDate={prefilledDate} onSelect={onSelect} onDismiss={onDismiss} />
    );

    const dateTab = screen.getByRole('tab', { name: testT('DATE', { ns: 'common' }) });
    expect(dateTab).toBeInTheDocument();
    expect(dateTab).toBeVisible();
    expect(dateTab.getAttribute('aria-selected')).toBe('true');
  });

  it('should render currently selected date in calendar', async () => {
    renderWithServiceContext(
      <DateTimePicker prefilledDate={prefilledDate} onSelect={onSelect} onDismiss={onDismiss} />
    );

    const selectedDate = screen.getByLabelText('14 September 2022');
    expect(selectedDate).toBeInTheDocument();
    expect(selectedDate).toBeVisible();
  });

  it('should render currently selected datetime', async () => {
    renderWithServiceContext(
      <DateTimePicker prefilledDate={prefilledDate} onSelect={onSelect} onDismiss={onDismiss} />
    );

    const display = screen.getByLabelText(testT('DateTimePicker.ARIA_LABELS.DISPLAY_SELECTED_DATETIME'));
    expect(display).toBeInTheDocument();
    expect(display).toBeVisible();
    expect(display.getAttribute('value')).toBe(dayjs(prefilledDate).format('L LTS'));

    const timezoneDisplay = screen.getByText(defaultDatetimeFormat.timeZone.short);
    expect(timezoneDisplay).toBeInTheDocument();
    expect(timezoneDisplay).toBeVisible();
  });

  it('should switch to time tab when a date is selected', async () => {
    const { user } = renderWithServiceContext(
      <DateTimePicker prefilledDate={prefilledDate} onSelect={onSelect} onDismiss={onDismiss} />
    );

    const selectedDate = screen.getByLabelText('14 September 2022');
    expect(selectedDate).toBeInTheDocument();
    expect(selectedDate).toBeVisible();

    await user.click(selectedDate);

    const timeTab = screen.getByRole('tab', { name: testT('TIME', { ns: 'common' }) });
    expect(timeTab).toBeInTheDocument();
    expect(timeTab).toBeVisible();
    expect(timeTab.getAttribute('aria-selected')).toBe('true');
  });

  it('should update selected datetime when date or time is seleted', async () => {
    const { user } = renderWithServiceContext(
      <DateTimePicker prefilledDate={prefilledDate} onSelect={onSelect} onDismiss={onDismiss} />
    );
    const selectedDate = screen.getByLabelText('13 September 2022');
    expect(selectedDate).toBeInTheDocument();
    expect(selectedDate).toBeVisible();

    await user.click(selectedDate);

    // Switched to time now
    const mInput = within(screen.getByLabelText(testT('MINUTE', { ns: 'common' }))).getByLabelText(
      testT('TimeSpinner.INPUT_MINUTE_VALUE')
    );
    expect(mInput).toBeInTheDocument();
    expect(mInput).toBeVisible();

    await user.type(mInput, '1');

    const display = screen.getByLabelText(testT('DateTimePicker.ARIA_LABELS.DISPLAY_SELECTED_DATETIME'));
    expect(display).toBeInTheDocument();
    expect(display).toBeVisible();
    expect(display.getAttribute('value')).toBe(dayjs(prefilledDate).date(13).minute(1).format('L LTS'));
  });

  it('should submit when select button is clicked', async () => {
    const { user } = renderWithServiceContext(
      <DateTimePicker prefilledDate={prefilledDate} onSelect={onSelect} onDismiss={onDismiss} />
    );

    const submitButton = screen.getByText(testT('SELECT', { ns: 'common' }));
    expect(submitButton).toBeInTheDocument();
    expect(submitButton).toBeVisible();

    await user.click(submitButton);

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith(prefilledDate, defaultDatetimeFormat.timeZone);
  });

  it('shoud dismiss the modal when cancel button is clicked', async () => {
    const { user } = renderWithServiceContext(
      <DateTimePicker prefilledDate={prefilledDate} onSelect={onSelect} onDismiss={onDismiss} />
    );

    const dismissButton = screen.getByText(testT('CANCEL', { ns: 'common' }));
    expect(dismissButton).toBeInTheDocument();
    expect(dismissButton).toBeVisible();

    await user.click(dismissButton);

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
