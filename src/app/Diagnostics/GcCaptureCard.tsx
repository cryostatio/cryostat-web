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
import { GcLoggingModal } from '@app/GcLogs/GcLoggingModal';
import { GcLoggingStatusSummary } from '@app/GcLogs/GcLoggingStatusCard';
import { CryostatLink } from '@app/Shared/Components/CryostatLink';
import { FeatureFlag } from '@app/Shared/Components/FeatureFlag';
import { GcLoggingStatus, NullableTarget } from '@app/Shared/Services/api.types';
import { NotificationsContext } from '@app/Shared/Services/Notifications.service';
import { FeatureLevel } from '@app/Shared/Services/service.types';
import { ServiceContext } from '@app/Shared/Services/Services';
import { useSubscriptions } from '@app/utils/hooks/useSubscriptions';
import { useCryostatTranslation } from '@i18n/i18nextUtil';
import {
  ActionList,
  ActionListItem,
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  Split,
  SplitItem,
  Stack,
  StackItem,
} from '@patternfly/react-core';
import { ListIcon } from '@patternfly/react-icons';
import * as React from 'react';

export interface GcCaptureCardProps {}

export const GcCaptureCard: React.FC<GcCaptureCardProps> = () => {
  const { t } = useCryostatTranslation();
  const serviceContext = React.useContext(ServiceContext);
  const notifications = React.useContext(NotificationsContext);
  const addSubscription = useSubscriptions();

  const [target, setTarget] = React.useState<NullableTarget>(undefined);
  const [status, setStatus] = React.useState<GcLoggingStatus | undefined>(undefined);
  const [isLoadingStatus, setIsLoadingStatus] = React.useState(true);
  const [runningGc, setRunningGc] = React.useState(false);
  const [isModalOpen, setIsModalOpen] = React.useState(false);

  React.useEffect(() => {
    addSubscription(serviceContext.target.target().subscribe(setTarget));
  }, [addSubscription, serviceContext.target]);

  const fetchStatus = React.useCallback(() => {
    if (!target) {
      return;
    }
    setIsLoadingStatus(true);
    addSubscription(
      serviceContext.api.getGcLoggingStatus(target, true).subscribe({
        next: (nextStatus) => {
          setStatus(nextStatus);
          setIsLoadingStatus(false);
        },
        error: () => setIsLoadingStatus(false),
      }),
    );
  }, [addSubscription, serviceContext.api, target]);

  React.useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const handleError = React.useCallback(
    (error) => {
      notifications.danger(
        t('DiagnosticsCard.DIAGNOSTICS_ACTION_FAILURE', { kind: t('DiagnosticsCard.KINDS.GC') }),
        error?.message || error,
      );
    },
    [notifications, t],
  );

  const handleGC = React.useCallback(() => {
    setRunningGc(true);
    addSubscription(
      serviceContext.api.runGC(true).subscribe({
        error: (err) => {
          setRunningGc(false);
          handleError(err);
        },
        complete: () => setRunningGc(false),
      }),
    );
  }, [addSubscription, serviceContext.api, handleError]);

  const handleModalClose = React.useCallback(() => {
    setIsModalOpen(false);
    fetchStatus();
  }, [fetchStatus]);

  const modalMode = status?.enabled ? 'reconfigure' : 'enable';
  const actionLabel = status?.enabled
    ? t('GcLoggingStatusCard.RECONFIGURE_BUTTON')
    : t('GcLoggingStatusCard.ENABLE_BUTTON');

  return (
    <>
      <Card isCompact isFullHeight>
        <CardHeader>
          <CardTitle>{t('GcCaptureCard.TITLE')}</CardTitle>
        </CardHeader>
        <CardBody>
          <Stack hasGutter>
            <StackItem>
              <FeatureFlag level={FeatureLevel.BETA}>
                <GcLoggingStatusSummary status={status} isLoading={isLoadingStatus} />
              </FeatureFlag>
            </StackItem>
            <StackItem>
              <Split hasGutter isWrappable>
                <SplitItem>
                  <Button
                    variant="primary"
                    onClick={handleGC}
                    spinnerAriaValueText="Invoke GC"
                    spinnerAriaLabel="invoke-gc"
                    isLoading={runningGc}
                  >
                    {t('DiagnosticsCard.DIAGNOSTICS_GC_BUTTON')}
                  </Button>
                </SplitItem>
                <FeatureFlag level={FeatureLevel.BETA}>
                  <SplitItem>
                    <Button variant="secondary" onClick={() => setIsModalOpen(true)} isDisabled={isLoadingStatus}>
                      {actionLabel}
                    </Button>
                  </SplitItem>
                  <SplitItem>
                    <ActionList>
                      <ActionListItem>
                        <Button
                          variant="primary"
                          component={(props) => <CryostatLink {...props} to="/gc-logs" />}
                          icon={<ListIcon />}
                        />
                      </ActionListItem>
                    </ActionList>
                  </SplitItem>
                </FeatureFlag>
              </Split>
            </StackItem>
          </Stack>
        </CardBody>
      </Card>
      {isModalOpen && (
        <GcLoggingModal
          isOpen={isModalOpen}
          onClose={handleModalClose}
          mode={modalMode}
          currentWhat={status?.what}
          currentDecorators={status?.decorators}
        />
      )}
    </>
  );
};

export default GcCaptureCard;
