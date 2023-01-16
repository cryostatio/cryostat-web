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
  DropdownItem,
  DropdownToggle,
  Flex,
  FlexItem,
  InputGroup,
  Popover,
  TextInput,
  Dropdown,
  ValidatedOptions,
  HelperText,
  HelperTextItem,
  Select,
  SelectVariant,
  SelectOption,
  Drawer,
  DrawerContent,
  DrawerContentBody,
  Bullseye,
  EmptyState,
  EmptyStateIcon,
  Spinner,
  Title,
  DrawerPanelContent,
  Stack,
  StackItem,
  DrawerPanelBody,
  Split,
  SplitItem,
  Level,
  LevelItem,
  Divider,
} from '@patternfly/react-core';
import { GlobeIcon, OutlinedCalendarAltIcon, OutlinedClockIcon, SearchIcon } from '@patternfly/react-icons';
import {
  generateTimeArray,
  convert12HrTo24Hr,
  format2Digit,
  localTimezone,
  supportedTimezones,
  Timezone,
} from '@app/utils/utils';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import React from 'react';

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
                <CompactTimezonePicker
                  menuAppendTo={document.body}
                  onTimezoneChange={setTimezone}
                  selected={timezone}
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

export interface CompactTimezonePickerProps {
  isFlipEnabled?: boolean;
  menuAppendTo?: HTMLElement | (() => HTMLElement) | 'inline' | 'parent' | undefined;
  onTimezoneChange?: (timezone: Timezone) => void;
  selected: Timezone;
}

export const CompactTimezonePicker: React.FunctionComponent<CompactTimezonePickerProps> = ({
  isFlipEnabled = true,
  menuAppendTo = 'parent',
  selected,
  onTimezoneChange = (_) => undefined,
}) => {
  const [isTimezoneOpen, setIsTimezoneOpen] = React.useState(false);

  const onSelect = React.useCallback(
    (e: any, timezone: any, isPlaceHolder: any) => {
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
        key={timezone.short}
        value={{
          ...timezone,
          toString: () => timezone.short,
          compareTo: (val) => timezone.short === val.short,
        }}
        description={timezone.full}
      >
        {timezone.short}
      </SelectOption>
    ));
  }, [localTimezone]);

  const onFilter = React.useCallback(
    (_, value: string) => {
      if (!value) {
        return options;
      }
      const matchExp = new RegExp(value, 'i');
      return options.filter((op) => matchExp.test(op.props.value.short) || matchExp.test(op.props.description));
    },
    [options]
  );

  return (
    <Select
      variant={SelectVariant.typeahead}
      onToggle={setIsTimezoneOpen}
      isFlipEnabled={isFlipEnabled}
      menuAppendTo={menuAppendTo}
      maxHeight="16em"
      width="6em"
      selections={{
        ...selected,
        toString: () => selected.short,
        compareTo: (val) => selected.short === val.short,
      }}
      onSelect={onSelect}
      onFilter={onFilter}
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
        <StackItem>{'loading'}</StackItem>
        <StackItem>{'loading'}</StackItem>
      </Stack>
    </>
  );
};
