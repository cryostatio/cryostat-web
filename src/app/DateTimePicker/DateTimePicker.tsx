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
  CalendarMonth,
  Flex,
  FlexItem,
  InputGroup,
  Popover,
  TextInput,
  ValidatedOptions,
  HelperText,
  HelperTextItem,
  Select,
  SelectVariant,
  SelectOption,
  Stack,
  StackItem,
  Level,
  LevelItem,
} from '@patternfly/react-core';
import { GlobeIcon, OutlinedCalendarAltIcon, SearchIcon } from '@patternfly/react-icons';
import { format2Digit } from '@app/utils/utils';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import React from 'react';
import { Timezone } from '@app/Shared/Services/Settings.service';
import { supportedTimezones, localTimezone } from '@app/Settings/DatetimeControl';

dayjs.extend(customParseFormat);

// https://day.js.org/docs/en/parse/string-format#list-of-all-available-parsing-tokens
const datetimeFormat = 'YYYY-MM-DD HH:mm';
const shortDatetimeFormat = 'YYYY-MM-DD';

export interface DateTimeFilterProps {
  onSubmit: (date: string) => void;
}

export const DateTimeFilter: React.FunctionComponent<DateTimeFilterProps> = ({ onSubmit }) => {
  const [datetimeInput, setDatetimeInput] = React.useState('');
  const [isCalendarOpen, setIsCalendarOpen] = React.useState(false);
  const [timezone, setTimezone] = React.useState(localTimezone);
  const [validation, setValidation] = React.useState(ValidatedOptions.default);

  const handleDateSelect = React.useCallback(
    (date: Date) => {
      const formattedDateStr = `${date.getFullYear()}-${format2Digit(date.getMonth() + 1)}-${format2Digit(
        date.getDate()
      )}`;
      if (validation === ValidatedOptions.success) {
        setDatetimeInput((old) => {
          const dateParts = old.split(/\s+/);
          return `${formattedDateStr} ${dateParts[1]}`.trim(); // Extract hh:mm
        });
      } else {
        setDatetimeInput(formattedDateStr);
      }
      setValidation(ValidatedOptions.success);
      setIsCalendarOpen(false);
    },
    [setDatetimeInput, setValidation, setIsCalendarOpen, validation]
  );

  const handleDateTimeInputChange = React.useCallback(
    (value: string, _: any) => {
      setValidation(
        value === ''
          ? ValidatedOptions.default
          : dayjs(value, datetimeFormat, true).isValid() || dayjs(value, shortDatetimeFormat, true).isValid()
          ? ValidatedOptions.success
          : ValidatedOptions.error
      );
      setDatetimeInput(value);
    },
    [setValidation, setDatetimeInput]
  );

  const handleTimeSelect = React.useCallback(
    (hour: number, minute: number) => {
      if (validation === ValidatedOptions.success) {
        setDatetimeInput((old) => {
          const dateParts = old.split(/\s+/);
          return `${dateParts[0]} ${format2Digit(hour)}:${format2Digit(minute)}`;
        });
      } else {
        const now = new Date(); // default to now
        setDatetimeInput(
          `${now.getFullYear()}-${format2Digit(now.getMonth() + 1)}-${format2Digit(now.getDate())} ${format2Digit(
            hour
          )}:${format2Digit(minute)}`
        );
      }
      setValidation(ValidatedOptions.success);
    },
    [validation, setDatetimeInput, setValidation]
  );

  const onToggleCalendar = React.useCallback(() => {
    setIsCalendarOpen((open) => !open);
  }, [setIsCalendarOpen]);

  const handleSubmit = React.useCallback(() => {
    if (validation === ValidatedOptions.success) {
      // Replace "-" with " " for browser compatibilities
      const selectedDate = new Date(Date.parse(`${datetimeInput.replace(/[-]/g, ' ')} ${timezone.short}`));
      onSubmit(selectedDate.toISOString());
      setDatetimeInput('');
      setValidation(ValidatedOptions.default);
    }
  }, [onSubmit, datetimeInput, timezone, setDatetimeInput, setValidation]);

  const selectedDate = React.useMemo(
    () => (validation === ValidatedOptions.success ? new Date(Date.parse(datetimeInput)) : undefined),
    [validation, datetimeInput]
  );

  return (
    <Flex>
      <FlexItem>
        <Popover
          enableFlip={true}
          bodyContent={<DateTimePicker />}
          isVisible={isCalendarOpen}
          showClose={false}
          hasNoPadding
          hasAutoWidth
        >
          <>
            <InputGroup>
              <TextInput
                style={{ width: '12.5em' }}
                type="text"
                id="date-time"
                placeholder={datetimeFormat}
                aria-label="Datetime Picker"
                value={datetimeInput}
                validated={validation}
                onChange={handleDateTimeInputChange}
              />
              <>
                <TimezonePicker
                  menuAppendTo={document.body}
                  onTimezoneChange={setTimezone}
                  selected={timezone}
                  isCompact
                />
                <Button variant="control" aria-label="Toggle the calendar" onClick={onToggleCalendar}>
                  <OutlinedCalendarAltIcon />
                </Button>
              </>
            </InputGroup>
            {validation === ValidatedOptions.error ? (
              <HelperText>
                <HelperTextItem variant="error">Invalid date time</HelperTextItem>
              </HelperText>
            ) : (
              <></>
            )}
          </>
        </Popover>
      </FlexItem>
      <FlexItem>
        <Button
          variant={ButtonVariant.control}
          aria-label="Search For Date"
          isDisabled={validation !== ValidatedOptions.success || !timezone}
          onClick={handleSubmit}
        >
          <SearchIcon />
        </Button>
      </FlexItem>
    </Flex>
  );
};

