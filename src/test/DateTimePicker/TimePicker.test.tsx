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

import { format2Digit } from '@i18n/datetimeUtils';
import { cleanup, screen, within } from '@testing-library/react';
import * as React from 'react';
import renderer, { act } from 'react-test-renderer';
import { TimePicker } from '../../app/DateTimePicker/TimePicker';
import { renderDefault, testTranslate } from '../Common';

const onHourSelect = jest.fn((_) => undefined);
const onMinuteSelect = jest.fn((_) => undefined);
const onSecondSelect = jest.fn((_) => undefined);

const mockSelected = {
  hour24: 13,
  minute: 11,
  second: 11,
};

const mockSelectedIn12hr = {
  hour12: 1,
  minute: 11,
  second: 11,
  meridiem: 'PM',
};

describe('<TimePicker/>', () => {
  beforeEach(() => {
    jest.mocked(onHourSelect).mockReset();
    jest.mocked(onMinuteSelect).mockReset();
    jest.mocked(onSecondSelect).mockReset();
  });

  afterEach(cleanup);

  it('renders correctly', async () => {
    let tree;
    await act(async () => {
      tree = renderer.create(
        <TimePicker
          selected={mockSelected}
          onHourSelect={onHourSelect}
          onMinuteSelect={onMinuteSelect}
          onSecondSelect={onSecondSelect}
        />
      );
    });
    expect(tree.toJSON()).toMatchSnapshot();
  });

  it('should render correctly in 12hr mode', async () => {
    const { user } = renderDefault(
      <TimePicker
        selected={mockSelected}
        onHourSelect={onHourSelect}
        onMinuteSelect={onMinuteSelect}
        onSecondSelect={onSecondSelect}
      />
    );

    const switchenable24h = screen.getByLabelText(testTranslate('TimePicker.24HOUR'));
    expect(switchenable24h).toBeInTheDocument();
    expect(switchenable24h).toBeVisible();
    expect(switchenable24h).toBeChecked();

    await user.click(switchenable24h);

    const hInput = within(screen.getByLabelText(testTranslate('HOUR', 'common'))).getByLabelText(
      testTranslate('TimeSpinner.INPUT_HOUR12_VALUE')
    );
    expect(hInput).toBeInTheDocument();
    expect(hInput).toBeVisible();
    expect(hInput.getAttribute('value')).toBe(format2Digit(mockSelectedIn12hr.hour12));

    const mInput = within(screen.getByLabelText(testTranslate('MINUTE', 'common'))).getByLabelText(
      testTranslate('TimeSpinner.INPUT_MINUTE_VALUE')
    );
    expect(mInput).toBeInTheDocument();
    expect(mInput).toBeVisible();
    expect(mInput.getAttribute('value')).toBe(format2Digit(mockSelectedIn12hr.minute));

    const sInput = within(screen.getByLabelText(testTranslate('SECOND', 'common'))).getByLabelText(
      testTranslate('TimeSpinner.INPUT_SECOND_VALUE')
    );
    expect(sInput).toBeInTheDocument();
    expect(sInput).toBeVisible();
    expect(sInput.getAttribute('value')).toBe(format2Digit(mockSelectedIn12hr.second));

    const meridiem = screen.getByText(mockSelectedIn12hr.meridiem);
    expect(meridiem).toBeInTheDocument();
    expect(meridiem).toBeVisible();
    expect(meridiem.classList).toContain('selected');
  });

  it('should update time when increment/decrement buttons are clicked', async () => {
    const { user } = renderDefault(
      <TimePicker
        selected={mockSelected}
        onHourSelect={onHourSelect}
        onMinuteSelect={onMinuteSelect}
        onSecondSelect={onSecondSelect}
      />
    );

    const upHour = within(screen.getByLabelText(testTranslate('HOUR', 'common'))).getByLabelText(
      testTranslate('TimeSpinner.INCREMENT_HOUR24_VALUE')
    );
    expect(upHour).toBeInTheDocument();
    expect(upHour).toBeVisible();

    await user.click(upHour);

    expect(onHourSelect).toHaveBeenCalledTimes(1);
    expect(onHourSelect).toHaveBeenCalledWith(14);

    const downHour = within(screen.getByLabelText(testTranslate('HOUR', 'common'))).getByLabelText(
      testTranslate('TimeSpinner.DECREMENT_HOUR24_VALUE')
    );
    expect(downHour).toBeInTheDocument();
    expect(downHour).toBeVisible();

    await user.click(downHour);

    expect(onHourSelect).toHaveBeenCalledTimes(2);
    expect(onHourSelect).toHaveBeenLastCalledWith(12);

    const upMinute = within(screen.getByLabelText(testTranslate('MINUTE', 'common'))).getByLabelText(
      testTranslate('TimeSpinner.INCREMENT_MINUTE_VALUE')
    );
    expect(upMinute).toBeInTheDocument();
    expect(upMinute).toBeVisible();

    await user.click(upMinute);

    expect(onMinuteSelect).toHaveBeenCalledTimes(1);
    expect(onMinuteSelect).toHaveBeenCalledWith(12);

    const downMinute = within(screen.getByLabelText(testTranslate('MINUTE', 'common'))).getByLabelText(
      testTranslate('TimeSpinner.DECREMENT_MINUTE_VALUE')
    );
    expect(downMinute).toBeInTheDocument();
    expect(downMinute).toBeVisible();

    await user.click(downMinute);

    expect(onMinuteSelect).toHaveBeenCalledTimes(2);
    expect(onMinuteSelect).toHaveBeenCalledWith(10);

    const upSecond = within(screen.getByLabelText(testTranslate('SECOND', 'common'))).getByLabelText(
      testTranslate('TimeSpinner.INCREMENT_SECOND_VALUE')
    );
    expect(upSecond).toBeInTheDocument();
    expect(upSecond).toBeVisible();

    await user.click(upSecond);

    expect(onSecondSelect).toHaveBeenCalledTimes(1);
    expect(onSecondSelect).toHaveBeenCalledWith(12);

    const downSecond = within(screen.getByLabelText(testTranslate('SECOND', 'common'))).getByLabelText(
      testTranslate('TimeSpinner.DECREMENT_SECOND_VALUE')
    );
    expect(downSecond).toBeInTheDocument();
    expect(downSecond).toBeVisible();

    await user.click(downSecond);

    expect(onSecondSelect).toHaveBeenCalledTimes(2);
    expect(onSecondSelect).toHaveBeenCalledWith(10);
  });

  it('should update time when time input is changed', async () => {
    const { user } = renderDefault(
      <TimePicker
        selected={mockSelected}
        onHourSelect={onHourSelect}
        onMinuteSelect={onMinuteSelect}
        onSecondSelect={onSecondSelect}
      />
    );

    const hInput = within(screen.getByLabelText(testTranslate('HOUR', 'common'))).getByLabelText(
      testTranslate('TimeSpinner.INPUT_HOUR24_VALUE')
    );
    expect(hInput).toBeInTheDocument();
    expect(hInput).toBeVisible();

    await user.type(hInput, '{Backspace}');
    expect(onHourSelect).toHaveBeenCalledTimes(1);
    expect(onHourSelect).toHaveBeenLastCalledWith(1);

    const mInput = within(screen.getByLabelText(testTranslate('MINUTE', 'common'))).getByLabelText(
      testTranslate('TimeSpinner.INPUT_MINUTE_VALUE')
    );
    expect(mInput).toBeInTheDocument();
    expect(mInput).toBeVisible();

    await user.type(mInput, '{Backspace}');
    expect(onHourSelect).toHaveBeenCalledTimes(1);
    expect(onHourSelect).toHaveBeenLastCalledWith(1);

    const sInput = within(screen.getByLabelText(testTranslate('SECOND', 'common'))).getByLabelText(
      testTranslate('TimeSpinner.INPUT_SECOND_VALUE')
    );
    expect(sInput).toBeInTheDocument();
    expect(sInput).toBeVisible();
    expect(sInput.getAttribute('value')).toBe(format2Digit(mockSelectedIn12hr.second));

    await user.type(sInput, '{Backspace}');
    expect(onHourSelect).toHaveBeenCalledTimes(1);
    expect(onHourSelect).toHaveBeenLastCalledWith(1);
  });
});
