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
import { NotificationsContext } from '@app/Notifications/Notifications';
import { Recording } from '@app/Shared/Services/Api.service';
import { ServiceContext } from '@app/Shared/Services/Services';
import { Target } from '@app/Shared/Services/Target.service';
import { useSubscriptions } from '@app/utils/useSubscriptions';
import { Dropdown, DropdownItem, KebabToggle } from '@patternfly/react-core';
import { Td } from '@patternfly/react-table';
import * as React from 'react';
import { Observable } from 'rxjs';
import { first } from 'rxjs/operators';

export interface RowAction {
  title: string | React.ReactNode;
  key: string;
  onClick: () => void;
}

export interface RecordingActionsProps {
  index: number;
  recording: Recording;
  sourceTarget?: Observable<Target>;
  uploadFn: () => Observable<boolean>;
}

export const RecordingActions: React.FC<RecordingActionsProps> = (props) => {
  const context = React.useContext(ServiceContext);
  const notifications = React.useContext(NotificationsContext);
  const [grafanaEnabled, setGrafanaEnabled] = React.useState(false);
  const [isOpen, setIsOpen] = React.useState(false);

  const addSubscription = useSubscriptions();

  React.useEffect(() => {
    addSubscription(
      context.api
        .grafanaDatasourceUrl()
        .pipe(first())
        .subscribe(() => setGrafanaEnabled(true))
    );
  }, [context.api, setGrafanaEnabled, addSubscription]);

  const grafanaUpload = React.useCallback(() => {
    notifications.info('Upload Started', `Recording "${props.recording.name}" uploading...`);
    addSubscription(
      props
        .uploadFn()
        .pipe(first())
        .subscribe((success) => {
          if (success) {
            notifications.success('Upload Success', `Recording "${props.recording.name}" uploaded`);
            context.api
              .grafanaDashboardUrl()
              .pipe(first())
              .subscribe((url) => window.open(url, '_blank'));
          }
        })
    );
  }, [addSubscription, notifications, props, context.api]);

  const handleDownloadRecording = React.useCallback(() => {
    context.api.downloadRecording(props.recording);
  }, [context.api, props.recording]);

  const handleViewReport = React.useCallback(() => {
    context.api.downloadReport(props.recording);
  }, [context.api, props.recording]);

  const actionItems = React.useMemo(() => {
    const actionItems = [
      {
        title: 'Download Recording',
        key: 'download-recording',
        onClick: handleDownloadRecording,
      },
      {
        title: 'View Report ...',
        key: 'view-report',
        onClick: handleViewReport,
      },
    ] as RowAction[];
    if (grafanaEnabled) {
      actionItems.push({
        title: 'View in Grafana ...',
        key: 'view-in-grafana',
        onClick: grafanaUpload,
      });
    }
    return actionItems;
  }, [handleDownloadRecording, handleViewReport, grafanaEnabled, grafanaUpload]);

  const onSelect = React.useCallback(
    (action: RowAction) => {
      setIsOpen(false);
      action.onClick();
    },
    [setIsOpen]
  );

  return (
    <Td isActionCell>
      <Dropdown
        aria-label={`${props.recording.name}-actions`}
        menuAppendTo={document.body}
        position="right"
        direction="down"
        toggle={<KebabToggle id="toggle-kebab" onToggle={setIsOpen} data-quickstart-id="recording-kebab" />}
        isPlain
        isOpen={isOpen}
        dropdownItems={actionItems.map((action) => (
          <DropdownItem key={action.key} onClick={() => onSelect(action)} data-quickstart-id={action.key}>
            {action.title}
          </DropdownItem>
        ))}
      />
    </Td>
  );
};
