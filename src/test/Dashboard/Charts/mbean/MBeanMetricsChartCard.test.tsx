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

jest.useFakeTimers('modern').setSystemTime(new Date('14 Feb 2023 00:00:00 UTC'));
jest.mock('@app/Dashboard/Charts/mbean/MBeanMetricsChartController');

import { ChartContext } from '@app/Dashboard/Charts/context';
import { JFRMetricsChartController } from '@app/Dashboard/Charts/jfr/JFRMetricsChartController';
import { MBeanMetricsChartCard } from '@app/Dashboard/Charts/mbean/MBeanMetricsChartCard';
import { MBeanMetricsChartController } from '@app/Dashboard/Charts/mbean/MBeanMetricsChartController';
import { ThemeSetting } from '@app/Settings/types';
import { MBeanMetrics } from '@app/Shared/Services/api.types';
import { defaultServices } from '@app/Shared/Services/Services';
import '@i18n/config';
import { defaultDatetimeFormat } from '@i18n/datetime';
import { mockMediaQueryList, renderSnapshot } from '@test/utils';
import { cleanup } from '@testing-library/react';
import { from, of } from 'rxjs';

jest.spyOn(defaultServices.settings, 'datetimeFormat').mockReturnValue(of(defaultDatetimeFormat));
jest.spyOn(defaultServices.settings, 'themeSetting').mockReturnValue(of(ThemeSetting.DARK));
jest.spyOn(defaultServices.settings, 'media').mockReturnValue(of(mockMediaQueryList));
jest.spyOn(defaultServices.target, 'authFailure').mockReturnValue(of());
jest.spyOn(defaultServices.target, 'authRetry').mockReturnValue(of());
jest.spyOn(defaultServices.target, 'sslFailure').mockReturnValue(of());

const mockTarget = {
  agent: false,
  connectUrl: 'service:jmx:rmi://someUrl',
  alias: 'fooTarget',
  jvmId: 'foo',
  labels: [],
  annotations: { cryostat: [], platform: [] },
};
jest.spyOn(defaultServices.target, 'target').mockReturnValue(of(mockTarget));

const mockJfrController = new JFRMetricsChartController(
  defaultServices.api,
  defaultServices.target,
  defaultServices.notificationChannel,
  defaultServices.settings,
);
const mockMbeanController = new MBeanMetricsChartController(
  defaultServices.api,
  defaultServices.target,
  defaultServices.settings,
);
const mockChartContext = {
  jfrController: mockJfrController,
  mbeanController: mockMbeanController,
};

const MB = Math.pow(1024, 2);

describe('<MBeanMetricsChartCard />', () => {
  afterEach(cleanup);
  afterAll(jest.useRealTimers);

  it.each([
    [
      'Process CPU Load',
      [{ os: { processCpuLoad: 0 } }, { os: { processCpuLoad: 1 } }, { os: { processCpuLoad: 0.5 } }],
    ],
    [
      'System Load Average',
      [{ os: { systemLoadAverage: 0 } }, { os: { systemLoadAverage: 2 } }, { os: { systemLoadAverage: 7.25 } }],
    ],
    ['System CPU Load', [{ os: { systemCpuLoad: 0 } }, { os: { systemCpuLoad: 0.1 } }, { os: { systemCpuLoad: 0.2 } }]],
    [
      'Physical Memory',
      [
        { os: { freePhysicalMemorySize: 32 * MB, totalPhysicalMemorySize: 64 * MB } },
        { os: { freePhysicalMemorySize: 20 * MB, totalPhysicalMemorySize: 64 * MB } },
        { os: { freePhysicalMemorySize: 18 * MB, totalPhysicalMemorySize: 64 * MB } },
      ],
    ],
    [
      'Heap Memory Usage',
      [
        { memory: { heapMemoryUsage: { init: 0, committed: 0, max: 0, used: 32 * MB } } },
        { memory: { heapMemoryUsage: { init: 0, committed: 0, max: 0, used: 40 * MB } } },
        { memory: { heapMemoryUsage: { init: 0, committed: 0, max: 0, used: 10 * MB } } },
      ],
    ],
    [
      'Heap Usage Percentage',
      [
        { memory: { heapMemoryUsagePercent: 0 } },
        { memory: { heapMemoryUsagePercent: 0.25 } },
        { memory: { heapMemoryUsagePercent: 0.1 } },
      ],
    ],
    [
      'Non-Heap Memory Usage',
      [
        { memory: { nonHeapMemoryUsage: { init: 0, committed: 0, max: 0, used: 32 * MB } } },
        { memory: { nonheapMemoryUsage: { init: 0, committed: 0, max: 0, used: 40 * MB } } },
        { memory: { nonheapMemoryUsage: { init: 0, committed: 0, max: 0, used: 10 * MB } } },
      ],
    ],
    [
      'Heap Usage Percentage',
      [
        { thread: { threadCount: 1, daemonThreadCount: 0 } },
        { thread: { threadCount: 5, daemonThreadCount: 3 } },
        { thread: { threadCount: 3, daemonThreadCount: 2 } },
      ],
    ],
  ])('renders correctly', async (chartKind: string, metrics: MBeanMetrics[]) => {
    jest.spyOn(mockMbeanController, 'attach').mockReturnValue(from(metrics));
    jest.spyOn(mockMbeanController, 'loading').mockReturnValue(of(false));

    const tree = await renderSnapshot({
      routerConfigs: {
        routes: [
          {
            path: '/',
            element: (
              <MBeanMetricsChartCard
                chartKind={chartKind}
                duration={120}
                period={10}
                span={6}
                dashboardId={0}
                themeColor={'blue'}
              />
            ),
          },
        ],
      },
      providers: [{ kind: ChartContext.Provider, instance: mockChartContext }],
    });
    expect(tree?.toJSON()).toMatchSnapshot('with-content');
  });

  it('renders loading state correctly', async () => {
    const metrics: MBeanMetrics = {};
    jest.spyOn(mockMbeanController, 'attach').mockReturnValue(of(metrics));
    jest.spyOn(mockMbeanController, 'loading').mockReturnValue(of(true));

    const tree = await renderSnapshot({
      routerConfigs: {
        routes: [
          {
            path: '/',
            element: (
              <MBeanMetricsChartCard
                themeColor={'blue'}
                chartKind={'Process CPU Load'}
                duration={120}
                period={10}
                span={6}
                dashboardId={0}
              />
            ),
          },
        ],
      },
      providers: [{ kind: ChartContext.Provider, instance: mockChartContext }],
    });
    expect(tree?.toJSON()).toMatchSnapshot('loading-view');
  });
});
