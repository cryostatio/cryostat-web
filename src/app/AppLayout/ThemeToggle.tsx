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

import { ThemeSetting } from '@app/Settings/types';
import { ServiceContext } from '@app/Shared/Services/Services';
import { useTheme } from '@app/utils/hooks/useTheme';
import { Icon, ToggleGroup, ToggleGroupItem } from '@patternfly/react-core';
import { SunIcon, MoonIcon } from '@patternfly/react-icons';
import * as React from 'react';
import { useTranslation } from 'react-i18next';

export interface ThemeToggleProps {}

export const ThemeToggle: React.FC<ThemeToggleProps> = () => {
  const context = React.useContext(ServiceContext);
  const [_theme] = useTheme();
  const { t } = useTranslation();

  const handleThemeSelect = React.useCallback(
    (_, setting: ThemeSetting) => {
      context.settings.setThemeSetting(setting);
    },
    [context.settings],
  );

  return (
    <ToggleGroup className="theme__toggle-group">
      <ToggleGroupItem
        aria-label={t('ThemeToggle.ARIA_LABELS.LIGHT_THEME')}
        icon={
          <Icon>
            <SunIcon />
          </Icon>
        }
        buttonId="light-theme"
        isSelected={_theme === ThemeSetting.LIGHT}
        onClick={(e) => handleThemeSelect(e, ThemeSetting.LIGHT)}
      />
      <ToggleGroupItem
        aria-label={t('ThemeToggle.ARIA_LABELS.DARK_THEME')}
        icon={
          <Icon>
            <MoonIcon />
          </Icon>
        }
        buttonId="dark-theme"
        isSelected={_theme === ThemeSetting.DARK}
        onClick={(e) => handleThemeSelect(e, ThemeSetting.DARK)}
      />
    </ToggleGroup>
  );
};
