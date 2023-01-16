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
import { ServiceContext } from '@app/Shared/Services/Services';
import { DatetimeFormat, Timezone } from '@app/Shared/Services/Settings.service';
import { useSubscriptions } from '@app/utils/useSubscriptions';
import {
  FormGroup,
  HelperText,
  HelperTextItem,
  Select,
  SelectOption,
  Stack,
  StackItem,
  Switch,
} from '@patternfly/react-core';
import { TimezonePicker } from '@app/DateTimePicker/DateTimePicker';
import * as React from 'react';
import { UserSetting } from './Settings';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import advanced from 'dayjs/plugin/advancedFormat';
import { locales, timezones } from '@i18n/datetime';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(advanced);

export const localTimezone = {
  full: dayjs.tz.guess(),
  short: dayjs().tz(dayjs.tz.guess()).format('z'),
} as Timezone;

export const UTCTimezone = {
  full: 'UTC',
  short: 'UTC',
} as Timezone;

export const supportedTimezones = !timezones.length
  ? [localTimezone, UTCTimezone]
  : timezones.map(
      (tname) =>
        ({
          full: tname,
          short: dayjs().tz(tname).format('z'), // Get abbreviation
        } as Timezone)
    );

const Component = () => {
  const context = React.useContext(ServiceContext);
  const addSubscription = useSubscriptions();

  const [dateLocaleOpen, setDateLocaleOpen] = React.useState(false);
  const [state, setState] = React.useState<DatetimeFormat>({
    dateLocale: {
      name: 'English',
      key: 'en',
    },
    timeFormat: '24h',
    timeZone: localTimezone,
  });

  React.useLayoutEffect(() => {
    context.settings.datetimeFormat().subscribe(setState);
  }, [addSubscription, setState]);

  const handleDateToggle = React.useCallback((expanded: boolean) => setDateLocaleOpen(expanded), [setDateLocaleOpen]);

  const handleDateLocaleSelect = React.useCallback(
    (_, locale) => {
      setDateLocaleOpen(false);
      context.settings.setDatetimeFormat({
        ...state,
        dateLocale: {
          name: locale.name,
          key: locale.key,
        },
      });
    },
    [context.settings, state, setDateLocaleOpen]
  );

  const handleTimeFormatSelect = React.useCallback(
    (checked: boolean) => {
      context.settings.setDatetimeFormat({
        ...state,
        timeFormat: checked ? '24h' : '12h',
      });
    },
    [context.settings, state]
  );

  const handleTimezoneSelect = React.useCallback(
    (timezone: Timezone) => {
      context.settings.setDatetimeFormat({
        ...state,
        timeZone: {
          short: timezone.short,
          full: timezone.full,
        },
      });
    },
    [context.settings, state]
  );

  const dateLocaleOptions = React.useMemo(
    () =>
      locales.map((locale) => (
        <SelectOption
          key={locale.key}
          description={locale.key}
          value={{
            ...locale,
            toString: () => locale.name,
            compareTo: (val) => locale.name === val.name,
          }}
        >
          {locale.name}
        </SelectOption>
      )),
    []
  );

  const handleDateLocaleFilter = React.useCallback(
    (_, value: string) => {
      if (!value) {
        return dateLocaleOptions;
      }
      const matchExp = new RegExp(value, 'i');
      return dateLocaleOptions.filter(
        (opt) => matchExp.test(opt.props.value.name) || matchExp.test(opt.props.description)
      );
    },
    [dateLocaleOptions]
  );

  return (
    <Stack hasGutter>
      <StackItem key={'date-locale-select'}>
        <FormGroup>
          <HelperText>
            <HelperTextItem>{'Select current date locale.'}</HelperTextItem>
          </HelperText>
          <Select
            isOpen={dateLocaleOpen}
            onToggle={handleDateToggle}
            isFlipEnabled
            menuAppendTo="parent"
            selections={{
              ...state.dateLocale,
              toString: () => state.dateLocale.name,
              compareTo: (val) => state.dateLocale.name === val.name,
            }}
            hasInlineFilter
            maxHeight={'16em'}
            onFilter={handleDateLocaleFilter}
            onSelect={handleDateLocaleSelect}
          >
            {dateLocaleOptions}
          </Select>
        </FormGroup>
      </StackItem>
      <StackItem key={'time-format-select'}>
        <FormGroup>
          <HelperText>
            <HelperTextItem>{'Use 24-hour time.'}</HelperTextItem>
          </HelperText>
          <Switch label="24-hour" isChecked={state.timeFormat === '24h'} onChange={handleTimeFormatSelect} />
        </FormGroup>
      </StackItem>
      <StackItem key={'timezone-select'}>
        <FormGroup>
          <HelperText>
            <HelperTextItem>{'Select current timezone.'}</HelperTextItem>
          </HelperText>
          <TimezonePicker
            selected={state.timeZone}
            menuAppendTo="parent"
            isFlipEnabled
            onTimezoneChange={handleTimezoneSelect}
          />
        </FormGroup>
      </StackItem>
    </Stack>
  );
};

export const DatetimeControl: UserSetting = {
  title: 'Date & Time',
  description: '',
  content: Component,
  category: 'Language & Region',
};
