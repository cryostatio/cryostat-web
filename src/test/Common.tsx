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

import { NotificationsContext, NotificationsInstance } from '@app/Notifications/Notifications';
import { setupStore } from '@app/Shared/Redux/ReduxStore';
import { defaultServices, ServiceContext } from '@app/Shared/Services/Services';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryHistory } from 'history';
import { t, TOptions } from 'i18next';
import React, { PropsWithChildren } from 'react';
import '@i18n/config';
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
  } = {}
) => {
  const Wrapper = ({ children }: PropsWithChildren<unknown>) => {
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
  } = {}
) => {
  const Wrapper = ({ children }: PropsWithChildren<unknown>) => {
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
  } = {}
) => {
  const Wrapper = ({ children }: PropsWithChildren<unknown>) => {
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
  } = {}
) => {
  const Wrapper = ({ children }: PropsWithChildren<unknown>) => {
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
  } = {}
) => {
  const Wrapper = ({ children }: PropsWithChildren<unknown>) => {
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
  } = {}
) => {
  const Wrapper = ({ children }: PropsWithChildren<unknown>) => {
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
  } = {}
) => {
  const Wrapper = ({ children }: PropsWithChildren<unknown>) => {
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
  { preloadedState = {}, store = setupStore(preloadedState), user = userEvent.setup(), ...renderOptions } = {}
) => {
  if (providers.length < 1) {
    throw new Error('At least one provider must be specified');
  }
  const Wrapper = ({ children }: PropsWithChildren<unknown>) => {
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
