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
import { Target } from '@app/Shared/Services/Target.service';
import useDayjs from '@app/utils/useDayjs';
import { useSubscriptions } from '@app/utils/useSubscriptions';
import {
  Chart,
  ChartAxis,
  ChartDonutUtilization,
  ChartGroup,
  ChartLine,
  ChartVoronoiContainer,
} from '@patternfly/react-charts';
import { Button, CardActions, CardBody, CardHeader, CardTitle } from '@patternfly/react-core';
import { SyncAltIcon } from '@patternfly/react-icons';
import { TFunction } from 'i18next';
import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { first, interval, map, switchMap } from 'rxjs';
import { DashboardCardDescriptor, DashboardCardProps, DashboardCardSizes } from '../Dashboard';
import { DashboardCard } from '../DashboardCard';

export interface MBeanMetricsChartCardProps extends DashboardCardProps {
  chartKind: string;
  duration: number;
  period: number;
}

interface Sample {
  timestamp: number;
  values: number[];
}

interface MBeanMetricsChartKind {
  displayName: string;
  category: string;
  fields: string[];
  /* eslint-disable @typescript-eslint/no-explicit-any */
  mapper: (metrics: any) => [number];
  singleValue?: boolean;
  visual: (t: TFunction, dayjs, samples: Sample[]) => React.ReactElement;
}

const SingleLineChart: React.FC<{
  data: { x: number; y: number }[];
  units?: string;
  xTicks?: (number | string)[];
  yTicks?: (number | string)[];
  /* eslint-disable @typescript-eslint/no-explicit-any */
  labeller: (datum: any) => string;
}> = ({ data, xTicks, yTicks, units, labeller }) => {
  return (
    <div className="disabled-pointer">
      <Chart containerComponent={<ChartVoronoiContainer labels={labeller} constrainToVisibleArea />}>
        <ChartAxis tickValues={xTicks} fixLabelOverlap />
        <ChartAxis tickValues={yTicks} dependentAxis showGrid label={units} />
        <ChartGroup>
          <ChartLine data={data} name={units}></ChartLine>
        </ChartGroup>
      </Chart>
    </div>
  );
};

/* eslint-disable @typescript-eslint/no-explicit-any */
const SimpleChart: React.FC<{
  t: TFunction;
  dayjs;
  samples: Sample[];
  units?: string;
}> = ({ dayjs, samples, units }) => {
  const data = samples.map((v) => ({ x: v.timestamp, y: v.values[0] }));
  return (
    <SingleLineChart
      data={data}
      units={units}
      xTicks={samples.map((v) => v.timestamp).map(dayjs)}
      labeller={({ datum }) => `${dayjs(datum.x)}: ${datum.y} ${units || ''}`}
    />
  );
};

// TODO these need to be localized
const chartKinds: MBeanMetricsChartKind[] = [
  {
    displayName: 'System Load Average',
    category: 'os',
    fields: ['systemCpuLoad'],
    /* eslint-disable @typescript-eslint/no-explicit-any */
    mapper: (metrics: any) => [metrics.systemCpuLoad],
    visual: (t, dayjs, samples: Sample[]) => <SimpleChart t={t} dayjs={dayjs} samples={samples} />,
  },
  {
    displayName: 'Heap Memory Usage',
    category: 'memory',
    fields: ['heapMemoryUsage{ used }'],
    // TODO scale units automatically and report units dynamically
    /* eslint-disable @typescript-eslint/no-explicit-any */
    mapper: (metrics: any) => [Math.round(metrics.heapMemoryUsage.used / Math.pow(1024, 2))],
    visual: (t, dayjs, samples: Sample[]) => <SimpleChart t={t} dayjs={dayjs} samples={samples} units={'MiB'} />,
  },
  {
    displayName: 'Heap Usage Percentage',
    category: 'memory',
    fields: ['heapMemoryUsagePercent'],
    // TODO scale units automatically and report units dynamically
    /* eslint-disable @typescript-eslint/no-explicit-any */
    mapper: (metrics: any) => [metrics.heapMemoryUsagePercent],
    singleValue: true,
    visual: (_t, _dayjs, samples: Sample[]) => {
      let value = 0;
      if (samples?.length > 0) {
        value = samples.slice(-1)[0].values[0] * 100;
      }
      return (
        <ChartDonutUtilization
          constrainToVisibleArea
          data={{ x: 'Used heap memory', y: value }}
          title={`${value.toFixed(2)}%`}
          labels={({ datum }) => (datum.x ? `${datum.x}: ${datum.y.toFixed(2)}%` : null)}
        />
      );
    },
  },
  {
    displayName: 'Non-Heap Memory Usage',
    category: 'memory',
    fields: ['nonHeapMemoryUsage{ used }'],
    /* eslint-disable @typescript-eslint/no-explicit-any */
    mapper: (metrics: any) => [Math.round(metrics.nonHeapMemoryUsage.used / Math.pow(1024, 2))],
    visual: (t, dayjs, samples: Sample[]) => <SimpleChart t={t} dayjs={dayjs} samples={samples} units={'MiB'} />,
  },
];

