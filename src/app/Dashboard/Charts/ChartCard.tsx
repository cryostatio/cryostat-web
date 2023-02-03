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
import { useSubscriptions } from '@app/utils/useSubscriptions';
import { CardActions, CardHeader } from '@patternfly/react-core';
import * as React from 'react';
import { DashboardCardDescriptor, DashboardCardProps, DashboardCardSizes } from '../Dashboard';
import { DashboardCard } from '../DashboardCard';

export interface ChartCardProps extends DashboardCardProps {
  theme: string;
  chartKind: string;
  duration: number;
}

// TODO these need to be localized
enum ChartKind {
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

function kindToId(kind: string): number {
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
  const context = React.useContext(ServiceContext);
  const addSubscription = useSubscriptions();
  const [dashboardUrl, setDashboardUrl] = React.useState('');

  React.useEffect(() => {
    addSubscription(context.api.grafanaDashboardUrl().subscribe(setDashboardUrl));
  }, [addSubscription, context, setDashboardUrl]);

  const cardStyle = React.useMemo(() => {
    return {
      height: getHeight(props.chartKind),
    };
  }, [props.chartKind]);

  const chartSrc = React.useMemo(() => {
    if (!dashboardUrl) {
      return '';
    }
    const now = Date.now();
    const u = new URL('/d-solo/main', dashboardUrl);
    u.searchParams.append('theme', props.theme);
    u.searchParams.append('panelId', String(kindToId(props.chartKind)));
    u.searchParams.append('to', String(+now));
    u.searchParams.append('from', String(now - props.duration * 1000));
    return u.toString();
  }, [dashboardUrl, props.theme, props.chartKind, props.duration]);

  return (
    <>
      <DashboardCard
        dashboardId={props.dashboardId}
        cardSizes={ChartCardSizes}
        id={props.chartKind + '-chart-card'}
        isCompact
        style={cardStyle}
        cardHeader={
          <CardHeader style={{ marginBottom: -44 }}>
            <CardActions>{props.actions || []}</CardActions>
          </CardHeader>
        }
      >
        <iframe style={cardStyle} src={chartSrc} />
      </DashboardCard>
    </>
  );
};

export const ChartCardSizes: DashboardCardSizes = {
  span: {
    minimum: 3,
    default: 3,
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
      name: 'Duration',
      key: 'duration',
      defaultValue: 60,
      description: 'The data window width in seconds.',
      kind: 'number',
    },
  ],
};
