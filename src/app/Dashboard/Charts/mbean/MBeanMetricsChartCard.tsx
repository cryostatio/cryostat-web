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
import { ThemeType, ThemeSetting } from '@app/Settings/types';
import { MBeanMetrics } from '@app/Shared/Services/api.types';
import { FeatureLevel } from '@app/Shared/Services/service.types';
import { ServiceContext } from '@app/Shared/Services/Services';
import useDayjs from '@app/utils/hooks/useDayjs';
import { useSubscriptions } from '@app/utils/hooks/useSubscriptions';
import { useTheme } from '@app/utils/hooks/useTheme';
import {
  Chart,
  ChartArea,
  ChartAxis,
  ChartDonutUtilization,
  ChartGroup,
  ChartLabel,
  ChartLegend,
  ChartLine,
  ChartVoronoiContainer,
  getResizeObserver,
} from '@patternfly/react-charts';
import { Button, CardActions, CardBody, CardHeader, CardTitle } from '@patternfly/react-core';
import { MonitoringIcon, SyncAltIcon } from '@patternfly/react-icons';
import _ from 'lodash';
import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { interval } from 'rxjs';
import { DashboardCard } from '../../DashboardCard';
import { ChartContext } from '../context';

export interface MBeanMetricsChartCardProps extends DashboardCardTypeProps {
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
  visual: (cryostatTheme: ThemeType, themeColor: string, width: number, samples: Sample[]) => React.ReactElement;
}

const SimpleChart: React.FC<{
  cryostatTheme?: ThemeType;
  themeColor?: string;
  style: 'line' | 'area';
  width: number;
  samples: Sample[];
  units: string;
  interpolation?: 'linear' | 'step' | 'monotoneX';
}> = ({ cryostatTheme, themeColor, style, width, samples, units, interpolation }) => {
  const [dayjs, dateTimeFormat] = useDayjs();

  const data = React.useMemo(
    () => samples.map((v) => ({ x: v.timestamp, y: v.datapoint.value, name: v.datapoint.name })),
    [samples],
  );

  const keys = React.useMemo(() => _.uniqBy(data, (d) => d.name), [data]);

  const render = React.useCallback(
    (key, data, style) =>
      style === 'line' ? (
        <ChartLine key={key} data={data} name={units} interpolation={interpolation} />
      ) : (
        <ChartArea key={key} data={data} name={units} interpolation={interpolation} />
      ),
    [units, interpolation],
  );

  return (
    <Chart
      containerComponent={
        <ChartVoronoiContainer
          labels={({ datum }) =>
            `${dayjs(datum.x).tz(dateTimeFormat.timeZone.full).format('LLLL')}: ${
              typeof datum.y === 'number' ? datum.y.toFixed(2) : datum.y
            } ${units || ''}`
          }
          constrainToVisibleArea
        />
      }
      legendData={keys.length > 1 ? keys.map((k) => ({ name: k.name })) : []}
      legendPosition={'bottom'}
      legendComponent={
        <ChartLegend
          labelComponent={
            <ChartLabel
              style={{
                fill:
                  cryostatTheme === ThemeSetting.DARK
                    ? 'var(--pf-global--palette--black-200)'
                    : 'var(--pf-chart-global--label--Fill, #151515)',
              }}
            />
          }
        />
      }
      themeColor={themeColor}
      width={width}
      padding={{
        left: 54,
        right: 30,
        top: 10,
        bottom: 60,
      }}
    >
      <ChartAxis tickFormat={(t) => dayjs(t).tz(dateTimeFormat.timeZone.full).format('LTS')} fixLabelOverlap />
      <ChartAxis
        tickFormat={(t) => (typeof t !== 'number' ? t : t.toPrecision(2))}
        dependentAxis
        showGrid
        label={units}
        axisLabelComponent={
          <ChartLabel
            style={{
              fill:
                cryostatTheme === ThemeSetting.DARK
                  ? 'var(--pf-global--palette--black-200)'
                  : 'var(--pf-chart-global--label--Fill, #151515)',
            }}
          />
        }
      />
      <ChartGroup>
        {keys.map((k) =>
          render(
            k,
            data.filter((d) => d.name === k.name),
            style,
          ),
        )}
      </ChartGroup>
    </Chart>
  );
};

