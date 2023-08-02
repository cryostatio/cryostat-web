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
import { Dashboard } from '@app/Dashboard/Dashboard';
import { NotificationsContext, NotificationsInstance } from '@app/Notifications/Notifications';
import { store } from '@app/Shared/Redux/ReduxStore';
import { defaultServices, ServiceContext } from '@app/Shared/Services/Services';
import { Target } from '@app/Shared/Services/Target.service';
import React from 'react';
import { Provider } from 'react-redux';
import renderer, { act } from 'react-test-renderer';
import { of } from 'rxjs';
import '../Common';

const mockFooConnectUrl = 'service:jmx:rmi://someFooUrl';

const mockFooTarget: Target = {
  connectUrl: mockFooConnectUrl,
  alias: 'fooTarget',
  annotations: {
    cryostat: {},
    platform: {},
  },
};

jest.mock('@app/TargetView/TargetContextSelector', () => ({
  TargetContextSelector: (_) => <div>Target Context Selector</div>,
}));

jest.mock('@app/Dashboard/AddCard', () => ({
  AddCard: (_) => <div>Add Card</div>,
}));

jest.mock('@app/Dashboard/DashboardLayoutToolbar', () => ({
  DashboardLayoutToolbar: (_) => <div>Dashboard Layout Toolbar</div>,
}));

// Mock the local storage such that the first run config is not shown
jest.mock('@app/utils/LocalStorage', () => ({
  getFromLocalStorage: jest.fn(() => {
    return {
      _version: '0',
    };
  }),
}));

jest.spyOn(defaultServices.target, 'target').mockReturnValue(of(mockFooTarget));

describe('<Dashboard />', () => {
  it('renders correctly', async () => {
    let tree;
    await act(async () => {
      tree = renderer.create(
        <ServiceContext.Provider value={defaultServices}>
          <NotificationsContext.Provider value={NotificationsInstance}>
            <Provider store={store}>
              <Dashboard />
            </Provider>
          </NotificationsContext.Provider>
        </ServiceContext.Provider>
      );
    });
    expect(tree.toJSON()).toMatchSnapshot();
  });
});
