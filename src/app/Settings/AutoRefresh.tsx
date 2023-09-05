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

import { DurationPicker } from '@app/DurationPicker/DurationPicker';
import { ServiceContext } from '@app/Shared/Services/Services';
import { Checkbox } from '@patternfly/react-core';
import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { SettingTab, UserSetting } from './SettingsUtils';

const defaultPreferences = {
  autoRefreshEnabled: true,
  autoRefreshPeriod: 30,
  autoRefreshUnits: 1_000,
};

const Component = () => {
  const [t] = useTranslation();
  const context = React.useContext(ServiceContext);
  const [state, setState] = React.useState(defaultPreferences);

  React.useLayoutEffect(() => {
    setState({
      autoRefreshEnabled: context.settings.autoRefreshEnabled(),
      autoRefreshPeriod: context.settings.autoRefreshPeriod(),
      autoRefreshUnits: context.settings.autoRefreshUnits(),
    });
  }, [setState, context.settings]);

  const handleAutoRefreshEnabledChange = React.useCallback(
    (autoRefreshEnabled) => {
      setState((state) => ({ ...state, autoRefreshEnabled }));
      context.settings.setAutoRefreshEnabled(autoRefreshEnabled);
    },
    [setState, context.settings],
  );

  const handleAutoRefreshPeriodChange = React.useCallback(
    (autoRefreshPeriod) => {
      setState((state) => ({ ...state, autoRefreshPeriod }));
      context.settings.setAutoRefreshPeriod(autoRefreshPeriod);
    },
    [setState, context.settings],
  );

  const handleAutoRefreshUnitScalarChange = React.useCallback(
    (autoRefreshUnits) => {
      setState((state) => ({ ...state, autoRefreshUnits }));
      context.settings.setAutoRefreshUnits(autoRefreshUnits);
    },
    [setState, context.settings],
  );

  return (
    <>
      <DurationPicker
        enabled={state.autoRefreshEnabled}
        period={state.autoRefreshPeriod}
        onPeriodChange={handleAutoRefreshPeriodChange}
        unitScalar={state.autoRefreshUnits}
        onUnitScalarChange={handleAutoRefreshUnitScalarChange}
      />
      <Checkbox
        id="auto-refresh-enabled"
        label={t('SETTINGS.AUTO_REFRESH.CHECKBOX_LABEL')}
        isChecked={state.autoRefreshEnabled}
        onChange={handleAutoRefreshEnabledChange}
        data-quickstart-id="settings-connectivity-tab-auto-refresh"
      />
    </>
  );
};

export const AutoRefresh: UserSetting = {
  titleKey: 'SETTINGS.AUTO_REFRESH.TITLE',
  descConstruct: 'SETTINGS.AUTO_REFRESH.DESCRIPTION',
  content: Component,
  category: SettingTab.CONNECTIVITY,
};
