import * as React from 'react';
import '@patternfly/react-core/dist/styles/base.css';
import { BrowserRouter as Router } from 'react-router-dom';
import { AppLayout } from '@app/AppLayout/AppLayout';
import { AppRoutes } from '@app/routes';
import '@app/app.css';
import { ServiceContext, defaultServices } from '@app/Shared/Services/Services';

const App: React.FunctionComponent = () => (
  <ServiceContext.Provider value={defaultServices}>
    <Router>
      <AppLayout>
        <AppRoutes />
      </AppLayout>
    </Router>
  </ServiceContext.Provider>
);

export { App };
