import * as React from 'react';
import { Route, RouteComponentProps, Switch } from 'react-router-dom';
import { Alert, PageSection } from '@patternfly/react-core';
import { DynamicImport } from '@app/DynamicImport';
import { accessibleRouteChangeHandler } from '@app/utils/utils';
import { NotFound } from '@app/NotFound/NotFound';
import { useDocumentTitle } from '@app/utils/useDocumentTitle';
import { LastLocationProvider, useLastLocation } from 'react-router-last-location';
import { ServiceContext } from '@app/Shared/Services/Services';
import { Login } from '@app/Login/Login';
import { Dashboard } from '@app/Dashboard/Dashboard';
import { RecordingList } from '@app/RecordingList/RecordingList';

let routeFocusTimer: number;

export interface IAppRoute {
  label?: string;
  /* eslint-disable @typescript-eslint/no-explicit-any */
  component: React.ComponentType<RouteComponentProps<any>> | React.ComponentType<any>;
  /* eslint-enable @typescript-eslint/no-explicit-any */
  exact?: boolean;
  path: string;
  title: string;
  isAsync?: boolean;
}

const staticRoutes: IAppRoute[] = [
  {
    component: Dashboard,
    exact: true,
    label: 'Dashboard',
    path: '/',
    title: 'ContainerJFR Dashboard'
  },
];

const dynamicRoutes: IAppRoute[] = [
  {
    component: RecordingList,
    exact: true,
    label: 'Recordings',
    path: '/recordings',
    title: 'JDK Flight Recordings'
  },
];

const getAvailableRoutes = isConnected => isConnected ? staticRoutes.concat(dynamicRoutes) : staticRoutes;

const routes: IAppRoute[] = staticRoutes.concat(dynamicRoutes);

// a custom hook for sending focus to the primary content container
// after a view has loaded so that subsequent press of tab key
// sends focus directly to relevant content
const useA11yRouteChange = (isAsync: boolean) => {
  const lastNavigation = useLastLocation();
  React.useEffect(() => {
    if (!isAsync && lastNavigation !== null) {
      routeFocusTimer = accessibleRouteChangeHandler();
    }
    return () => {
      window.clearTimeout(routeFocusTimer);
    };
  }, [isAsync, lastNavigation]);
};

const RouteWithTitleUpdates = ({ component: Component, isAsync = false, title, ...rest }: IAppRoute) => {
  useA11yRouteChange(isAsync);
  useDocumentTitle(title);

  function routeWithTitle(routeProps: RouteComponentProps) {
    return <Component {...rest} {...routeProps} />;
  }

  return <Route render={routeWithTitle} />;
};

const PageNotFound = ({ title }: { title: string }) => {
  useDocumentTitle(title);
  return <Route component={NotFound} />;
};


const AppRoutes = () => {
  const context = React.useContext(ServiceContext);
  const [authenticated, setAuthenticated] = React.useState(false);
  const [availableRoutes, setAvailableRoutes] = React.useState(staticRoutes);

  React.useEffect(() => {
    const sub = context.commandChannel.isConnected().subscribe(isConnected =>
        setAvailableRoutes(getAvailableRoutes(isConnected))
    );
    return () => sub.unsubscribe();
  }, []);

  return (
    <LastLocationProvider>
      <Switch>
        {
        authenticated ?
          availableRoutes.map(({ path, exact, component, title, isAsync }, idx) => (
            <RouteWithTitleUpdates
              path={path}
              exact={exact}
              component={component}
              key={idx}
              title={title}
              isAsync={isAsync}
            />
          ))
          : <Login onLoginSuccess={() => setAuthenticated(true)}/>
        }
        <PageNotFound title="404 Page Not Found" />
      </Switch>
    </LastLocationProvider>
  );
}

export { AppRoutes, routes, getAvailableRoutes, staticRoutes, dynamicRoutes };
