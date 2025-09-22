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
import { useSubscriptions } from '@app/utils/hooks/useSubscriptions';
import { portalRoot } from '@app/utils/utils';
import { useCryostatTranslation } from '@i18n/i18nextUtil';
import {
  FormGroup,
  HelperText,
  HelperTextItem,
  Label,
  LabelGroup,
  MenuToggle,
  MenuToggleElement,
  Select,
  SelectList,
  SelectOption,
  Stack,
  StackItem,
  Switch,
} from '@patternfly/react-core';
import * as React from 'react';
import { getPaletteColours, Palette, SettingTab, UserSetting } from '../types';

const Component = () => {
  const { t } = useCryostatTranslation();
  const context = React.useContext(ServiceContext);
  const addSubscription = useSubscriptions();
  const [paletteOpen, setPaletteOpen] = React.useState(false);
  const [palette, setPalette] = React.useState(Palette.DEFAULT);
  const [largeUi, setLargeUi] = React.useState(false);

  React.useEffect(() => {
    addSubscription(context.settings.palette().subscribe(setPalette));
    addSubscription(context.settings.largeUi().subscribe(setLargeUi));
  }, [addSubscription, context.settings, setPalette, setLargeUi]);

  const handlePaletteToggle = React.useCallback(() => setPaletteOpen((v) => !v), [setPaletteOpen]);

  const handlePaletteSelect = React.useCallback(
    (_, setting: Palette) => {
      context.settings.setPalette(setting);
      setPaletteOpen(false);
    },
    [context.settings, setPaletteOpen],
  );

  const handleSetLargeUi = React.useCallback(
    (_: any, largeUi: boolean) => {
      context.settings.setLargeUi(largeUi);
    },
    [context.settings],
  );

  const getPaletteDisplay = React.useCallback(
    (palette: Palette) => {
      return t(`SETTINGS.ACCESSIBILITY.PALETTES.${palette}`);
    },
    [t],
  );

  const paletteToggle = React.useCallback(
    (toggleRef: React.Ref<MenuToggleElement>) => (
      <MenuToggle
        aria-label={t('SETTINGS.THEME.ARIA_LABELS.MENU_TOGGLE')}
        ref={toggleRef}
        onClick={handlePaletteToggle}
        isExpanded={paletteOpen}
        isFullWidth
      >
        {getPaletteDisplay(palette)}
      </MenuToggle>
    ),
    [t, handlePaletteToggle, getPaletteDisplay, palette, paletteOpen],
  );

  return (
    <Stack hasGutter>
      <StackItem key="accessibility-palette">
        <FormGroup>
          <HelperText>
            <HelperTextItem>{t('SETTINGS.ACCESSIBILITY.PALETTE_SELECT_DESCRIPTION')}</HelperTextItem>
          </HelperText>
          <Stack hasGutter>
            <StackItem>
              <Select
                aria-label={t('SETTINGS.ACCESSIBILITY.ARIA_LABELS.PALETTE_SELECT')}
                isOpen={paletteOpen}
                onSelect={handlePaletteSelect}
                selected={palette}
                popperProps={{
                  enableFlip: true,
                  appendTo: portalRoot,
                }}
                toggle={paletteToggle}
                onOpenChange={setPaletteOpen}
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
            </StackItem>
            <StackItem>
              <HelperText>
                <HelperTextItem>{t('SETTINGS.ACCESSIBILITY.PALETTE_PREVIEW_DESCRIPTION')}</HelperTextItem>
              </HelperText>
              <LabelGroup numLabels={6}>
                <Label isCompact={!largeUi} color={getPaletteColours(palette).primary()[0]}>
                  {t('SETTINGS.ACCESSIBILITY.PALETTE_PREVIEW.PRIMARY')}
                </Label>
                <Label isCompact={!largeUi} color={getPaletteColours(palette).secondary()[0]}>
                  {t('SETTINGS.ACCESSIBILITY.PALETTE_PREVIEW.SECONDARY')}
                </Label>
                <Label isCompact={!largeUi} color={getPaletteColours(palette).tertiary()[0]}>
                  {t('SETTINGS.ACCESSIBILITY.PALETTE_PREVIEW.TERTIARY')}
                </Label>
                <Label isCompact={!largeUi} color={getPaletteColours(palette).accent()[0]}>
                  {t('SETTINGS.ACCESSIBILITY.PALETTE_PREVIEW.ACCENT')}
                </Label>
                <Label isCompact={!largeUi} color={getPaletteColours(palette).neutral()[0]}>
                  {t('SETTINGS.ACCESSIBILITY.PALETTE_PREVIEW.NEUTRAL')}
                </Label>
              </LabelGroup>
            </StackItem>
          </Stack>
        </FormGroup>
      </StackItem>
      <StackItem key="large-ui-elements">
        <FormGroup>
          <HelperText>
            <HelperTextItem>{t('SETTINGS.ACCESSIBILITY.LARGE_UI_DESCRIPTION')}</HelperTextItem>
          </HelperText>
        </FormGroup>
        <Switch
          aria-label={t('SETTINGS.ACCESSIBILITY.ARIA_LABELS.LARGE_UI')}
          isChecked={largeUi}
          onChange={handleSetLargeUi}
        />
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