export interface TimezonePickerProps {
  isFlipEnabled?: boolean;
  isCompact?: boolean;
  menuAppendTo?: HTMLElement | (() => HTMLElement) | 'inline' | 'parent' | undefined;
  onTimezoneChange?: (timezone: Timezone) => void;
  selected: Timezone;
}

export const TimezonePicker: React.FunctionComponent<TimezonePickerProps> = ({
  isFlipEnabled = true,
  isCompact,
  menuAppendTo = 'parent',
  selected,
  onTimezoneChange = (_) => undefined,
}) => {
  const [isTimezoneOpen, setIsTimezoneOpen] = React.useState(false);

  const onSelect = React.useCallback(
    (_, timezone, __) => {
      setIsTimezoneOpen(false);
      onTimezoneChange({
        full: timezone.full,
        short: timezone.short,
      });
    },
    [onTimezoneChange, setIsTimezoneOpen]
  );

  const options = React.useMemo(() => {
    return supportedTimezones.map((timezone) => (
      <SelectOption
        key={timezone.full}
        value={{
          ...timezone,
          toString: () => timezone.full,
          compareTo: (val) => timezone.full === val.full,
        }}
        description={isCompact ? timezone.full : timezone.short}
      >
        {isCompact ? timezone.short : timezone.full}
      </SelectOption>
    ));
  }, []);

  const onFilter = React.useCallback(
    (_, value: string) => {
      if (!value) {
        return options;
      }
      const matchExp = new RegExp(value, 'i');
      return options.filter((op) => matchExp.test(op.props.value.full) || matchExp.test(op.props.description));
    },
    [options]
  );

  return (
    <Select
      variant={isCompact ? SelectVariant.typeahead : SelectVariant.single}
      onToggle={setIsTimezoneOpen}
      isFlipEnabled={isFlipEnabled}
      menuAppendTo={menuAppendTo}
      maxHeight="16em"
      width={isCompact ? '6em' : undefined}
      selections={{
        ...selected,
        toString: () => selected.full,
        compareTo: (val) => selected.full === val.full,
      }}
      onSelect={onSelect}
      onFilter={onFilter}
      hasInlineFilter={!isCompact}
      aria-label="Select a timezone"
      typeAheadAriaLabel="Search a timezone"
      isOpen={isTimezoneOpen}
      toggleIndicator={<GlobeIcon />}
    >
      {options}
    </Select>
  );
};

export interface DateTimePickerProps {}

export const DateTimePicker: React.FC<DateTimePickerProps> = ({}) => {
  return (
    <InputGroup>
      <Level hasGutter>
        <LevelItem>
          <CalendarMonth isDateFocused />
        </LevelItem>
        <LevelItem>
          <TimePicker />
        </LevelItem>
      </Level>
    </InputGroup>
  );
};

export interface TimePickerProps {}

export const TimePicker: React.FC<TimePickerProps> = ({}) => {
  return (
    <>
      <Stack>
        <StackItem>{'Time picker'}</StackItem>
      </Stack>
    </>
  );
};
