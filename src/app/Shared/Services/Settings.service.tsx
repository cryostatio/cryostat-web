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

import { DeleteOrDisableWarningType } from '@app/Modal/DeleteWarningUtils';
import { ThemeSetting } from '@app/Settings/SettingsUtils';
import { getFromLocalStorage, saveToLocalStorage } from '@app/utils/LocalStorage';
import { DatetimeFormat, defaultDatetimeFormat } from '@i18n/datetime';
import { BehaviorSubject, fromEvent, Observable, startWith } from 'rxjs';
import {
  AutomatedAnalysisRecordingConfig,
  automatedAnalysisRecordingName,
  ChartControllerConfig,
  defaultAutomatedAnalysisRecordingConfig,
  defaultChartControllerConfig,
  RecordingAttributes,
} from './Api.service';
import { NotificationCategory } from './NotificationChannel.service';

export enum FeatureLevel {
  DEVELOPMENT = 0,
  BETA = 1,
  PRODUCTION = 2,
}

export const automatedAnalysisConfigToRecordingAttributes = (
  config: AutomatedAnalysisRecordingConfig
): RecordingAttributes => {
  return {
    name: automatedAnalysisRecordingName,
    events: `template=${config.template.name},type=${config.template.type}`,
    duration: undefined,
    archiveOnStop: false,
    options: {
      toDisk: true,
      maxAge: config.maxAge,
      maxSize: config.maxSize,
    },
    metadata: {
      labels: {
        origin: automatedAnalysisRecordingName,
      },
    },
  } as RecordingAttributes;
};
export class SettingsService {
  private readonly _featureLevel$ = new BehaviorSubject<FeatureLevel>(
    getFromLocalStorage('FEATURE_LEVEL', FeatureLevel.PRODUCTION)
  );

  private readonly _visibleNotificationsCount$ = new BehaviorSubject<number>(
    getFromLocalStorage('VISIBLE_NOTIFICATIONS_COUNT', 5)
  );

  private readonly _datetimeFormat$ = new BehaviorSubject<DatetimeFormat>(
    getFromLocalStorage('DATETIME_FORMAT', defaultDatetimeFormat)
  );

  private readonly _theme$ = new BehaviorSubject<ThemeSetting>(getFromLocalStorage('THEME', ThemeSetting.AUTO));

  constructor() {
    this._featureLevel$.subscribe((featureLevel: FeatureLevel) => saveToLocalStorage('FEATURE_LEVEL', featureLevel));
    this._visibleNotificationsCount$.subscribe((count: number) =>
      saveToLocalStorage('VISIBLE_NOTIFICATIONS_COUNT', count)
    );
    this._datetimeFormat$.subscribe((format: DatetimeFormat) => saveToLocalStorage('DATETIME_FORMAT', format));
    this._theme$.subscribe((theme: ThemeSetting) => saveToLocalStorage('THEME', theme));
  }

  media(query: string): Observable<MediaQueryList> {
    const mediaQuery = window.matchMedia(query);
    return fromEvent<MediaQueryList>(mediaQuery, 'change').pipe(startWith(mediaQuery));
  }

  themeSetting(): Observable<ThemeSetting> {
    return this._theme$.asObservable();
  }

  setThemeSetting(theme: ThemeSetting): void {
    this._theme$.next(theme);
  }

  datetimeFormat(): Observable<DatetimeFormat> {
    return this._datetimeFormat$.asObservable();
  }

  setDatetimeFormat(format: DatetimeFormat) {
    this._datetimeFormat$.next(format);
  }

  featureLevel(): Observable<FeatureLevel> {
    return this._featureLevel$.asObservable();
  }

  setFeatureLevel(featureLevel: FeatureLevel): void {
    this._featureLevel$.next(featureLevel);
  }

  autoRefreshEnabled(): boolean {
    return getFromLocalStorage('AUTO_REFRESH_ENABLED', 'false') === 'true';
  }

  setAutoRefreshEnabled(enabled: boolean): void {
    saveToLocalStorage('AUTO_REFRESH_ENABLED', String(enabled));
  }

  autoRefreshPeriod(defaultPeriod = 30): number {
    return Number(getFromLocalStorage('AUTO_REFRESH_PERIOD', defaultPeriod));
  }

  setAutoRefreshPeriod(period: number): void {
    saveToLocalStorage('AUTO_REFRESH_PERIOD', String(period));
  }

  autoRefreshUnits(defaultUnits = 1000): number {
    return Number(getFromLocalStorage('AUTO_REFRESH_UNITS', defaultUnits));
  }

