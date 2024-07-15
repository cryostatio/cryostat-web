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
import { ArchivedRecordingsTable } from '@app/Recordings/ArchivedRecordingsTable';
import { Target, UPLOADS_SUBDIRECTORY } from '@app/Shared/Services/api.types';
import { ServiceContext } from '@app/Shared/Services/Services';
import { useSubscriptions } from '@app/utils/hooks/useSubscriptions';
import { getActiveTab, switchTab } from '@app/utils/utils';
import {
  Card,
  CardBody,
  EmptyState,
  EmptyStateIcon,
  Tab,
  Tabs,
  TabTitleText,
  EmptyStateHeader,
} from '@patternfly/react-core';
import { SearchIcon } from '@patternfly/react-icons';
import * as React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { of } from 'rxjs';
import { AllArchivedRecordingsTable } from './AllArchivedRecordingsTable';
import { AllTargetsArchivedRecordingsTable } from './AllTargetsArchivedRecordingsTable';
/*
  This specific target is used as the "source" for the Uploads version of the ArchivedRecordingsTable.
  The connectUrl is the 'uploads' because for actions performed on uploaded archived recordings,
  the backend issues a notification with the "target" field set to the 'uploads', signalling that
  these recordings are not associated with any target. We can then match on the 'uploads' when performing
  notification handling in the ArchivedRecordingsTable.
*/
export const uploadAsTarget: Target = {
  connectUrl: UPLOADS_SUBDIRECTORY,
  alias: '',
  labels: [],
  annotations: {
    cryostat: [],
    platform: [],
  },
};

enum ArchiveTab {
  ALL_ARCHIVES = 'all-archives',
  ALL_TARGETS = 'all-targets',
  UPLOADS = 'uploads',
}

export interface ArchivesProps {}

export const Archives: React.FC<ArchivesProps> = ({ ...props }) => {
  const { search, pathname } = useLocation();
  const navigate = useNavigate();
  const context = React.useContext(ServiceContext);
  const addSubscription = useSubscriptions();

  const activeTab = React.useMemo(() => {
    return getActiveTab(search, 'tab', Object.values(ArchiveTab), ArchiveTab.ALL_TARGETS);
  }, [search]);

  const [archiveEnabled, setArchiveEnabled] = React.useState(false);

  React.useEffect(() => {
    addSubscription(context.api.isArchiveEnabled().subscribe(setArchiveEnabled));
  }, [context.api, addSubscription, setArchiveEnabled]);

  const onTabSelect = React.useCallback(
    (_: React.MouseEvent, key: string | number) =>
      switchTab(navigate, pathname, search, { tabKey: 'tab', tabValue: `${key}` }),
    [navigate, pathname, search],
  );

  const uploadTargetAsObs = React.useMemo(() => of(uploadAsTarget), []);

  const cardBody = React.useMemo(() => {
    return archiveEnabled ? (
      <Tabs id="archives" activeKey={activeTab} onSelect={onTabSelect} unmountOnExit>
        <Tab id="all-targets" eventKey={ArchiveTab.ALL_TARGETS} title={<TabTitleText>All Targets</TabTitleText>}>
          <AllTargetsArchivedRecordingsTable />
        </Tab>
        <Tab id="all-archives" eventKey={ArchiveTab.ALL_ARCHIVES} title={<TabTitleText>All Archives</TabTitleText>}>
          <AllArchivedRecordingsTable />
        </Tab>
        <Tab id="uploads" eventKey={ArchiveTab.UPLOADS} title={<TabTitleText>Uploads</TabTitleText>}>
          <ArchivedRecordingsTable target={uploadTargetAsObs} isUploadsTable={true} isNestedTable={false} />
        </Tab>
      </Tabs>
    ) : (
      <EmptyState>
        <EmptyStateHeader
          titleText="Archives Unavailable"
          icon={<EmptyStateIcon icon={SearchIcon} />}
          headingLevel="h4"
        />
      </EmptyState>
    );
  }, [archiveEnabled, activeTab, uploadTargetAsObs, onTabSelect]);

  return (
    <BreadcrumbPage {...props} pageTitle="Archives">
      <Card>
        <CardBody>{cardBody}</CardBody>
      </Card>
    </BreadcrumbPage>
  );
};

export default Archives;
