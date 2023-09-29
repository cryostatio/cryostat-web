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

export enum LocalStorageKey {
  ASSET_VERSION,
  FEATURE_LEVEL,
  DASHBOARD_CFG,
  AUTOMATED_ANALYSIS_FILTERS,
  TARGET_RECORDING_FILTERS,
  CREDENTIAL_LOCATION,
  TARGET,
  TARGET_FAVORITES,
  TOPOLOGY_GRAPH_POSITONS,
  TOPOLOGY_NODE_POSITIONS,
  TOPOLOGY_CONFIG,
  TOPOLOGY_FILTERS,
  AUTO_REFRESH_ENABLED,
  AUTO_REFRESH_PERIOD,
  AUTO_REFRESH_UNITS,
  AUTOMATED_ANALYSIS_RECORDING_CONFIG,
  CHART_CONTROLLER_CONFIG,
  DELETION_DIALOGS_ENABLED,
  VISIBLE_NOTIFICATIONS_COUNT,
  NOTIFICATIONS_ENABLED,
  WEBSOCKET_DEBOUNCE_MS,
  DATETIME_FORMAT,
  MATCH_EXPRES_VIS_GRAPH_POSITIONS,
  MATCH_EXPRES_VIS_NODE_POSITIONS,
  THEME,
}

export type LocalStorageKeyStrings = keyof typeof LocalStorageKey;

export const getFromLocalStorage = <T>(key: LocalStorageKeyStrings, defaultValue: T): T => {
  if (typeof window === 'undefined') {
    return defaultValue;
  }
  try {
    const item = window.localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (error) {
    return defaultValue;
  }
};

export const saveToLocalStorage = <T>(key: LocalStorageKeyStrings, value: T, error?: () => void): void => {
  try {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(key, JSON.stringify(value));
    }
  } catch (err) {
    console.warn(err);
    error && error();
  }
};

export const removeFromLocalStorage = (key: LocalStorageKeyStrings, error?: () => void): void => {
  try {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(key);
    }
  } catch (err) {
    console.warn(err);
    error && error();
  }
};