  setAutoRefreshUnits(units: number): void {
    saveToLocalStorage('AUTO_REFRESH_UNITS', String(units));
  }

  automatedAnalysisRecordingConfig(
    defaultConfig = defaultAutomatedAnalysisRecordingConfig
  ): AutomatedAnalysisRecordingConfig {
    return getFromLocalStorage('AUTOMATED_ANALYSIS_RECORDING_CONFIG', defaultConfig);
  }

  setAutomatedAnalysisRecordingConfig(config: AutomatedAnalysisRecordingConfig): void {
    saveToLocalStorage('AUTOMATED_ANALYSIS_RECORDING_CONFIG', config);
  }

  chartControllerConfig(defaultConfig = defaultChartControllerConfig): ChartControllerConfig {
    return getFromLocalStorage('CHART_CONTROLLER_CONFIG', defaultConfig);
  }

  setChartControllerConfig(config: ChartControllerConfig): void {
    saveToLocalStorage('CHART_CONTROLLER_CONFIG', config);
  }

  deletionDialogsEnabled(): Map<DeleteOrDisableWarningType, boolean> {
    const value = getFromLocalStorage('DELETION_DIALOGS_ENABLED', undefined);
    if (typeof value === 'object') {
      const obj = new Map<string, AutomatedAnalysisRecordingConfig>(Array.from(Object.entries(value)));
      const res = new Map<DeleteOrDisableWarningType, boolean>();
      obj.forEach((v) => {
        res.set(v[0] as DeleteOrDisableWarningType, v[1] as boolean);
      });
      for (const t in DeleteOrDisableWarningType) {
        if (!res.has(DeleteOrDisableWarningType[t])) {
          res.set(DeleteOrDisableWarningType[t], true);
        }
      }
      return res;
    }

    const map = new Map<DeleteOrDisableWarningType, boolean>();
    for (const cat in DeleteOrDisableWarningType) {
      map.set(DeleteOrDisableWarningType[cat], true);
    }
    this.setDeletionDialogsEnabled(map);
    return map;
  }

  deletionDialogsEnabledFor(type: DeleteOrDisableWarningType): boolean {
    const res = this.deletionDialogsEnabled().get(type);
    if (typeof res != 'boolean') {
      return true;
    }
    return res;
  }

  setDeletionDialogsEnabled(map: Map<DeleteOrDisableWarningType, boolean>): void {
    const value = Array.from(map.entries());
    saveToLocalStorage('DELETION_DIALOGS_ENABLED', value);
  }

  setDeletionDialogsEnabledFor(type: DeleteOrDisableWarningType, enabled: boolean) {
    const map = this.deletionDialogsEnabled();
    map.set(type, enabled);
    this.setDeletionDialogsEnabled(map);
  }

  visibleNotificationsCount(): Observable<number> {
    return this._visibleNotificationsCount$.asObservable();
  }

  setVisibleNotificationCount(count: number): void {
    this._visibleNotificationsCount$.next(count);
  }

  notificationsEnabled(): Map<NotificationCategory, boolean> {
    const value = getFromLocalStorage('NOTIFICATIONS_ENABLED', undefined);
    if (typeof value === 'object') {
      const res = new Map<NotificationCategory, boolean>();
      value.forEach((v: [NotificationCategory, boolean]) => {
        res.set(v[0], v[1]);
      });
      for (const t in NotificationCategory) {
        if (!res.has(NotificationCategory[t])) {
          res.set(NotificationCategory[t], true);
        }
      }
      return res;
    }
    const map = new Map<NotificationCategory, boolean>();
    for (const cat in NotificationCategory) {
      map.set(NotificationCategory[cat], true);
    }
    this.setNotificationsEnabled(map);
    return map;
  }

  notificationsEnabledFor(category: NotificationCategory): boolean {
    const res = this.notificationsEnabled().get(category);
    if (typeof res != 'boolean') {
      return true;
    }
    return res;
  }

  setNotificationsEnabled(map: Map<NotificationCategory, boolean>): void {
    const value = Array.from(map.entries());
    saveToLocalStorage('NOTIFICATIONS_ENABLED', value);
  }

  webSocketDebounceMs(defaultWebSocketDebounceMs = 100): number {
    return Number(getFromLocalStorage('WEBSOCKET_DEBOUNCE_MS', defaultWebSocketDebounceMs));
  }

  setWebSocketDebounceMs(debounce: number): void {
    saveToLocalStorage('WEBSOCKET_DEBOUNCE_MS', String(debounce));
  }
}
