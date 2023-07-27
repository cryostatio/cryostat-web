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
/// <reference path="datetime.typings.d.ts" />
import dayjs from 'dayjs';
import localeJson from 'dayjs/locale.json';
import advancedFormat from 'dayjs/plugin/advancedFormat';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import localeData from 'dayjs/plugin/localeData';
import localizedFormat from 'dayjs/plugin/localizedFormat';
import timezone from 'dayjs/plugin/timezone'; // dependent on utc plugin
import utc from 'dayjs/plugin/utc';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(localeData);
dayjs.extend(localizedFormat);
dayjs.extend(customParseFormat);
dayjs.extend(advancedFormat);

export default dayjs;

export const locales = localeJson
  .map((locale) => ({
    ...locale,
    // Dynamic locale loading
    // Need to include .js to skip parsing .d.ts
    load: () => import(`dayjs/locale/${locale.key}.js`),
  }))
  .sort((a, b) => a.key.localeCompare(b.key));

export const getLocale = (key: string) => {
  return locales.find((l) => l.key === key);
};

export const timezones = (
  typeof Intl.supportedValuesOf === 'undefined' ? [] : Intl.supportedValuesOf('timeZone')
) as string[];

export interface Timezone {
  full: string;
  short: string;
}

export interface DatetimeFormat {
  dateLocale: {
    name: string;
    key: string;
  };
  timeZone: Timezone;
}

export const defaultDatetimeFormat: DatetimeFormat = {
  dateLocale: {
    key: 'en',
    name: 'English',
  }, // default en
  timeZone: {
    // guess current timezone
    full: dayjs.tz.guess(),
    short: dayjs().tz(dayjs.tz.guess()).format('z'),
  } as Timezone,
};

export const localTimezone = {
  full: dayjs.tz.guess(),
  short: dayjs().tz(dayjs.tz.guess()).format('z'),
} as Timezone;

export const UTCTimezone = {
  full: 'UTC',
  short: 'UTC',
} as Timezone;

export const supportedTimezones = () =>
  !timezones.length
    ? [localTimezone, UTCTimezone]
    : timezones.map(
        (tname) =>
          ({
            full: tname,
            short: dayjs().tz(tname).format('z'), // Get abbreviation
          } as Timezone)
      );

export const getTimezone = (short: string): Timezone | undefined => {
  return supportedTimezones().find((t) => t.short === short);
};
