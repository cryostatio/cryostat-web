/*
 * Copyright (c) 2020 Red Hat, Inc.
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
import * as React from 'react';
import { CreateRecording } from '@app/CreateRecording/CreateRecording';
import { Dashboard } from '@app/Dashboard/Dashboard';
import { Events } from '@app/Events/Events';
import { Login } from '@app/Login/Login';
import { NotFound } from '@app/NotFound/NotFound';
import { RecordingList } from '@app/RecordingList/RecordingList';
import { SecurityPanel } from '@app/SecurityPanel/SecurityPanel';
import { ServiceContext } from '@app/Shared/Services/Services';
import { useDocumentTitle } from '@app/utils/useDocumentTitle';
import { accessibleRouteChangeHandler } from '@app/utils/utils';
import { Route, RouteComponentProps, Switch } from 'react-router-dom';
import { LastLocationProvider, useLastLocation } from 'react-router-last-location';
import { filter } from 'rxjs/operators';

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
  children?: IAppRoute[];
}

const routes: IAppRoute[] = [
  {
    component: Dashboard,
    exact: true,
    label: 'Dashboard',
    path: '/',
    title: 'Dashboard',
  },
  {
    component: RecordingList,
    exact: true,
    label: 'Recordings',
    path: '/recordings',
    title: 'Recordings',
    children: [
      {
        component: CreateRecording,
        exact: true,
        path: '/recordings/create',
        title: 'Create Recording',
      },
    ],
  },
  {
    component: Events,
    exact: true,
    label: 'Events',
    path: '/events',
    title: 'Events',
  },
  {
    component: SecurityPanel,
    exact: true,
    label: 'Security',
    path: '/security',
    title: 'Security',
  },
];

const flatten = (routes: IAppRoute[]): IAppRoute[] => {
  const ret: IAppRoute[] = [];
  for (const r of routes) {
    ret.push(r);
    if (r.children) {
      ret.push(...flatten(r.children));
    }
  }
  return ret;
};

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

const RouteWithTitleUpdates = ({ component: Component, isAsync = false, path, title, ...rest }: IAppRoute) => {
  useA11yRouteChange(isAsync);
  useDocumentTitle(title);

  function routeWithTitle(routeProps: RouteComponentProps) {
    return <Component {...rest} {...routeProps} />;
  }

  return <Route render={routeWithTitle} path={path} />;
};

const PageNotFound = ({ title }: { title: string }) => {
  useDocumentTitle(title);
  return <Route component={NotFound} />;
};

const AppRoutes = () => {
  const context = React.useContext(ServiceContext);
  const [authenticated, setAuthenticated] = React.useState(false);

  React.useEffect(() => {
    const sub = context.commandChannel
      .isReady()
      .pipe(filter((v) => !v))
      .subscribe(() => setAuthenticated(false));
    return () => sub.unsubscribe();
  }, [context.commandChannel]);

  return (
    <LastLocationProvider>
      <Switch>
        {authenticated ? (
          flatten(routes).map(({ path, exact, component, title, isAsync }, idx) => (
            <RouteWithTitleUpdates
              path={path}
              exact={exact}
              component={component}
              key={idx}
              title={title}
              isAsync={isAsync}
            />
          ))
        ) : (
          <Login onLoginSuccess={() => setAuthenticated(true)} />
        )}
        <PageNotFound title="404 Page Not Found" />
      </Switch>
    </LastLocationProvider>
  );
};

export { AppRoutes, routes };
