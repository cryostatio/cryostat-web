/*
 * Copyright The Cryostat Authors
 *
 * The Universal Permissive License (UPL), Version 1.0
 *
 * Subject to the condition set forth below, permission is hereby granted to any
 * person obtaining a copy of this software, associated documentation and/or data
 * (collectively the "Software"), free of charge and under any and all copyright
 * rights in the Software, and any and all patent rights owned or freely
 * licensable by each licensor hereunder covering either (i) the unmodified
 * Software as contributed to or provided by such licensor, or (ii) the Larger
 * Works (as defined below), to deal in both
 *
 * (a) the Software, and
 * (b) any piece of software and/or hardware listed in the lrgrwrks.txt file if
 * one is included with the Software (each a "Larger Work" to which the Software
 * is contributed by such licensors),
 *
 * without restriction, including without limitation the rights to copy, create
 * derivative works of, display, perform, and distribute the Software and make,
 * use, sell, offer for sale, import, export, have made, and have sold the
 * Software and the Larger Work(s), and to sublicense the foregoing rights on
 * either these or other terms.
 *
 * This license is subject to the following condition:
 * The above copyright notice and either this complete permission notice or at
 * a minimum a reference to the UPL must be included in all copies or
 * substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

import { BreadcrumbPage } from '@app/BreadcrumbPage/BreadcrumbPage';
import { FeatureFlag } from '@app/Shared/FeatureFlag/FeatureFlag';
import { FeatureLevel } from '@app/Shared/Services/Settings.service';
import { hashCode } from '@app/utils/utils';
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
import { css } from '@patternfly/react-styles';
import * as React from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import { AutomatedAnalysisConfig } from './AutomatedAnalysisConfig';
import { AutoRefresh } from './AutoRefresh';
import { CredentialsStorage } from './CredentialsStorage';
import { DatetimeControl } from './DatetimeControl';
import { DeletionDialogControl } from './DeletionDialogControl';
import { FeatureLevels } from './FeatureLevels';
import { Language } from './Language';
import { NotificationControl } from './NotificationControl';
import { WebSocketDebounce } from './WebSocketDebounce';

const _SettingCategoryKeys = [
  'SETTINGS.CATEGORIES.CONNECTIVITY',
  'SETTINGS.CATEGORIES.LANGUAGE_REGION',
  'SETTINGS.CATEGORIES.NOTIFICATION_MESSAGE',
  'SETTINGS.CATEGORIES.DASHBOARD',
  'SETTINGS.CATEGORIES.ADVANCED',
] as const;

// Use translation keys for internal categorization
export type SettingCategory = (typeof _SettingCategoryKeys)[number];

export interface SettingGroup {
  groupLabel: SettingCategory;
  groupKey: string;
  featureLevel: FeatureLevel;
  disabled?: boolean;
  settings: _TransformedUserSetting[];
}

export interface UserSetting {
  titleKey: string;
  disabled?: boolean;
  // Translation Key or { Translation Key, React Component Parts }
  // https://react.i18next.com/latest/trans-component#how-to-get-the-correct-translation-string
  descConstruct:
    | string
    | {
        key: string;
        parts: React.ReactNode[];
      };
  content: React.FunctionComponent;
  category: SettingCategory;
  orderInGroup?: number; // default -1
  featureLevel?: FeatureLevel; // default PRODUCTION
}

interface _TransformedUserSetting extends Omit<UserSetting, 'content'> {
  title: string;
  description: React.ReactNode;
  element: React.FunctionComponentElement<Record<string, never>>;
  orderInGroup: number;
  featureLevel: FeatureLevel;
}

const _getGroupFeatureLevel = (settings: _TransformedUserSetting[]): FeatureLevel => {
  if (!settings.length) {
    return FeatureLevel.DEVELOPMENT;
  }
  return settings.slice().sort((a, b) => b.featureLevel - a.featureLevel)[0].featureLevel;
};

export const selectTab = (tabKey: SettingCategory) => {
  const tab = document.getElementById(`pf-tab-${tabKey}-${hashCode(tabKey)}`);
  tab && tab.click();
};

export interface SettingsProps {}

export const Settings: React.FC<SettingsProps> = (_) => {
  const [t] = useTranslation();

  const settings = React.useMemo(
    () =>
      [
        NotificationControl,
        AutomatedAnalysisConfig,
        CredentialsStorage,
        DeletionDialogControl,
        WebSocketDebounce,
        AutoRefresh,
        FeatureLevels,
        Language,
        DatetimeControl,
      ].map(
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
    [t]
  );

  const location = useLocation();
  const [activeTab, setActiveTab] = React.useState<SettingCategory>(
    ((location.state && location.state['preSelectedTab']) as SettingCategory) || 'SETTINGS.CATEGORIES.CONNECTIVITY'
  );

  const onTabSelect = React.useCallback(
    (_: React.MouseEvent<HTMLElement, MouseEvent>, eventKey: string | number) =>
      setActiveTab(eventKey as SettingCategory),
    [setActiveTab]
  );

  const settingGroups = React.useMemo(() => {
    return _SettingCategoryKeys.map((cat) => {
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
                  <SettingTab
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
              {settingGroups.map((grp) => (
                <div
                  key={`${grp.groupKey}-setting`}
                  className={css('settings__content', grp.groupKey === activeTab ? 'active' : '')}
                >
                  <Form>
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
                </div>
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
const SettingTab: React.FC<SettingTabProps> = ({ featureLevelConfig, eventKey, title, children }) => {
  return (
    <FeatureFlag level={featureLevelConfig.level} strict={featureLevelConfig.strict}>
      <Tab eventKey={eventKey} title={title} id={`${hashCode(`${eventKey}`)}`}>
        {children}
      </Tab>
    </FeatureFlag>
  );
};

export default Settings;
