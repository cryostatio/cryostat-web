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
  defaultAutomatedAnalysisFilters,
  defaultDashboardConfigs,
  defaultRecordingFilters,
  defaultTopologyConfig,
  defaultTopologyFilters,
  RootState,
  setupStore,
} from '@app/Shared/Redux/ReduxStore';
import { NotificationsContext, NotificationsInstance } from '@app/Shared/Services/Notifications.service';
import { defaultServices, ServiceContext } from '@app/Shared/Services/Services';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryHistory } from 'history';
import { t, TOptions } from 'i18next';
import * as React from 'react';
import { Provider } from 'react-redux';
import { Router } from 'react-router-dom';

// userEvent functions are recommended to be called in tests (i.e it()).
// See https://testing-library.com/docs/user-event/intro#writing-tests-with-userevent

export const renderDefault = (
  ui: React.ReactElement,
  {
    user = userEvent.setup(), // Create a default user session
    notifications = NotificationsInstance,
    ...renderOptions
  } = {},
) => {
  const Wrapper = ({ children }: React.PropsWithChildren<unknown>) => {
    return <NotificationsContext.Provider value={notifications}>{children}</NotificationsContext.Provider>;
  };
  return { user, ...render(ui, { wrapper: Wrapper, ...renderOptions }) };
};

export const renderWithReduxStore = (
  ui: React.ReactElement,
  {
    preloadState = {},
    store = setupStore(preloadState), // Create a new store instance if no store was passed in
    user = userEvent.setup(), // Create a default user session
    notifications = NotificationsInstance,
    ...renderOptions
  } = {},
) => {
  const Wrapper = ({ children }: React.PropsWithChildren<unknown>) => {
    return (
      <NotificationsContext.Provider value={notifications}>
        <Provider store={store}>{children}</Provider>
      </NotificationsContext.Provider>
    );
  };
  return { store, user, ...render(ui, { wrapper: Wrapper, ...renderOptions }) };
};

export const renderWithServiceContext = (
  ui: React.ReactElement,
  {
    services = defaultServices,
    notifications = NotificationsInstance,
    user = userEvent.setup(), // Create a default user session
    ...renderOptions
  } = {},
) => {
  const Wrapper = ({ children }: React.PropsWithChildren<unknown>) => {
    return (
      <ServiceContext.Provider value={services}>
        <NotificationsContext.Provider value={notifications}>{children}</NotificationsContext.Provider>
      </ServiceContext.Provider>
    );
  };
  return { user, ...render(ui, { wrapper: Wrapper, ...renderOptions }) };
};

export const renderWithRouter = (
  ui: React.ReactElement,
  {
    history = createMemoryHistory({ initialEntries: ['/'] }),
    user = userEvent.setup(), // Create a default user session
    notifications = NotificationsInstance,
    ...renderOptions
  } = {},
) => {
  const Wrapper = ({ children }: React.PropsWithChildren<unknown>) => {
    return (
      <NotificationsContext.Provider value={notifications}>
        <Router history={history}>{children}</Router>
      </NotificationsContext.Provider>
    );
  };
  return { user, ...render(ui, { wrapper: Wrapper, ...renderOptions }) };
};

export const renderWithServiceContextAndReduxStore = (
  ui: React.ReactElement,
  {
    preloadState = {},
    store = setupStore(preloadState), // Create a new store instance if no store was passed in
    services = defaultServices,
    notifications = NotificationsInstance,
    user = userEvent.setup(), // Create a default user session
    ...renderOptions
  } = {},
) => {
  const Wrapper = ({ children }: React.PropsWithChildren<unknown>) => {
    return (
      <ServiceContext.Provider value={services}>
        <NotificationsContext.Provider value={notifications}>
          <Provider store={store}>{children}</Provider>
        </NotificationsContext.Provider>
      </ServiceContext.Provider>
    );
  };
  return { store, user, ...render(ui, { wrapper: Wrapper, ...renderOptions }) };
};

