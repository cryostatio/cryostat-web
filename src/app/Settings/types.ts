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
import { LabelProps } from '@patternfly/react-core';

export interface _TransformedUserSetting extends Omit<UserSetting, 'content'> {
  title: string;
  description: React.ReactNode;
  element: React.ReactNode;
  orderInGroup: number;
  featureLevel: FeatureLevel;
}

export enum SettingTab {
  GENERAL = 'SETTINGS.CATEGORIES.GENERAL',
  CONNECTIVITY = 'SETTINGS.CATEGORIES.CONNECTIVITY',
  NOTIFICATION_MESSAGE = 'SETTINGS.CATEGORIES.NOTIFICATION_MESSAGE',
  DASHBOARD = 'SETTINGS.CATEGORIES.DASHBOARD',
  TOPOLOGY = 'SETTINGS.CATEGORIES.TOPOLOGY',
  ADVANCED = 'SETTINGS.CATEGORIES.ADVANCED',
}

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
}

export enum ThemeSetting {
  AUTO = 'auto',
  DARK = 'dark',
  LIGHT = 'light',
}

export type ThemeType = Exclude<ThemeSetting, ThemeSetting.AUTO>;

export enum Palette {
  DEFAULT = 'DEFAULT',
  HIGH_CONTRAST = 'HIGH_CONTRAST',
  MONOCHROME_BLUE = 'MONOCHROME_BLUE',
  MONOCHROME_ORANGE = 'MONOCHROME_ORANGE',
}

export interface ColourPalette {
  primary(): [LabelProps['color'], string];
  secondary(): [LabelProps['color'], string];
  tertiary(): [LabelProps['color'], string];
  accent(): [LabelProps['color'], string];
  neutral(): [LabelProps['color'], string];
}

export const DefaultColourPalette: ColourPalette = {
  primary: () => ['green', 'var(--pf-v5-global--success-color--100)'],
  secondary: () => ['orange', 'var(--pf-v5-global--warning-color--100)'],
  tertiary: () => ['red', 'var(--pf-v5-global--danger-color--100)'],
  accent: () => ['blue', 'var(--pf-v5-global--primary-color--100)'],
  neutral: () => ['grey', 'var(--pf-v5-global---color--200)'],
};

export const MonochromeBlueColourPalette: ColourPalette = {
  primary: () => ['cyan', 'var(--pf-v5-global--palette--blue-200)'],
  secondary: () => ['blue', 'var(--pf-v5-global--palette--blue-300)'],
  tertiary: () => ['purple', 'var(--pf-v5-global--palette--blue-500)'],
  accent: () => ['gold', 'var(--pf-v5-global--palette--orange-200)'],
  neutral: () => ['grey', 'var(--pf-v5-global--color--200)'],
};

export const MonochromeOrangeColourPalette: ColourPalette = {
  primary: () => ['gold', 'var(--pf-v5-global--palette--gold-200)'],
  secondary: () => ['orange', 'var(--pf-v5-global--palette--orange-300)'],
  tertiary: () => ['red', 'var(--pf-v5-global--palette--red-100)'],
  accent: () => ['cyan', 'var(--pf-v5-global--palette--blue-200)'],
  neutral: () => ['grey', 'var(--pf-v5-global--color--200)'],
};

export const HighContrastColourPalette: ColourPalette = {
  primary: () => ['green', 'var(--pf-v5-global--palette--green-300)'],
  secondary: () => ['purple', 'var(--pf-v5-global--palette--purple-300)'],
  tertiary: () => ['gold', 'var(--pf-v5-global--palette--gold-300)'],
  accent: () => ['cyan', 'var(--pf-v5-global--palette--cyan-400)'],
  neutral: () => ['grey', 'var(--pf-v5-global--color--200)'],
};

export function getPaletteColours(palette: Palette): ColourPalette {
  switch (palette) {
    case Palette.MONOCHROME_BLUE:
      return MonochromeBlueColourPalette;
    case Palette.MONOCHROME_ORANGE:
      return MonochromeOrangeColourPalette;
    case Palette.HIGH_CONTRAST:
      return HighContrastColourPalette;
    default:
      return DefaultColourPalette;
  }
}

export interface SettingGroup {
  groupLabel: SettingTab;
  groupKey: string;
  featureLevel: FeatureLevel;
  disabled?: boolean;
  settings: _TransformedUserSetting[];
}
