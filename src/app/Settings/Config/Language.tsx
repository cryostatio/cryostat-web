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
import { portalRoot } from '@app/utils/utils';
import { i18nLanguages, i18nResources } from '@i18n/config';
import { localeReadable } from '@i18n/i18nextUtil';
import { MenuToggle, MenuToggleElement, Select, SelectList, SelectOption } from '@patternfly/react-core';
import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { SettingTab, UserSetting } from '../types';

const Component = () => {
  const [t, i18n] = useTranslation();
  const [open, setOpen] = React.useState(false);

  const handleLanguageToggle = React.useCallback(() => setOpen((v) => !v), [setOpen]);

  const handleLanguageSelect = React.useCallback(
    (_, language: string) => {
      i18n.changeLanguage(language);
      setOpen(false);
    },
    [i18n, setOpen],
  );

  React.useEffect(() => {
    if (!i18nLanguages.includes(i18n.language)) {
      i18n.changeLanguage('en');
    }
  }, [i18n, i18n.language]);

  const toggle = React.useCallback(
    (toggleRef: React.Ref<MenuToggleElement>) => (
      <MenuToggle ref={toggleRef} onClick={handleLanguageToggle} isExpanded={open}>
        {i18n.language}
      </MenuToggle>
    ),
    [handleLanguageToggle, open, i18n.language],
  );

  return (
    <Select
      isOpen={open}
      aria-label={t('SETTINGS.LANGUAGE.ARIA_LABELS.SELECT')}
      toggle={toggle}
      onSelect={handleLanguageSelect}
      selected={i18n.language}
      popperProps={{
        enableFlip: true,
        appendTo: portalRoot,
      }}
    >
      <SelectList>
        {Object.keys(i18nResources).map((l) => (
          <SelectOption key={l} value={l}>
            {localeReadable(l)}
          </SelectOption>
        ))}
      </SelectList>
    </Select>
  );
};

export const Language: UserSetting = {
  titleKey: 'SETTINGS.LANGUAGE.TITLE',
  descConstruct: 'SETTINGS.LANGUAGE.DESCRIPTION',
  content: Component,
  category: SettingTab.GENERAL,
  orderInGroup: 1,
  featureLevel: FeatureLevel.BETA,
};
