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
import { NoTargetSelected } from '@app/TargetView/NoTargetSelected';
import { TargetContextSelector } from '@app/TargetView/TargetContextSelector';
import { useSubscriptions } from '@app/utils/hooks/useSubscriptions';
import { getActiveTab, switchTab } from '@app/utils/utils';
import { Card, CardBody, Stack, StackItem, Tab, Tabs, TabTitleText } from '@patternfly/react-core';
import { t } from 'i18next';
import * as React from 'react';
import { useLocation, useNavigate } from 'react-router-dom-v5-compat';
import { HeapDumpsTable } from './HeapDumpsTable';

export interface AnalyzeHeapDumpsProps {}

enum AnalyzeHeapDumpsTab {
  HEAP_DUMPS = 'target-heap-dumps',
}

export const AnalyzeHeapDumps: React.FC<AnalyzeHeapDumpsProps> = ({ ...props }) => {
  const { search, pathname } = useLocation();
  const navigate = useNavigate();
  const context = React.useContext(ServiceContext);
  const addSubscription = useSubscriptions();

  const [target, setTarget] = React.useState(undefined as NullableTarget);

  React.useEffect(() => {
    addSubscription(context.target.target().subscribe((t) => setTarget(t)));
  }, [addSubscription, context.target, setTarget]);

  const activeTab = React.useMemo(() => {
    return getActiveTab(search, 'tab', Object.values(AnalyzeHeapDumpsTab), AnalyzeHeapDumpsTab.HEAP_DUMPS);
  }, [search]);

  const onTabSelect = React.useCallback(
    (_: React.MouseEvent, key: string | number) =>
      switchTab(navigate, pathname, search, { tabKey: 'tab', tabValue: `${key}` }),
    [navigate, pathname, search],
  );

  const cardBody = React.useMemo(
    () => (
      <Tabs id="heapDumps" activeKey={activeTab} onSelect={onTabSelect} unmountOnExit>
        <Tab
          id="heapDumps"
          eventKey={AnalyzeHeapDumpsTab.HEAP_DUMPS}
          title={<TabTitleText>{t('Diagnostics.TARGET_HEAP_DUMPS_TAB_TITLE')}</TabTitleText>}
          data-quickstart-id="heap-dumps-tab"
        >
          <Stack hasGutter>
            <StackItem>
              <TargetContextSelector />
            </StackItem>
            <StackItem>
              {target ? (
                <HeapDumpsTable />
              ) : (
                // FIXME this should be an "AllTargetsHeapDumpsTable" like the AllTargetsArchivedRecordingsTable
                <NoTargetSelected />
              )}
            </StackItem>
          </Stack>
        </Tab>
      </Tabs>
    ),
    [activeTab, onTabSelect, target],
  );

  return (
    <BreadcrumbPage {...props} pageTitle="Heap Dumps">
      <Card isFullHeight>
        <CardBody isFilled>{cardBody}</CardBody>
      </Card>
    </BreadcrumbPage>
  );
};

export default AnalyzeHeapDumps;
