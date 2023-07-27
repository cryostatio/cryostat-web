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

import { ServiceContext } from '@app/Shared/Services/Services';
import dayjs, { DatetimeFormat, defaultDatetimeFormat, getLocale } from '@i18n/datetime';
import * as React from 'react';
import { concatMap, from, of, Subscription } from 'rxjs';

export function useDayjs(): [typeof dayjs, DatetimeFormat] {
  const _localeSubRef = React.useRef<Subscription[]>([]);
  const _services = React.useContext(ServiceContext);
  const [datetimeContext, setDatetimeContext] = React.useState<DatetimeFormat>(defaultDatetimeFormat);

  React.useEffect(() => () => _localeSubRef.current.forEach((s: Subscription): void => s.unsubscribe()), []);

  React.useEffect(() => {
    _localeSubRef.current = _localeSubRef.current.concat([
      _services.settings
        .datetimeFormat()
        .pipe(
          concatMap((f: DatetimeFormat) => {
            const locale = getLocale(f.dateLocale.key);
            if (locale) {
              return dayjs.locale() === f.dateLocale.key // only load if not yet
                ? of(f)
                : from(
                    locale
                      .load()
                      .then(() => {
                        dayjs.locale(locale.key); // Load globally
                        return f;
                      })
                      .catch((err) => {
                        console.warn(err);
                        return f;
                      })
                  );
            } else {
              console.warn(`${f.dateLocale.name} (${f.dateLocale.key}) is not supported.`);
              return of(f);
            }
          })
        )
        .subscribe(setDatetimeContext),
    ]);
  }, [_services.settings, setDatetimeContext, _localeSubRef]);

  return [dayjs, datetimeContext];
}

export default useDayjs;
