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
import { ServiceContext } from '@app/Shared/Services/Services';
import { useTheme } from '@app/utils/useTheme';
import { Select, SelectOption } from '@patternfly/react-core';
import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { SettingTab, ThemeSetting, UserSetting } from './SettingsUtils';

const Component = () => {
  const { t } = useTranslation();
  const context = React.useContext(ServiceContext);
  const [open, setOpen] = React.useState(false);
  const [_theme, setting] = useTheme();

  const handleThemeToggle = React.useCallback(() => setOpen((v) => !v), [setOpen]);

  const handleThemeSelect = React.useCallback(
    (_, v) => {
      context.settings.setThemeSetting(v as ThemeSetting);
      setOpen(false);
    },
    [context.settings, setOpen],
  );

  return (
    <Select
      isOpen={open}
      aria-label={t('SETTINGS.THEME.SELECT.LABEL')}
      onToggle={handleThemeToggle}
      onSelect={handleThemeSelect}
      selections={setting}
      isFlipEnabled
      menuAppendTo="parent"
    >
      <SelectOption key="auto" value="auto">
        {t('SETTINGS.THEME.AUTO')}
      </SelectOption>
      <SelectOption key="light" value="light">
        {t('SETTINGS.THEME.LIGHT')}
      </SelectOption>
      <SelectOption key="dark" value="dark">
        {t('SETTINGS.THEME.DARK')}
      </SelectOption>
    </Select>
  );
};

export const Theme: UserSetting = {
  titleKey: 'SETTINGS.THEME.TITLE',
  descConstruct: 'SETTINGS.THEME.DESCRIPTION',
  content: Component,
  category: SettingTab.GENERAL,
  orderInGroup: 2,
};
