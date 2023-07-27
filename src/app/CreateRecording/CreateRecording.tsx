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
import { RecordingLabel } from '@app/RecordingMetadata/RecordingLabel';
import { TemplateType } from '@app/Shared/Services/Api.service';
import { TargetView } from '@app/TargetView/TargetView';
import { Card, CardBody, Tab, Tabs } from '@patternfly/react-core';
import * as React from 'react';
import { StaticContext } from 'react-router';
import { RouteComponentProps, withRouter } from 'react-router-dom';
import { CustomRecordingForm } from './CustomRecordingForm';
import { SnapshotRecordingForm } from './SnapshotRecordingForm';

export interface CreateRecordingProps {
  restartExisting?: boolean;
  name?: string;
  templateName?: string;
  templateType?: TemplateType;
  labels?: RecordingLabel[];
  duration?: number;
  maxAge?: number;
  maxSize?: number;
}

export interface EventTemplate {
  name: string;
  description: string;
  provider: string;
  type: TemplateType;
}

const Comp: React.FC<RouteComponentProps<Record<string, never>, StaticContext, CreateRecordingProps>> = (props) => {
  const [activeTab, setActiveTab] = React.useState(0);

  const onTabSelect = React.useCallback((evt, idx) => setActiveTab(Number(idx)), [setActiveTab]);

  const prefilled = React.useMemo(
    () => ({
      restartExisting: props.location?.state?.restartExisting,
      name: props.location?.state?.name,
      templateName: props.location?.state?.templateName,
      templateType: props.location?.state?.templateType,
      labels: props.location?.state?.labels,
      duration: props.location?.state?.duration,
      maxAge: props.location?.state?.maxAge,
      maxSize: props.location?.state?.maxSize,
    }),
    [props.location]
  );

  return (
    <TargetView pageTitle="Create Recording" breadcrumbs={[{ title: 'Recordings', path: '/recordings' }]}>
      <Card>
        <CardBody>
          <Tabs activeKey={activeTab} onSelect={onTabSelect}>
            <Tab eventKey={0} title="Custom Flight Recording">
              <CustomRecordingForm prefilled={prefilled} />
            </Tab>
            <Tab eventKey={1} title="Snapshot Recording">
              <SnapshotRecordingForm />
            </Tab>
          </Tabs>
        </CardBody>
      </Card>
    </TargetView>
  );
};

export const CreateRecording = withRouter(Comp);
export default CreateRecording;
