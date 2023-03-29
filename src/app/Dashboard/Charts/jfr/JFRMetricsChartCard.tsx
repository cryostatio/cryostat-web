/*
 * Copyright The Cryostat Authors
 *
 * The Universal Permissive License (UPL), Version 1.0
 *
 * Subject to the condition set forth below, permission is hereby granted to any
 * person obtaining a copy of this software, associated documentation and/or data
 * (collectively the "Software"), free of charge and under any and all copyright
 * rights in the Software, and any and all patent rights owned or freely
 * licensable by each licensor hereunder covering either (i) the unmodified
 * Software as contributed to or provided by such licensor, or (ii) the Larger
 * Works (as defined below), to deal in both
 *
 * (a) the Software, and
 * (b) any piece of software and/or hardware listed in the lrgrwrks.txt file if
 * one is included with the Software (each a "Larger Work" to which the Software
 * is contributed by such licensors),
 *
 * without restriction, including without limitation the rights to copy, create
 * derivative works of, display, perform, and distribute the Software and make,
 * use, sell, offer for sale, import, export, have made, and have sold the
 * Software and the Larger Work(s), and to sublicense the foregoing rights on
 * either these or other terms.
 *
 * This license is subject to the following condition:
 * The above copyright notice and either this complete permission notice or at
 * a minimum a reference to the UPL must be included in all copies or
 * substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

import { CreateRecordingProps } from '@app/CreateRecording/CreateRecording';
import { DashboardCardDescriptor, DashboardCardProps, DashboardCardSizes } from '@app/Dashboard/Dashboard';
import { LoadingView } from '@app/LoadingView/LoadingView';
import { ServiceContext } from '@app/Shared/Services/Services';
import { FeatureLevel } from '@app/Shared/Services/Settings.service';
import { useSubscriptions } from '@app/utils/useSubscriptions';
import { useTheme } from '@app/utils/useTheme';
import {
  Bullseye,
  Button,
  CardActions,
  CardBody,
  CardHeader,
  CardTitle,
  EmptyState,
  EmptyStateBody,
  EmptyStateIcon,
  EmptyStateVariant,
  Label,
  Title,
} from '@patternfly/react-core';
import { DataSourceIcon, ExternalLinkAltIcon, SyncAltIcon } from '@patternfly/react-icons';
import * as React from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { useHistory } from 'react-router-dom';
import { interval } from 'rxjs';
import { DashboardCard } from '../../DashboardCard';
import { ChartContext } from './../ChartContext';
import { ControllerState, RECORDING_NAME } from './JFRMetricsChartController';

export interface JFRMetricsChartCardProps extends DashboardCardProps {
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

export const JFRMetricsChartCard: React.FC<JFRMetricsChartCardProps> = (props) => {
  const [t] = useTranslation();
  const serviceContext = React.useContext(ServiceContext);
  const controllerContext = React.useContext(ChartContext);
  const history = useHistory();
  const addSubscription = useSubscriptions();
  const theme = useTheme();
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
    const u = new URL('/d-solo/main', dashboardUrl);
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
    const isWide = props.span > 4;
    const style = {
      marginBottom: isWide ? '-2em' : '',
    };
    if (controllerState === ControllerState.READY) {
      return (
        <CardHeader style={style}>
          <CardActions>{actions}</CardActions>
        </CardHeader>
      );
    } else {
      return (
        <CardHeader style={style}>
          <CardTitle>{props.chartKind}</CardTitle>
          <CardActions>{props.actions}</CardActions>
        </CardHeader>
      );
    }
  }, [props.actions, props.span, props.chartKind, controllerState, actions]);

  const handleCreateRecording = React.useCallback(() => {
    history.push({
      pathname: '/recordings/create',
      state: {
        restartExisting: true,
        name: RECORDING_NAME,
        templateName: 'Continuous',
        templateType: 'TARGET',
        labels: [{ key: 'origin', value: RECORDING_NAME }],
        duration: -1,
        // TODO these are arbitrary defaults that will be set in the recording creation form.
        // Should these values be inferred in some more intelligent way?
        maxAge: 120, // seconds
        maxSize: 100 * 1024 * 1024, // bytes
      } as CreateRecordingProps,
    });
  }, [history]);

  return (
    <DashboardCard
      id={props.chartKind + '-chart-card'}
      dashboardId={props.dashboardId}
      cardSizes={JFRMetricsChartCardSizes}
      isCompact
      style={cardStyle}
      cardHeader={header}
      isDraggable={props.isDraggable}
      isResizable={props.isResizable}
      isFullHeight={props.isFullHeight}
    >
      <CardBody>
        {controllerState === ControllerState.UNKNOWN ? (
          <LoadingView />
        ) : controllerState === ControllerState.READY ? (
          <iframe
            className="disabled-pointer"
            key={controllerState + randomKey}
            style={{ height: '100%', width: '100%' }}
            src={chartSrc}
          />
        ) : (
          <Bullseye>
            <EmptyState variant={EmptyStateVariant.large}>
              <EmptyStateIcon icon={DataSourceIcon} />
              <Title headingLevel="h2" size="md">
                {t('CHART_CARD.NO_RECORDING.TITLE')}
              </Title>
              <EmptyStateBody>
                <Trans
                  t={t}
                  values={{ recordingName: RECORDING_NAME }}
                  components={{ label: <Label color="blue" isCompact /> }}
                >
                  CHART_CARD.NO_RECORDING.DESCRIPTION
                </Trans>
              </EmptyStateBody>
              <Button variant="primary" onClick={handleCreateRecording}>
                {t('CHART_CARD.BUTTONS.CREATE.LABEL')}
              </Button>
            </EmptyState>
          </Bullseye>
        )}
      </CardBody>
    </DashboardCard>
  );
};

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
};
