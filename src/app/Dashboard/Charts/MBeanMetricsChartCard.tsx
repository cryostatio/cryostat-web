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

import { ServiceContext } from '@app/Shared/Services/Services';
import { FeatureLevel } from '@app/Shared/Services/Settings.service';
import useDayjs from '@app/utils/useDayjs';
import { useSubscriptions } from '@app/utils/useSubscriptions';
import {
  Chart,
  ChartArea,
  ChartAxis,
  ChartDonutUtilization,
  ChartGroup,
  ChartLine,
  ChartVoronoiContainer,
} from '@patternfly/react-charts';
import { Bullseye, Button, CardActions, CardBody, CardHeader, CardTitle } from '@patternfly/react-core';
import { SyncAltIcon } from '@patternfly/react-icons';
import _ from 'lodash';
import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { interval } from 'rxjs';
import { DashboardCardDescriptor, DashboardCardProps, DashboardCardSizes } from '../Dashboard';
import { DashboardCard } from '../DashboardCard';
import { ChartContext } from './ChartContext';
import { MBeanMetrics } from './MBeanMetricsChartController';

export interface MBeanMetricsChartCardProps extends DashboardCardProps {
  themeColor: string;
  chartKind: string;
  duration: number;
  period: number;
}

interface Datapoint {
  name: string;
  value: number;
}

interface Sample {
  timestamp: number;
  datapoint: Datapoint;
}

interface MBeanMetricsChartKind {
  displayName: string;
  category: string;
  fields: string[];
  mapper: (metrics: MBeanMetrics) => Datapoint[];
  singleValue?: boolean;
  visual: (themeColor: string, samples: Sample[]) => React.ReactElement;
}

const SimpleChart: React.FC<{
  themeColor?: string;
  style: 'line' | 'area';
  samples: Sample[];
  units?: string;
  interpolation?: 'linear' | 'step' | 'monotoneX';
}> = ({ themeColor, style, samples, units, interpolation }) => {
  const [dayjs] = useDayjs();

  const data = React.useMemo(
    () => samples.map((v) => ({ x: v.timestamp, y: v.datapoint.value, name: v.datapoint.name })),
    [samples]
  );

  const keys = React.useMemo(() => _.uniqBy(data, (d) => d.name), [data]);

  const render = React.useCallback(
    (key, data, style) =>
      style === 'line' ? (
        <ChartLine key={key} data={data} name={units} interpolation={interpolation} />
      ) : (
        <ChartArea key={key} data={data} name={units} interpolation={interpolation} />
      ),
    [units, interpolation]
  );

  return (
    <div className="disabled-pointer">
      <Chart
        containerComponent={
          <ChartVoronoiContainer
            labels={({ datum }) => `${dayjs(datum.x)}: ${datum.y} ${units || ''}`}
            constrainToVisibleArea
          />
        }
        legendData={keys.length > 1 ? keys.map((k) => ({ name: k.name })) : []}
        legendPosition={'bottom'}
        themeColor={themeColor}
      >
        <ChartAxis tickValues={samples.map((v) => v.timestamp).map(dayjs)} fixLabelOverlap />
        <ChartAxis dependentAxis showGrid label={units} />
        <ChartGroup>
          {keys.map((k) =>
            render(
              k,
              data.filter((d) => d.name === k.name),
              style
            )
          )}
        </ChartGroup>
      </Chart>
    </div>
  );
};