function getChartKindByName(name: string): MBeanMetricsChartKind {
  return chartKinds.filter((k) => k.displayName === name)[0];
}

export const MBeanMetricsChartCard: React.FC<MBeanMetricsChartCardProps> = (props) => {
  const [t] = useTranslation();
  const [dayjs] = useDayjs();
  const serviceContext = React.useContext(ServiceContext);
  const addSubscription = useSubscriptions();
  const [samples, setSamples] = React.useState([] as Sample[]);

  React.useEffect(() => {
    addSubscription(serviceContext.target.target().subscribe(_ => setSamples([])));
  }, [addSubscription, serviceContext, setSamples]);

  const refresh = React.useCallback(() => {
    const kind = getChartKindByName(props.chartKind);
    const fields = kind.fields.join('\n');
    serviceContext.target
      .target()
      .pipe(
        first(),
        switchMap((target: Target) =>
          /* eslint-disable @typescript-eslint/no-explicit-any */
          serviceContext.api.graphql<any>(
            `
          query MBeanMXMetricsForTarget($connectUrl: String) {
            targetNodes(filter: { name: $connectUrl }) {
              mbeanMetrics {
                ${kind.category} {
                  ${fields}
                }
              }
            }
          }`,
            { connectUrl: target.connectUrl }
          )
        ),
        /* eslint-disable @typescript-eslint/no-explicit-any */
        map((resp: any) => {
          const timestamp = Date.now();
          const metrics = resp.data.targetNodes[0].mbeanMetrics;
          const values: number[] = kind.mapper(metrics[kind.category]);
          return { timestamp, values };
        })
      )
      .subscribe((v) =>
        setSamples((old) => {
          const now = Date.now();
          if (kind.singleValue) {
            return [v];
          }
          return [...old, v].filter((d) => d.timestamp > now - props.duration * 1000);
        })
      );
  }, [serviceContext, props.chartKind, props.duration]);

  React.useEffect(() => {
    refresh();
    addSubscription(interval(props.period * 1000).subscribe(() => refresh()));
  }, [addSubscription, props.period, refresh]);

  const refreshButton = React.useMemo(() => {
    return (
      <Button
        key={0}
        aria-label={t('CHART_CARD.BUTTONS.SYNC.LABEL', { chartKind: props.chartKind })}
        onClick={refresh}
        variant="plain"
        icon={<SyncAltIcon />}
      />
    );
  }, [t, props.chartKind, refresh]);

  const actions = React.useMemo(() => {
    const a = props.actions || [];
    return [refreshButton, ...a];
  }, [props.actions, refreshButton]);

  const header = React.useMemo(() => {
    return (
      <CardHeader>
        <CardTitle>{props.chartKind}</CardTitle>
        <CardActions>{actions}</CardActions>
      </CardHeader>
    );
  }, [props.chartKind, actions]);

  const visual = React.useMemo(() => {
    return getChartKindByName(props.chartKind).visual(t, dayjs, samples);
  }, [props.chartKind, t, dayjs, samples]);

  return (
    <DashboardCard
      id={props.chartKind + '-chart-card'}
      dashboardId={props.dashboardId}
      cardSizes={MBeanMetricsChartCardSizes}
      isCompact
      cardHeader={header}
    >
      <CardBody>{visual}</CardBody>
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
  ],
};
