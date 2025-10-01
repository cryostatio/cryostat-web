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

import {
  DashboardCardTypeProps,
  DashboardCardFC,
  DashboardCardSizes,
  DashboardCardDescriptor,
} from '@app/Dashboard/types';
import { CryostatLink } from '@app/Shared/Components/CryostatLink';
import { FeatureFlag } from '@app/Shared/Components/FeatureFlag';
import { NotificationCategory } from '@app/Shared/Services/api.types';
import { NotificationsContext } from '@app/Shared/Services/Notifications.service';
import { FeatureLevel } from '@app/Shared/Services/service.types';
import { ServiceContext } from '@app/Shared/Services/Services';
import { useSubscriptions } from '@app/utils/hooks/useSubscriptions';
import { useCryostatTranslation } from '@i18n/i18nextUtil';
import {
  Bullseye,
  Button,
  CardBody,
  CardHeader,
  CardTitle,
  EmptyState,
  EmptyStateBody,
  EmptyStateIcon,
  EmptyStateVariant,
  EmptyStateHeader,
  EmptyStateFooter,
  ActionList,
  Tooltip,
  Stack,
  StackItem,
  ActionListItem,
} from '@patternfly/react-core';
import { ListIcon, WrenchIcon } from '@patternfly/react-icons';
import * as React from 'react';
import { concatMap, filter, first } from 'rxjs/operators';
import { DashboardCard } from '../DashboardCard';

export interface DiagnosticsCardProps extends DashboardCardTypeProps {}

