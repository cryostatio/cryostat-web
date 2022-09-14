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

import { findDatetimeMenuMountPoint } from '@app/utils/utils';
import {
  Button,
  ButtonVariant,
  DatePicker,
  Flex,
  FlexItem,
  isValidDate,
  Text,
  TimePicker,
  yyyyMMddFormat,
} from '@patternfly/react-core';
import { SearchIcon } from '@patternfly/react-icons';
import React from 'react';

export interface DateTimePickerProps {
  onSubmit: (date: any) => void;
  menuMountId?: string;
}

export const DateTimePicker: React.FunctionComponent<DateTimePickerProps> = (props) => {
  const [selectedDate, setSelectedDate] = React.useState<Date|undefined>();
  const [selectedHour, setSelectedHour] = React.useState(0);
  const [selectedMinute, setSelectedMinute] = React.useState(0);
  const [isTimeOpen, setIsTimeOpen] = React.useState(false);

  const onDateChange = React.useCallback(
    (inputDateValue: string, newDate: Date | undefined) => {
      setSelectedDate(newDate);
    },
    [isValidDate, yyyyMMddFormat, setSelectedDate]
  );

  const onTimeChange = React.useCallback(
    (_, hour, minute) => {
      setSelectedHour(hour);
      setSelectedMinute(minute);
    },
    [setSelectedHour, setSelectedMinute]
  );

  const onTimeToggle = React.useCallback((opened) => {
    setIsTimeOpen(opened);
  }, [setIsTimeOpen]);

  const handleSubmit = React.useCallback(() => {
    selectedDate!.setUTCHours(selectedHour, selectedMinute);
    props.onSubmit(`${selectedDate!.toISOString()}`);
  }, [selectedDate, selectedHour, selectedMinute, props.onSubmit]);

  // Append the popover date menu to the higher component in the tree to avoid cut-off.
  // Potential cause: A parent container has "overflow: hidden".
  // Caution: Lose accessibility support if using document.body
  const elementToAppend = React.useMemo(() => {
    return props.menuMountId? findDatetimeMenuMountPoint(props.menuMountId): "parent";
  }, [props.menuMountId]);

  return (
    <Flex>
      <FlexItem>
        <DatePicker
            appendTo={elementToAppend}
            onChange={onDateChange}
            aria-label="Date Picker"
            placeholder="YYYY-MM-DD" />
        <TimePicker
          isOpen={isTimeOpen}
          setIsOpen={onTimeToggle}
          is24Hour
          aria-label="Time Picker"
          className="time-picker"
          menuAppendTo={elementToAppend}
          onChange={onTimeChange} 
          />
      </FlexItem>
      <FlexItem>
        <Text>UTC</Text>
      </FlexItem>
      <FlexItem>
        <Button variant={ButtonVariant.control} aria-label="Search For Date" isDisabled={!selectedDate} onClick={handleSubmit}>
          <SearchIcon />
        </Button>
      </FlexItem>
    </Flex>
  );
};
