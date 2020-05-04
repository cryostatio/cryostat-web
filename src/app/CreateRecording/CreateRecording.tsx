import * as React from 'react';
import { useHistory } from 'react-router-dom';
import { filter, first } from 'rxjs/operators';
import { Breadcrumb, BreadcrumbHeading, BreadcrumbItem, Card, CardBody, PageSection, Tabs, Tab, Text, TextVariants } from '@patternfly/react-core';
import { ServiceContext } from '@app/Shared/Services/Services';
import { NotificationsContext } from '@app/Notifications/Notifications';
import { CustomRecordingForm } from './CustomRecordingForm';
import { SnapshotRecordingForm } from './SnapshotRecordingForm';

export interface CreateRecordingProps {
  recordingName?: string;
  template?: string;
  eventSpecifiers?: string[];
  location?: any;
}

export interface EventTemplate {
  name: string;
  description: string;
  provider: string;
}

export const CreateRecording = (props: CreateRecordingProps) => {
  const context = React.useContext(ServiceContext);
  const notifications = React.useContext(NotificationsContext);
  const history = useHistory();

  const [activeTab, setActiveTab] = React.useState(0);

  const handleSubmit = (command: string, args: string[]): void => {
    const id = context.commandChannel.createMessageId();
    context.commandChannel.onResponse(command).pipe(
      filter(m => m.id === id),
      first(),
      )
      .subscribe((msg) => {
          if (msg.status === 0) {
            notifications.success('Recording created');
            history.push('/recordings');
          } else {
            notifications.danger(`Request failed (Status ${msg.status})`, msg.payload)
          }
      });
    context.commandChannel.sendMessage(command, args, id);
  };

  return (
    <PageSection>
      <Breadcrumb>
        <BreadcrumbItem to="/recordings">Recordings</BreadcrumbItem>
        <BreadcrumbHeading>Create</BreadcrumbHeading>
      </Breadcrumb>
      <Card>
        <CardBody>
          <Tabs activeKey={activeTab} onSelect={(evt, idx) => setActiveTab(Number(idx))}>
            <Tab eventKey={0} title="Custom Flight Recording">
              <CustomRecordingForm onSubmit={handleSubmit}
                recordingName={props?.location?.state?.recordingName}
                template={props?.location?.state?.template}
                eventSpecifiers={props?.location?.state?.eventSpecifiers}
              />
            </Tab>
            <Tab eventKey={1} title="Snapshot Recording">
              <SnapshotRecordingForm onSubmit={handleSubmit} />
            </Tab>
          </Tabs>
        </CardBody>
      </Card>
    </PageSection>
  );

};
