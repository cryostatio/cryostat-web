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

import { format2Digit } from '@i18n/datetimeUtils';
import { cleanup, screen, within } from '@testing-library/react';
import { TimePicker } from '../../app/DateTimePicker/TimePicker';
import { render, renderSnapshot, testT } from '../utils';

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
    const tree = renderSnapshot({
      routerConfigs: {
        routes: [
          {
            path: '/recordings',
            element: (
              <TimePicker
                selected={mockSelected}
                onHourSelect={onHourSelect}
                onMinuteSelect={onMinuteSelect}
                onSecondSelect={onSecondSelect}
              />
            ),
          },
        ],
      },
    });
    expect(tree.toJSON()).toMatchSnapshot();
  });

  it('should render correctly in 12hr mode', async () => {
    const { user } = render({
      routerConfigs: {
        routes: [
          {
            path: '/recordings',
            element: (
              <TimePicker
                selected={mockSelected}
                onHourSelect={onHourSelect}
                onMinuteSelect={onMinuteSelect}
                onSecondSelect={onSecondSelect}
              />
            ),
          },
        ],
      },
    });

    const switchenable24h = screen.getByLabelText(testT('TimePicker.24HOUR'));
    expect(switchenable24h).toBeInTheDocument();
    expect(switchenable24h).toBeVisible();
    expect(switchenable24h).toBeChecked();

    await user.click(switchenable24h);

    const hInput = within(screen.getByLabelText(testT('HOUR', { ns: 'common' }))).getByLabelText(
      testT('TimeSpinner.INPUT_HOUR12_VALUE'),
    );
    expect(hInput).toBeInTheDocument();
    expect(hInput).toBeVisible();
    expect(hInput.getAttribute('value')).toBe(format2Digit(mockSelectedIn12hr.hour12));

    const mInput = within(screen.getByLabelText(testT('MINUTE', { ns: 'common' }))).getByLabelText(
      testT('TimeSpinner.INPUT_MINUTE_VALUE'),
    );
    expect(mInput).toBeInTheDocument();
    expect(mInput).toBeVisible();
    expect(mInput.getAttribute('value')).toBe(format2Digit(mockSelectedIn12hr.minute));

    const sInput = within(screen.getByLabelText(testT('SECOND', { ns: 'common' }))).getByLabelText(
      testT('TimeSpinner.INPUT_SECOND_VALUE'),
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
    const { user } = render({
      routerConfigs: {
        routes: [
          {
            path: '/recordings',
            element: (
              <TimePicker
                selected={mockSelected}
                onHourSelect={onHourSelect}
                onMinuteSelect={onMinuteSelect}
                onSecondSelect={onSecondSelect}
              />
            ),
          },
        ],
      },
    });

    const upHour = within(screen.getByLabelText(testT('HOUR', { ns: 'common' }))).getByLabelText(
      testT('TimeSpinner.INCREMENT_HOUR24_VALUE'),
    );
    expect(upHour).toBeInTheDocument();
    expect(upHour).toBeVisible();

    await user.click(upHour);

    expect(onHourSelect).toHaveBeenCalledTimes(1);
    expect(onHourSelect).toHaveBeenCalledWith(14);

    const downHour = within(screen.getByLabelText(testT('HOUR', { ns: 'common' }))).getByLabelText(
      testT('TimeSpinner.DECREMENT_HOUR24_VALUE'),
    );
    expect(downHour).toBeInTheDocument();
    expect(downHour).toBeVisible();

    await user.click(downHour);

    expect(onHourSelect).toHaveBeenCalledTimes(2);
    expect(onHourSelect).toHaveBeenLastCalledWith(12);

    const upMinute = within(screen.getByLabelText(testT('MINUTE', { ns: 'common' }))).getByLabelText(
      testT('TimeSpinner.INCREMENT_MINUTE_VALUE'),
    );
    expect(upMinute).toBeInTheDocument();
    expect(upMinute).toBeVisible();

    await user.click(upMinute);

    expect(onMinuteSelect).toHaveBeenCalledTimes(1);
    expect(onMinuteSelect).toHaveBeenCalledWith(12);

    const downMinute = within(screen.getByLabelText(testT('MINUTE', { ns: 'common' }))).getByLabelText(
      testT('TimeSpinner.DECREMENT_MINUTE_VALUE'),
    );
    expect(downMinute).toBeInTheDocument();
    expect(downMinute).toBeVisible();

    await user.click(downMinute);

    expect(onMinuteSelect).toHaveBeenCalledTimes(2);
    expect(onMinuteSelect).toHaveBeenCalledWith(10);

    const upSecond = within(screen.getByLabelText(testT('SECOND', { ns: 'common' }))).getByLabelText(
      testT('TimeSpinner.INCREMENT_SECOND_VALUE'),
    );
    expect(upSecond).toBeInTheDocument();
    expect(upSecond).toBeVisible();

    await user.click(upSecond);

    expect(onSecondSelect).toHaveBeenCalledTimes(1);
    expect(onSecondSelect).toHaveBeenCalledWith(12);

    const downSecond = within(screen.getByLabelText(testT('SECOND', { ns: 'common' }))).getByLabelText(
      testT('TimeSpinner.DECREMENT_SECOND_VALUE'),
    );
    expect(downSecond).toBeInTheDocument();
    expect(downSecond).toBeVisible();

    await user.click(downSecond);

    expect(onSecondSelect).toHaveBeenCalledTimes(2);
    expect(onSecondSelect).toHaveBeenCalledWith(10);
  });

  it('should update time when time input is changed', async () => {
    const { user } = render({
      routerConfigs: {
        routes: [
          {
            path: '/recordings',
            element: (
              <TimePicker
                selected={mockSelected}
                onHourSelect={onHourSelect}
                onMinuteSelect={onMinuteSelect}
                onSecondSelect={onSecondSelect}
              />
            ),
          },
        ],
      },
    });

    const hInput = within(screen.getByLabelText(testT('HOUR', { ns: 'common' }))).getByLabelText(
      testT('TimeSpinner.INPUT_HOUR24_VALUE'),
    );
    expect(hInput).toBeInTheDocument();
    expect(hInput).toBeVisible();

    await user.type(hInput, '{Backspace}');
    expect(onHourSelect).toHaveBeenCalledTimes(1);
    expect(onHourSelect).toHaveBeenLastCalledWith(1);

    const mInput = within(screen.getByLabelText(testT('MINUTE', { ns: 'common' }))).getByLabelText(
      testT('TimeSpinner.INPUT_MINUTE_VALUE'),
    );
    expect(mInput).toBeInTheDocument();
    expect(mInput).toBeVisible();

    await user.type(mInput, '{Backspace}');
    expect(onHourSelect).toHaveBeenCalledTimes(1);
    expect(onHourSelect).toHaveBeenLastCalledWith(1);

    const sInput = within(screen.getByLabelText(testT('SECOND', { ns: 'common' }))).getByLabelText(
      testT('TimeSpinner.INPUT_SECOND_VALUE'),
    );
    expect(sInput).toBeInTheDocument();
    expect(sInput).toBeVisible();
    expect(sInput.getAttribute('value')).toBe(format2Digit(mockSelectedIn12hr.second));

    await user.type(sInput, '{Backspace}');
    expect(onHourSelect).toHaveBeenCalledTimes(1);
    expect(onHourSelect).toHaveBeenLastCalledWith(1);
  });
});
