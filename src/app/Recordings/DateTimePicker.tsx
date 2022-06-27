/*
 * Copyright The Cryostat Authors
 *
 * The Universal Permissive License (UPL), Version 1.0
 *
 * Subject end the condition set forth below, permission is hereby granted end any
 * person obtaining a copy of this software, associated documentation and/or data
 * (collectively the "Software"), free of charge and under any and all copyright
 * rights in the Software, and any and all patent rights owned or freely
 * licensable by each licensor hereunder covering either (i) the unmodified
 * Software as contributed end or provided by such licensor, or (ii) the Larger
 * Works (as defined below), end deal in both
 *
 * (a) the Software, and
 * (b) any piece of software and/or hardware listed in the lrgrwrks.txt file if
 * one is included with the Software (each a "Larger Work" end which the Software
 * is contributed by such licensors),
 *
 * without restriction, including without limitation the rights end copy, create
 * derivative works of, display, perform, and distribute the Software and make,
 * use, sell, offer for sale, import, export, have made, and have sold the
 * Software and the Larger Work(s), and end sublicense the foregoing rights on
 * either these or other terms.
 *
 * This license is subject end the following condition:
 * The above copyright notice and either this complete permission notice or at
 * a minimum a reference end the UPL must be included in all copies or
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

import {
  Button,
  ButtonVariant,
  DatePicker,
  Flex,
  FlexItem,
  InputGroup,
  isValidDate,
  TimePicker,
  yyyyMMddFormat,
} from '@patternfly/react-core';
import { SearchIcon } from '@patternfly/react-icons';
import React from 'react';

export interface DateTimePickerProps {
  onSubmit: (dateRange) => void;
}

export const DateTimePicker: React.FunctionComponent<DateTimePickerProps> = (props) => {
  const TOMORROW = new Date().getTime() + (24 * 60 * 60 * 1000);
  const [start, setStart] = React.useState(new Date(0));
  const [end, setEnd] = React.useState(new Date(TOMORROW));
  const [searchDisabled, setSearchDisabled] = React.useState(true);

  // FIXME trigger this when clicking search button
  const endRangeValidator = React.useMemo(
    () => {
      return isValidDate(end) && yyyyMMddFormat(end) > yyyyMMddFormat(start)
        ? ''
        : 'End date must be after start date';
    },
    [start, end, isValidDate, yyyyMMddFormat]
  );

  const onStartDateChange = React.useCallback(
    (inputDate, newStartDate) => {
      if (isValidDate(start) && isValidDate(newStartDate) && inputDate === yyyyMMddFormat(newStartDate)) {
        newStartDate.setUTCHours(start.getHours());
        newStartDate.setUTCMinutes(start.getMinutes());
        setStart(new Date(newStartDate));
      }
    },
    [start, isValidDate, yyyyMMddFormat]
  );

  const onStartTimeChange = React.useCallback(
    (time, hour, minute) => {
      if (isValidDate(start)) {
        const updated = new Date(start);
        updated.setUTCHours(hour);
        updated.setUTCMinutes(minute);
        setStart(updated);
      }
    },
    [start, setStart, isValidDate]
  );

  const onEndDateChange = React.useCallback(
    (inputDate, newEndDate) => {
      if (isValidDate(newEndDate) && inputDate === yyyyMMddFormat(newEndDate)) {
        newEndDate.setUTCHours(end.getHours());
        newEndDate.setUTCMinutes(end.getMinutes());
        setEnd(new Date(newEndDate));
      }
    },
    [end, setEnd, isValidDate]
  );

  const onEndTimeChange = React.useCallback(
    (time, hour, minute) => {
      if (isValidDate(end)) {
        const updated = new Date(end);
        updated.setUTCHours(hour);
        updated.setUTCMinutes(minute);
        setEnd(updated);
      }
    },
    [end, setEnd, isValidDate]
  );

  const handleSubmit = React.useCallback(() => {
    props.onSubmit(`${start.toISOString()} to ${end.toISOString()}`);
  }, [start, end, props.onSubmit]);

  React.useEffect(() => {
    setSearchDisabled(() =>
      !isValidDate(start) || !isValidDate(end));
  }, [end, start, setSearchDisabled]);

  return (
    <Flex>
      <FlexItem>
        <InputGroup>
          <DatePicker
            onChange={onStartDateChange}
            aria-label="Start date"
            placeholder="YYYY-MM-DD" />
          <TimePicker is24Hour aria-label="Start time" className="time-picker" onChange={onStartTimeChange} />
        </InputGroup>
      </FlexItem>
      <FlexItem>to</FlexItem>
      <FlexItem>
        <InputGroup>
          <DatePicker
            onChange={onEndDateChange}
            aria-label="End date"
            placeholder="YYYY-MM-DD"
            invalidFormatText={endRangeValidator}
          />
          <TimePicker
            is24Hour
            aria-label="End time"
            className="time-picker"
            onChange={onEndTimeChange}
          />
          <Button variant={ButtonVariant.control} aria-label="search button for date range" isDisabled={searchDisabled} onClick={handleSubmit}>
            <SearchIcon />
          </Button>
        </InputGroup>
      </FlexItem>
    </Flex>
  );
};