// TODO these need to be localized
const chartKinds: MBeanMetricsChartKind[] = [
  {
    displayName: 'Process Load Average',
    category: 'os',
    fields: ['processCpuLoad'],
    mapper: (metrics: MBeanMetrics) => [{ name: 'processCpuLoad', value: metrics?.os?.processCpuLoad || 0 }],
    visual: (themeColor: string, samples: Sample[]) => (
      <SimpleChart samples={samples} interpolation={'monotoneX'} style={'line'} themeColor={themeColor} />
    ),
  },
  {
    displayName: 'System Load Average',
    category: 'os',
    fields: ['systemLoadAverage'],
    mapper: (metrics: MBeanMetrics) => [{ name: 'systemLoadAverage', value: metrics?.os?.systemLoadAverage || 0 }],
    visual: (themeColor: string, samples: Sample[]) => (
      <SimpleChart samples={samples} interpolation={'monotoneX'} style={'line'} themeColor={themeColor} />
    ),
  },
  {
    displayName: 'System CPU Load',
    category: 'os',
    fields: ['systemCpuLoad'],
    mapper: (metrics: MBeanMetrics) => [{ name: 'systemCpuLoad', value: metrics?.os?.systemCpuLoad || 0 }],
    visual: (themeColor: string, samples: Sample[]) => (
      <SimpleChart samples={samples} style={'line'} themeColor={themeColor} />
    ),
  },
  {
    displayName: 'Physical Memory',
    category: 'os',
    fields: ['freePhysicalMemorySize', 'totalPhysicalMemorySize'],
    // TODO scale units automatically and report units dynamically
    mapper: (metrics: MBeanMetrics) => [
      {
        name: 'usedPhysicalMemorySize',
        value:
          ((metrics?.os?.totalPhysicalMemorySize || 0) - (metrics?.os?.freePhysicalMemorySize || 0)) /
          Math.pow(1024, 2),
      },
      {
        name: 'totalPhysicalMemorySize',
        value: (metrics?.os?.totalPhysicalMemorySize || 0) / Math.pow(1024, 2),
      },
    ],
    visual: (themeColor: string, samples: Sample[]) => (
      <SimpleChart samples={samples} units={'MiB'} interpolation={'step'} style={'area'} themeColor={themeColor} />
    ),
  },
  {
    displayName: 'Heap Memory Usage',
    category: 'memory',
    fields: ['heapMemoryUsage{ used }'],
    mapper: (metrics: MBeanMetrics) => [
      {
        name: 'heapMemoryUsed',
        value: Math.round((metrics?.memory?.heapMemoryUsage?.used || 0) / Math.pow(1024, 2)),
      },
    ],
    visual: (themeColor: string, samples: Sample[]) => (
      <SimpleChart samples={samples} units={'MiB'} interpolation={'step'} style={'area'} themeColor={themeColor} />
    ),
  },
  {
    displayName: 'Heap Usage Percentage',
    category: 'memory',
    fields: ['heapMemoryUsagePercent'],
    mapper: (metrics: MBeanMetrics) => [
      { name: 'heapMemoryUsage', value: metrics?.memory?.heapMemoryUsagePercent || 0 },
    ],
    singleValue: true,
    visual: (themeColor: string, samples: Sample[]) => {
      let value = 0;
      if (samples?.length > 0) {
        value = samples.slice(-1)[0].datapoint.value * 100;
      }
      return (
        <ChartDonutUtilization
          constrainToVisibleArea
          data={{ x: 'Used heap memory', y: value }}
          title={`${value.toFixed(2)}%`}
          labels={({ datum }) => (datum.x ? `${datum.x}: ${datum.y.toFixed(2)}%` : null)}
          themeColor={themeColor}
        />
      );
    },
  },
  {
    displayName: 'Non-Heap Memory Usage',
    category: 'memory',
    fields: ['nonHeapMemoryUsage{ used }'],
    mapper: (metrics: MBeanMetrics) => [
      {
        name: 'noneapMemoryUsed',
        value: Math.round((metrics?.memory?.nonHeapMemoryUsage?.used || 0) / Math.pow(1024, 2)),
      },
    ],
    visual: (themeColor: string, samples: Sample[]) => (
      <SimpleChart samples={samples} units={'MiB'} interpolation={'step'} style={'area'} themeColor={themeColor} />
    ),
  },
  {
    displayName: 'Threads',
    category: 'thread',
    fields: ['daemonThreadCount', 'threadCount'],
    mapper: (metrics: MBeanMetrics) => [
      {
        name: 'daemonThreadCount',
        value: metrics?.thread?.daemonThreadCount || 0,
      },
      {
        name: 'threadCount',
        value: metrics?.thread?.threadCount || 0,
      },
    ],
    visual: (themeColor: string, samples: Sample[]) => (
      <SimpleChart samples={samples} interpolation={'step'} style={'line'} themeColor={themeColor} />
    ),
  },
];

function getChartKindByName(name: string): MBeanMetricsChartKind {
  return chartKinds.filter((k) => k.displayName === name)[0];
}

