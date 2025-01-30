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
} from '@patternfly/react-core';
import { WrenchIcon } from '@patternfly/react-icons';
import * as React from 'react';
import { DashboardCard } from '../DashboardCard';

export interface DiagnosticsCardProps extends DashboardCardTypeProps {}

export const DiagnosticsCard: DashboardCardFC<DiagnosticsCardProps> = (props) => {
  const { t } = useCryostatTranslation();
  const serviceContext = React.useContext(ServiceContext);
  const notifications = React.useContext(NotificationsContext);
  const addSubscription = useSubscriptions();
  const [running, setRunning] = React.useState(false);

  const handleError = React.useCallback(
    (kind, error) => {
      notifications.danger(t('DiagnosticsCard.DIAGNOSTICS_ACTION_FAILURE', { kind }), error?.message || error);
    },
    [notifications, t],
  );

  const handleGC = React.useCallback(() => {
    setRunning(true);
    addSubscription(
      serviceContext.api.runGC(true).subscribe({
        error: (err) => handleError(t('DiagnosticsCard.KINDS.GC'), err),
        complete: () => setRunning(false),
      }),
    );
  }, [addSubscription, serviceContext.api, handleError, setRunning, t]);

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
                <Button
                  variant="primary"
                  onClick={handleGC}
                  spinnerAriaValueText="Invoke GC"
                  spinnerAriaLabel="invoke-gc"
                  isLoading={running}
                >
                  {t('DiagnosticsCard.DIAGNOSTICS_GC_BUTTON')}
                </Button>
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
  featureLevel: FeatureLevel.BETA,
  title: 'DiagnosticsCard.DIAGNOSTICS_CARD_TITLE',
  cardSizes: DiagnosticsCardSizes,
  description: 'DiagnosticsCard.DIAGNOSTICS_CARD_DESCRIPTION',
  descriptionFull: 'DiagnosticsCard.DIAGNOSTICS_CARD_DESCRIPTION_FULL',
  component: DiagnosticsCard,
  propControls: [],
  icon: <WrenchIcon />,
  labels: [
    {
      content: 'Beta',
      color: 'cyan',
    },
    {
      content: 'Diagnostics',
      color: 'blue',
    },
  ],
};
