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
import { NotificationCategory, Recording, Target } from '@app/Shared/Services/api.types';
import { NotificationsContext } from '@app/Shared/Services/Notifications.service';
import { ServiceContext } from '@app/Shared/Services/Services';
import { useSubscriptions } from '@app/utils/hooks/useSubscriptions';
import { Divider, Dropdown, DropdownItem, DropdownList, MenuToggle, MenuToggleElement } from '@patternfly/react-core';
import { EllipsisVIcon } from '@patternfly/react-icons';
import { Td } from '@patternfly/react-table';
import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { Observable } from 'rxjs';
import { concatMap, filter, first, tap } from 'rxjs/operators';

export interface RowAction {
  title?: string | React.ReactNode;
  key?: string;
  onClick?: () => void;
  isSeparator?: boolean;
}

export interface RecordingActionsProps {
  index: number;
  recording: Recording;
  sourceTarget?: Observable<Target>;
  uploadFn: () => Observable<string>;
}

export const RecordingActions: React.FC<RecordingActionsProps> = ({ recording, uploadFn, ...props }) => {
  const { t } = useTranslation();
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
        .subscribe(() => setGrafanaEnabled(true)),
    );
  }, [context.api, setGrafanaEnabled, addSubscription]);

  const grafanaUpload = React.useCallback(() => {
    addSubscription(
      uploadFn()
        .pipe(
          tap(() => notifications.info('Upload Started', `Recording "${recording.name}" uploading...`)),
          concatMap((jobId) =>
            context.notificationChannel
              .messages(NotificationCategory.GrafanaUploadSuccess)
              .pipe(filter((n) => n.message.jobId === jobId)),
          ),
          tap(() => notifications.success('Upload Success', `Recording ${recording.name} uploaded`)),
          concatMap(() => context.api.grafanaDashboardUrl()),
        )
        .subscribe((url) => window.open(url, '_blank')),
    );
  }, [addSubscription, notifications, context.api, context.notificationChannel, recording, uploadFn]);

  const handleDownloadRecording = React.useCallback(() => {
    context.api.downloadRecording(recording);
  }, [context.api, recording]);

  const actionItems = React.useMemo(() => {
    const actionItems = [
      {
        title: 'Download Recording',
        key: 'download-recording',
        onClick: handleDownloadRecording,
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
  }, [handleDownloadRecording, grafanaEnabled, grafanaUpload]);

  const onSelect = React.useCallback(
    (action: RowAction) => {
      setIsOpen(false);
      action.onClick && action.onClick();
    },
    [setIsOpen],
  );

  const toggle = React.useCallback(
    (toggleRef: React.Ref<MenuToggleElement>) => (
      <MenuToggle
        ref={toggleRef}
        onClick={() => setIsOpen((isOpen) => !isOpen)}
        isExpanded={isOpen}
        variant="plain"
        data-quickstart-id="recording-kebab"
        aria-label={t('RecordingActions.ARIA_LABELS.MENU_TOGGLE')}
      >
        <EllipsisVIcon />
      </MenuToggle>
    ),
    [t, setIsOpen, isOpen],
  );

  return (
    <Td {...props} isActionCell>
      <Dropdown
        toggle={toggle}
        popperProps={{
          enableFlip: true,
          position: 'right',
        }}
        isOpen={isOpen}
        onOpenChange={(isOpen) => setIsOpen(isOpen)}
        onOpenChangeKeys={['Escape']}
      >
        <DropdownList>
          {actionItems.map((action) =>
            action.isSeparator ? (
              <Divider />
            ) : (
              <DropdownItem key={action.key} onClick={() => onSelect(action)} data-quickstart-id={action.key}>
                {action.title}
              </DropdownItem>
            ),
          )}
        </DropdownList>
      </Dropdown>
    </Td>
  );
};
