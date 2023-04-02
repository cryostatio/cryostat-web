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
import { ArchivedRecordingsTable } from '@app/Recordings/ArchivedRecordingsTable';
import { UPLOADS_SUBDIRECTORY } from '@app/Shared/Services/Api.service';
import { ServiceContext } from '@app/Shared/Services/Services';
import { Target } from '@app/Shared/Services/Target.service';
import { useSubscriptions } from '@app/utils/useSubscriptions';
import { getActiveTab, switchTab } from '@app/utils/utils';
import { Card, CardBody, EmptyState, EmptyStateIcon, Tab, Tabs, TabTitleText, Title } from '@patternfly/react-core';
import { SearchIcon } from '@patternfly/react-icons';
import * as React from 'react';
import { useHistory, useLocation } from 'react-router-dom';
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
};

enum ArchiveTab {
  ALL_ARCHIVES = 'all-archives',
  ALL_TARGETS = 'all-targets',
  UPLOADS = 'uploads',
}

export interface ArchivesProps {}

export const Archives: React.FC<ArchivesProps> = ({ ...props }) => {
  const { search, pathname } = useLocation();
  const history = useHistory();
  const context = React.useContext(ServiceContext);
  const addSubscription = useSubscriptions();

  const activeTab = React.useMemo(() => {
    return getActiveTab(search, Object.values(ArchiveTab), ArchiveTab.ALL_TARGETS);
  }, [search]);

  const [archiveEnabled, setArchiveEnabled] = React.useState(false);

  React.useEffect(() => {
    addSubscription(context.api.isArchiveEnabled().subscribe(setArchiveEnabled));
  }, [context.api, addSubscription, setArchiveEnabled]);

  const onTabSelect = React.useCallback(
    (_: React.MouseEvent, key: string | number) => switchTab(history, pathname, `${key}`),
    [history, pathname]
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
        <EmptyStateIcon icon={SearchIcon} />
        <Title headingLevel="h4" size="lg">
          Archives Unavailable
        </Title>
      </EmptyState>
    );
  }, [archiveEnabled, activeTab, uploadTargetAsObs]);

  return (
    <BreadcrumbPage {...props} pageTitle="Archives">
      <Card>
        <CardBody>{cardBody}</CardBody>
      </Card>
    </BreadcrumbPage>
  );
};

export default Archives;
