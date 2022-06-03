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
import * as React from 'react';
import { ServiceContext } from '@app/Shared/Services/Services';
import { Card, CardBody, CardHeader, EmptyState, EmptyStateIcon, Tab, Tabs, Text, TextVariants, Title } from '@patternfly/react-core';
import { SearchIcon } from '@patternfly/react-icons';
import { AllTargetsArchivedRecordingsTable } from './AllTargetsArchivedRecordingsTable';
import { UploadedArchivedRecordingsTable } from './UploadedArchivedRecordingsTable';
import { BreadcrumbPage } from '@app/BreadcrumbPage/BreadcrumbPage';
import { ArchivedRecordingsTable } from '@app/Recordings/ArchivedRecordingsTable';

export const Archives = () => {
  const context = React.useContext(ServiceContext);
  const [activeTab, setActiveTab] = React.useState(0);
  const [archiveEnabled, setArchiveEnabled] = React.useState(false);

  React.useEffect(() => {
    const sub = context.api.isArchiveEnabled().subscribe(setArchiveEnabled);
    return () => sub.unsubscribe();
  }, [context.api]);

  const allTargets = React.useMemo(() => {
    if (!archiveEnabled) {
      return (<>
        <EmptyState>
          <EmptyStateIcon icon={SearchIcon}/>
          <Title headingLevel="h4" size="lg">
            Archives Unavailable
          </Title>
        </EmptyState>
      </>);
    }
    return (<>
      <AllTargetsArchivedRecordingsTable />
    </>);
  }, [archiveEnabled]);

  const uploads = React.useMemo(() => {
    return (<> 
      <ArchivedRecordingsTable isUploadsTable={true} />
    </>);
  },[]);

  return (
    <BreadcrumbPage pageTitle='Archives'>
      <Card>
        <CardBody>
          <Tabs id='archives' activeKey={activeTab} onSelect={(evt, idx) => setActiveTab(Number(idx))}>
            <Tab id='all-targets' eventKey={0} title="All Targets">
              { allTargets }
            </Tab>
            <Tab id='uploads' eventKey={1} title="Uploads">
              {activeTab == 1 ?
                uploads
              :
                null}
            </Tab>
          </Tabs>
        </CardBody>
      </Card>
    </BreadcrumbPage>
  );
};
