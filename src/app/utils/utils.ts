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

import { UPLOADS_SUBDIRECTORY } from '@app/Shared/Services/Api.service';
import { ISortBy, SortByDirection } from '@patternfly/react-table';
import _ from 'lodash';
import { useHistory } from 'react-router-dom';
import { BehaviorSubject, Observable } from 'rxjs';
import { getFromLocalStorage } from './LocalStorage';

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

export interface TableColumn {
  title: string;
  tooltip?: string;
  keyPaths?: string[];
  transform?: (value: unknown, _rec: unknown) => unknown;
  sortable?: boolean;
  width?: number;
}

const mapper = (tableColumns: TableColumn[], index?: number) => {
  if (index === undefined) {
    return undefined;
  }
  return tableColumns[index]?.keyPaths;
};

const getTransform = (tableColumns: TableColumn[], index?: number) => {
  if (index === undefined) {
    return undefined;
  }
  return tableColumns[index]?.transform;
};

/* eslint-disable @typescript-eslint/no-explicit-any */
export const getValue = (object: any, keyPath: string[]) => {
  return keyPath.reduce((acc, key) => acc[key], object);
};

// Returned a newly sorted array)
export const sortResources = <R>({ index, direction }: ISortBy, resources: R[], tableColumns: TableColumn[]): R[] => {
  const keyPaths = mapper(tableColumns, index);
  if (!keyPaths || !keyPaths.length) {
    return [...resources];
  }
  const transform = getTransform(tableColumns, index);
  const sorted = [...resources].sort((a, b) => {
    let aVal = getValue(a, keyPaths);
    let bVal = getValue(b, keyPaths);
    if (transform) {
      aVal = transform(aVal, a);
      bVal = transform(bVal, b);
    }
    return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
  });
  return direction === SortByDirection.asc ? sorted : sorted.reverse();
};

/* eslint-enable @typescript-eslint/no-explicit-any */
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

export interface SemVer {
  major: number;
  minor: number;
  patch: number;
}

// https://semver.org/#is-there-a-suggested-regular-expression-regex-to-check-a-semver-string
export const semverRegex =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/;

export const getSemVer = (str: string): SemVer | undefined => {
  const matched = str.match(semverRegex);
  if (matched) {
    const [_, major, minor, patch] = matched;
    return {
      major: Number(major),
      minor: Number(minor),
      patch: Number(patch),
    };
  }
  return undefined;
};

const convert = (ver: SemVer) => ver.major * 100 + ver.minor * 10 + ver.patch;

export const compareSemVer = (ver1: SemVer, ver2: SemVer): number => {
  const _ver1 = convert(ver1);
  const _ver2 = convert(ver2);
  return _ver1 > _ver2 ? 1 : _ver1 < _ver2 ? -1 : 0;
};

export const isAssetNew = (currVerStr: string) => {
  const oldVer = getSemVer(getFromLocalStorage('ASSET_VERSION', '0.0.0'));
  const currVer = getSemVer(currVerStr);

  if (!currVer) {
    throw new Error(`Invalid asset version: ${currVer}`);
  }
  // Invalid (old) version is ignored.
  return !oldVer || compareSemVer(currVer, oldVer) > 0;
};

export const utf8ToBase32 = (str: string): string => {
  const encoder = new TextEncoder();
  const byteArray = encoder.encode(str);
  const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = 0;
  let value = 0;
  let base32 = '';

  for (let i = 0; i < byteArray.length; i++) {
    value = (value << 8) | byteArray[i];
    bits += 8;
    while (bits >= 5) {
      bits -= 5;
      base32 += BASE32_ALPHABET[(value >>> bits) & 0x1f];
    }
  }

  if (bits > 0) {
    value <<= 5 - bits;
    base32 += BASE32_ALPHABET[value & 0x1f];
  }

  const paddingLength = base32.length % 8 !== 0 ? 8 - (base32.length % 8) : 0;
  for (let i = 0; i < paddingLength; i++) {
    base32 += '=';
  }

  return base32;
};

export const jvmIdToSubdirectoryName = (jvmId: string): string => {
  if (jvmId === UPLOADS_SUBDIRECTORY || jvmId === 'lost') {
    return jvmId;
  }
  return utf8ToBase32(jvmId);
};
