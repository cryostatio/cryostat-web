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
import { ServiceContext } from '@app/Shared/Services/Services';
import { useSubscriptions } from '@app/utils/hooks/useSubscriptions';
import { portalRoot } from '@app/utils/utils';
import { useCryostatTranslation } from '@i18n/i18nextUtil';
import { MenuToggle, MenuToggleElement, Select, SelectList, SelectOption } from '@patternfly/react-core';
import * as React from 'react';
import { SettingTab, UserSetting } from '../types';
import { isDevNodeEnv } from '../utils';

const Component = () => {
  const { t } = useCryostatTranslation();
  const context = React.useContext(ServiceContext);
  const addSubscription = useSubscriptions();
  const [featureLevel, setFeatureLevel] = React.useState(FeatureLevel.PRODUCTION);
  const [open, setOpen] = React.useState(false);

  React.useLayoutEffect(() => {
    addSubscription(context.settings.featureLevel().subscribe(setFeatureLevel));
  }, [addSubscription, context.settings, setFeatureLevel]);

  const handleToggle = React.useCallback(() => setOpen((v) => !v), [setOpen]);

  const handleSelect = React.useCallback(
    (_, v) => {
      setFeatureLevel(v.value);
      context.settings.setFeatureLevel(v.value);
      setOpen(false);
    },
    [setFeatureLevel, setOpen, context.settings],
  );

  const toggle = React.useCallback(
    (toggleRef: React.Ref<MenuToggleElement>) => (
      <MenuToggle
        aria-label={t('SETTINGS.FEATURE_LEVEL.MENU_TOGGLE')}
        ref={toggleRef}
        onClick={handleToggle}
        isExpanded={open}
        isFullWidth
      >
        {t(FeatureLevel[featureLevel])}
      </MenuToggle>
    ),
    [handleToggle, open, featureLevel, t],
  );

  return (
    <>
      <Select
        isOpen={open}
        selected={featureLevel}
        onSelect={handleSelect}
        popperProps={{
          enableFlip: true,
          appendTo: portalRoot,
        }}
        toggle={toggle}
        onOpenChange={setOpen}
        onOpenChangeKeys={['Escape']}
      >
        <SelectList>
          {Object.values(FeatureLevel)
            .filter((v) => typeof v === 'string')
            .map((v): { key: string; value: number } => ({ key: v.toString(), value: FeatureLevel[v] }))
            .filter((v) => isDevNodeEnv() || v.value !== FeatureLevel.DEVELOPMENT)
            .map((level) => (
              <SelectOption
                key={level.key}
                value={level}
                isSelected={featureLevel == level.value}
                description={t(`SETTINGS.FEATURE_LEVEL.${level.key}_DESCRIPTION`)}
              >
                {t(level.key)}
              </SelectOption>
            ))}
        </SelectList>
      </Select>
    </>
  );
};

export const FeatureLevels: UserSetting = {
  titleKey: 'SETTINGS.FEATURE_LEVEL.TITLE',
  descConstruct: 'SETTINGS.FEATURE_LEVEL.DESCRIPTION',
  content: Component,
  category: SettingTab.ADVANCED,
};
