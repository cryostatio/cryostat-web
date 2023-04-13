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

import { ISortBy, SortByDirection } from '@patternfly/react-table';
import _ from 'lodash';
import { useHistory } from 'react-router-dom';
import { BehaviorSubject, Observable } from 'rxjs';

const SECOND_MILLIS = 1000;
const MINUTE_MILLIS = 60 * SECOND_MILLIS;
const HOUR_MILLIS = 60 * MINUTE_MILLIS;
const DAY_MILLIS = 24 * HOUR_MILLIS;

// [     0,    1,    2,    3     ] array
//       0     1     2     3       indexes
// {  0  |  1  |  2  |  3  |  4  } gap indices (drop zones)
/* eslint-disable @typescript-eslint/no-explicit-any */
export function move(arr: any[], from: number, gapIndex: number) {
  if (gapIndex > from) {
    gapIndex--;
  }
  arr.splice(gapIndex, 0, arr.splice(from, 1)[0]);
  return arr;
}

export function swap(arr: any[], from: number, to: number) {
  arr[from] = arr.splice(to, 1, arr[from])[0];
  return arr;
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export const openTabForUrl = (url: string) => {
  const anchor = document.createElement('a') as HTMLAnchorElement;
  anchor.setAttribute('href', url);
  anchor.setAttribute('target', '_blank');
  anchor.setAttribute('style', 'display: none; visibility: hidden;');

  anchor.click();
  anchor.remove();
};

export const createBlobURL = (content: string, contentType: string, timeout = 1000) => {
  const blob = new Blob([content], { type: contentType });
  const url = window.URL.createObjectURL(blob);
  setTimeout(() => window.URL.revokeObjectURL(url), timeout);
  return url;
};

export function accessibleRouteChangeHandler() {
  return window.setTimeout(() => {
    const mainContainer = document.getElementById('primary-app-container');
    if (mainContainer) {
      mainContainer.focus();
    }
  }, 50);
}

export const hashCode = (str: string): number => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0; // Force 32-bit number
  }
  return hash;
};

export const sizeUnits = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

export const formatBytes = (bytes: number, decimals = 2): string => {
  if (bytes <= 0) return '0 B';

  const k = 1024; // 1 KB
  const dm = Math.max(decimals, 0); // Decimal places

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizeUnits[i]}`;
};

export interface AutomatedAnalysisTimerObject {
  quantity: number;
  unit: string;
  interval: number;
}

export const calculateAnalysisTimer = (reportTime: number): AutomatedAnalysisTimerObject => {
  let interval, timerQuantity, timerUnits;
  const now = Date.now();
  const reportMillis = now - reportTime;
  if (reportMillis < MINUTE_MILLIS) {
    timerQuantity = Math.round(reportMillis / SECOND_MILLIS);
    interval = SECOND_MILLIS - (reportMillis % SECOND_MILLIS);
    timerUnits = 'second';
  } else if (reportMillis < HOUR_MILLIS) {
    timerQuantity = Math.round(reportMillis / MINUTE_MILLIS);
    interval = MINUTE_MILLIS - (reportMillis % MINUTE_MILLIS);
    timerUnits = 'minute';
  } else if (reportMillis < DAY_MILLIS) {
    timerQuantity = Math.round(reportMillis / HOUR_MILLIS);
    interval = HOUR_MILLIS - (reportMillis % HOUR_MILLIS);
    timerUnits = 'hour';
  } else {
    timerQuantity = Math.round(reportMillis / DAY_MILLIS);
    interval = DAY_MILLIS - reportMillis * DAY_MILLIS;
    timerUnits = 'day';
  }
  return {
    quantity: timerQuantity,
    unit: timerUnits,
    interval: interval,
  } as AutomatedAnalysisTimerObject;
};

export const splitWordsOnUppercase = (str: string, capitalizeFirst?: boolean): string[] => {
  const words = str.split(/(?=[A-Z])/);
  if (capitalizeFirst && words.length) {
    const first = words[0];
    words[0] = first.substring(0, 1).toUpperCase() + first.slice(1);
  }
  return words;
};

const needUppercase = /(url|id|jvm)/i;

export const getDisplayFieldName = (fieldName: string) => {
  return splitWordsOnUppercase(fieldName)
    .map((word) => {
      if (needUppercase.test(word)) {
        return _.upperCase(word);
      }
      return _.capitalize(word);
    })
    .join(' ');
};

export const evaluateTargetWithExpr = (target: unknown, matchExpression: string) => {
  const f = new Function('target', `return ${matchExpression}`);
  return f(_.cloneDeep(target));
};

export const portalRoot = document.getElementById('portal-root') || document.body;

export const cleanDataId = (key: string): string => {
  return key.toLocaleLowerCase().replace(/\s+/g, '');
};

export class StreamOf<T> {
  private readonly _stream$: BehaviorSubject<T>;

  constructor(first: T) {
    this._stream$ = new BehaviorSubject<T>(first);
  }

  get(): Observable<T> {
    return this._stream$.asObservable();
  }

  set(value: T): void {
    this._stream$.next(value);
  }
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export const getValue = (object: any, keyPath: string[]) => {
  return keyPath.reduce((acc, key) => acc[key], object);
};

/* eslint-enable @typescript-eslint/no-explicit-any */
export const sortResources = <R>(
  { index, direction }: ISortBy,
  resources: R[],
  mapper: (index?: number) => string[] | undefined,
  getTransform: (index?: number) => ((value: any, resource: R) => any) | undefined
): R[] => {
  const keyPaths = mapper(index);
  if (!keyPaths || !keyPaths.length) {
    return resources;
  }
  const transform = getTransform(index);
  const sorted = resources.sort((a, b) => {
    let aVal = getValue(a, keyPaths);
    let bVal = getValue(b, keyPaths);
    if (transform) {
      aVal = transform(aVal, a);
      bVal = transform(bVal, b);
    }
    return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
  });
  return [...(direction === SortByDirection.asc ? sorted : sorted.reverse())];
};

export interface TabConfig {
  tabKey: string;
  tabValue: string;
}

export const switchTab = (
  history: ReturnType<typeof useHistory>,
  pathname: string,
  search: string,
  { tabKey, tabValue }: TabConfig
) => {
  const query = new URLSearchParams(search);
  query.set(tabKey, tabValue);
  history.push(`${pathname}?${query.toString()}`);
};

export const getActiveTab = <T>(search: string, key: string, supportedTabs: T[], defaultTab: T) => {
  const query = new URLSearchParams(search);
  const tab = query.get(key) || defaultTab;
  return supportedTabs.includes(tab as T) ? (tab as T) : defaultTab;
};

export const clickOutside = () => document.body.click();
