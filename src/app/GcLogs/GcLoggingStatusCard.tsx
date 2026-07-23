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
import { GcLoggingStatus, Target } from '@app/Shared/Services/api.types';
import { ServiceContext } from '@app/Shared/Services/Services';
import { useSubscriptions } from '@app/utils/hooks/useSubscriptions';
import { useCryostatTranslation } from '@i18n/i18nextUtil';
import {
  Button,
  Card,
  CardBody,
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  Label,
  LabelGroup,
  Spinner,
  Split,
  SplitItem,
} from '@patternfly/react-core';
import * as React from 'react';
import { GcLoggingModal } from './GcLoggingModal';

export interface GcLoggingStatusSummaryProps {
  status?: GcLoggingStatus;
  isLoading: boolean;
}

export const GcLoggingStatusSummary: React.FC<GcLoggingStatusSummaryProps> = ({ status, isLoading }) => {
  const { t } = useCryostatTranslation();

  const whatLabels = React.useMemo(() => (status?.what ? status.what.split('+').filter(Boolean) : []), [status]);

  const decoratorLabels = React.useMemo(
    () => (status?.decorators ? status.decorators.split(',').filter(Boolean) : []),
    [status],
  );

  if (isLoading) {
    return <Spinner size="md" />;
  }

  return (
    <DescriptionList isHorizontal isCompact>
      <DescriptionListGroup>
        <DescriptionListTerm>{t('GcLoggingStatusCard.STATUS_LABEL')}</DescriptionListTerm>
        <DescriptionListDescription>
          {status?.enabled ? t('GcLoggingStatusCard.ENABLED') : t('GcLoggingStatusCard.DISABLED')}
        </DescriptionListDescription>
      </DescriptionListGroup>
      {status?.enabled && (
        <>
          <DescriptionListGroup>
            <DescriptionListTerm>{t('GcLoggingStatusCard.WHAT_LABEL')}</DescriptionListTerm>
            <DescriptionListDescription>
              {whatLabels.length ? (
                <LabelGroup>
                  {whatLabels.map((v) => (
                    <Label key={v} color="blue" isCompact>
                      {v}
                    </Label>
                  ))}
                </LabelGroup>
              ) : (
                '—'
              )}
            </DescriptionListDescription>
          </DescriptionListGroup>
          <DescriptionListGroup>
            <DescriptionListTerm>{t('GcLoggingStatusCard.DECORATORS_LABEL')}</DescriptionListTerm>
            <DescriptionListDescription>
              {decoratorLabels.length ? (
                <LabelGroup>
                  {decoratorLabels.map((v) => (
                    <Label key={v} color="grey" isCompact>
                      {v}
                    </Label>
                  ))}
                </LabelGroup>
              ) : (
                '—'
              )}
            </DescriptionListDescription>
          </DescriptionListGroup>
        </>
      )}
    </DescriptionList>
  );
};

export interface GcLoggingStatusCardProps {
  target: Target;
  onStatusChange?: (enabled: boolean) => void;
}

export const GcLoggingStatusCard: React.FC<GcLoggingStatusCardProps> = ({ target, onStatusChange }) => {
  const { t } = useCryostatTranslation();
  const context = React.useContext(ServiceContext);
  const addSubscription = useSubscriptions();

  const [status, setStatus] = React.useState<GcLoggingStatus | undefined>(undefined);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isModalOpen, setIsModalOpen] = React.useState(false);

  const fetchStatus = React.useCallback(() => {
    setIsLoading(true);
    addSubscription(
      context.api.getGcLoggingStatus(target, true).subscribe({
        next: (s) => {
          setStatus(s);
          setIsLoading(false);
          onStatusChange?.(s.enabled);
        },
        error: () => setIsLoading(false),
      }),
    );
  }, [addSubscription, context.api, target, onStatusChange]);

  React.useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

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
      <Card isCompact>
        <CardBody>
          <Split hasGutter isWrappable>
            <SplitItem isFilled>
              <GcLoggingStatusSummary status={status} isLoading={isLoading} />
            </SplitItem>
            <SplitItem>
              <Button variant="secondary" size="sm" onClick={() => setIsModalOpen(true)} isDisabled={isLoading}>
                {actionLabel}
              </Button>
            </SplitItem>
          </Split>
        </CardBody>
      </Card>
      {isModalOpen && (
        <GcLoggingModal
          isOpen={isModalOpen}
          onClose={handleModalClose}
          target={target}
          mode={modalMode}
          currentWhat={status?.what}
          currentDecorators={status?.decorators}
        />
      )}
    </>
  );
};

export default GcLoggingStatusCard;
