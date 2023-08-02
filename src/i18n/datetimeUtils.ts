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

import dayjs from '@i18n/datetime';
import { clamp } from 'lodash';

export const hourIn12HrFormat = (hourIn24h: number): [number, boolean] => {
  // return [hour, isAM]
  hourIn24h = clamp(hourIn24h, 0, 23);
  if (hourIn24h > 12) {
    return [hourIn24h - 12, false];
  } else if (hourIn24h === 0) {
    return [12, true]; // 12AM
  } else {
    return [hourIn24h, true];
  }
};

export const hourIn24HrFormat = (hourIn12h: number, isAM: boolean): number => {
  hourIn12h = clamp(hourIn12h, 0, 12);
  return dayjs(`2023-01-01 ${hourIn12h}:00:00 ${isAM ? 'AM' : 'PM'}`, 'YY-MM-DD H:mm:ss A').hour();
};

export const isHourIn24hAM = (hourIn24h: number): boolean => {
  hourIn24h = clamp(hourIn24h, 0, 23);
  const marker = dayjs(`2023-01-01 12:00`);
  return dayjs(`2023-01-01 ${hourIn24h}:00`).isBefore(marker);
};

export const format2Digit = (value: number): string => {
  return value.toLocaleString('en', {
    minimumIntegerDigits: 2,
  });
};
