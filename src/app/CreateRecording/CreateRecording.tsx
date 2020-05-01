import * as React from 'react';
import { useHistory } from 'react-router-dom';
import { filter, first } from 'rxjs/operators';
import { Breadcrumb, BreadcrumbHeading, BreadcrumbItem, Card, CardBody, PageSection } from '@patternfly/react-core';
import { ServiceContext } from '@app/Shared/Services/Services';
import { NotificationsContext } from '@app/Notifications/Notifications';
import { CustomRecordingForm } from './CustomRecordingForm';

export interface CreateRecordingProps {
  recordingName?: string;
  template?: string;
  eventSpecifiers?: string[];
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
          <CustomRecordingForm onSubmit={handleSubmit} />
        </CardBody>
      </Card>
    </PageSection>
  );

};
