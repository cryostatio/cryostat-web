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
import { useCryostatTranslation } from '@i18n/i18nextUtil';
import {
  FormGroup,
  HelperText,
  HelperTextItem,
  MenuToggle,
  MenuToggleElement,
  Select,
  SelectList,
  SelectOption,
  Stack,
  StackItem,
} from '@patternfly/react-core';
import * as React from 'react';
import { Palette, SettingTab, ThemeSetting, UserSetting } from '../types';

const Component = () => {
  const { t } = useCryostatTranslation();
  const context = React.useContext(ServiceContext);
  const [open, setOpen] = React.useState(false);
  const [palette, setPalette] = React.useState(Palette.DEFAULT);

  const handleToggle = React.useCallback(() => setOpen((v) => !v), [setOpen]);

  const handlePaletteSelect = React.useCallback(
    (_, setting: Palette) => {
      setPalette(setting);
      context.settings.setPalette(setting);
      setOpen(false);
    },
    [context.settings, setOpen],
  );

  const getPaletteDisplay = React.useCallback(
    (palette: Palette) => {
      return t(`SETTINGS.ACCESSIBILITY.PALETTES.${palette}`);
    },
    [t],
  );

  const toggle = React.useCallback(
    (toggleRef: React.Ref<MenuToggleElement>) => (
      <MenuToggle
        aria-label={t('SETTINGS.THEME.ARIA_LABELS.MENU_TOGGLE')}
        ref={toggleRef}
        onClick={handleToggle}
        isExpanded={open}
        isFullWidth
      >
        {getPaletteDisplay(palette)}
      </MenuToggle>
    ),
    [t, handleToggle, getPaletteDisplay, palette, open],
  );

  return (
    <Stack hasGutter>
      <StackItem key="accessibility-palette">
        <FormGroup>
          <HelperText>
            <HelperTextItem>{t('SETTINGS.ACCESSIBILITY.PALETTE_SELECT_DESCRIPTION')}</HelperTextItem>
          </HelperText>
          <Select
            aria-label={t('SETTINGS.ACCESSIBILITY.ARIA_LABELS.PALETTE_SELECT')}
            isOpen={open}
            onSelect={handlePaletteSelect}
            selected={palette}
            popperProps={{
              enableFlip: true,
              appendTo: portalRoot,
            }}
            toggle={toggle}
            onOpenChange={setOpen}
            onOpenChangeKeys={['Escape']}
          >
            <SelectList>
              {Object.values(Palette).map((palette) => (
                <SelectOption key={palette} value={palette}>
                  {getPaletteDisplay(palette)}
                </SelectOption>
              ))}
            </SelectList>
          </Select>
        </FormGroup>
      </StackItem>
    </Stack>
  );
};

export const Accessibility: UserSetting = {
  titleKey: 'SETTINGS.ACCESSIBILITY.TITLE',
  descConstruct: 'SETTINGS.ACCESSIBILITY.DESCRIPTION',
  content: Component,
  category: SettingTab.GENERAL,
  orderInGroup: 1,
};