export const DiagnosticsCard: DashboardCardFC<DiagnosticsCardProps> = (props) => {
  const { t } = useCryostatTranslation();
  const serviceContext = React.useContext(ServiceContext);
  const notifications = React.useContext(NotificationsContext);
  const addSubscription = useSubscriptions();
  const [runningGc, setRunningGc] = React.useState(false);
  const [runningThreadDump, setRunningThreadDump] = React.useState(false);
  const [runningHeapDump, setRunningHeapDump] = React.useState(false);
  const [heapDumpReady, setHeapDumpReady] = React.useState(false);
  const [threadDumpReady, setThreadDumpReady] = React.useState(false);
  const [controlEnabled, setControlEnabled] = React.useState(false);

  React.useEffect(() => {
    addSubscription(
      serviceContext.target.target().subscribe({
        next: (target) => setControlEnabled(target != null ? target.agent : false),
        error: () => setControlEnabled(false),
      }),
    );
  }, [addSubscription, serviceContext, setControlEnabled]);

  const handleError = React.useCallback(
    (kind, error) => {
      notifications.danger(t('DiagnosticsCard.DIAGNOSTICS_ACTION_FAILURE', { kind }), error?.message || error);
    },
    [notifications, t],
  );

  React.useEffect(() => {
    addSubscription(
      serviceContext.target
        .target()
        .pipe(
          filter((target) => !!target),
          first(),
          concatMap(() => serviceContext.api.getThreadDumps()),
        )
        .subscribe({
          next: (dumps) => (dumps.length > 0 ? setThreadDumpReady(true) : setThreadDumpReady(false)),
          error: () => setThreadDumpReady(false),
        }),
    );
  }, [addSubscription, serviceContext.api, serviceContext.target, setThreadDumpReady]);

  React.useEffect(() => {
    addSubscription(
      serviceContext.target
        .target()
        .pipe(
          filter((target) => !!target),
          first(),
          concatMap(() => serviceContext.api.getHeapDumps()),
        )
        .subscribe({
          next: (dumps) => (dumps.length > 0 ? setHeapDumpReady(true) : setHeapDumpReady(false)),
          error: () => setHeapDumpReady(false),
        }),
    );
  }, [addSubscription, serviceContext.api, serviceContext.target, setHeapDumpReady]);

  React.useEffect(() => {
    addSubscription(
      serviceContext.notificationChannel.messages(NotificationCategory.HeapDumpUploaded).subscribe(() => {
        setHeapDumpReady(true);
      }),
    );
  }, [addSubscription, serviceContext.notificationChannel, setHeapDumpReady]);

  React.useEffect(() => {
    addSubscription(
      serviceContext.notificationChannel.messages(NotificationCategory.ThreadDumpSuccess).subscribe(() => {
        setThreadDumpReady(true);
      }),
    );
  }, [addSubscription, serviceContext.notificationChannel, setThreadDumpReady]);

  const handleGC = React.useCallback(() => {
    setRunningGc(true);
    addSubscription(
      serviceContext.api.runGC(true).subscribe({
        error: (err) => handleError(t('DiagnosticsCard.KINDS.GC'), err),
        complete: () => setRunningGc(false),
      }),
    );
  }, [addSubscription, serviceContext.api, handleError, setRunningGc, t]);

  const handleThreadDump = React.useCallback(() => {
    setRunningThreadDump(true);
    addSubscription(
      serviceContext.api.runThreadDump(true).subscribe({
        error: (err) => handleError(t('DiagnosticsCard.KINDS.THREADS'), err),
        complete: () => {
          setRunningThreadDump(false);
          setThreadDumpReady(true);
        },
      }),
    );
  }, [addSubscription, serviceContext.api, handleError, setRunningThreadDump, t]);

  const handleHeapDump = React.useCallback(() => {
    setRunningHeapDump(true);
    addSubscription(
      serviceContext.api.runHeapDump(true).subscribe({
        error: (err) => handleError(t('DiagnosticsCard.KINDS.HEAP_DUMP'), err),
        complete: () => {
          setRunningHeapDump(false);
        },
      }),
    );
  }, [addSubscription, serviceContext.api, handleError, setRunningHeapDump, t]);

  const header = React.useMemo(() => {
    return (
      <CardHeader actions={{ actions: <>{...props.actions || []}</>, hasNoOffset: false, className: undefined }}>
        <CardTitle>{t('DiagnosticsCard.DIAGNOSTICS_CARD_TITLE')}</CardTitle>
      </CardHeader>
    );
  }, [props.actions, t]);

  return (
    <>
      <DashboardCard
        id={'diagnostics-card'}
        dashboardId={props.dashboardId}
        cardSizes={DiagnosticsCardSizes}
        isCompact
        cardHeader={header}
        isDraggable={props.isDraggable}
        isResizable={props.isResizable}
        isFullHeight={props.isFullHeight}
      >
        <CardBody>
          <Bullseye>
            <EmptyState variant={EmptyStateVariant.lg}>
              <EmptyStateHeader
                titleText={<>{t('DiagnosticsCard.DIAGNOSTICS_CARD_TITLE')}</>}
                icon={<EmptyStateIcon icon={WrenchIcon} />}
                headingLevel="h2"
              />
              <EmptyStateBody>{t('DiagnosticsCard.DIAGNOSTICS_CARD_DESCRIPTION')}</EmptyStateBody>
              <EmptyStateFooter>
                <Stack hasGutter>
                  <StackItem>
                    <ActionList>
                      <ActionListItem>
                        <Button
                          variant="primary"
                          onClick={handleGC}
                          spinnerAriaValueText="Invoke GC"
                          spinnerAriaLabel="invoke-gc"
                          isLoading={runningGc}
                        >
                          {t('DiagnosticsCard.DIAGNOSTICS_GC_BUTTON')}
                        </Button>
                      </ActionListItem>
                    </ActionList>
                  </StackItem>
                  <StackItem>
                    <FeatureFlag level={FeatureLevel.BETA}>
                      <ActionList>
                        <ActionListItem>
                          <Button
                            variant="primary"
                            onClick={handleThreadDump}
                            spinnerAriaValueText="Invoke Thread Dump"
                            spinnerAriaLabel="invoke-thread-dump"
                            isLoading={runningThreadDump}
                          >
                            {t('DiagnosticsCard.DIAGNOSTICS_THREAD_DUMP_BUTTON')}
                          </Button>
                        </ActionListItem>
                        <ActionListItem>
                          <Tooltip content={t('DiagnosticsCard.DIAGNOSTICS_THREAD_DUMP_TABLE_TOOLTIP')}>
                            <Button
                              variant="primary"
                              isAriaDisabled={!threadDumpReady}
                              component={(props) => <CryostatLink {...props} to="/thread-dumps" />}
                              icon={<ListIcon />}
                            />
                          </Tooltip>
                        </ActionListItem>
                      </ActionList>
                    </FeatureFlag>
                  </StackItem>
                  <StackItem>
                    <FeatureFlag level={FeatureLevel.BETA}>
                      <ActionList>
                        <ActionListItem>
                          <Tooltip
                            trigger={controlEnabled ? 'manual' : 'mouseenter focus'}
                            content={t('DiagnosticsCard.DIAGNOSTICS_HEAP_DUMP_BUTTON_DISABLED')}
                          >
                            <Button
                              variant="primary"
                              onClick={handleHeapDump}
                              isAriaDisabled={!controlEnabled}
                              spinnerAriaValueText="Invoke Heap Dump"
                              spinnerAriaLabel="invoke-heap-dump"
                              isLoading={runningHeapDump}
                            >
                              {t('DiagnosticsCard.DIAGNOSTICS_HEAP_DUMP_BUTTON')}
                            </Button>
                          </Tooltip>
                        </ActionListItem>
                        <ActionListItem>
                          <Tooltip content={t('DiagnosticsCard.DIAGNOSTICS_HEAP_REDIRECT_BUTTON')}>
                            <Button
                              variant="primary"
                              isAriaDisabled={!(heapDumpReady && controlEnabled)}
                              component={(props) => <CryostatLink {...props} to="/heapdumps" />}
                              icon={<ListIcon />}
                            />
                          </Tooltip>
                        </ActionListItem>
                      </ActionList>
                    </FeatureFlag>
                  </StackItem>
                </Stack>
              </EmptyStateFooter>
            </EmptyState>
          </Bullseye>
        </CardBody>
      </DashboardCard>
    </>
  );
};

DiagnosticsCard.cardComponentName = 'DiagnosticsCard';

export const DiagnosticsCardSizes: DashboardCardSizes = {
  span: {
    minimum: 3,
    default: 4,
    maximum: 12,
  },
  height: {
    // TODO: implement height resizing
    minimum: Number.NaN,
    default: Number.NaN,
    maximum: Number.NaN,
  },
};

export const DiagnosticsCardDescriptor: DashboardCardDescriptor = {
  featureLevel: FeatureLevel.PRODUCTION,
  title: 'DiagnosticsCard.DIAGNOSTICS_CARD_TITLE',
  cardSizes: DiagnosticsCardSizes,
  description: 'DiagnosticsCard.DIAGNOSTICS_CARD_DESCRIPTION',
  descriptionFull: 'DiagnosticsCard.DIAGNOSTICS_CARD_DESCRIPTION_FULL',
  component: DiagnosticsCard,
  propControls: [],
  icon: <WrenchIcon />,
  labels: [
    {
      content: 'Diagnostics',
      color: 'blue',
    },
  ],
};
