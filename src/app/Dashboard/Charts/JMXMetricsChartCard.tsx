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
import { Chart, ChartAxis, ChartGroup, ChartLine, ChartVoronoiContainer } from '@patternfly/react-charts';
import { Button, CardActions, CardBody, CardHeader, CardTitle } from '@patternfly/react-core';
import { SyncAltIcon } from '@patternfly/react-icons';
import { TFunction } from 'i18next';
import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { first, interval, map, switchMap } from 'rxjs';
import { DashboardCardDescriptor, DashboardCardProps, DashboardCardSizes } from '../Dashboard';
import { DashboardCard } from '../DashboardCard';

export interface JMXMetricsChartCardProps extends DashboardCardProps {
  chartKind: string;
  duration: number;
  period: number;
}

interface Sample {
  timestamp: number;
  values: number[];
}

interface JMXMetricsChartKind {
  displayName: string;
  category: string;
  fieldNames: string[];
  visual: (t: TFunction, dayjs, samples: Sample[]) => React.ReactElement;
}

const SingleLineChart: React.FC<{
  data: { x: number; y: number }[];
  xTicks?: (number | string)[];
  yTicks?: (number | string)[];
  /* eslint-disable @typescript-eslint/no-explicit-any */
  labeller: (datum: any) => string;
}> = ({ data, xTicks, yTicks, labeller }) => {
  return (
    <Chart height={286} containerComponent={<ChartVoronoiContainer labels={labeller} constrainToVisibleArea />}>
      <ChartAxis tickValues={xTicks} fixLabelOverlap />
      <ChartAxis tickValues={yTicks} dependentAxis showGrid />
      <ChartGroup>
        <ChartLine data={data}></ChartLine>
      </ChartGroup>
    </Chart>
  );
};

/* eslint-disable @typescript-eslint/no-explicit-any */
const SimpleChart: React.FC<{ t: TFunction; dayjs; samples: Sample[] }> = ({ dayjs, samples }) => {
  const data = samples.map((v) => ({ x: v.timestamp, y: v.values[0] }));
  return (
    <SingleLineChart
      data={data}
      xTicks={samples.map((v) => v.timestamp).map(dayjs)}
      labeller={({ datum }) => `${dayjs(datum.x)}: ${datum.y}`}
    />
  );
};

// TODO these need to be localized
const chartKinds: JMXMetricsChartKind[] = [
  {
    displayName: 'System Load Average',
    category: 'os',
    fieldNames: ['systemCpuLoad'],
    visual: (t, dayjs, samples: Sample[]) => <SimpleChart t={t} dayjs={dayjs} samples={samples} />,
  },
];

function getChartKindByName(name: string): JMXMetricsChartKind {
  return chartKinds.filter((k) => k.displayName === name)[0];
}

export const JMXMetricsChartCard: React.FC<JMXMetricsChartCardProps> = (props) => {
  const [t] = useTranslation();
  const [dayjs] = useDayjs();
  const serviceContext = React.useContext(ServiceContext);
  const addSubscription = useSubscriptions();
  const [samples, setSamples] = React.useState([] as Sample[]);

  const refresh = React.useCallback(() => {
    const kind = getChartKindByName(props.chartKind);
    const fields = kind.fieldNames.join('\n');
    serviceContext.target
      .target()
      .pipe(
        first(),
        switchMap((target: Target) =>
          /* eslint-disable @typescript-eslint/no-explicit-any */
          serviceContext.api.graphql<any>(
            `
          query JMXMetricsForTarget($connectUrl: String) {
            targetNodes(filter: { name: $connectUrl }) {
              jmxMetrics {
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
          const values: Map<string, number> = resp.data.targetNodes[0].jmxMetrics[kind.category];
          return {
            timestamp: Date.now(),
            values: Object.values(values),
          };
        })
      )
      .subscribe((v) =>
        setSamples((old) => {
          const now = Date.now();
          return [...old, v].filter((d) => d.timestamp > now - props.duration * 1000);
        })
      );
  }, [serviceContext, props.chartKind, props.duration]);

  React.useEffect(() => {
    refresh();
    addSubscription(interval(props.period * 1000).subscribe(() => refresh()));
  }, [addSubscription, props.period, refresh]);

  const cardStyle = React.useMemo(() => {
    let height: number;
    switch (props.chartKind) {
      case 'Core Count':
        height = 250;
        break;
      default:
        height = 380;
        break;
    }
    return { height };
  }, [props.chartKind]);

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
      cardSizes={JMXMetricsChartCardSizes}
      isCompact
      style={cardStyle}
      cardHeader={header}
    >
      <CardBody>{visual}</CardBody>
    </DashboardCard>
  );
};

export const JMXMetricsChartCardSizes: DashboardCardSizes = {
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

export const JMXMetricsChartCardDescriptor: DashboardCardDescriptor = {
  featureLevel: FeatureLevel.BETA,
  title: 'JMX Metrics Chart',
  cardSizes: JMXMetricsChartCardSizes,
  description: 'Display common performance metrics from current JMX data.',
  descriptionFull: `Display a single performance metric from a list of supported MBeans retrieved over JMX.`,
  component: JMXMetricsChartCard,
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
