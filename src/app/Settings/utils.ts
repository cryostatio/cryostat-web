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

import { FeatureLevel } from '@app/Shared/Services/service.types';
import { hashCode } from '@app/utils/utils';
import { SettingTab, ThemeSetting, _TransformedUserSetting } from './types';

export const tabAsParam = (key: SettingTab) => {
  const parts = key.split('.');
  return parts[parts.length - 1].toLowerCase().replace(/[_]/g, '-');
};

export const paramAsTab = (param: string) => {
  return `SETTINGS.CATEGORIES.${param.toUpperCase().replace(/[-]/g, '_')}`;
};

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

export const getGroupFeatureLevel = (settings: _TransformedUserSetting[]): FeatureLevel => {
  if (!settings.length) {
    return FeatureLevel.DEVELOPMENT;
  }
  return settings.slice().sort((a, b) => b.featureLevel - a.featureLevel)[0].featureLevel;
};

export const isDevNodeEnv = () => (process.env.NODE_ENV ?? '').toLowerCase() === 'development';
