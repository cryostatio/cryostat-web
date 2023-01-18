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
 * * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */
import { TimePicker } from '@app/DateTimePicker/TimePicker';
import { ServiceContext } from '@app/Shared/Services/Services';
import { DatetimeFormat, defaultDatetimeFormat, Timezone } from '@app/Shared/Services/Settings.service';
import { useSubscriptions } from '@app/utils/useSubscriptions';
import {
  ActionGroup,
  Bullseye,
  Button,
  CalendarMonth,
  CalendarMonthInlineProps,
  Flex,
  FlexItem,
  Form,
  FormGroup,
  Tab,
  Tabs,
  TabTitleText,
  TextInput,
} from '@patternfly/react-core';
import dayjs from 'dayjs';
import advanced from 'dayjs/plugin/advancedFormat';
import localizedFormat from 'dayjs/plugin/localizedFormat';
import timezone from 'dayjs/plugin/timezone'; // dependent on utc plugin
import utc from 'dayjs/plugin/utc';
import React from 'react';
import { TimezonePicker } from './TimezonePicker';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(advanced);
dayjs.extend(localizedFormat);

export interface DateTimePickerProps {
  onSelect?: (date: Date, timezone: Timezone) => void;
  prefilledDate?: Date;
  onDismiss: () => void;
}

export const DateTimePicker: React.FC<DateTimePickerProps> = ({ onSelect, onDismiss, prefilledDate }) => {
  const context = React.useContext(ServiceContext);
  const addSubscription = useSubscriptions();
  const [format, setFormat] = React.useState<DatetimeFormat>(defaultDatetimeFormat);

  const [activeTab, setActiveTab] = React.useState('date');

  const [datetime, setDatetime] = React.useState<Date>(new Date());
  const [timezone, setTimezone] = React.useState<Timezone>(defaultDatetimeFormat.timeZone);

  const inlineProps: CalendarMonthInlineProps = React.useMemo(
    () => ({
      component: 'article',
      ariaLabelledby: 'start-date',
    }),
    []
  );

  const handleTabSelect = React.useCallback((_, key: string | number) => setActiveTab(`${key}`), [setActiveTab]);

  const handleSubmit = React.useCallback(() => {
    onSelect && onSelect(datetime, timezone);
  }, [datetime, timezone]);

  const handleCaledarSelect = React.useCallback(
    (date: Date) => {
      setDatetime((old) => {
        const wrappedOld = dayjs(old);
        return dayjs(date).hour(wrappedOld.hour()).minute(wrappedOld.minute()).second(wrappedOld.second()).toDate();
      });
      setActiveTab('time'); // Switch to time
    },
    [setDatetime, setActiveTab]
  );

  const handleHourChange = React.useCallback(
    (h: number) => {
      setDatetime((old) => dayjs(old).hour(h).toDate());
    },
    [setDatetime]
  );

  const handleMinuteChange = React.useCallback(
    (m: number) => {
      setDatetime((old) => dayjs(old).minute(m).toDate());
    },
    [setDatetime]
  );

  const handleSecondChange = React.useCallback(
    (s: number) => {
      setDatetime((old) => dayjs(old).second(s).toDate());
    },
    [setDatetime]
  );

  const selectedDatetimeDisplay = React.useMemo(() => {
    // TODO: Dynamic load locale
    return dayjs(datetime).locale(format.dateLocale.key).format('L LTS');
  }, [datetime, format]);

  React.useEffect(() => {
    addSubscription(context.settings.datetimeFormat().subscribe(setFormat));
  }, [addSubscription, context.settings, setFormat]);

  React.useEffect(() => {
    if (prefilledDate) {
      setDatetime(prefilledDate);
    }
  }, [setDatetime]);

  return (
    <Form>
      <Tabs
        aria-label="Select a date or time tab"
        onSelect={handleTabSelect}
        activeKey={activeTab}
        isFilled
        role="region"
      >
        <Tab key={'date'} eventKey={'date'} title={<TabTitleText>Date</TabTitleText>}>
          <FormGroup key={'calendar'}>
            <Bullseye>
              <CalendarMonth
                isDateFocused
                inlineProps={inlineProps}
                style={{ padding: 0 }}
                date={datetime}
                onChange={handleCaledarSelect}
              />
            </Bullseye>
          </FormGroup>
        </Tab>
        <Tab key={'time'} eventKey={'time'} title={<TabTitleText>Time</TabTitleText>}>
          <FormGroup key={'time'}>
            <Bullseye>
              <TimePicker
                selected={{
                  hour24: dayjs(datetime).hour(), // 24hr format
                  minute: dayjs(datetime).minute(),
                  second: dayjs(datetime).second(),
                }}
                onHourSelect={handleHourChange}
                onMinuteSelect={handleMinuteChange}
                onSecondSelect={handleSecondChange}
              />
            </Bullseye>
          </FormGroup>
        </Tab>
      </Tabs>
      <FormGroup label={'Selected DateTime'}>
        <Flex>
          <FlexItem>
            <TextInput
              id="selected-datetime"
              aria-label="Displayed selected datetime"
              className="datetime-picker__datetime-selected-display"
              isDisabled
              value={selectedDatetimeDisplay}
            />
          </FlexItem>
          <FlexItem>
            <TimezonePicker menuAppendTo={document.body} onTimezoneChange={setTimezone} selected={timezone} isCompact />
          </FlexItem>
        </Flex>
      </FormGroup>
      <ActionGroup style={{ marginTop: 0 }}>
        <Button variant="primary" onClick={handleSubmit}>
          Select
        </Button>
        <Button variant="link" onClick={onDismiss}>
          Cancel
        </Button>
      </ActionGroup>
    </Form>
  );
};