export const MBeanMetricsChartCard: React.FC<MBeanMetricsChartCardProps> = (props) => {
  const [t] = useTranslation();
  const serviceContext = React.useContext(ServiceContext);
  const controllerContext = React.useContext(ChartContext);
  const addSubscription = useSubscriptions();
  const [samples, setSamples] = React.useState([] as Sample[]);
  const [isLoading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const kind = getChartKindByName(props.chartKind);
    addSubscription(
      controllerContext.mbeanController.attach(kind.category, kind.fields).subscribe((v: MBeanMetrics) => {
        setSamples((old: Sample[]) => {
          const timestamp = Date.now();
          const newSamples: Sample[] = kind.mapper(v).map((datapoint: Datapoint): Sample => ({ timestamp, datapoint }));
          if (kind.singleValue) {
            return newSamples;
          }
          return [...old, ...newSamples].filter((d) => d.timestamp > timestamp - props.duration * 1000);
        });
      })
    );
  }, [addSubscription, controllerContext, props.chartKind, props.duration]);

  const refresh = React.useCallback(() => {
    controllerContext.mbeanController.requestRefresh();
  }, [controllerContext]);

  React.useEffect(() => {
    addSubscription(
      serviceContext.target.target().subscribe((_) => {
        setSamples([]);
      })
    );
  }, [addSubscription, serviceContext, setSamples, refresh]);

  React.useEffect(() => {
    refresh();
    addSubscription(interval(props.period * 1000).subscribe(() => refresh()));
  }, [addSubscription, props.period, refresh]);

  React.useEffect(() => {
    addSubscription(controllerContext.mbeanController.loading().subscribe(setLoading));
  }, [addSubscription, controllerContext, setLoading]);

  const refreshButton = React.useMemo(
    () => (
      <Button
        key={0}
        aria-label={t('CHART_CARD.BUTTONS.SYNC.LABEL', { chartKind: props.chartKind })}
        onClick={refresh}
        variant="plain"
        icon={<SyncAltIcon />}
        isDisabled={isLoading}
      />
    ),
    [t, props.chartKind, refresh, isLoading]
  );

  const actions = React.useMemo(() => {
    const a = props.actions || [];
    return [refreshButton, ...a];
  }, [props.actions, refreshButton]);

  const header = React.useMemo(
    () => (
      <CardHeader>
        <CardTitle>
          {t('CHART_CARD.TITLE', { chartKind: props.chartKind, duration: props.duration, period: props.period })}
        </CardTitle>
        <CardActions>{actions}</CardActions>
      </CardHeader>
    ),
    [t, props.chartKind, props.duration, props.period, actions]
  );

  const chartKind = React.useMemo(() => getChartKindByName(props.chartKind), [props.chartKind]);

  const visual = React.useMemo(
    () => chartKind.visual(props.themeColor, samples),
    [props.themeColor, chartKind, samples]
  );

  return (
    <DashboardCard
      id={props.chartKind + '-chart-card'}
      dashboardId={props.dashboardId}
      cardSizes={MBeanMetricsChartCardSizes}
      isCompact
      cardHeader={header}
    >
      <CardBody>
        <Bullseye>{visual}</Bullseye>
      </CardBody>
    </DashboardCard>
  );
};

export const MBeanMetricsChartCardSizes: DashboardCardSizes = {
  span: {
    minimum: 2,
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

export const MBeanMetricsChartCardDescriptor: DashboardCardDescriptor = {
  featureLevel: FeatureLevel.PRODUCTION,
  title: 'MBean Metrics Chart',
  cardSizes: MBeanMetricsChartCardSizes,
  description: 'Display common performance metrics from current MBean data.',
  descriptionFull: `Display a single performance metric from a list of supported MBeans.`,
  component: MBeanMetricsChartCard,
  propControls: [
    {
      name: 'Performance Metric',
      key: 'chartKind',
      values: chartKinds.map((k) => k.displayName),
      defaultValue: chartKinds[0].displayName,
      description: 'Select the metric to display in this card.', // TODO should this be a function that returns a value based on the selection?
      kind: 'select',
    },
    {
      name: 'Data Window',
      key: 'duration',
      defaultValue: 60,
      description: 'The data window width in seconds.',
      kind: 'number',
      extras: {
        min: 1,
        max: 300,
      },
    },
    {
      name: 'Refresh Period',
      key: 'period',
      defaultValue: 5,
      description: 'The chart refresh period in seconds.',
      kind: 'number',
      extras: {
        min: 1,
        max: 300,
      },
    },
    {
      name: 'Color',
      key: 'themeColor',
      values: ['blue', 'cyan', 'gold', 'gray', 'green', 'orange', 'purple'],
      defaultValue: 'blue',
      description: 'The color theme to apply to this chart.',
      kind: 'select',
    },
  ],
};
