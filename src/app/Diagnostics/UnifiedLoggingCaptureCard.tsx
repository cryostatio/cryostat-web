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
import { CryostatLink } from '@app/Shared/Components/CryostatLink';
import { FeatureFlag } from '@app/Shared/Components/FeatureFlag';
import { UnifiedLoggingStatus, NullableTarget } from '@app/Shared/Services/api.types';
import { NotificationsContext } from '@app/Shared/Services/Notifications.service';
import { FeatureLevel } from '@app/Shared/Services/service.types';
import { ServiceContext } from '@app/Shared/Services/Services';
import { UnifiedLoggingModal } from '@app/UnifiedLogs/UnifiedLoggingModal';
import { UnifiedLoggingStatusSummary } from '@app/UnifiedLogs/UnifiedLoggingStatusCard';
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
  Tooltip,
} from '@patternfly/react-core';
import { ListIcon } from '@patternfly/react-icons';
import * as React from 'react';

export interface UnifiedLoggingCaptureCardProps {}

export const UnifiedLoggingCaptureCard: React.FC<UnifiedLoggingCaptureCardProps> = () => {
  const { t } = useCryostatTranslation();
  const serviceContext = React.useContext(ServiceContext);
  const notifications = React.useContext(NotificationsContext);
  const addSubscription = useSubscriptions();

  const [target, setTarget] = React.useState<NullableTarget>(undefined);
  const [status, setStatus] = React.useState<UnifiedLoggingStatus | undefined>(undefined);
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
      serviceContext.api.getUnifiedLoggingStatus(target, true).subscribe({
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
    ? t('UnifiedLoggingStatusCard.RECONFIGURE_BUTTON')
    : t('UnifiedLoggingStatusCard.ENABLE_BUTTON');

  return (
    <>
      <Card isCompact isFullHeight data-quickstart-id="unified-capture-status-card">
        <CardHeader>
          <CardTitle>{t('UnifiedLoggingCaptureCard.TITLE')}</CardTitle>
        </CardHeader>
        <CardBody>
          <Stack hasGutter>
            <StackItem>
              <FeatureFlag level={FeatureLevel.BETA}>
                <UnifiedLoggingStatusSummary status={status} isLoading={isLoadingStatus} />
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
                    <Button
                      variant="secondary"
                      onClick={() => setIsModalOpen(true)}
                      isDisabled={isLoadingStatus}
                      data-quickstart-id="unified-capture-configure-btn"
                    >
                      {actionLabel}
                    </Button>
                  </SplitItem>
                  <SplitItem>
                    <ActionList>
                      <ActionListItem>
                        <Tooltip content={t('UnifiedLogs.TABLE_TITLE')}>
                          <Button
                            variant="primary"
                            aria-label={t('UnifiedLogs.TABLE_TITLE')}
                            component={(props) => <CryostatLink {...props} to="/unified-logs" />}
                            icon={<ListIcon />}
                          />
                        </Tooltip>
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
        <UnifiedLoggingModal
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

export default UnifiedLoggingCaptureCard;
