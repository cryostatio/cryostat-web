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
import { CapabilitiesContext } from '@app/Shared/Services/Capabilities';
import { ServiceContext } from '@app/Shared/Services/Services';
import { TargetContextSelector } from '@app/TargetView/TargetContextSelector';
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
  Stack,
  StackItem,
} from '@patternfly/react-core';
import { SearchIcon } from '@patternfly/react-icons';
import * as React from 'react';
import { useLocation, useNavigate } from 'react-router-dom-v5-compat';
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
  agent: false,
  connectUrl: UPLOADS_SUBDIRECTORY,
  alias: '',
  labels: [],
  annotations: {
    cryostat: [],
    platform: [],
  },
};

enum ArchiveTab {
  PER_TARGET = 'target',
  ALL_ARCHIVES = 'all-archives',
  ALL_TARGETS = 'all-targets',
  UPLOADS = 'uploads',
}

export interface ArchivesProps {}

export const Archives: React.FC<ArchivesProps> = ({ ...props }) => {
  const { search, pathname } = useLocation();
  const navigate = useNavigate();
  const context = React.useContext(ServiceContext);
  const capabilities = React.useContext(CapabilitiesContext);
  const addSubscription = useSubscriptions();

  const activeTab = React.useMemo(() => {
    return getActiveTab(search, 'tab', Object.values(ArchiveTab), ArchiveTab.PER_TARGET);
  }, [search]);

  const [archiveEnabled, setArchiveEnabled] = React.useState(false);

  const uploadTargetAsObs = React.useMemo(() => of(uploadAsTarget), []);
  const targetAsObs = React.useMemo(() => context.target.target(), [context.target]);

  const tabs = React.useMemo(() => {
    const arr: JSX.Element[] = [];
    if (archiveEnabled) {
      arr.push(
        <Tab
          id="per-target"
          data-quickstart-id="nav-archives-per-target"
          key={ArchiveTab.PER_TARGET}
          eventKey={ArchiveTab.PER_TARGET}
          title={<TabTitleText>Target</TabTitleText>}
        >
          <Stack hasGutter>
            <StackItem>
              <TargetContextSelector />
            </StackItem>
            <StackItem>
              <ArchivedRecordingsTable target={targetAsObs} isUploadsTable={false} isNestedTable={false} />
            </StackItem>
          </Stack>
        </Tab>,
      );
      arr.push(
        <Tab
          id="all-targets"
          data-quickstart-id="nav-archives-all-targets"
          key={ArchiveTab.ALL_TARGETS}
          eventKey={ArchiveTab.ALL_TARGETS}
          title={<TabTitleText>All Targets</TabTitleText>}
        >
          <AllTargetsArchivedRecordingsTable />
        </Tab>,
      );
      arr.push(
        <Tab
          id="all-archives"
          data-quickstart-id="nav-archives-all-archives"
          key={ArchiveTab.ALL_ARCHIVES}
          eventKey={ArchiveTab.ALL_ARCHIVES}
          title={<TabTitleText>All Archives</TabTitleText>}
        >
          <AllArchivedRecordingsTable />
        </Tab>,
      );

      if (capabilities.fileUploads) {
        arr.push(
          <Tab
            id="uploads"
            data-quickstart-id="nav-archives-all-uploads"
            key={ArchiveTab.UPLOADS}
            eventKey={ArchiveTab.UPLOADS}
            title={<TabTitleText>Uploads</TabTitleText>}
          >
            <ArchivedRecordingsTable target={uploadTargetAsObs} isUploadsTable={true} isNestedTable={false} />
          </Tab>,
        );
      }
    }
    return arr;
  }, [capabilities.fileUploads, archiveEnabled, uploadTargetAsObs, targetAsObs]);

  React.useEffect(() => {
    addSubscription(context.api.isArchiveEnabled().subscribe(setArchiveEnabled));
  }, [context.api, addSubscription, setArchiveEnabled]);

  const onTabSelect = React.useCallback(
    (_: React.MouseEvent, key: string | number) =>
      switchTab(navigate, pathname, search, { tabKey: 'tab', tabValue: `${key}` }),
    [navigate, pathname, search],
  );

  const cardBody = React.useMemo(() => {
    return tabs.length > 0 ? (
      <Tabs id="archives" activeKey={activeTab} onSelect={onTabSelect} unmountOnExit>
        {tabs}
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
  }, [tabs, activeTab, onTabSelect]);

  return (
    <BreadcrumbPage {...props} pageTitle="Archives">
      <Card isCompact>
        <CardBody>{cardBody}</CardBody>
      </Card>
      <></>
    </BreadcrumbPage>
  );
};

export default Archives;
