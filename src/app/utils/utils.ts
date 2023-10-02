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

import { UPLOADS_SUBDIRECTORY } from '@app/Shared/Services/api.types';
import { ISortBy, SortByDirection } from '@patternfly/react-table';
import _ from 'lodash';
import { NavigateFunction } from 'react-router-dom';
import { BehaviorSubject, Observable } from 'rxjs';
import semverGt from 'semver/functions/gt';
import semverValid from 'semver/functions/valid';
import { getFromLocalStorage } from './LocalStorage';

const SECOND_MILLIS = 1000;
const MINUTE_MILLIS = 60 * SECOND_MILLIS;
const HOUR_MILLIS = 60 * MINUTE_MILLIS;
const DAY_MILLIS = 24 * HOUR_MILLIS;

/**
 *
 * [     0,    1,    2,    3     ] array
 *       0     1     2     3       indexes
 * {  0  |  1  |  2  |  3  |  4  } gap indices (drop zones)
 */
export const move = <T>(arr: T[], from: number, gapIndex: number): T[] => {
  if (gapIndex > from) {
    gapIndex--;
  }
  arr.splice(gapIndex, 0, arr.splice(from, 1)[0]);
  return arr;
};

export const swap = <T>(arr: T[], from: number, to: number): T[] => {
  arr[from] = arr.splice(to, 1, arr[from])[0];
  return arr;
};

export const openTabForUrl = (url: string): void => {
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

export const accessibleRouteChangeHandler = () => {
  return window.setTimeout(() => {
    const mainContainer = document.getElementById('primary-app-container');
    if (mainContainer) {
      mainContainer.focus();
    }
  }, 50);
};

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
  let interval: number, timerQuantity: number, timerUnits: string;
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

export const getDisplayFieldName = (fieldName: string): string => {
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

export const getValue = <R>(object: R, keyPath: string[]) => {
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

export interface TabConfig {
  tabKey: string;
  tabValue: string;
}

export const switchTab = (
  navigate: NavigateFunction,
  pathname: string,
  search: string,
  { tabKey, tabValue }: TabConfig,
) => {
  const query = new URLSearchParams(search);
  query.set(tabKey, tabValue);
  navigate(`${pathname}?${query.toString()}`);
};

export const getActiveTab = <T>(search: string, key: string, supportedTabs: T[], defaultTab: T) => {
  const query = new URLSearchParams(search);
  const tab = query.get(key) || defaultTab;
  return supportedTabs.includes(tab as T) ? (tab as T) : defaultTab;
};

export const clickOutside = () => document.body.click();

export const isAssetNew = (currVer: string) => {
  const oldVer: string = getFromLocalStorage('ASSET_VERSION', '0.0.0');
  return !semverValid(oldVer) || semverGt(currVer, oldVer);
};

export const includesSubstr = (a: string, b: string): boolean =>
  !!a && !!b && a.toLowerCase().includes(b.trim().toLowerCase());
