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

import '@patternfly/react-core/dist/styles/base.css';
import '@patternfly/patternfly/patternfly-charts.css';
import '@patternfly/quickstarts/dist/quickstarts.css';
import '@app/app.css';
import '@app/Topology/styles/base.css';
import '@i18n/config';
import { AppLayout } from '@app/AppLayout/AppLayout';
import { NotificationsContext, NotificationsInstance } from '@app/Notifications/Notifications';
import { AppRoutes } from '@app/routes';
import { store } from '@app/Shared/Redux/ReduxStore';
import { ServiceContext, defaultServices } from '@app/Shared/Services/Services';
import * as React from 'react';
import { Provider } from 'react-redux';
import { BrowserRouter as Router } from 'react-router-dom';
import { JoyrideProvider } from './Joyride/JoyrideProvider';

export const App: React.FC = () => (
  <ServiceContext.Provider value={defaultServices}>
    <NotificationsContext.Provider value={NotificationsInstance}>
      <Provider store={store}>
        <Router>
          <JoyrideProvider>
            <AppLayout>
              <AppRoutes />
            </AppLayout>
          </JoyrideProvider>
        </Router>
      </Provider>
    </NotificationsContext.Provider>
  </ServiceContext.Provider>
);
