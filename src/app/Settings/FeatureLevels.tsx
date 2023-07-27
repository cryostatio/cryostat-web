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
import { FeatureLevel } from '@app/Shared/Services/Settings.service';
import { useSubscriptions } from '@app/utils/useSubscriptions';
import { Select, SelectOption } from '@patternfly/react-core';
import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { SettingTab, UserSetting } from './SettingsUtils';

const Component = () => {
  const [t] = useTranslation();
  const context = React.useContext(ServiceContext);
  const addSubscription = useSubscriptions();
  const [state, setState] = React.useState(FeatureLevel.PRODUCTION);
  const [open, setOpen] = React.useState(false);

  React.useLayoutEffect(() => {
    addSubscription(context.settings.featureLevel().subscribe((level) => setState(level)));
  }, [addSubscription, context.settings, setState]);

  const handleToggle = React.useCallback(() => {
    setOpen((v) => !v);
  }, [setOpen]);

  const handleSelect = React.useCallback(
    (_, v) => {
      setState(v.value);
      context.settings.setFeatureLevel(v.value);
      setOpen(false);
    },
    [setState, setOpen, context.settings]
  );

  return (
    <>
      <Select
        isOpen={open}
        onToggle={handleToggle}
        selections={{
          ...{ value: state },
          toString: () => t(FeatureLevel[state]),
          compareTo: (val) => val.value === state,
        }}
        onSelect={handleSelect}
        isFlipEnabled={true}
        menuAppendTo="parent"
      >
        {Object.values(FeatureLevel)
          .filter((v) => typeof v === 'string')
          .map((v): { key: string; value: number } => ({ key: String(v), value: FeatureLevel[v] }))
          .filter((v) => {
            if (!process.env.CRYOSTAT_AUTHORITY) {
              return v.value !== FeatureLevel.DEVELOPMENT;
            }
            return true;
          })
          .map((level) => (
            <SelectOption
              key={level.key}
              value={{
                ...{ value: level.value },
                toString: () => t(level.key),
                compareTo: (val) => val.value === level.value,
              }}
            >
              {level.key}
            </SelectOption>
          ))}
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