// TODO these need to be localized
const chartKinds: MBeanMetricsChartKind[] = [
  {
    displayName: 'Process CPU Load',
    category: 'os',
    fields: ['processCpuLoad'],
    mapper: (metrics: MBeanMetrics) => [{ name: 'processCpuLoad', value: (metrics?.os?.processCpuLoad || 0) * 100 }],
    visual: (cryostatTheme: ThemeType, themeColor: string, width: number, samples: Sample[]) => (
      <SimpleChart
        samples={samples}
        width={width}
        units={'%'}
        interpolation={'monotoneX'}
        style={'line'}
        themeColor={themeColor}
        cryostatTheme={cryostatTheme}
      />
    ),
  },
  {
    displayName: 'System Load Average',
    category: 'os',
    fields: ['systemLoadAverage'],
    mapper: (metrics: MBeanMetrics) => [{ name: 'systemLoadAverage', value: metrics?.os?.systemLoadAverage || 0 }],
    visual: (cryostatTheme: ThemeType, themeColor: string, width: number, samples: Sample[]) => (
      <SimpleChart
        samples={samples}
        width={width}
        units={''}
        interpolation={'monotoneX'}
        style={'line'}
        themeColor={themeColor}
        cryostatTheme={cryostatTheme}
      />
    ),
  },
  {
    displayName: 'System CPU Load',
    category: 'os',
    fields: ['systemCpuLoad'],
    mapper: (metrics: MBeanMetrics) => [{ name: 'systemCpuLoad', value: (metrics?.os?.systemCpuLoad || 0) * 100 }],
    visual: (cryostatTheme: ThemeType, themeColor: string, width: number, samples: Sample[]) => (
      <SimpleChart
        samples={samples}
        width={width}
        units={'%'}
        style={'line'}
        themeColor={themeColor}
        cryostatTheme={cryostatTheme}
      />
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
    visual: (cryostatTheme: ThemeType, themeColor: string, width: number, samples: Sample[]) => (
      <SimpleChart
        samples={samples}
        width={width}
        units={'MiB'}
        interpolation={'step'}
        style={'area'}
        themeColor={themeColor}
        cryostatTheme={cryostatTheme}
      />
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
    visual: (cryostatTheme: ThemeType, themeColor: string, width: number, samples: Sample[]) => (
      <SimpleChart
        samples={samples}
        width={width}
        units={'MiB'}
        interpolation={'step'}
        style={'area'}
        themeColor={themeColor}
        cryostatTheme={cryostatTheme}
      />
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
    visual: (cryostatTheme: ThemeSetting, themeColor: string, width: number, samples: Sample[]) => {
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
          titleComponent={
            <ChartLabel
              style={{
                fill:
                  cryostatTheme === ThemeSetting.DARK
                    ? 'var(--pf-global--palette--black-200)'
                    : 'var(--pf-chart-donut--label--title--Fill, #151515)',
                fontSize: '24px',
              }}
            />
          }
          themeColor={themeColor}
          width={width}
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
        name: 'nonHeapMemoryUsed',
        value: Math.round((metrics?.memory?.nonHeapMemoryUsage?.used || 0) / Math.pow(1024, 2)),
      },
    ],
    visual: (cryostatTheme: ThemeType, themeColor: string, width: number, samples: Sample[]) => (
      <SimpleChart
        samples={samples}
        width={width}
        units={'MiB'}
        interpolation={'step'}
        style={'area'}
        themeColor={themeColor}
        cryostatTheme={cryostatTheme}
      />
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
    visual: (cryostatTheme: ThemeType, themeColor: string, width: number, samples: Sample[]) => (
      <SimpleChart
        samples={samples}
        width={width}
        units={'threads'}
        interpolation={'step'}
        style={'line'}
        themeColor={themeColor}
        cryostatTheme={cryostatTheme}
      />
    ),
  },
];

function getChartKindByName(name: string): MBeanMetricsChartKind {
  return chartKinds.filter((k) => k.displayName === name)[0];
}

export const MBeanMetricsChartCard: DashboardCardFC<MBeanMetricsChartCardProps> = (props) => {
  const { t } = useTranslation();
  const [theme] = useTheme();
  const serviceContext = React.useContext(ServiceContext);
  const controllerContext = React.useContext(ChartContext);
  const addSubscription = useSubscriptions();
  const [samples, setSamples] = React.useState([] as Sample[]);
  const [isLoading, setLoading] = React.useState(true);

  const resizeObserver = React.useRef((): void => undefined);
  const [cardWidth, setCardWidth] = React.useState(0);
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const containerRef: React.Ref<any> = React.createRef();

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
      }),
    );
  }, [addSubscription, controllerContext, props.chartKind, props.duration]);

  const handleResize = React.useCallback(() => {
    if (containerRef.current && containerRef.current.clientWidth) {
      setCardWidth(containerRef.current.clientWidth);
    }
  }, [containerRef, setCardWidth]);

  React.useEffect(() => {
    resizeObserver.current = getResizeObserver(containerRef.current, handleResize);
    return resizeObserver.current;
  }, [resizeObserver, containerRef, handleResize]);

  const refresh = React.useCallback(() => {
    controllerContext.mbeanController.requestRefresh();
  }, [controllerContext]);

  React.useEffect(() => {
    addSubscription(
      serviceContext.target.target().subscribe((_) => {
        setSamples([]);
      }),
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
    [t, props.chartKind, refresh, isLoading],
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
    [t, props.chartKind, props.duration, props.period, actions],
  );

  const chartKind = React.useMemo(() => getChartKindByName(props.chartKind), [props.chartKind]);

  const visual = React.useMemo(
    () => (
      <div ref={containerRef} style={{ height: props.isFullHeight ? '100%' : '300px' }} className="disabled-pointer">
        {chartKind.visual(theme, props.themeColor, cardWidth, samples)}
      </div>
    ),
    [theme, containerRef, props.themeColor, props.isFullHeight, chartKind, cardWidth, samples],
  );

  return (
    <DashboardCard
      id={props.chartKind + '-chart-card'}
      dashboardId={props.dashboardId}
      cardSizes={MBeanMetricsChartCardSizes}
      isCompact
      isDraggable={props.isDraggable}
      isResizable={props.isResizable}
      isFullHeight={props.isFullHeight}
      cardHeader={header}
    >
      <CardBody>{visual}</CardBody>
    </DashboardCard>
  );
};

MBeanMetricsChartCard.cardComponentName = 'MBeanMetricsChartCard';

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
  title: 'CHART_CARD.MBEAN_METRICS_CARD_TITLE',
  cardSizes: MBeanMetricsChartCardSizes,
  description: 'CHART_CARD.MBEAN_METRICS_CARD_DESCRIPTION',
  descriptionFull: `CHART_CARD.MBEAN_METRICS_CARD_DESCRIPTION_FULL`,
  component: MBeanMetricsChartCard,
  propControls: [
    {
      name: 'CHART_CARD.PROP_CONTROLS.PERFORMANCE_METRIC.NAME',
      key: 'chartKind',
      values: chartKinds.map((k) => k.displayName),
      defaultValue: chartKinds[0].displayName,
      description: 'CHART_CARD.PROP_CONTROLS.PERFORMANCE_METRIC.DESCRIPTION', // TODO should this be a function that returns a value based on the selection?
      kind: 'select',
    },
    {
      name: 'CHART_CARD.PROP_CONTROLS.DATA_WINDOW.NAME',
      key: 'duration',
      defaultValue: 60,
      description: 'CHART_CARD.PROP_CONTROLS.DATA_WINDOW.DESCRIPTION',
      kind: 'number',
      extras: {
        min: 1,
        max: 300,
      },
    },
    {
      name: 'CHART_CARD.PROP_CONTROLS.REFRESH_PERIOD.NAME',
      key: 'period',
      defaultValue: 10, // TODO this is set equal to the default Settings value for minimum refresh period, but should instead be set dynamically equal to that actual value.
      description: 'CHART_CARD.PROP_CONTROLS.REFRESH_PERIOD.DESCRIPTION',
      kind: 'number',
      extras: {
        min: 1,
        max: 300,
      },
    },
    {
      name: 'CHART_CARD.PROP_CONTROLS.THEME.NAME',
      key: 'themeColor',
      values: ['blue', 'cyan', 'gold', 'gray', 'green', 'orange', 'purple'],
      defaultValue: 'blue',
      description: 'CHART_CARD.PROP_CONTROLS.THEME.DESCRIPTION',
      kind: 'select',
      extras: {
        displayMapper: _.startCase,
      },
    },
  ],
  icon: <MonitoringIcon />,
  labels: [
    {
      content: 'Metrics',
      color: 'blue',
    },
  ],
  preview: (
    <MBeanMetricsChartCard
      themeColor={'blue'}
      chartKind={chartKinds[0].displayName}
      duration={60}
      period={1}
      span={12}
      isFullHeight
      isDraggable={false}
      isResizable={false}
      dashboardId={0}
    />
  ),
};
