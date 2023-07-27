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

import { BreadcrumbPage } from '@app/BreadcrumbPage/BreadcrumbPage';
import { FeatureFlag } from '@app/Shared/FeatureFlag/FeatureFlag';
import { FeatureLevel } from '@app/Shared/Services/Settings.service';
import { useLogin } from '@app/utils/useLogin';
import { cleanDataId, getActiveTab, hashCode, switchTab } from '@app/utils/utils';
import {
  Card,
  Form,
  FormGroup,
  HelperText,
  HelperTextItem,
  Label,
  Sidebar,
  SidebarContent,
  SidebarPanel,
  Tab,
  TabProps,
  Tabs,
  TabTitleText,
  Title,
} from '@patternfly/react-core';
import * as React from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { useHistory, useLocation } from 'react-router-dom';
import { AutomatedAnalysisConfig } from './AutomatedAnalysisConfig';
import { AutoRefresh } from './AutoRefresh';
import { ChartCardsConfig } from './ChartCardsConfig';
import { CredentialsStorage } from './CredentialsStorage';
import { DatetimeControl } from './DatetimeControl';
import { DeletionDialogControl } from './DeletionDialogControl';
import { FeatureLevels } from './FeatureLevels';
import { Language } from './Language';
import { NotificationControl } from './NotificationControl';
import { paramAsTab, SettingTab, tabAsParam, _TransformedUserSetting } from './SettingsUtils';
import { Theme } from './Theme';
import { WebSocketDebounce } from './WebSocketDebounce';

export const allSettings = [
  NotificationControl,
  AutomatedAnalysisConfig,
  ChartCardsConfig,
  CredentialsStorage,
  DeletionDialogControl,
  WebSocketDebounce,
  AutoRefresh,
  FeatureLevels,
  Language,
  DatetimeControl,
  Theme,
];

interface SettingGroup {
  groupLabel: SettingTab;
  groupKey: string;
  featureLevel: FeatureLevel;
  disabled?: boolean;
  settings: _TransformedUserSetting[];
}

const _getGroupFeatureLevel = (settings: _TransformedUserSetting[]): FeatureLevel => {
  if (!settings.length) {
    return FeatureLevel.DEVELOPMENT;
  }
  return settings.slice().sort((a, b) => b.featureLevel - a.featureLevel)[0].featureLevel;
};

export interface SettingsProps {}

export const Settings: React.FC<SettingsProps> = (_) => {
  const [t] = useTranslation();
  const loggedIn = useLogin();

  const settings = React.useMemo(
    () =>
      allSettings
        .filter((s) => !s.authenticated || loggedIn)
        .map(
          (c) =>
            ({
              title: t(c.titleKey) || '',
              description:
                typeof c.descConstruct === 'string' ? (
                  t(c.descConstruct)
                ) : (
                  // Use children prop to avoid i18n parses body as key
                  /* eslint react/no-children-prop: 0 */
                  <Trans i18nKey={c.descConstruct.key} children={c.descConstruct.parts} />
                ),
              element: React.createElement(c.content, null),
              category: c.category,
              disabled: c.disabled,
              orderInGroup: c.orderInGroup || -1,
              featureLevel: c.featureLevel || FeatureLevel.PRODUCTION,
            } as _TransformedUserSetting)
        ),
    [t, loggedIn]
  );

  const history = useHistory();
  const { search, pathname } = useLocation();

  const activeTab = React.useMemo(() => {
    return paramAsTab(
      getActiveTab(
        search,
        'tab',
        Object.values(SettingTab).map((v) => tabAsParam(v)),
        tabAsParam(SettingTab.GENERAL)
      )
    );
  }, [search]);

  const onTabSelect = React.useCallback(
    (_: React.MouseEvent, key: string | number) =>
      switchTab(history, pathname, search, { tabKey: 'tab', tabValue: `${tabAsParam(key as SettingTab)}` }),
    [history, pathname, search]
  );

  const settingGroups = React.useMemo(() => {
    return Object.values(SettingTab).map((cat) => {
      const panels = settings.filter((s) => s.category === cat).sort((a, b) => b.orderInGroup - a.orderInGroup);
      return {
        groupLabel: t(cat),
        groupKey: cat,
        settings: panels,
        featureLevel: _getGroupFeatureLevel(panels),
      };
    }) as SettingGroup[];
  }, [settings, t]);

  return (
    <>
      <BreadcrumbPage pageTitle="Settings">
        <Card isFullHeight>
          <Sidebar tabIndex={0}>
            <SidebarPanel>
              <Tabs
                isVertical
                isExpanded
                aria-label="Select setting category"
                activeKey={activeTab}
                onSelect={onTabSelect}
              >
                {settingGroups.map((grp) => (
                  <WrappedTab
                    key={`${grp.groupLabel}-tab`}
                    eventKey={grp.groupKey}
                    title={<TabTitleText>{grp.groupLabel}</TabTitleText>}
                    featureLevelConfig={{
                      level: grp.featureLevel,
                    }}
                  />
                ))}
              </Tabs>
            </SidebarPanel>
            <SidebarContent>
              {settingGroups
                .filter((grp) => grp.groupKey === activeTab)
                .map((grp) => (
                  <Form key={`${grp.groupKey}-setting`} className="settings__content">
                    {grp.settings.map((s, index) => (
                      <FeatureFlag level={s.featureLevel} key={`${grp.groupLabel}-${s.title}-${index}-flag`}>
                        <FormGroup
                          label={
                            <Title headingLevel={'h2'} size={'lg'}>
                              {s.title}
                              {s.featureLevel !== FeatureLevel.PRODUCTION && (
                                <Label
                                  isCompact
                                  style={{
                                    marginLeft: '1ch',
                                    textTransform: 'capitalize',
                                  }}
                                  color={s.featureLevel === FeatureLevel.BETA ? 'green' : 'red'}
                                >
                                  {FeatureLevel[s.featureLevel].toLowerCase()}
                                </Label>
                              )}
                            </Title>
                          }
                          helperText={
                            <HelperText>
                              <HelperTextItem>{s.description}</HelperTextItem>
                            </HelperText>
                          }
                          isHelperTextBeforeField
                          key={`${grp.groupLabel}-${s.title}-${index}`}
                        >
                          {s.element}
                        </FormGroup>
                      </FeatureFlag>
                    ))}
                  </Form>
                ))}
            </SidebarContent>
          </Sidebar>
        </Card>
        <>
          {
            // Need this fragment to correct bottom margin.
          }
        </>
      </BreadcrumbPage>
    </>
  );
};

interface SettingTabProps extends TabProps {
  featureLevelConfig: {
    level: FeatureLevel;
    strict?: boolean;
  };
}

// Workaround to the Tabs component requiring children to be React.FC<TabProps>
const WrappedTab: React.FC<SettingTabProps> = ({ featureLevelConfig, eventKey, title, children }) => {
  const { t } = useTranslation();

  return (
    <FeatureFlag level={featureLevelConfig.level} strict={featureLevelConfig.strict}>
      <Tab
        eventKey={eventKey}
        title={title}
        id={`${hashCode(`${eventKey}`)}`}
        data-quickstart-id={cleanDataId(`settings-${t(eventKey.toString())}-tab`)}
      >
        {children}
      </Tab>
    </FeatureFlag>
  );
};

export default Settings;
