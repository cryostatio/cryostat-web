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

jest.mock('@app/Dashboard/Charts/ChartController');

import { ChartCard, kindToId } from '@app/Dashboard/Charts/ChartCard';
import { ChartContext } from '@app/Dashboard/Charts/ChartContext';
import { ChartController, ControllerState } from '@app/Dashboard/Charts/ChartController';
import { NotificationsContext, NotificationsInstance } from '@app/Notifications/Notifications';
import { setupStore, store } from '@app/Shared/Redux/ReduxStore';
import { defaultServices, ServiceContext } from '@app/Shared/Services/Services';
import { cleanup, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryHistory, MemoryHistory } from 'history';
import React from 'react';
import { Provider } from 'react-redux';
import renderer, { act } from 'react-test-renderer';
import { of } from 'rxjs';
import { renderWithProvidersAndRedux } from '../../Common';

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

const mockController = new ChartController(
  defaultServices.api,
  defaultServices.target,
  defaultServices.notificationChannel,
  defaultServices.settings
);
const mockChartContext = {
  controller: mockController,
};

describe('<ChartCard />', () => {
  beforeEach(() => (history = createMemoryHistory({ initialEntries: ['/'] })));
  afterEach(cleanup);

  it('renders correctly', async () => {
    jest.spyOn(mockController, 'attach').mockReturnValue(of(ControllerState.READY));

    let tree;
    await act(async () => {
      tree = renderer.create(
        <ServiceContext.Provider value={defaultServices}>
          <NotificationsContext.Provider value={NotificationsInstance}>
            <ChartContext.Provider value={mockChartContext}>
              <Provider store={store}>
                <ChartCard theme={'light'} chartKind={'CPU Load'} duration={120} period={10} span={6} dashboardId={0} />
              </Provider>
            </ChartContext.Provider>
          </NotificationsContext.Provider>
        </ServiceContext.Provider>
      );
    });
    expect(tree.toJSON()).toMatchSnapshot('with-content');
  });

  it('renders loading state correctly', async () => {
    jest.spyOn(mockController, 'attach').mockReturnValue(of(ControllerState.UNKNOWN));

    let tree;
    await act(async () => {
      tree = renderer.create(
        <ServiceContext.Provider value={defaultServices}>
          <NotificationsContext.Provider value={NotificationsInstance}>
            <ChartContext.Provider value={mockChartContext}>
              <Provider store={store}>
                <ChartCard theme={'light'} chartKind={'CPU Load'} duration={120} period={10} span={6} dashboardId={0} />
              </Provider>
            </ChartContext.Provider>
          </NotificationsContext.Provider>
        </ServiceContext.Provider>
      );
    });
    expect(tree.toJSON()).toMatchSnapshot('loading-view');
  });

  it('renders empty state correctly', async () => {
    jest.spyOn(mockController, 'attach').mockReturnValue(of(ControllerState.NO_DATA));

    let tree;
    await act(async () => {
      tree = renderer.create(
        <ServiceContext.Provider value={defaultServices}>
          <NotificationsContext.Provider value={NotificationsInstance}>
            <ChartContext.Provider value={mockChartContext}>
              <Provider store={store}>
                <ChartCard theme={'light'} chartKind={'CPU Load'} duration={120} period={10} span={6} dashboardId={0} />
              </Provider>
            </ChartContext.Provider>
          </NotificationsContext.Provider>
        </ServiceContext.Provider>
      );
    });
    expect(tree.toJSON()).toMatchSnapshot('empty-state');
  });

  it('renders empty state with information and action button', async () => {
    jest.spyOn(mockController, 'attach').mockReturnValue(of(ControllerState.NO_DATA));

    renderChartCard(
      <ChartCard theme={'light'} chartKind={'CPU Load'} duration={120} period={10} span={6} dashboardId={0} />
    );

    expect(screen.getByText('CPU Load')).toBeInTheDocument();
    expect(screen.getByText('No source recording')).toBeInTheDocument();
    expect(
      screen.getByText((s) => s.includes('Metrics cards display data taken from running flight recordings'))
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create/i })).toBeInTheDocument();
  });

  it('navigates to recording creation with prefilled state when empty state button clicked', async () => {
    jest.spyOn(mockController, 'attach').mockReturnValue(of(ControllerState.NO_DATA));

    const { user } = renderChartCard(
      <ChartCard theme={'light'} chartKind={'CPU Load'} duration={120} period={10} span={6} dashboardId={0} />
    );

    expect(history.location.pathname).toBe('/');
    await user.click(screen.getByRole('button', { name: /create/i }));
    expect(history.location.pathname).toBe('/recordings/create');
    expect(history.location.state).toEqual({
      duration: -1,
      labels: [
        {
          key: 'origin',
          value: 'dashboard_metrics',
        },
      ],
      maxAge: 120,
      maxSize: 100 * 1024 * 1024,
      name: 'dashboard_metrics',
      restartExisting: true,
      templateName: 'Continuous',
      templateType: 'TARGET',
    });
  });

  it.each([
    ['CPU Load', 120, 5],
    ['Heap Usage', 90, 10],
    ['Network Utilization', 60, 15],
    ['File I/O', 30, 20],
  ])('renders iframe', async (chartKind: string, duration: number, period: number) => {
    jest.spyOn(mockController, 'attach').mockReturnValue(of(ControllerState.READY));

    const { container } = renderChartCard(
      <ChartCard theme={'light'} chartKind={chartKind} duration={duration} period={period} span={6} dashboardId={0} />
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
  } = {}
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
    }
  );
};
