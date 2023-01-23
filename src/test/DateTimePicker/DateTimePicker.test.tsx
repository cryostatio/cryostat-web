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

import { DateTimePicker } from '@app/DateTimePicker/DateTimePicker';
import { defaultServices } from '@app/Shared/Services/Services';
import dayjs, { defaultDatetimeFormat } from '@i18n/datetime';
import { cleanup, screen, within } from '@testing-library/react';
import * as React from 'react';
import { of } from 'rxjs';
import { renderWithServiceContext, testTranslate } from '../Common';

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

    const dateTab = screen.getByRole('tab', { name: testTranslate('DATE', 'common') });
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

    const display = screen.getByLabelText(testTranslate('DateTimePicker.ARIA_LABELS.DISPLAY_SELECTED_DATETIME'));
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

    const timeTab = screen.getByRole('tab', { name: testTranslate('TIME', 'common') });
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
    const mInput = within(screen.getByLabelText(testTranslate('MINUTE', 'common'))).getByLabelText(
      testTranslate('TimeSpinner.INPUT_MINUTE_VALUE')
    );
    expect(mInput).toBeInTheDocument();
    expect(mInput).toBeVisible();

    await user.type(mInput, '1');

    const display = screen.getByLabelText(testTranslate('DateTimePicker.ARIA_LABELS.DISPLAY_SELECTED_DATETIME'));
    expect(display).toBeInTheDocument();
    expect(display).toBeVisible();
    expect(display.getAttribute('value')).toBe(dayjs(prefilledDate).date(13).minute(1).format('L LTS'));
  });

  it('should submit when select button is clicked', async () => {
    const { user } = renderWithServiceContext(
      <DateTimePicker prefilledDate={prefilledDate} onSelect={onSelect} onDismiss={onDismiss} />
    );

    const submitButton = screen.getByText(testTranslate('SELECT', 'common'));
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

    const dismissButton = screen.getByText(testTranslate('CANCEL', 'common'));
    expect(dismissButton).toBeInTheDocument();
    expect(dismissButton).toBeVisible();

    await user.click(dismissButton);

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
