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
import { Card, CardBody, Tab, Tabs, TabTitleText } from '@patternfly/react-core';
import * as React from 'react';
import { CustomRecordingForm } from './CustomRecordingForm';
import { SnapshotRecordingForm } from './SnapshotRecordingForm';

export const CreateRecording: React.FC = () => {
  const [activeTab, setActiveTab] = React.useState(0);

  const onTabSelect = React.useCallback(
    (_evt: MouseEvent | React.MouseEvent, idx: string | number) => setActiveTab(Number(idx)),
    [setActiveTab],
  );

  return (
    <TargetView pageTitle="Create Recording" breadcrumbs={[{ title: 'Recordings', path: '/recordings' }]}>
      <Card>
        <CardBody>
          <Tabs activeKey={activeTab} onSelect={onTabSelect}>
            <Tab eventKey={0} title={<TabTitleText>Custom Flight Recording</TabTitleText>}>
              <CustomRecordingForm />
            </Tab>
            <Tab eventKey={1} title={<TabTitleText>Snapshot Recording</TabTitleText>}>
              <SnapshotRecordingForm />
            </Tab>
          </Tabs>
        </CardBody>
      </Card>
    </TargetView>
  );
};

export default CreateRecording;
