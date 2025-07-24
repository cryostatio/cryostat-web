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
import { TargetView } from '@app/TargetView/TargetView';
import { getActiveTab, switchTab } from '@app/utils/utils';
import { Card, CardBody, Tab, Tabs, TabTitleText } from '@patternfly/react-core';
import * as React from 'react';
import { useLocation, useNavigate } from 'react-router-dom-v5-compat';
import { ThreadDumpsTable } from './ThreadDumpsTable';

enum DiagnosticsTab {
  THREAD_DUMPS = 'thread-dumps',
}

export interface DiagnosticsProps {}

export const Diagnostics: React.FC<DiagnosticsProps> = ({ ...props }) => {
  const { search, pathname } = useLocation();
  const navigate = useNavigate();

  const activeTab = React.useMemo(() => {
    return getActiveTab(search, 'tab', Object.values(DiagnosticsTab), DiagnosticsTab.THREAD_DUMPS);
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
          eventKey={DiagnosticsTab.THREAD_DUMPS}
          title={<TabTitleText>Thread Dumps</TabTitleText>}
          data-quickstart-id="thread-dumps-tab"
        >
          <ThreadDumpsTable />
        </Tab>
      </Tabs>
    ),
    [activeTab, onTabSelect],
  );

  return (
    <TargetView {...props} pageTitle="Diagnostics">
      <Card isFullHeight>
        <CardBody isFilled>{cardBody}</CardBody>
      </Card>
    </TargetView>
  );
};

export default Diagnostics;
