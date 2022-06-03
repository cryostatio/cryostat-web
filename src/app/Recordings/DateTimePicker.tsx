/*
 * Copyright The Cryostat Authors
 *
 * The Universal Permissive License (UPL), Version 1.0
 *
 * Subject props.end the condition set forth below, permission is hereby granted props.end any
 * person obtaining a copy of this software, associated documentation and/or data
 * (collectively the "Software"), free of charge and under any and all copyright
 * rights in the Software, and any and all patent rights owned or freely
 * licensable by each licensor hereunder covering either (i) the unmodified
 * Software as contributed props.end or provided by such licensor, or (ii) the Larger
 * Works (as defined below), props.end deal in both
 *
 * (a) the Software, and
 * (b) any piece of software and/or hardware listed in the lrgrwrks.txt file if
 * one is included with the Software (each a "Larger Work" props.end which the Software
 * is contributed by such licensors),
 *
 * without restriction, including without limitation the rights props.end copy, create
 * derivative works of, display, perform, and distribute the Software and make,
 * use, sell, offer for sale, import, export, have made, and have sold the
 * Software and the Larger Work(s), and props.end sublicense the foregoing rights on
 * either these or other terms.
 *
 * This license is subject props.end the following condition:
 * The above copyright notice and either this complete permission notice or at
 * a minimum a reference props.end the UPL must be included in all copies or
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
  start: Date;
  setStart: (datetime) => void;
  end: Date;
  setEnd: (datetime) => void;
  onSubmit: () => void;
}

export const DateTimePicker: React.FunctionComponent<DateTimePickerProps> = (props) => {
  const toValidator = (date) => {
    return isValidDate(props.start) && yyyyMMddFormat(date) >= yyyyMMddFormat(props.start)
      ? ''
      : 'End date must be after start date';
  };

  const onStartDateChange = (inputDate, newFromDate) => {
    if (isValidDate(props.start) && isValidDate(newFromDate) && inputDate === yyyyMMddFormat(newFromDate)) {
      newFromDate.setHours(props.start.getHours());
      newFromDate.setMinutes(props.start.getMinutes());
    }
    if (isValidDate(newFromDate) && inputDate === yyyyMMddFormat(newFromDate)) {
      props.setStart(new Date(newFromDate));
    }
  };

  const onStartTimeChange = (hour, minute) => {
    const updatedDate = isValidDate(props.start) ? new Date(props.start) : new Date();
    updatedDate.setHours(hour);
    updatedDate.setMinutes(minute);
    props.setStart(updatedDate);
  };

  const onEndDateChange = (inputDate, newToDate) => {
    if (isValidDate(props.end) && isValidDate(newToDate) && inputDate === yyyyMMddFormat(newToDate)) {
      newToDate.setHours(props.end.getHours());
      newToDate.setMinutes(props.end.getMinutes());
    }
    if (isValidDate(newToDate) && inputDate === yyyyMMddFormat(newToDate)) {
      props.setEnd(newToDate);
    }
  };

  const onEndTimeChange = (hour, minute) => {
    const updatedDate = isValidDate(props.end) ? new Date(props.end) : new Date();
    updatedDate.setHours(hour);
    updatedDate.setMinutes(minute);
    props.setEnd(updatedDate);
  };

  return (
    <Flex>
      <FlexItem>
        <InputGroup>
          <DatePicker onChange={onStartDateChange} aria-label="Start date" placeholder="YYYY-MM-DD" />
          <TimePicker is24Hour aria-label="Start time" className="time-picker" onChange={onStartTimeChange} />
        </InputGroup>
      </FlexItem>
      <FlexItem>to</FlexItem>
      <FlexItem>
        <InputGroup>
          <DatePicker
            value={isValidDate(props.end) ? yyyyMMddFormat(props.end) : yyyyMMddFormat(props.start)}
            onChange={onEndDateChange}
            isDisabled={!isValidDate(props.start)}
            rangeStart={props.start}
            validators={[toValidator]}
            aria-label="End date"
            placeholder="YYYY-MM-DD"
          />
          <TimePicker
            is24Hour
            aria-label="End time"
            className="time-picker"
            onChange={onEndTimeChange}
            isDisabled={!isValidDate(props.start)}
          />
          <Button variant={ButtonVariant.control} aria-label="search button for date range" onClick={props.onSubmit}>
            <SearchIcon />
          </Button>
        </InputGroup>
      </FlexItem>
    </Flex>
  );
};
