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
import { PreloadedState } from '@reduxjs/toolkit';
import { render as tlrRender } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { t, TOptions } from 'i18next';
import * as React from 'react';
import { Provider } from 'react-redux';
import { createMemoryRouter, RouterProvider } from 'react-router-dom-v5-compat';
import renderer from 'react-test-renderer';

export interface ProviderInstance<T> {
  kind: React.Provider<T>;
  instance: T;
}

export interface RenderOptions {
  routerConfigs: {
    routes: Parameters<typeof createMemoryRouter>[0];
    options?: Parameters<typeof createMemoryRouter>[1];
  };
  userConfigs?: Parameters<typeof userEvent.setup>[0];
  preloadedState?: PreloadedState<RootState>;
  providers?: ProviderInstance<unknown>[];
}

export const wrapProviders = (
  children: React.ReactNode,
  providers: ProviderInstance<unknown>[],
): React.ReactElement => {
  return (
    <>{providers.reduce((acc, next) => React.createElement(next.kind, { value: next.instance }, acc), children)}</>
  );
};

const _setupProviders = (providers: ProviderInstance<unknown>[]) => {
  if (!providers.some((p) => p.kind === NotificationsContext.Provider)) {
    providers = [{ kind: NotificationsContext.Provider, instance: NotificationsInstance }, ...providers];
  }
  if (!providers.some((p) => p.kind === ServiceContext.Provider)) {
    providers = [{ kind: ServiceContext.Provider, instance: defaultServices }, ...providers];
  }
  return providers;
};

const _setupRoutes = ({ routes, options }: RenderOptions['routerConfigs']) => {
  if (!routes.some((r) => r.path === '/')) {
    routes = [{ path: '/', element: <>Root</> }, ...routes];
  }
  options = options ?? { initialEntries: routes.map((r) => r.path ?? '').filter((p) => p != '') };
  return { routes, options };
};

export const setupRenderEnv = ({
  routerConfigs,
  userConfigs: userOptions = {},
  preloadedState = {},
  providers: baseProviders = [],
}: RenderOptions) => {
  // Set up environment
  const store = setupStore(preloadedState);
  const { routes, options } = _setupRoutes(routerConfigs);
  const router = createMemoryRouter(routes, options);
  const user = userEvent.setup(userOptions);
  const providers = _setupProviders(baseProviders);

  // Provider wrapper
  const Wrapper = ({ children }: React.PropsWithChildren<unknown>) => {
    return <Provider store={store}>{wrapProviders(children, providers)}</Provider>;
  };
  return { store, router, user, Wrapper: Wrapper };
};

export const renderSnapshot = (options: RenderOptions) => {
  const { router, Wrapper } = setupRenderEnv(options);
  return renderer.create(
    <Wrapper>
      <RouterProvider router={router} />
    </Wrapper>,
  );
};

export const render = (options: RenderOptions) => {
  const { user, store, router, Wrapper } = setupRenderEnv(options);
  return { user, router, store, ...tlrRender(<RouterProvider router={router} />, { wrapper: Wrapper }) };
};

export const testT = (key: string, options?: TOptions): string => {
  return t(key, 'i18next test value', options);
};

// Default jsdom size 1024x728
export const DEFAULT_DIMENSIONS = [1024, 728];

export const resize = (width: number, height: number): void => {
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

export const escapeKeyboardInput = (value: string) => value.replace(/[{[]/g, '$&$&');
