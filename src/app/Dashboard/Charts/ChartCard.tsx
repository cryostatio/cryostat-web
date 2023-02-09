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
import { ServiceContext } from '@app/Shared/Services/Services';
import {FeatureLevel} from '@app/Shared/Services/Settings.service';
import { useSubscriptions } from '@app/utils/useSubscriptions';
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
  Title,
} from '@patternfly/react-core';
import { DataSourceIcon, ExternalLinkAltIcon, SyncAltIcon } from '@patternfly/react-icons';
import * as React from 'react';
import { useHistory } from 'react-router-dom';
import { interval } from 'rxjs';
import { DashboardCardDescriptor, DashboardCardProps, DashboardCardSizes } from '../Dashboard';
import { DashboardCard } from '../DashboardCard';
import { ChartContext } from './ChartContext';
import { RECORDING_NAME } from './ChartController';

export interface ChartCardProps extends DashboardCardProps {
  theme: string;
  chartKind: string;
  duration: number;
  period: number;
}

// TODO these need to be localized
export enum ChartKind {
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
  return ChartKind[kind];
}

function getHeight(kind: string): number {
  switch (kind) {
    case 'Core Count':
      return 180;
    default:
      return 380;
  }
}

export const ChartCard: React.FC<ChartCardProps> = (props) => {
  const serviceContext = React.useContext(ServiceContext);
  const controllerContext = React.useContext(ChartContext);
  const history = useHistory();
  const addSubscription = useSubscriptions();
  const [idx, setIdx] = React.useState(0);
  const [key, setKey] = React.useState(Math.floor(Math.random()));
  const [hasRecording, setHasRecording] = React.useState(false);
  const [chartSrc, setChartSrc] = React.useState('');
  const [dashboardUrl, setDashboardUrl] = React.useState('');

  const updateKey = React.useCallback(() => {
    setKey((prev) => {
      let next = prev + 1;
      if (next >= 10) {
        next = 0;
      }
      return next;
    });
  }, [setKey]);

  React.useEffect(() => {
    addSubscription(serviceContext.target.target().subscribe((_) => updateKey()));
  }, [addSubscription, serviceContext, updateKey]);

  React.useEffect(() => {
    addSubscription(controllerContext.controller.hasActiveRecording().subscribe(setHasRecording));
  }, [addSubscription, controllerContext, setHasRecording]);

  React.useEffect(() => {
    addSubscription(serviceContext.api.grafanaDashboardUrl().subscribe(setDashboardUrl));
  }, [addSubscription, serviceContext, setDashboardUrl]);

  React.useEffect(() => {
    if (!dashboardUrl) {
      return;
    }
    const u = new URL('/d-solo/main', dashboardUrl);
    u.searchParams.append('theme', props.theme);
    u.searchParams.append('panelId', String(kindToId(props.chartKind)));
    u.searchParams.append('to', 'now');
    u.searchParams.append('from', `now-${props.duration}s`);
    u.searchParams.append('refresh', `${props.period}s`);
    setChartSrc(u.toString());
  }, [dashboardUrl, props.theme, props.chartKind, props.duration, props.period, setChartSrc]);

  React.useEffect(() => {
    addSubscription(controllerContext.controller.attach().subscribe(setIdx));
  }, [addSubscription, controllerContext]);

  const refresh = React.useCallback(() => {
    controllerContext.controller.requestRefresh();
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
    return {
      height: getHeight(props.chartKind),
    };
  }, [props.chartKind]);

  const expandButton = React.useMemo(() => {
    return (
      <>
        <Button
          key={0}
          aria-label={`Expand ${props.chartKind} chart window`}
          onClick={updateKey}
          variant="plain"
          icon={<SyncAltIcon />}
          isDisabled={!chartSrc || !dashboardUrl}
        />
      </>
    );
  }, [props.chartKind, updateKey, chartSrc, dashboardUrl]);

  const popoutButton = React.useMemo(() => {
    return (
      <>
        <Button
          key={1}
          aria-label={`Pop out ${props.chartKind} chart`}
          onClick={popout}
          variant="plain"
          icon={<ExternalLinkAltIcon />}
          isDisabled={!chartSrc || !dashboardUrl}
        />
      </>
    );
  }, [props.chartKind, popout, chartSrc, dashboardUrl]);

  const actions = React.useMemo(() => {
    const a = props.actions || [];
    return [expandButton, popoutButton, ...a];
  }, [props.actions, expandButton, popoutButton]);

  const header = React.useMemo(() => {
    const isWide = props.span > 4;
    const style = {
      marginBottom: isWide ? '-2.8em' : '',
    };
    if (hasRecording) {
      return (
        <>
          <CardHeader style={style}>
            <CardActions>{actions}</CardActions>
          </CardHeader>
        </>
      );
    } else {
      return (
        <>
          <CardHeader style={style}>
            <CardTitle>{props.chartKind}</CardTitle>
            <CardActions>{props.actions}</CardActions>
          </CardHeader>
        </>
      );
    }
  }, [props.actions, props.span, props.chartKind, hasRecording, actions]);

  const handleCreateRecording = React.useCallback(() => {
    history.push({
      pathname: '/recordings/create',
      state: {
        restartExisting: true,
        name: RECORDING_NAME,
        templateName: 'Profiling',
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
    <>
      <DashboardCard
        key={idx}
        id={props.chartKind + '-chart-card'}
        dashboardId={props.dashboardId}
        cardSizes={ChartCardSizes}
        isCompact
        style={cardStyle}
        cardHeader={header}
      >
        <CardBody>
          {hasRecording ? (
            <iframe key={key} style={{ height: '100%', width: '100%' }} src={chartSrc} />
          ) : (
            <Bullseye>
              <EmptyState variant={EmptyStateVariant.large}>
                <EmptyStateIcon icon={DataSourceIcon} />
                <Title headingLevel="h2" size="md">
                  No source recording
                </Title>
                <EmptyStateBody>
                  Metrics cards display data taken from running flight recordings with the label{' '}
                  <code>origin={RECORDING_NAME}</code>. No such recordings are currently available.
                </EmptyStateBody>

                <Button variant="primary" onClick={handleCreateRecording}>
                  Create
                </Button>
              </EmptyState>
            </Bullseye>
          )}
        </CardBody>
      </DashboardCard>
    </>
  );
};

export const ChartCardSizes: DashboardCardSizes = {
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

export const ChartCardDescriptor: DashboardCardDescriptor = {
  featureLevel: FeatureLevel.PRODUCTION,
  title: 'Metrics Chart',
  cardSizes: ChartCardSizes,
  description: 'Display common performance metrics.',
  descriptionFull:
    'Display a single performance metric from a list of supported types. Data is displayed from the present moment back to a specified duration.',
  component: ChartCard,
  propControls: [
    {
      name: 'Theme',
      key: 'theme',
      values: ['light', 'dark'],
      defaultValue: 'light',
      description: 'Select a colour theme',
      kind: 'select',
    },
    {
      name: 'Performance Metric',
      key: 'chartKind',
      values: Object.values(ChartKind).filter((v) => typeof v === 'string'),
      defaultValue: Object.values(ChartKind).filter((v) => typeof v === 'string')[0],
      description: 'Select the metric to display in this card.', // TODO should this be a function that returns a value based on the selection?
      kind: 'select',
    },
    {
      name: 'Data Window',
      key: 'duration',
      defaultValue: 120,
      description: 'The data window width in seconds.',
      kind: 'number',
      extras: {
        min: 30,
        max: 300,
      },
    },
    {
      name: 'Refresh Period',
      key: 'period',
      defaultValue: 10,
      description: 'The chart refresh period in seconds.',
      kind: 'number',
      extras: {
        min: 5,
        max: 120,
      },
    },
  ],
};
