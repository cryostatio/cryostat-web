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
import { useTheme } from '@app/utils/hooks/useTheme';
import { portalRoot } from '@app/utils/utils';
import { MenuToggle, MenuToggleElement, Select, SelectList, SelectOption } from '@patternfly/react-core';
import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { SettingTab, ThemeSetting, UserSetting } from '../types';

const Component = () => {
  const { t } = useTranslation();
  const context = React.useContext(ServiceContext);
  const [open, setOpen] = React.useState(false);
  const [_theme, themeSetting] = useTheme();

  const handleThemeToggle = React.useCallback(() => setOpen((v) => !v), [setOpen]);

  const handleThemeSelect = React.useCallback(
    (_, setting: ThemeSetting) => {
      context.settings.setThemeSetting(setting);
      setOpen(false);
    },
    [context.settings, setOpen],
  );

  const toggle = React.useCallback(
    (toggleRef: React.Ref<MenuToggleElement>) => (
      <MenuToggle ref={toggleRef} onClick={handleThemeToggle} isExpanded={open}>
        {themeSetting}
      </MenuToggle>
    ),
    [handleThemeToggle, open, themeSetting],
  );

  return (
    <Select
      isOpen={open}
      aria-label={t('SETTINGS.THEME.SELECT.LABEL')}
      onSelect={handleThemeSelect}
      selected={themeSetting}
      popperProps={{
        enableFlip: true,
        appendTo: portalRoot,
      }}
      toggle={toggle}
    >
      <SelectList>
        <SelectOption key="auto" value={ThemeSetting.AUTO}>
          {t('SETTINGS.THEME.AUTO')}
        </SelectOption>
        <SelectOption key="light" value={ThemeSetting.LIGHT}>
          {t('SETTINGS.THEME.LIGHT')}
        </SelectOption>
        <SelectOption key="dark" value={ThemeSetting.DARK}>
          {t('SETTINGS.THEME.DARK')}
        </SelectOption>
      </SelectList>
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
