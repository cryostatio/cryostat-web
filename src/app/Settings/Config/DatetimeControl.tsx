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
import { portalRoot } from '@app/utils/utils';
import { locales, Timezone } from '@i18n/datetime';
import {
  Button,
  FormGroup,
  HelperText,
  HelperTextItem,
  MenuToggle,
  MenuToggleElement,
  Select,
  SelectList,
  SelectOption,
  Stack,
  StackItem,
  TextInputGroup,
  TextInputGroupMain,
  TextInputGroupUtilities,
} from '@patternfly/react-core';
import { TimesIcon } from '@patternfly/react-icons';
import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { SettingTab, UserSetting } from '../types';

const Component = () => {
  const { t } = useTranslation();
  const context = React.useContext(ServiceContext);
  const [dateLocaleOpen, setDateLocaleOpen] = React.useState(false);
  const [_, datetimeFormat] = useDayjs();
  const [filterValue, setFilterValue] = React.useState('');

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
      locales
        .filter((locale) => {
          if (!filterValue) {
            return true;
          }
          const matchExp = new RegExp(filterValue, 'i');
          return matchExp.test(locale.name) || matchExp.test(locale.key);
        })
        .map((locale) => (
          <SelectOption key={locale.key} description={locale.key} value={locale}>
            {locale.name}
          </SelectOption>
        )),
    [filterValue],
  );

  const onToggle = React.useCallback(() => setDateLocaleOpen((open) => !open), [setDateLocaleOpen]);

  const onInputChange = React.useCallback((_, value: string) => setFilterValue(value), [setFilterValue]);

  const toggle = React.useCallback(
    (toggleRef: React.Ref<MenuToggleElement>) => (
      <MenuToggle ref={toggleRef} variant="typeahead" onClick={onToggle} isExpanded={dateLocaleOpen} isFullWidth>
        <TextInputGroup isPlain>
          <TextInputGroupMain
            value={filterValue}
            onClick={onToggle}
            onChange={onInputChange}
            autoComplete="off"
            placeholder={t('SETTINGS.DATETIME_CONTROL.LOCALE_SELECT_DESCRIPTION')}
            isExpanded={dateLocaleOpen}
            role="combobox"
            id="typeahead-datetime-filter"
            aria-controls="typeahead-datetime-select"
            aria-label={t('SETTINGS.DATETIME_CONTROL.ARIA_LABELS.LOCALE_SELECT')}
          />
          <TextInputGroupUtilities>
            {filterValue ? (
              <Button
                variant="plain"
                onClick={() => {
                  setFilterValue('');
                }}
                aria-label="Clear input value"
              >
                <TimesIcon aria-hidden />
              </Button>
            ) : null}
          </TextInputGroupUtilities>
        </TextInputGroup>
      </MenuToggle>
    ),
    [onToggle, dateLocaleOpen, filterValue, onInputChange, setFilterValue, t],
  );

  return (
    <Stack hasGutter>
      <StackItem key={'date-locale-select'}>
        <FormGroup>
          <HelperText>
            <HelperTextItem>{t('SETTINGS.DATETIME_CONTROL.LOCALE_SELECT_DESCRIPTION')}</HelperTextItem>
          </HelperText>
          <Select
            aria-label={t('SETTINGS.DATETIME_CONTROL.ARIA_LABELS.LOCALE_SELECT')}
            isOpen={dateLocaleOpen}
            toggle={toggle}
            popperProps={{
              enableFlip: true,
              appendTo: portalRoot,
            }}
            selected={datetimeFormat.dateLocale}
            onSelect={handleDateLocaleSelect}
          >
            <SelectList>{dateLocaleOptions}</SelectList>
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
            menuAppendTo={portalRoot}
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
