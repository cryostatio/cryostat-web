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
import { useDayjs } from '@app/utils/useDayjs';
import { Timezone } from '@i18n/datetime';
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
import { t } from 'i18next';
import * as React from 'react';

export interface DateTimeFilterProps {
  onSubmit: (dateISO: string) => void;
}

const _emptyDatetimeInput: {
  text: string;
  date: Date | undefined; // Ignore timezone
  validation: ValidatedOptions;
} = {
  text: '',
  date: undefined,
  validation: ValidatedOptions.default,
};

export const DateTimeFilter: React.FunctionComponent<DateTimeFilterProps> = ({ onSubmit }) => {
  const [dayjs, datetimeContext] = useDayjs();
  const [datetimeInput, setDatetimeInput] = React.useState(_emptyDatetimeInput);
  const [isCalendarOpen, setIsCalendarOpen] = React.useState(false);

  const onToggleCalendar = React.useCallback(() => setIsCalendarOpen((open) => !open), [setIsCalendarOpen]);

  const onPopoverDismiss = React.useCallback(() => setIsCalendarOpen(false), [setIsCalendarOpen]);

  const handleSubmit = React.useCallback(() => {
    if (datetimeInput.validation === ValidatedOptions.success) {
      // internally uses ISOString but display will be localized.
      onSubmit(dayjs(datetimeInput.date).toISOString());
      setDatetimeInput(_emptyDatetimeInput);
    }
  }, [onSubmit, datetimeInput, setDatetimeInput, dayjs]);

  const handleDatetimeSelect = React.useCallback(
    (date: Date, timezone: Timezone) => {
      const d = dayjs(date).tz(timezone.full, true);
      setDatetimeInput({
        text: d.toISOString(),
        date: d.toDate(),
        validation: ValidatedOptions.success,
      });
      onPopoverDismiss();
    },
    [setDatetimeInput, onPopoverDismiss, dayjs]
  );

  const handleTextInput = React.useCallback(
    (value: string) => {
      setDatetimeInput((_) => {
        if (value === '') {
          return _emptyDatetimeInput;
        }
        const d = dayjs.utc(value, 'YYYY-MM-DD[T]HH:mm:ss.SSS[Z]', true); // Parse ISO8601, must be in UTC
        if (d.isValid()) {
          return {
            text: value,
            date: d.toDate(),
            validation: ValidatedOptions.success,
          };
        } else {
          return {
            text: value,
            date: undefined,
            validation: ValidatedOptions.error,
          };
        }
      });
    },
    [setDatetimeInput, dayjs]
  );

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
            flipBehavior={['bottom']}
          >
            <Stack>
              <StackItem>
                <InputGroup>
                  <TextInput
                    type="text"
                    id="date-time"
                    placeholder={dayjs().startOf('year').tz(datetimeContext.timeZone.full, true).toISOString()}
                    aria-label={t('DatetimeFilter.ARIA_LABELS.DATETIME_INPUT') || ''}
                    value={datetimeInput.text}
                    validated={datetimeInput.validation}
                    onChange={handleTextInput}
                  />
                  <Button
                    variant="control"
                    aria-label={t('DatetimeFilter.ARIA_LABELS.TOGGLE_CALENDAR') || ''}
                    onClick={onToggleCalendar}
                  >
                    <OutlinedCalendarAltIcon />
                  </Button>
                </InputGroup>
              </StackItem>
              {datetimeInput.validation === ValidatedOptions.error ? (
                <StackItem>
                  <HelperText>
                    <HelperTextItem variant="error">{t('DatetimeFilter.INVALID_DATE_TEXT')}</HelperTextItem>
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
          aria-label={t('DatetimeFilter.ARIA_LABELS.SEARCH_BUTTON') || ''}
          isDisabled={datetimeInput.validation !== ValidatedOptions.success}
          onClick={handleSubmit}
        >
          <SearchIcon />
        </Button>
      </FlexItem>
    </Flex>
  );
};
