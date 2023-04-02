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
import { ServiceContext } from '@app/Shared/Services/Services';
import { TargetView } from '@app/TargetView/TargetView';
import { useSubscriptions } from '@app/utils/useSubscriptions';
import { switchTab } from '@app/utils/utils';
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
    const queries = new URLSearchParams(search);
    const tab = queries.get('tab');
    return tab && Object.values(RecordingTab).includes(tab as RecordingTab) ? tab : RecordingTab.ACTIVE_RECORDING;
  }, [search]);

  const [archiveEnabled, setArchiveEnabled] = React.useState(false);

  React.useEffect(() => {
    addSubscription(context.api.isArchiveEnabled().subscribe(setArchiveEnabled));
  }, [context.api, addSubscription, setArchiveEnabled]);

  const onTabSelect = React.useCallback(
    (_: React.MouseEvent, key: string | number) => switchTab(history, pathname, `${key}`),
    [history, pathname]
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
