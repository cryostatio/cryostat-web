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
import { TimezonePicker } from '@app/DateTimePicker/TimezonePicker';
import { ServiceContext } from '@app/Shared/Services/Services';
import useDayjs from '@app/utils/hooks/useDayjs';
import { locales, Timezone } from '@i18n/datetime';
import { FormGroup, HelperText, HelperTextItem, Select, SelectOption, Stack, StackItem } from '@patternfly/react-core';
import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { SettingTab, UserSetting } from '../types';

const Component = () => {
  const [t] = useTranslation();
  const context = React.useContext(ServiceContext);
  const [dateLocaleOpen, setDateLocaleOpen] = React.useState(false);
  const [_, datetimeFormat] = useDayjs();

  const handleDateLocaleSelect = React.useCallback(
    (_, locale) => {
      setDateLocaleOpen(false);
      context.settings.setDatetimeFormat({
        ...datetimeFormat,
        dateLocale: {
          name: locale.name,
          key: locale.key,
        },
      });
    },
    [context.settings, datetimeFormat, setDateLocaleOpen],
  );

  const handleTimezoneSelect = React.useCallback(
    (timezone: Timezone) => {
      context.settings.setDatetimeFormat({
        ...datetimeFormat,
        timeZone: {
          short: timezone.short,
          full: timezone.full,
        },
      });
    },
    [context.settings, datetimeFormat],
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
    [],
  );

  const handleDateLocaleFilter = React.useCallback(
    (_, value: string) => {
      if (!value) {
        return dateLocaleOptions;
      }
      const matchExp = new RegExp(value, 'i');
      return dateLocaleOptions.filter(
        (opt) => matchExp.test(opt.props.value.name) || matchExp.test(opt.props.description),
      );
    },
    [dateLocaleOptions],
  );

  return (
    <Stack hasGutter>
      <StackItem key={'date-locale-select'}>
        <FormGroup>
          <HelperText>
            <HelperTextItem>{t('SETTINGS.DATETIME_CONTROL.LOCALE_SELECT_DESCRIPTION')}</HelperTextItem>
          </HelperText>
          <Select
            aria-label={t('SETTINGS.DATETIME_CONTROL.ARIA_LABELS.LOCALE_SELECT') || ''}
            isOpen={dateLocaleOpen}
            onToggle={setDateLocaleOpen}
            isFlipEnabled
            menuAppendTo="parent"
            selections={{
              ...datetimeFormat.dateLocale,
              toString: () => datetimeFormat.dateLocale.name,
              compareTo: (val) => datetimeFormat.dateLocale.name === val.name,
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
      <StackItem key={'timezone-select'}>
        <FormGroup>
          <HelperText>
            <HelperTextItem>{t('SETTINGS.DATETIME_CONTROL.TIMEZONE_SELECT_DESCRIPTION')}</HelperTextItem>
          </HelperText>
          <TimezonePicker
            selected={datetimeFormat.timeZone}
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
  titleKey: 'SETTINGS.DATETIME_CONTROL.TITLE',
  descConstruct: 'SETTINGS.DATETIME_CONTROL.DESCRIPTION',
  content: Component,
  category: SettingTab.GENERAL,
};
