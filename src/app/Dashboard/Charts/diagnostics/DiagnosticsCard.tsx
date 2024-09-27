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
import { ErrorView } from '@app/ErrorView/ErrorView';
import { FeatureLevel } from '@app/Shared/Services/service.types';
import { LoadingProps } from '@app/Shared/Components/types';
import { ServiceContext } from '@app/Shared/Services/Services';
import { useSubscriptions } from '@app/utils/hooks/useSubscriptions';
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
  Label,
  EmptyStateHeader,
  EmptyStateFooter,
} from '@patternfly/react-core';
import { DataSourceIcon, SyncAltIcon, TachometerAltIcon } from '@patternfly/react-icons';
import * as React from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { DashboardCard } from '../../DashboardCard';

export interface DiagnosticsCardProps extends DashboardCardTypeProps {
  chartKind: string;
  duration: number;
  period: number;
}

export enum DiagnosticsCardKind {}

export function kindToId(kind: string): number {
  return DiagnosticsCardKind[kind];
}

export const DiagnosticsCard: DashboardCardFC<DiagnosticsCardProps> = (props) => {
  const { t } = useTranslation();
  const serviceContext = React.useContext(ServiceContext);
  const addSubscription = useSubscriptions();
  const [errorMessage, setErrorMessage] = React.useState('');
  const [running, setRunning] = React.useState(false);
  const isError = React.useMemo(() => errorMessage != '', [errorMessage]);

  const handleError = React.useCallback(
    (error) => {
      setErrorMessage(error.message);
    },
    [setErrorMessage],
  );

  const handleGC = React.useCallback(() => {
    addSubscription(
      serviceContext.api.runGC().subscribe({
        error: (err) => handleError(err),
      }),
    );
  }, [addSubscription, serviceContext.api, handleError]);

  const GCButton = React.useMemo(() => {
    return (
      <Button
        key={0}
        aria-label={t('DIAGNOSTICS_GC_BUTTON', { chartKind: props.chartKind })}
        onClick={handleGC}
        variant="plain"
        icon={<SyncAltIcon />}
        isDisabled={false}
      />
    );
  }, [t, props.chartKind, handleGC]);

  const actions = React.useMemo(() => {
    const a = props.actions || [];
    return [GCButton, ...a];
  }, [props.actions, GCButton]);

  const gcButtonLoadingProps = React.useMemo(
    () =>
      ({
        spinnerAriaValueText: 'Invoke GC',
        spinnerAriaLabel: 'saving-credentials',
        isLoading: running,
      }) as LoadingProps,
    [running],
  );

  const header = React.useMemo(() => {
    return (
      <CardHeader
        actions={{
          actions: <>{actions}</>,
          hasNoOffset: false,
          className: undefined,
        }}
      >
        <CardTitle>
          {t('CHART_CARD.TITLE', { chartKind: props.chartKind, duration: props.duration, period: props.period })}
        </CardTitle>
      </CardHeader>
    );
  }, [props.chartKind, props.duration, props.period, t, actions]);

  return isError ? (
    <ErrorView title={'Error executing diagnostic command'} message={`${errorMessage}`} />
  ) : (
    <DashboardCard
      id={props.chartKind + '-chart-card'}
      dashboardId={props.dashboardId}
      cardSizes={DiagnosticsCardSizes}
      isCompact
      cardHeader={header}
      title={props.chartKind}
      isDraggable={props.isDraggable}
      isResizable={props.isResizable}
      isFullHeight={props.isFullHeight}
    >
      <CardBody>
        <Bullseye>
          <EmptyState variant={EmptyStateVariant.lg}>
            <EmptyStateHeader
              titleText={<>{t('CHART_CARD.DIAGNOSTICS_CARD_TITLE')}</>}
              icon={<EmptyStateIcon icon={DataSourceIcon} />}
              headingLevel="h2"
            />
            <EmptyStateBody>
              <Trans t={t} components={{ label: <Label color="blue" isCompact /> }}>
                CHART_CARD.DIAGNOSTICS_CARD_DESCRIPTION
              </Trans>
            </EmptyStateBody>
            <EmptyStateFooter>
              <Button variant="primary" onClick={handleGC} {...gcButtonLoadingProps}>
                {t('CHART_CARD.DIAGNOSTICS_GC_BUTTON')}
              </Button>
            </EmptyStateFooter>
          </EmptyState>
        </Bullseye>
      </CardBody>
    </DashboardCard>
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
  title: 'CHART_CARD.DIAGNOSTICS_CARD_TITLE',
  cardSizes: DiagnosticsCardSizes,
  description: 'CHART_CARD.DIAGNOSTICS_CARD_DESCRIPTION',
  descriptionFull: 'CHART_CARD.DIAGNOSTICS_CARD_DESCRIPTION_FULL',
  component: DiagnosticsCard,
  propControls: [],
  icon: <TachometerAltIcon />,
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
