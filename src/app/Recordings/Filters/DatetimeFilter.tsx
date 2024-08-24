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
import { DateTimePicker } from '@app/DateTimePicker/DateTimePicker';
import { useDayjs } from '@app/utils/hooks/useDayjs';
import { portalRoot } from '@app/utils/utils';
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
  InputGroupItem,
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

export const DateTimeFilter: React.FC<DateTimeFilterProps> = ({ onSubmit }) => {
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
    [setDatetimeInput, onPopoverDismiss, dayjs],
  );

  const handleTextInput = React.useCallback(
    (_, value: string) => {
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
    [setDatetimeInput, dayjs],
  );

  return (
    <Flex>
      <Flex alignSelf={{ default: 'alignSelfFlexStart' }}>
        <FlexItem spacer={{ default: 'spacerNone' }}>
          <Popover
            appendTo={portalRoot}
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
            shouldClose={() => setIsCalendarOpen(false)}
          >
            <Stack>
              <StackItem>
                <InputGroup>
                  <InputGroupItem isFill>
                    <TextInput
                      type="text"
                      id="date-time"
                      placeholder={dayjs().startOf('year').tz(datetimeContext.timeZone.full, true).toISOString()}
                      aria-label={t('DatetimeFilter.ARIA_LABELS.DATETIME_INPUT') || ''}
                      value={datetimeInput.text}
                      validated={datetimeInput.validation}
                      onChange={handleTextInput}
                    />
                  </InputGroupItem>
                  <InputGroupItem>
                    <Button
                      variant="control"
                      aria-label={t('DatetimeFilter.ARIA_LABELS.TOGGLE_CALENDAR') || ''}
                      onClick={onToggleCalendar}
                    >
                      <OutlinedCalendarAltIcon />
                    </Button>
                  </InputGroupItem>
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
