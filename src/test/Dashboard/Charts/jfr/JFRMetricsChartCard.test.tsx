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

jest.mock('@app/Dashboard/Charts/jfr/JFRMetricsChartController');

import { ChartContext } from '@app/Dashboard/Charts/context';
import { JFRMetricsChartCard, kindToId } from '@app/Dashboard/Charts/jfr/JFRMetricsChartCard';
import { JFRMetricsChartController, ControllerState } from '@app/Dashboard/Charts/jfr/JFRMetricsChartController';
import { MBeanMetricsChartController } from '@app/Dashboard/Charts/mbean/MBeanMetricsChartController';
import { ThemeSetting } from '@app/Settings/types';
import { setupStore, store } from '@app/Shared/Redux/ReduxStore';
import { NotificationsContext, NotificationsInstance } from '@app/Shared/Services/Notifications.service';
import { defaultServices, ServiceContext } from '@app/Shared/Services/Services';
import { cleanup, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryHistory, MemoryHistory } from 'history';
import * as React from 'react';
import { Provider } from 'react-redux';
import renderer, { act } from 'react-test-renderer';
import { of } from 'rxjs';
import { mockMediaQueryList, renderWithProvidersAndRedux } from '../../../Common';

let history: MemoryHistory = createMemoryHistory({ initialEntries: ['/'] });
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useRouteMatch: () => ({ url: history.location.pathname }),
  useHistory: () => history,
}));

const mockDashboardUrl = 'http://localhost:3000';
jest.spyOn(defaultServices.api, 'grafanaDashboardUrl').mockReturnValue(of(mockDashboardUrl));

const mockTarget = { connectUrl: 'service:jmx:rmi://someUrl', alias: 'fooTarget' };
jest.spyOn(defaultServices.target, 'target').mockReturnValue(of(mockTarget));

jest.spyOn(defaultServices.settings, 'themeSetting').mockReturnValue(of(ThemeSetting.LIGHT));
jest.spyOn(defaultServices.settings, 'media').mockReturnValue(of(mockMediaQueryList));

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

