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
import { ActiveRecording } from '@app/Shared/Services/api.types';
import { useDayjs } from '@app/utils/hooks/useDayjs';
import { portalRoot } from '@app/utils/utils';
import dayjs, { Timezone } from '@i18n/datetime';
import {
  Button,
  ButtonVariant,
  Flex,
  FlexItem,
  HelperText,
  HelperTextItem,
  InputGroup,
  Popover,
  TextInput,
  ValidatedOptions,
  InputGroupItem,
  InputGroupText,
  CalendarProps,
} from '@patternfly/react-core';
import { OutlinedCalendarAltIcon, SearchIcon } from '@patternfly/react-icons';
import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { DATETIME_INPUT_MAXLENGTH } from './const';

interface _DatetimeState {
  text: string;
  date?: Date; // Ignore timezone
  validation: ValidatedOptions;
}

const _emptyDatetimeInput: _DatetimeState = {
  text: '',
  date: undefined,
  validation: ValidatedOptions.default,
};

export interface DateTimeRange {
  from?: Date;
  to?: Date;
}

export const filterRecordingByDatetime = (recordings: ActiveRecording[], filters?: DateTimeRange[]) => {
  if (!recordings || !recordings.length || !filters || !filters.length) {
    return recordings;
  }

  return recordings.filter((rec) => {
    return filters.some((range) => {
      return (
        (!range.from || dayjs(rec.startTime).isSameOrAfter(range.from)) &&
        (!range.to || dayjs(rec.startTime).isSameOrBefore(range.to))
      );
    });
  });
};

export interface DateTimeFilterProps {
  onSubmit: (dateTimeRange: DateTimeRange) => void;
}

export const DateTimeFilter: React.FC<DateTimeFilterProps> = ({ onSubmit }) => {
  const { t } = useTranslation();
  const [dayjs, _] = useDayjs();
  const [fromDatetimeInput, setFromDatetimeInput] = React.useState<_DatetimeState>(_emptyDatetimeInput);
  const [toDatetimeInput, setToDatetimeInput] = React.useState<_DatetimeState>(_emptyDatetimeInput);

  const invalidErr = React.useMemo((): Error | undefined => {
    if (
      fromDatetimeInput.validation === ValidatedOptions.error ||
      toDatetimeInput.validation === ValidatedOptions.error
    ) {
      return new Error(t('DatetimeFilter.INVALID_DATE_TEXT'));
    }

    if (fromDatetimeInput.date && toDatetimeInput.date) {
      const _from = dayjs(fromDatetimeInput.date);
      const _to = dayjs(toDatetimeInput.date);
      return _from.isAfter(_to) ? new Error(t('DatetimeFilter.HELPER_TEXT.INVALID_UPPER_BOUND')) : undefined;
    }

    return undefined;
  }, [fromDatetimeInput, toDatetimeInput, t, dayjs]);

  const submitDisabled = React.useMemo(
    () =>
      invalidErr !== undefined ||
      (!fromDatetimeInput.date && !toDatetimeInput.date) ||
      fromDatetimeInput.validation === ValidatedOptions.error ||
      toDatetimeInput.validation === ValidatedOptions.error,
    [invalidErr, fromDatetimeInput, toDatetimeInput],
  );

  const handleSubmit = React.useCallback(() => {
    onSubmit({
      from: fromDatetimeInput.date,
      to: toDatetimeInput.date,
    });
  }, [onSubmit, fromDatetimeInput, toDatetimeInput]);

  const fromValidators = React.useMemo(() => {
    if (toDatetimeInput.date) {
      return [(d: Date) => dayjs(toDatetimeInput.date).startOf('day').isSameOrAfter(d)];
    }
    return undefined;
  }, [dayjs, toDatetimeInput]);

  const toValidators = React.useMemo(() => {
    if (fromDatetimeInput.date) {
      return [(d: Date) => dayjs(fromDatetimeInput.date).startOf('day').isSameOrBefore(d)];
    }
    return undefined;
  }, [dayjs, fromDatetimeInput]);

  return (
    <Flex direction={{ default: 'column' }}>
      <Flex spaceItems={{ default: 'spaceItemsSm' }}>
        <FlexItem>
          <InputGroup>
            <InputGroupText>{t('FROM', { ns: 'common' })}</InputGroupText>
            <DateTimeInput
              onChange={setFromDatetimeInput}
              selectedDateTime={fromDatetimeInput}
              dateValidators={fromValidators}
            />
            <InputGroupText>{t('TO', { ns: 'common' })}</InputGroupText>
            <DateTimeInput
              onChange={setToDatetimeInput}
              selectedDateTime={toDatetimeInput}
              dateValidators={toValidators}
            />
          </InputGroup>
        </FlexItem>
        <FlexItem alignSelf={{ default: 'alignSelfFlexStart' }}>
          <Button
            variant={ButtonVariant.control}
            aria-label={t('DatetimeFilter.ARIA_LABELS.SEARCH_BUTTON')}
            onClick={handleSubmit}
            isDisabled={submitDisabled}
          >
            <SearchIcon />
          </Button>
        </FlexItem>
      </Flex>
      {invalidErr ? (
        <FlexItem>
          <HelperText>
            <HelperTextItem variant="error">{invalidErr.message}</HelperTextItem>
          </HelperText>
        </FlexItem>
      ) : null}
    </Flex>
  );
};

