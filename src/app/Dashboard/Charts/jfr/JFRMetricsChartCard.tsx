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
import { LoadingView } from '@app/Shared/Components/LoadingView';
import { FeatureLevel } from '@app/Shared/Services/service.types';
import { ServiceContext } from '@app/Shared/Services/Services';
import { useSubscriptions } from '@app/utils/hooks/useSubscriptions';
import { useTheme } from '@app/utils/hooks/useTheme';
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
import { DataSourceIcon, ExternalLinkAltIcon, SyncAltIcon, TachometerAltIcon } from '@patternfly/react-icons';
import * as React from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { interval } from 'rxjs';
import { DashboardCard } from '../../DashboardCard';
import { ChartContext } from '../context';
import { ControllerState, RECORDING_NAME } from './JFRMetricsChartController';

export interface JFRMetricsChartCardProps extends DashboardCardTypeProps {
  chartKind: string;
  duration: number;
  period: number;
}

// TODO these need to be localized
export enum JFRMetricsChartKind {
  'Core Count' = 1,
  'Thread Count' = 2,
  'CPU Load' = 3,
  'Heap Usage' = 4,
  'Memory Usage' = 5,
  'Total Memory' = 6,
  'Recording Start Time' = 7,
  'Recording Duration' = 8,
  'Classloading Statistics' = 9,
  'Metaspace Summary' = 10,
  'Network Utilization' = 11,
  'Metaspace GC Threshold' = 12,
  'Thread Statistics' = 13,
  'Exception Statistics' = 14,
  'Thread Context Switch Rate' = 15,
  'Compiler Statistics' = 16,

  'Safepoint Duration' = 18,
  'File I/O' = 19,
  'Compiler Total Time' = 20,

  'Compiler Peak Time' = 24,

  'Object Allocation Sample' = 38,
}

export function kindToId(kind: string): number {
  return JFRMetricsChartKind[kind];
}

export const JFRMetricsChartCard: DashboardCardFC<JFRMetricsChartCardProps> = (props) => {
  const { t } = useTranslation();
  const serviceContext = React.useContext(ServiceContext);
  const controllerContext = React.useContext(ChartContext);
  const navigate = useNavigate();
  const addSubscription = useSubscriptions();
  const [theme] = useTheme();
  const [controllerState, setControllerState] = React.useState(ControllerState.NO_DATA);
  const [randomKey, setRandomKey] = React.useState(Math.floor(Math.random()));
  const [chartSrc, setChartSrc] = React.useState('');
  const [dashboardUrl, setDashboardUrl] = React.useState('');

  const updateRandomKey = React.useCallback(() => {
    setRandomKey((prev) => {
      let next = prev + 1;
      if (next >= 10) {
        next = 0;
      }
      return next;
    });
  }, [setRandomKey]);

  React.useEffect(() => {
    addSubscription(serviceContext.api.grafanaDashboardUrl().subscribe(setDashboardUrl));
  }, [addSubscription, serviceContext, setDashboardUrl]);

  React.useEffect(() => {
    if (!dashboardUrl) {
      return;
    }
    const u = new URL('d-solo/main', new URL(dashboardUrl, window.location.href));
    u.searchParams.append('theme', theme);
    u.searchParams.append('panelId', String(kindToId(props.chartKind)));
    u.searchParams.append('to', 'now');
    u.searchParams.append('from', `now-${props.duration}s`);
    u.searchParams.append('refresh', `${props.period}s`);
    setChartSrc(u.toString());
  }, [dashboardUrl, setControllerState, theme, props.chartKind, props.duration, props.period, setChartSrc]);

  React.useEffect(() => {
    addSubscription(controllerContext.jfrController.attach().subscribe(setControllerState));
  }, [addSubscription, controllerContext, setControllerState]);

  const refresh = React.useCallback(() => {
    controllerContext.jfrController.requestRefresh();
  }, [controllerContext]);

  React.useEffect(() => {
    refresh();
    addSubscription(interval(props.period * 1000).subscribe(() => refresh()));
  }, [addSubscription, props.period, refresh]);

  const popout = React.useCallback(() => {
    if (chartSrc && dashboardUrl) {
      window.open(chartSrc, '_blank');
    }
  }, [chartSrc, dashboardUrl]);

  const cardStyle = React.useMemo(() => {
    if (controllerState !== ControllerState.READY || props.isFullHeight) {
      return {};
    }
    let height: string;
    switch (props.chartKind) {
      case 'Core Count':
        height = '250px';
        break;
      default:
        height = `380px`;
        break;
    }
    return { height };
  }, [controllerState, props.chartKind, props.isFullHeight]);

  const resyncButton = React.useMemo(() => {
    return (
      <Button
        key={0}
        aria-label={t('CHART_CARD.BUTTONS.SYNC.LABEL', { chartKind: props.chartKind })}
        onClick={updateRandomKey}
        variant="plain"
        icon={<SyncAltIcon />}
        isDisabled={!chartSrc || !dashboardUrl}
      />
    );
  }, [t, props.chartKind, updateRandomKey, chartSrc, dashboardUrl]);

  const popoutButton = React.useMemo(() => {
    return (
      <Button
        key={1}
        aria-label={t('CHART_CARD.BUTTONS.POPOUT.LABEL', { chartKind: props.chartKind })}
        onClick={popout}
        variant="plain"
        icon={<ExternalLinkAltIcon />}
        isDisabled={!chartSrc || !dashboardUrl}
      />
    );
  }, [t, props.chartKind, popout, chartSrc, dashboardUrl]);

  const actions = React.useMemo(() => {
    const a = props.actions || [];
    return [resyncButton, popoutButton, ...a];
  }, [props.actions, resyncButton, popoutButton]);

  const header = React.useMemo(() => {
    return (
      <CardHeader
        actions={{
          actions: <>{controllerState === ControllerState.READY ? actions : props.actions}</>,
          hasNoOffset: false,
          className: undefined,
        }}
      >
        <CardTitle>
          {t('CHART_CARD.TITLE', { chartKind: props.chartKind, duration: props.duration, period: props.period })}
        </CardTitle>
      </CardHeader>
    );
  }, [props.actions, props.chartKind, props.duration, props.period, t, controllerState, actions]);

  const handleCreateRecording = React.useCallback(() => {
    navigate('/recordings/create', {
      state: {
        name: RECORDING_NAME,
        template: {
          name: 'Continuous',
          type: 'TARGET',
        },
        restart: true,
        labels: [{ key: 'origin', value: RECORDING_NAME }],
        duration: -1,
        skipDurationCheck: true,
        // TODO these are arbitrary defaults that will be set in the recording creation form.
        // Should these values be inferred in some more intelligent way?
        maxAge: 120,
        maxAgeUnit: 1, // seconds
        maxSize: 100 * 1024 * 1024,
        maxSizeUnit: 1, // bytes
      },
    });
  }, [navigate]);

  return (
    <DashboardCard
      id={props.chartKind + '-chart-card'}
      dashboardId={props.dashboardId}
      cardSizes={JFRMetricsChartCardSizes}
      isCompact
      style={cardStyle}
      cardHeader={header}
      title={props.chartKind}
      isDraggable={props.isDraggable}
      isResizable={props.isResizable}
      isFullHeight={props.isFullHeight}
    >
      <CardBody>
        {controllerState === ControllerState.UNKNOWN ? (
          <LoadingView />
        ) : controllerState === ControllerState.READY ? (
          <div className="grafana-iframe-wrapper">
            <iframe className="disabled-pointer" key={controllerState + randomKey} src={chartSrc} />
          </div>
        ) : (
          <Bullseye>
            <EmptyState variant={EmptyStateVariant.lg}>
              <EmptyStateHeader
                titleText={<>{t('CHART_CARD.NO_RECORDING.TITLE')}</>}
                icon={<EmptyStateIcon icon={DataSourceIcon} />}
                headingLevel="h2"
              />
              <EmptyStateBody>
                <Trans
                  t={t}
                  values={{ recordingName: RECORDING_NAME }}
                  components={{ label: <Label color="blue" isCompact /> }}
                >
                  CHART_CARD.NO_RECORDING.DESCRIPTION
                </Trans>
              </EmptyStateBody>
              <EmptyStateFooter>
                <Button variant="primary" onClick={handleCreateRecording}>
                  {t('CHART_CARD.BUTTONS.CREATE.LABEL')}
                </Button>
              </EmptyStateFooter>
            </EmptyState>
          </Bullseye>
        )}
      </CardBody>
    </DashboardCard>
  );
};

