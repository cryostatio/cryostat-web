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
import { clamp } from 'lodash';

export const isValidTimeStr = (timeValue: string) =>
  new Date('2022-01-01T' + timeValue + 'Z').toString() !== 'Invalid Date';

export const convert12HrTo24Hr = (timeIn12H: string): string | undefined => {
  const suffix = timeIn12H.substring(timeIn12H.length - 2, timeIn12H.length);
  const timeValue = (
    suffix === 'AM' || suffix === 'PM' ? timeIn12H.substring(0, timeIn12H.length - 2) : timeIn12H
  ).trim();
  if (!isValidTimeStr(timeValue)) {
    return undefined;
  }
  const str = timeValue.split(':');
  if (suffix === 'PM') {
    return `${Number(str[0]) + 12}:${str[1]}`;
  } else if (suffix === 'AM' && Number(str[0]) == 12) {
    // From 12:00AM - 12:59AM
    return `${Number(str[0]) - 12}:${str[1]}`;
  }
  return timeValue; // >= 1AM or not specified
};

export const hourIn12HrFormat = (hourIn24h: number): number => {
  hourIn24h = clamp(hourIn24h, 0, 23);
  if (hourIn24h > 12) {
    return hourIn24h - 12;
  } else if (hourIn24h === 0) {
    return 12; // 12AM
  } else {
    return hourIn24h;
  }
};

export const format2Digit = (value: number): string => {
  return value.toLocaleString('en', {
    minimumIntegerDigits: 2,
  });
};
