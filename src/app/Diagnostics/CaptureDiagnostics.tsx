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
import { MBeanMetricsChartCard } from '@app/Dashboard/Charts/mbean/MBeanMetricsChartCard';
import { CryostatLink } from '@app/Shared/Components/CryostatLink';
import { NotificationCategory } from '@app/Shared/Services/api.types';
import { NotificationsContext } from '@app/Shared/Services/Notifications.service';
import { ServiceContext } from '@app/Shared/Services/Services';
import { TargetView } from '@app/TargetView/TargetView';
import { useSubscriptions } from '@app/utils/hooks/useSubscriptions';
import { useCryostatTranslation } from '@i18n/i18nextUtil';
import {
  ActionList,
  Bullseye,
  Button,
  Card,
  CardBody,
  Grid,
  GridItem,
  Stack,
  StackItem,
  Tooltip,
} from '@patternfly/react-core';
import { ListIcon } from '@patternfly/react-icons';
import * as React from 'react';
import { concatMap, filter, first } from 'rxjs';

export interface CaptureDiagnosticsProps {}

export const CaptureDiagnostics: React.FC<CaptureDiagnosticsProps> = ({ ...props }) => {
  const { t } = useCryostatTranslation();
  const serviceContext = React.useContext(ServiceContext);
  const notifications = React.useContext(NotificationsContext);
  const addSubscription = useSubscriptions();
  const [running, setRunning] = React.useState(false);
  const [threadDumpReady, setThreadDumpReady] = React.useState(false);
  const [heapDumpReady, setHeapDumpReady] = React.useState(false);
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
      // TODO this message key should not be specific to the Card view
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
          next: (dumps) => (dumps.length > 0 ? setHeapDumpReady(true) : setThreadDumpReady(false)),
          error: () => setHeapDumpReady(false),
        }),
    );
  }, [addSubscription, serviceContext.api, serviceContext.target, setHeapDumpReady]);

  React.useEffect(() => {
    addSubscription(
      serviceContext.notificationChannel.messages(NotificationCategory.ThreadDumpSuccess).subscribe(() => {
        setThreadDumpReady(true);
      }),
    );
  }, [addSubscription, serviceContext.notificationChannel, setThreadDumpReady]);

  const handleGC = React.useCallback(() => {
    setRunning(true);
    addSubscription(
      serviceContext.api.runGC(true).subscribe({
        error: (err) => handleError(t('DiagnosticsCard.KINDS.GC'), err),
        complete: () => setRunning(false),
      }),
    );
  }, [addSubscription, serviceContext.api, handleError, setRunning, t]);

  const handleThreadDump = React.useCallback(() => {
    setRunning(true);
    addSubscription(
      serviceContext.api.runThreadDump(true).subscribe({
        error: (err) => handleError(t('DiagnosticsCard.KINDS.THREADS'), err),
        complete: () => {
          setRunning(false);
          setThreadDumpReady(true);
        },
      }),
    );
  }, [addSubscription, serviceContext.api, handleError, setRunning, t]);

  const handleHeapDump = React.useCallback(() => {
    setRunning(true);
    addSubscription(
      serviceContext.api.runHeapDump(true).subscribe({
        error: (err) => handleError(t('DiagnosticsCard.KINDS.HEAP_DUMP'), err),
        complete: () => {
          setRunning(false);
          setHeapDumpReady(true);
        },
      }),
    );
  }, [addSubscription, serviceContext.api, handleError, setRunning, t]);

  return (
    <TargetView {...props} pageTitle="Diagnostics">
      <Grid hasGutter>
        <GridItem span={3}>
          <Card isCompact>
            <CardBody>
              <Bullseye>
                <Stack hasGutter>
                  <StackItem>
                    <ActionList>
                      <Button
                        variant="primary"
                        onClick={handleGC}
                        spinnerAriaValueText="Invoke GC"
                        spinnerAriaLabel="invoke-gc"
                        isLoading={running}
                      >
                        {t('DiagnosticsCard.DIAGNOSTICS_GC_BUTTON')}
                      </Button>
                    </ActionList>
                  </StackItem>
                  <StackItem>
                    <ActionList>
                      <Button
                        variant="primary"
                        onClick={handleThreadDump}
                        spinnerAriaValueText="Invoke Thread Dump"
                        spinnerAriaLabel="invoke-thread-dump"
                        isLoading={running}
                      >
                        {t('DiagnosticsCard.DIAGNOSTICS_THREAD_DUMP_BUTTON')}
                      </Button>
                      <Tooltip content={t('DiagnosticsCard.DIAGNOSTICS_THREAD_DUMP_TABLE_TOOLTIP')}>
                        <Button
                          variant="primary"
                          isAriaDisabled={!threadDumpReady}
                          component={(props) => <CryostatLink {...props} to="/thread-dumps" />}
                          icon={<ListIcon />}
                        />
                      </Tooltip>
                    </ActionList>
                  </StackItem>
                  <StackItem>
                    <ActionList>
                      <Button
                        variant="primary"
                        isAriaDisabled={!controlEnabled}
                        onClick={handleHeapDump}
                        spinnerAriaValueText="Invoke Heap Dump"
                        spinnerAriaLabel="invoke-heap-dump"
                        isLoading={running}
                      >
                        {t('DiagnosticsCard.DIAGNOSTICS_HEAP_DUMP_BUTTON')}
                      </Button>
                      <Tooltip content={t('DiagnosticsCard.DIAGNOSTICS_HEAP_REDIRECT_BUTTON')}>
                        <Button
                          variant="primary"
                          isAriaDisabled={!heapDumpReady}
                          component={(props) => <CryostatLink {...props} to="/heapdumps" />}
                          icon={<ListIcon />}
                        />
                      </Tooltip>
                    </ActionList>
                  </StackItem>
                </Stack>
              </Bullseye>
            </CardBody>
          </Card>
        </GridItem>
        <GridItem span={9}>
          <MBeanMetricsChartCard
            span={9}
            chartKind="Heap Memory Usage"
            themeColor="blue"
            duration={300}
            period={10}
            dashboardId={0}
            isDraggable={false}
            isResizable={false}
          />
        </GridItem>
      </Grid>
    </TargetView>
  );
};

export default CaptureDiagnostics;