export const renderWithServiceContextAndRouter = (
  ui: React.ReactElement,
  {
    services = defaultServices,
    notifications = NotificationsInstance,
    user = userEvent.setup(), // Create a default user session
    history = createMemoryHistory({ initialEntries: ['/'] }),
    ...renderOptions
  } = {},
) => {
  const Wrapper = ({ children }: React.PropsWithChildren<unknown>) => {
    return (
      <ServiceContext.Provider value={services}>
        <NotificationsContext.Provider value={notifications}>
          <Router history={history}>{children}</Router>
        </NotificationsContext.Provider>
      </ServiceContext.Provider>
    );
  };
  return { user, ...render(ui, { wrapper: Wrapper, ...renderOptions }) };
};

export const renderWithServiceContextAndReduxStoreWithRouter = (
  ui: React.ReactElement,
  {
    preloadState = {},
    store = setupStore(preloadState), // Create a new store instance if no store was passed in
    services = defaultServices,
    notifications = NotificationsInstance,
    user = userEvent.setup(), // Create a default user session
    history = createMemoryHistory({ initialEntries: ['/'] }),
    ...renderOptions
  } = {},
) => {
  const Wrapper = ({ children }: React.PropsWithChildren<unknown>) => {
    return (
      <ServiceContext.Provider value={services}>
        <NotificationsContext.Provider value={notifications}>
          <Provider store={store}>
            <Router history={history}>{children}</Router>
          </Provider>
        </NotificationsContext.Provider>
      </ServiceContext.Provider>
    );
  };
  return { store, user, ...render(ui, { wrapper: Wrapper, ...renderOptions }) };
};

export const renderWithProvidersAndRedux = (
  ui: React.ReactElement,
  /* eslint-disable @typescript-eslint/no-explicit-any */
  providers: ProviderInstance<any>[],
  { preloadedState = {}, store = setupStore(preloadedState), user = userEvent.setup(), ...renderOptions } = {},
) => {
  if (providers.length < 1) {
    throw new Error('At least one provider must be specified');
  }
  const Wrapper = ({ children }: React.PropsWithChildren<unknown>) => {
    let els = children;
    for (let i = 0; i < providers.length; i++) {
      const provider = providers[i];
      const ctx = React.createElement(provider.kind, { key: i, value: provider.instance }, els);
      els = [ctx];
    }
    return (
      <Provider key={0} store={store}>
        {els}
      </Provider>
    );
  };
  return { store, user, ...render(ui, { wrapper: Wrapper, ...renderOptions }) };
};

export interface ProviderInstance<T> {
  kind: React.Provider<T>;
  instance: T;
}

// export const testTranslate = (key: string, ns = 'public', ...options): string => {
//   // if no translation is found, return the "test value" for debugging
//   return t(key, 'i18next test value', { ns: ns, ...options });
// };

export const testT = (key: string, options?: TOptions) => {
  return t(key, 'i18next test value', options);
};

// Default jsdom size 1024x728
export const DEFAULT_DIMENSIONS = [1024, 728];

export const resize = (width: number, height: number) => {
  Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: width });
  Object.defineProperty(window, 'innerHeight', { writable: true, configurable: true, value: height });
  window.dispatchEvent(new Event('resize'));
};

export const mockMediaQueryList: MediaQueryList = {
  matches: true,
  media: '',
  onchange: null,
  addListener: jest.fn(), // deprecated
  removeListener: jest.fn(), // deprecated
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  dispatchEvent: jest.fn(),
};

export const basePreloadedState: RootState = {
  dashboardConfigs: defaultDashboardConfigs,
  recordingFilters: defaultRecordingFilters,
  automatedAnalysisFilters: defaultAutomatedAnalysisFilters,
  topologyConfigs: defaultTopologyConfig,
  topologyFilters: defaultTopologyFilters,
};