describe('<JFRMetricsChartCard />', () => {
  beforeEach(() => (history = createMemoryHistory({ initialEntries: ['/'] })));
  afterEach(cleanup);

  it('renders correctly', async () => {
    jest.spyOn(mockJfrController, 'attach').mockReturnValue(of(ControllerState.READY));

    let tree;
    await act(async () => {
      tree = renderer.create(
        <ServiceContext.Provider value={defaultServices}>
          <NotificationsContext.Provider value={NotificationsInstance}>
            <ChartContext.Provider value={mockChartContext}>
              <Provider store={store}>
                <JFRMetricsChartCard chartKind={'CPU Load'} duration={120} period={10} span={6} dashboardId={0} />
              </Provider>
            </ChartContext.Provider>
          </NotificationsContext.Provider>
        </ServiceContext.Provider>,
      );
    });
    expect(tree.toJSON()).toMatchSnapshot();
  });

  it('renders loading state correctly', async () => {
    jest.spyOn(mockJfrController, 'attach').mockReturnValue(of(ControllerState.UNKNOWN));

    let tree;
    await act(async () => {
      tree = renderer.create(
        <ServiceContext.Provider value={defaultServices}>
          <NotificationsContext.Provider value={NotificationsInstance}>
            <ChartContext.Provider value={mockChartContext}>
              <Provider store={store}>
                <JFRMetricsChartCard chartKind={'CPU Load'} duration={120} period={10} span={6} dashboardId={0} />
              </Provider>
            </ChartContext.Provider>
          </NotificationsContext.Provider>
        </ServiceContext.Provider>,
      );
    });
    expect(tree.toJSON()).toMatchSnapshot();
  });

  it('renders empty state correctly', async () => {
    jest.spyOn(mockJfrController, 'attach').mockReturnValue(of(ControllerState.NO_DATA));

    let tree;
    await act(async () => {
      tree = renderer.create(
        <ServiceContext.Provider value={defaultServices}>
          <NotificationsContext.Provider value={NotificationsInstance}>
            <ChartContext.Provider value={mockChartContext}>
              <Provider store={store}>
                <JFRMetricsChartCard chartKind={'CPU Load'} duration={120} period={10} span={6} dashboardId={0} />
              </Provider>
            </ChartContext.Provider>
          </NotificationsContext.Provider>
        </ServiceContext.Provider>,
      );
    });
    expect(tree.toJSON()).toMatchSnapshot();
  });

  it('renders empty state with information and action button', async () => {
    jest.spyOn(mockJfrController, 'attach').mockReturnValue(of(ControllerState.NO_DATA));

    renderChartCard(<JFRMetricsChartCard chartKind={'CPU Load'} duration={120} period={10} span={6} dashboardId={0} />);

    expect(screen.getByText('CPU Load (last 120s, every 10s)')).toBeInTheDocument();
    expect(screen.getByText('No source recording')).toBeInTheDocument();
    expect(
      screen.getByText((s) => s.includes('Metrics cards display data taken from running flight recordings')),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create/i })).toBeInTheDocument();
  });

  it('navigates to recording creation with prefilled state when empty state button clicked', async () => {
    jest.spyOn(mockJfrController, 'attach').mockReturnValue(of(ControllerState.NO_DATA));

    const { user } = renderChartCard(
      <JFRMetricsChartCard chartKind={'CPU Load'} duration={120} period={10} span={6} dashboardId={0} />,
    );

    expect(history.location.pathname).toBe('/');
    await user.click(screen.getByRole('button', { name: /create/i }));
    expect(history.location.pathname).toBe('/recordings/create');
    expect(history.location.state).toEqual({
      name: 'dashboard_metrics',
      template: {
        name: 'Continuous',
        type: 'TARGET',
      },
      restart: true,
      labels: [{ key: 'origin', value: 'dashboard_metrics' }],
      duration: -1,
      skipDurationCheck: true,
      maxAge: 120,
      maxAgeUnit: 1,
      maxSize: 100 * 1024 * 1024,
      maxSizeUnit: 1,
    });
  });

  it.each([
    ['CPU Load', 120, 5],
    ['Heap Usage', 90, 10],
    ['Network Utilization', 60, 15],
    ['File I/O', 30, 20],
  ])('renders iframe', async (chartKind: string, duration: number, period: number) => {
    jest.spyOn(mockJfrController, 'attach').mockReturnValue(of(ControllerState.READY));

    const { container } = renderChartCard(
      <JFRMetricsChartCard chartKind={chartKind} duration={duration} period={period} span={6} dashboardId={0} />,
    );

    const iframe = container.querySelector('iframe');
    expect(iframe).toBeTruthy();
    const u = new URL(iframe?.src || '');
    expect(u.host).toBe('localhost:3000');
    expect(u.protocol).toBe('http:');
    const params = new URLSearchParams();
    params.set('theme', 'light');
    params.set('panelId', String(kindToId(chartKind)));
    params.set('to', 'now');
    params.set('from', `now-${duration}s`);
    params.set('refresh', `${period}s`);
    expect(u.searchParams.toString()).toEqual(params.toString());
  });
});

const renderChartCard = (
  ui: React.ReactElement,
  {
    services = defaultServices,
    notifications = NotificationsInstance,
    chartContext = mockChartContext,
    preloadState = {},
    store = setupStore(preloadState),
    user = userEvent.setup(),
    ...renderOptions
  } = {},
) => {
  return renderWithProvidersAndRedux(
    ui,
    [
      {
        kind: ChartContext.Provider,
        instance: chartContext,
      },
      {
        kind: NotificationsContext.Provider,
        instance: notifications,
      },
      {
        kind: ServiceContext.Provider,
        instance: services,
      },
    ],
    {
      store,
      user,
      ...renderOptions,
    },
  );
};
