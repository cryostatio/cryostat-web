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
import { DateTimePicker } from '@app/DateTimePicker/DateTimePicker';
import { DateTimeContext } from '@app/Shared/DateTimeContext';
import { defaultDatetimeFormat } from '@app/Shared/Services/Settings.service';
import { useForceUpdate } from '@app/utils/useForceUpdate';
import { useSubscriptions } from '@app/utils/useSubscriptions';
import { getLocale, getTimezone, Timezone } from '@i18n/datetime';
import {
  Button,
  ButtonVariant,
  Flex,
  FlexItem,
  HelperText,
  HelperTextItem,
  InputGroup,
  Popover,
  PopoverPosition,
  Stack,
  StackItem,
  TextInput,
  ValidatedOptions,
} from '@patternfly/react-core';
import { OutlinedCalendarAltIcon, SearchIcon } from '@patternfly/react-icons';
import dayjs from 'dayjs';
import advancedFormat from 'dayjs/plugin/advancedFormat';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import localeData from 'dayjs/plugin/localeData';
import localizedFormat from 'dayjs/plugin/localizedFormat';
import timezone from 'dayjs/plugin/timezone'; // dependent on utc plugin
import utc from 'dayjs/plugin/utc';
import * as React from 'react';
import { from } from 'rxjs';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(localeData);
dayjs.extend(localizedFormat);
dayjs.extend(customParseFormat);
dayjs.extend(advancedFormat);

export interface DateTimeFilterProps {
  onSubmit: (dateISO: string) => void;
}

const _emptyDatetimeInput: {
  text: string;
  date: Date | undefined; // Ignore timezone
  timezone: Timezone; // default to local
  validation: ValidatedOptions;
} = {
  text: '',
  date: undefined,
  timezone: defaultDatetimeFormat.timeZone,
  validation: ValidatedOptions.default,
};

export const DateTimeFilter: React.FunctionComponent<DateTimeFilterProps> = ({ onSubmit }) => {
  const datetimeContext = React.useContext(DateTimeContext);
  const addSubscription = useSubscriptions();
  const forceUpdate = useForceUpdate();

  const [datetimeInput, setDatetimeInput] = React.useState(_emptyDatetimeInput);
  const [isCalendarOpen, setIsCalendarOpen] = React.useState(false);

  const onToggleCalendar = React.useCallback(() => setIsCalendarOpen((open) => !open), [setIsCalendarOpen]);

  const onPopoverDismiss = React.useCallback(() => setIsCalendarOpen(false), [setIsCalendarOpen]);

  const handleSubmit = React.useCallback(() => {
    if (datetimeInput.validation === ValidatedOptions.success) {
      // internally uses ISOString but display will be localized.
      onSubmit(dayjs(datetimeInput.date).tz(datetimeInput.timezone.full, true).toISOString());
      setDatetimeInput(_emptyDatetimeInput);
    }
  }, [onSubmit, datetimeInput, setDatetimeInput]);

  const handleDatetimeSelect = React.useCallback(
    (date: Date, timezone: Timezone) => {
      setDatetimeInput({
        text: dayjs(date).tz(timezone.full, true).format('L LTS z'),
        date: date,
        timezone: timezone,
        validation: ValidatedOptions.success,
      });
      onPopoverDismiss();
    },
    [setDatetimeInput, onPopoverDismiss]
  );

  const handleTextInput = React.useCallback(
    (value: string) => {
      setDatetimeInput((old) => {
        if (value === '') {
          return _emptyDatetimeInput;
        }

        const d = dayjs(
          value,
          `${dayjs.Ls[dayjs.locale()].formats.L} ${dayjs.Ls[dayjs.locale()].formats.LTS}`,
          dayjs.locale()
        );

        if (d.isValid()) {
          // Expecting timezone comes last, else default to user preferences
          const parts = value.split(/\s/);
          const shortName = parts.length ? parts[parts.length - 1] : 'Invalid';
          const tz = getTimezone(shortName);
          if (!tz) {
            return {
              ...old,
              text: value,
              date: undefined,
              validation: ValidatedOptions.error,
            };
          }
          return {
            text: value,
            date: d.toDate(),
            validation: ValidatedOptions.success,
            timezone: { short: shortName, full: tz.full },
          };
        } else {
          return {
            ...old,
            text: value,
            date: undefined,
            validation: ValidatedOptions.error,
          };
        }
      });
    },
    [setDatetimeInput]
  );

  React.useEffect(() => {
    const locale = getLocale(datetimeContext.dateLocale.key);
    if (locale) {
      addSubscription(
        from(locale.load()).subscribe(() => {
          dayjs.locale(locale.key);
          forceUpdate();
        })
      );
    }
  }, [addSubscription, datetimeContext.dateLocale, forceUpdate]);

  return (
    <Flex>
      <Flex alignSelf={{ default: 'alignSelfFlexStart' }} flex={{ default: 'flex_1' }}>
        <FlexItem spacer={{ default: 'spacerNone' }}>
          <Popover
            bodyContent={
              <DateTimePicker
                onSelect={handleDatetimeSelect}
                onDismiss={onPopoverDismiss}
                prefilledDate={datetimeInput.date}
              />
            }
            isVisible={isCalendarOpen}
            showClose={false}
            minWidth={'28em'}
            position={PopoverPosition.bottom}
            flipBehavior={['bottom', 'right', 'left']}
          >
            <Stack>
              <StackItem>
                <InputGroup>
                  <TextInput
                    type="text"
                    id="date-time"
                    placeholder={dayjs().startOf('year').tz(datetimeContext.timeZone.full, true).format('L LTS z')}
                    aria-label="Datetime Picker"
                    value={datetimeInput.text}
                    validated={datetimeInput.validation}
                    onChange={handleTextInput}
                  />
                  <Button variant="control" aria-label="Toggle the calendar" onClick={onToggleCalendar}>
                    <OutlinedCalendarAltIcon />
                  </Button>
                </InputGroup>
              </StackItem>
              {datetimeInput.validation === ValidatedOptions.error ? (
                <StackItem>
                  <HelperText>
                    <HelperTextItem variant="error">Invalid date time</HelperTextItem>
                  </HelperText>
                </StackItem>
              ) : (
                <></>
              )}
            </Stack>
          </Popover>
        </FlexItem>
      </Flex>
      <FlexItem alignSelf={{ default: 'alignSelfFlexStart' }}>
        <Button
          variant={ButtonVariant.control}
          aria-label="Search For Date"
          isDisabled={datetimeInput.validation !== ValidatedOptions.success}
          onClick={handleSubmit}
        >
          <SearchIcon />
        </Button>
      </FlexItem>
    </Flex>
  );
};
