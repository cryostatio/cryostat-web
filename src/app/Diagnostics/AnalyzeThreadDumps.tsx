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
import { NullableTarget } from '@app/Shared/Services/api.types';
import { ServiceContext } from '@app/Shared/Services/Services';
import { TargetContextSelector } from '@app/TargetView/TargetContextSelector';
import { useSubscriptions } from '@app/utils/hooks/useSubscriptions';
import { getActiveTab, switchTab } from '@app/utils/utils';
import { useCryostatTranslation } from '@i18n/i18nextUtil';
import { Card, CardBody, Stack, StackItem, Tab, Tabs, TabTitleText } from '@patternfly/react-core';
import * as React from 'react';
import { useLocation, useNavigate } from 'react-router-dom-v5-compat';
import { of } from 'rxjs';
import { AllArchivedThreadDumpsTable } from './AllArchivedThreadDumpsTable';
import { AllTargetsThreadDumpsTable } from './AllTargetsThreadDumpsTable';
import { ThreadDumpsTable } from './ThreadDumpsTable';

export interface AnalyzeThreadDumpsProps {}

enum AnalyzeThreadDumpsTab {
  PER_TARGET = 'target-thread-dumps',
  ALL_ARCHIVES = 'all-thread-dumps',
}

export const AnalyzeThreadDumps: React.FC<AnalyzeThreadDumpsProps> = ({ ...props }) => {
  const { t } = useCryostatTranslation();
  const { search, pathname } = useLocation();
  const navigate = useNavigate();
  const context = React.useContext(ServiceContext);
  const addSubscription = useSubscriptions();

  const [target, setTarget] = React.useState(undefined as NullableTarget);
  const targetAsObs = React.useMemo(() => of(target), [target]);

  React.useEffect(() => {
    addSubscription(context.target.target().subscribe((t) => setTarget(t)));
  }, [addSubscription, context.target, setTarget]);

  const activeTab = React.useMemo(() => {
    return getActiveTab(search, 'tab', Object.values(AnalyzeThreadDumpsTab), AnalyzeThreadDumpsTab.PER_TARGET);
  }, [search]);

  const onTabSelect = React.useCallback(
    (_: React.MouseEvent, key: string | number) =>
      switchTab(navigate, pathname, search, { tabKey: 'tab', tabValue: `${key}` }),
    [navigate, pathname, search],
  );

  const cardBody = React.useMemo(
    () => (
      <Tabs id="threadDumps" activeKey={activeTab} onSelect={onTabSelect} unmountOnExit>
        <Tab
          id="threadDumps"
          eventKey={AnalyzeThreadDumpsTab.PER_TARGET}
          title={<TabTitleText>{t('Diagnostics.TARGET_THREAD_DUMPS_TAB_TITLE')}</TabTitleText>}
          data-quickstart-id="thread-dumps-tab"
        >
          <Stack hasGutter>
            <StackItem>
              <TargetContextSelector />
            </StackItem>
            <StackItem>
              {target ? (
                <ThreadDumpsTable target={targetAsObs} isNestedTable={false} />
              ) : (
                <AllTargetsThreadDumpsTable />
              )}
            </StackItem>
          </Stack>
        </Tab>
        <Tab
          id="allThreadDumps"
          eventKey={AnalyzeThreadDumpsTab.ALL_ARCHIVES}
          title={<TabTitleText>{t('Diagnostics.ALL_THREAD_DUMPS_TAB_TITLE')}</TabTitleText>}
          data-quickstart-id="all-thread-dumps-tab"
        >
          <AllArchivedThreadDumpsTable />
        </Tab>
      </Tabs>
    ),
    [activeTab, onTabSelect, t, target, targetAsObs],
  );

  return (
    <BreadcrumbPage {...props} pageTitle="Thread Dumps">
      <Card isFullHeight>
        <CardBody isFilled>{cardBody}</CardBody>
      </Card>
    </BreadcrumbPage>
  );
};

export default AnalyzeThreadDumps;
