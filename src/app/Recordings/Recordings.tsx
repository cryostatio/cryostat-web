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
import { TargetView } from '@app/TargetView/TargetView';
import { useSubscriptions } from '@app/utils/useSubscriptions';
import { getActiveTab, switchTab } from '@app/utils/utils';
import { Card, CardBody, CardTitle, Tab, Tabs, TabTitleText } from '@patternfly/react-core';
import * as React from 'react';
import { useHistory, useLocation } from 'react-router';
import { ActiveRecordingsTable } from './ActiveRecordingsTable';
import { ArchivedRecordingsTable } from './ArchivedRecordingsTable';

enum RecordingTab {
  ACTIVE_RECORDING = 'active-recording',
  ARCHIVED_RECORDING = 'archived-recording',
}

export interface RecordingsProps {}

export const Recordings: React.FC<RecordingsProps> = ({ ...props }) => {
  const { search, pathname } = useLocation();
  const history = useHistory();
  const context = React.useContext(ServiceContext);
  const addSubscription = useSubscriptions();

  const activeTab = React.useMemo(() => {
    return getActiveTab(search, 'tab', Object.values(RecordingTab), RecordingTab.ACTIVE_RECORDING);
  }, [search]);

  const [archiveEnabled, setArchiveEnabled] = React.useState(false);

  React.useEffect(() => {
    addSubscription(context.api.isArchiveEnabled().subscribe(setArchiveEnabled));
  }, [context.api, addSubscription, setArchiveEnabled]);

  const onTabSelect = React.useCallback(
    (_: React.MouseEvent, key: string | number) =>
      switchTab(history, pathname, search, { tabKey: 'tab', tabValue: `${key}` }),
    [history, pathname, search],
  );

  const targetAsObs = React.useMemo(() => context.target.target(), [context.target]);

  const cardBody = React.useMemo(() => {
    return archiveEnabled ? (
      <Tabs id="recordings" activeKey={activeTab} onSelect={onTabSelect} unmountOnExit>
        <Tab
          id="active-recordings"
          eventKey={RecordingTab.ACTIVE_RECORDING}
          title={<TabTitleText>Active Recordings</TabTitleText>}
          data-quickstart-id="active-recordings-tab"
        >
          <ActiveRecordingsTable archiveEnabled={true} />
        </Tab>
        <Tab
          id="archived-recordings"
          eventKey={RecordingTab.ARCHIVED_RECORDING}
          title={<TabTitleText>Archived Recordings</TabTitleText>}
          data-quickstart-id="archived-recordings-tab"
        >
          <ArchivedRecordingsTable target={targetAsObs} isUploadsTable={false} isNestedTable={false} />
        </Tab>
      </Tabs>
    ) : (
      <>
        <CardTitle>Active Recordings</CardTitle>
        <ActiveRecordingsTable archiveEnabled={false} />
      </>
    );
  }, [archiveEnabled, activeTab, onTabSelect, targetAsObs]);

  return (
    <TargetView {...props} pageTitle="Recordings">
      <Card>
        <CardBody>{cardBody}</CardBody>
      </Card>
    </TargetView>
  );
};

export default Recordings;
