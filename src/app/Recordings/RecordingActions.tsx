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
import { modalPrefillSetIntent, store } from '@app/Shared/Redux/ReduxStore';
import { NotificationCategory, Recording, Target } from '@app/Shared/Services/api.types';
import { CapabilitiesContext } from '@app/Shared/Services/Capabilities';
import { NotificationsContext } from '@app/Shared/Services/Notifications.service';
import { FeatureLevel } from '@app/Shared/Services/service.types';
import { ServiceContext } from '@app/Shared/Services/Services';
import { useFeatureLevel } from '@app/utils/hooks/useFeatureLevel';
import { useSubscriptions } from '@app/utils/hooks/useSubscriptions';
import { toPath } from '@app/utils/utils';
import { useCryostatTranslation } from '@i18n/i18nextUtil';
import { Divider, Dropdown, DropdownItem, DropdownList, MenuToggle, MenuToggleElement } from '@patternfly/react-core';
import { EllipsisVIcon } from '@patternfly/react-icons';
import { Td } from '@patternfly/react-table';
import * as React from 'react';
import { useNavigate } from 'react-router-dom-v5-compat';
import { Observable } from 'rxjs';
import { concatMap, filter, first, tap } from 'rxjs/operators';

export interface RowAction {
  title?: string | React.ReactNode;
  key?: string;
  onClick?: () => void;
  isSeparator?: boolean;
  isDisabled?: boolean;
}

export interface RecordingActionsProps {
  index: number;
  recording: Recording;
  sourceTarget?: Observable<Target>;
  uploadFn: () => Observable<string>;
  directory?: { jvmId: string };
}

export const RecordingActions: React.FC<RecordingActionsProps> = ({ recording, uploadFn, directory, ...props }) => {
  const { t } = useCryostatTranslation();
  const context = React.useContext(ServiceContext);
  const capabilities = React.useContext(CapabilitiesContext);
  const notifications = React.useContext(NotificationsContext);
  const navigate = useNavigate();
  const activeLevel = useFeatureLevel();
  const [grafanaEnabled, setGrafanaEnabled] = React.useState(false);
  const [isOpen, setIsOpen] = React.useState(false);

  const addSubscription = useSubscriptions();

  React.useEffect(() => {
    if (
      capabilities.openGrafana === true ||
      (typeof capabilities.openGrafana === 'string' && capabilities.openGrafana)
    ) {
      addSubscription(
        context.api
          .grafanaDatasourceUrl()
          .pipe(first())
          .subscribe(() => setGrafanaEnabled(true)),
      );
    }
  }, [capabilities, context.api, setGrafanaEnabled, addSubscription]);

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
        )
        .subscribe(() => context.api.openGrafanaDashboard(capabilities.openGrafana)),
    );
  }, [capabilities, addSubscription, notifications, context.api, context.notificationChannel, recording, uploadFn]);

  const handleDownloadRecording = React.useCallback(() => {
    context.api.downloadRecording(recording);
  }, [context.api, recording]);

  const handleViewInAnalytics = React.useCallback(
    (jvmId) => {
      const state = {
        jvmId,
        filename: recording.name,
      };
      store.dispatch(modalPrefillSetIntent(toPath('/recording-analytics'), state as Record<string, unknown>));
      navigate(toPath('/recording-analytics'), { state });
    },
    [recording, navigate],
  );

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
        title: t('RecordingActions.VIEW_IN_GRAFANA'),
        key: 'view-in-grafana',
        onClick: grafanaUpload,
      });
    }

    const jvmId = directory?.jvmId ?? recording.metadata.labels.find((v) => v.key === 'jvmId')?.value;
    if (jvmId && activeLevel <= FeatureLevel.BETA) {
      actionItems.push({
        title: t('RecordingActions.VIEW_IN_ANALYTICS'),
        key: 'view-in-analytics',
        onClick: () => handleViewInAnalytics(jvmId),
      });
    }

    return actionItems;
  }, [
    t,
    handleDownloadRecording,
    grafanaEnabled,
    grafanaUpload,
    directory,
    recording,
    activeLevel,
    handleViewInAnalytics,
  ]);

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