JFRMetricsChartCard.cardComponentName = 'JFRMetricsChartCard';

export const JFRMetricsChartCardSizes: DashboardCardSizes = {
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

export const JFRMetricsChartCardDescriptor: DashboardCardDescriptor = {
  featureLevel: FeatureLevel.BETA,
  title: 'CHART_CARD.JFR_METRICS_CARD_TITLE',
  cardSizes: JFRMetricsChartCardSizes,
  description: 'CHART_CARD.JFR_METRICS_CARD_DESCRIPTION',
  descriptionFull: 'CHART_CARD.JFR_METRICS_CARD_DESCRIPTION_FULL',
  component: JFRMetricsChartCard,
  propControls: [
    {
      name: 'CHART_CARD.PROP_CONTROLS.PERFORMANCE_METRIC.NAME',
      key: 'chartKind',
      description: 'CHART_CARD.PROP_CONTROLS.PERFORMANCE_METRIC.DESCRIPTION', // TODO should this be a function that returns a value based on the selection?
      values: Object.values(JFRMetricsChartKind).filter((v) => typeof v === 'string'),
      defaultValue: Object.values(JFRMetricsChartKind).filter((v) => typeof v === 'string')[0],
      kind: 'select',
    },
    {
      name: 'CHART_CARD.PROP_CONTROLS.DATA_WINDOW.NAME',
      key: 'duration',
      defaultValue: 120,
      description: 'CHART_CARD.PROP_CONTROLS.DATA_WINDOW.DESCRIPTION',
      kind: 'number',
      extras: {
        min: 30,
        max: 300,
      },
    },
    {
      name: 'CHART_CARD.PROP_CONTROLS.REFRESH_PERIOD.NAME',
      key: 'period',
      defaultValue: 10,
      description: 'CHART_CARD.PROP_CONTROLS.REFRESH_PERIOD.DESCRIPTION',
      kind: 'number',
      extras: {
        min: 5,
        max: 120,
      },
    },
  ],
  icon: <TachometerAltIcon />,
  labels: [
    {
      content: 'Beta',
      color: 'green',
    },
    {
      content: 'Metrics',
      color: 'blue',
    },
  ],
};
