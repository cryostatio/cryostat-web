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
import { TimezonePicker } from '@app/DateTimePicker/TimezonePicker';
import { ServiceContext } from '@app/Shared/Services/Services';
import useDayjs from '@app/utils/useDayjs';
import { locales, Timezone } from '@i18n/datetime';
import { FormGroup, HelperText, HelperTextItem, Select, SelectOption, Stack, StackItem } from '@patternfly/react-core';
import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { SettingTab, UserSetting } from './SettingsUtils';

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
    [context.settings, datetimeFormat, setDateLocaleOpen]
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
    [context.settings, datetimeFormat]
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