export interface DateTimeInputProps {
  selectedDateTime: _DatetimeState;
  onChange: (datetime: _DatetimeState) => void;
  dateValidators?: CalendarProps['validators']; // Restrict selectable calendar entry
}

export const DateTimeInput: React.FC<DateTimeInputProps> = ({ selectedDateTime, dateValidators, onChange }) => {
  const { t } = useTranslation();
  const [dayjs, datetimeContext] = useDayjs();
  const [isCalendarOpen, setIsCalendarOpen] = React.useState(false);

  const onToggleCalendar = React.useCallback(() => setIsCalendarOpen((open) => !open), [setIsCalendarOpen]);

  const onPopoverDismiss = React.useCallback(() => setIsCalendarOpen(false), [setIsCalendarOpen]);

  const handleDatetimeSelect = React.useCallback(
    (date: Date, timezone: Timezone) => {
      const d = dayjs(date).tz(timezone.full, true);
      onChange({
        text: d.toISOString(),
        date: d.toDate(),
        validation: ValidatedOptions.success,
      });
      onPopoverDismiss();
    },
    [onChange, onPopoverDismiss, dayjs],
  );

  const handleTextInput = React.useCallback(
    (_, value: string) => {
      let val: _DatetimeState;
      if (value === '') {
        val = _emptyDatetimeInput;
      } else {
        const d = dayjs.utc(value, 'YYYY-MM-DD[T]HH:mm:ss.SSS[Z]', true); // Parse ISO8601, must be in UTC
        if (d.isValid()) {
          val = {
            text: value,
            date: d.toDate(),
            validation: ValidatedOptions.success,
          };
        } else {
          val = {
            text: value,
            date: undefined,
            validation: ValidatedOptions.error,
          };
        }
      }
      onChange(val);
    },
    [onChange, dayjs],
  );

  return (
    <>
      <InputGroupItem isFill>
        <Popover
          appendTo={portalRoot}
          bodyContent={
            <DateTimePicker
              onSelect={handleDatetimeSelect}
              onDismiss={onPopoverDismiss}
              prefilledDate={selectedDateTime.date}
              dateValidators={dateValidators}
            />
          }
          isVisible={isCalendarOpen}
          showClose={false}
          hasAutoWidth
        >
          <TextInput
            type="text"
            id="date-time"
            placeholder={dayjs().startOf('year').tz(datetimeContext.timeZone.full, true).toISOString()}
            aria-label={t('DatetimeFilter.ARIA_LABELS.DATETIME_INPUT')}
            value={selectedDateTime.text}
            validated={selectedDateTime.validation}
            onChange={handleTextInput}
            style={{ maxWidth: DATETIME_INPUT_MAXLENGTH }}
          />
        </Popover>
      </InputGroupItem>
      <InputGroupItem>
        <Button
          variant="control"
          aria-label={t('DatetimeFilter.ARIA_LABELS.TOGGLE_CALENDAR')}
          onClick={onToggleCalendar}
        >
          <OutlinedCalendarAltIcon />
        </Button>
      </InputGroupItem>
    </>
  );
};
