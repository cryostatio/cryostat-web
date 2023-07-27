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
import { FeatureLevel } from '@app/Shared/Services/Settings.service';
import { hashCode } from '@app/utils/utils';

export interface _TransformedUserSetting extends Omit<UserSetting, 'content'> {
  title: string;
  description: React.ReactNode;
  element: React.FC<Record<string, never>>;
  orderInGroup: number;
  featureLevel: FeatureLevel;
}

export enum SettingTab {
  GENERAL = 'SETTINGS.CATEGORIES.GENERAL',
  CONNECTIVITY = 'SETTINGS.CATEGORIES.CONNECTIVITY',
  NOTIFICATION_MESSAGE = 'SETTINGS.CATEGORIES.NOTIFICATION_MESSAGE',
  DASHBOARD = 'SETTINGS.CATEGORIES.DASHBOARD',
  ADVANCED = 'SETTINGS.CATEGORIES.ADVANCED',
}

export const tabAsParam = (key: SettingTab) => {
  const parts = key.split('.');
  return parts[parts.length - 1].toLowerCase().replace(/[_]/g, '-');
};

export const paramAsTab = (param: string) => {
  return `SETTINGS.CATEGORIES.${param.toUpperCase().replace(/[-]/g, '_')}`;
};

export interface UserSetting {
  titleKey: string;
  disabled?: boolean;
  // Translation Key or { Translation Key, React Component Parts }
  // https://react.i18next.com/latest/trans-component#how-to-get-the-correct-translation-string
  descConstruct:
    | string
    | {
        key: string;
        parts: React.ReactNode[];
      };
  content: React.FC;
  category: SettingTab;
  orderInGroup?: number; // default -1
  featureLevel?: FeatureLevel; // default PRODUCTION
  authenticated?: boolean;
}

export const selectTab = (tabKey: SettingTab) => {
  const tab = document.getElementById(`pf-tab-${tabKey}-${hashCode(tabKey)}`);
  tab && tab.click();
};

export const getDefaultTheme = (): ThemeSetting => {
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return ThemeSetting.DARK;
  }
  return ThemeSetting.LIGHT;
};

export enum ThemeSetting {
  AUTO = 'auto',
  DARK = 'dark',
  LIGHT = 'light',
}

export type ThemeType = Exclude<ThemeSetting, ThemeSetting.AUTO>;
