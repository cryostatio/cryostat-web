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

jest.useFakeTimers('modern').setSystemTime(new Date('14 Feb 2023 00:00:00 UTC'));
jest.mock('@app/Dashboard/Charts/mbean/MBeanMetricsChartController');

import { ChartContext } from '@app/Dashboard/Charts/ChartContext';
import { JFRMetricsChartController } from '@app/Dashboard/Charts/jfr/JFRMetricsChartController';
import { MBeanMetricsChartCard } from '@app/Dashboard/Charts/mbean/MBeanMetricsChartCard';
import { MBeanMetricsChartController } from '@app/Dashboard/Charts/mbean/MBeanMetricsChartController';
import { NotificationsContext, NotificationsInstance } from '@app/Notifications/Notifications';
import { ThemeSetting } from '@app/Settings/SettingsUtils';
import { store } from '@app/Shared/Redux/ReduxStore';
import { MBeanMetrics } from '@app/Shared/Services/Api.service';
import { defaultServices, ServiceContext } from '@app/Shared/Services/Services';
import '@i18n/config';
import { defaultDatetimeFormat } from '@i18n/datetime';
import { mockMediaQueryList } from '@test/Common';
import { cleanup } from '@testing-library/react';
import React from 'react';
import { Provider } from 'react-redux';
import renderer, { act } from 'react-test-renderer';
import { from, of } from 'rxjs';

jest.spyOn(defaultServices.settings, 'datetimeFormat').mockReturnValue(of(defaultDatetimeFormat));
jest.spyOn(defaultServices.settings, 'themeSetting').mockReturnValue(of(ThemeSetting.DARK));
jest.spyOn(defaultServices.settings, 'media').mockReturnValue(of(mockMediaQueryList));

const mockTarget = { connectUrl: 'service:jmx:rmi://someUrl', alias: 'fooTarget' };
jest.spyOn(defaultServices.target, 'target').mockReturnValue(of(mockTarget));

const mockJfrController = new JFRMetricsChartController(
  defaultServices.api,
  defaultServices.target,
  defaultServices.notificationChannel,
  defaultServices.settings
);
const mockMbeanController = new MBeanMetricsChartController(
  defaultServices.api,
  defaultServices.target,
  defaultServices.settings
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

    let tree;
    await act(async () => {
      tree = renderer.create(
        <ServiceContext.Provider value={defaultServices}>
          <ChartContext.Provider value={mockChartContext}>
            <Provider store={store}>
              <MBeanMetricsChartCard
                chartKind={chartKind}
                duration={120}
                period={10}
                span={6}
                dashboardId={0}
                themeColor={'blue'}
              />
            </Provider>
          </ChartContext.Provider>
        </ServiceContext.Provider>
      );
    });
    expect(tree.toJSON()).toMatchSnapshot('with-content');
  });

  it('renders loading state correctly', async () => {
    const metrics: MBeanMetrics = {};
    jest.spyOn(mockMbeanController, 'attach').mockReturnValue(of(metrics));
    jest.spyOn(mockMbeanController, 'loading').mockReturnValue(of(true));

    let tree;
    await act(async () => {
      tree = renderer.create(
        <ServiceContext.Provider value={defaultServices}>
          <NotificationsContext.Provider value={NotificationsInstance}>
            <ChartContext.Provider value={mockChartContext}>
              <Provider store={store}>
                <MBeanMetricsChartCard
                  themeColor={'blue'}
                  chartKind={'Process CPU Load'}
                  duration={120}
                  period={10}
                  span={6}
                  dashboardId={0}
                />
              </Provider>
            </ChartContext.Provider>
          </NotificationsContext.Provider>
        </ServiceContext.Provider>
      );
    });
    expect(tree.toJSON()).toMatchSnapshot('loading-view');
  });
});
