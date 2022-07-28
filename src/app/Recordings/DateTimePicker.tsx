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


import {
  Button,
  ButtonVariant,
  DatePicker,
  Flex,
  FlexItem,
  InputGroup,
  isValidDate,
  Text,
  TimePicker,
  yyyyMMddFormat,
} from '@patternfly/react-core';
import { SearchIcon } from '@patternfly/react-icons';
import React from 'react';

export interface DateTimePickerProps {
  onSubmit: (startDate) => void;
}

export const DateTimePicker: React.FunctionComponent<DateTimePickerProps> = (props) => {
  const [start, setStart] = React.useState(new Date(0));
  const [searchDisabled, setSearchDisabled] = React.useState(true);

  const onStartDateChange = React.useCallback(
    (inputDate, newStartDate) => {
      if (isValidDate(start) && isValidDate(newStartDate) && inputDate === yyyyMMddFormat(newStartDate)) {
        setStart(new Date(newStartDate));
        setSearchDisabled(false);
      } else {
        setSearchDisabled(true);
      }
    },
    [start, isValidDate, yyyyMMddFormat]
  );

  const onStartTimeChange = React.useCallback(
    (unused, hour, minute) => {
      let updated = new Date(start);
      updated.setUTCHours(hour, minute);
      setStart(updated);
    },
    [start, setStart, isValidDate]
  );

  const handleSubmit = React.useCallback(() => {
    props.onSubmit(`${start.toISOString()}`);
  }, [start, props.onSubmit]);

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
        <FlexItem>
          <Text>UTC</Text>
        </FlexItem>
        <FlexItem>
          <Button variant={ButtonVariant.control} aria-label="search button for start date" isDisabled={searchDisabled} onClick={handleSubmit}>
            <SearchIcon />
          </Button>
      </FlexItem>
    </Flex>
  );
};
