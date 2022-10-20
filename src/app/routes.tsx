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
import * as React from 'react';
import { CreateRecording } from '@app/CreateRecording/CreateRecording';
import { Dashboard } from '@app/Dashboard/Dashboard';
import { Events } from '@app/Events/Events';
import { Agent } from '@app/Agent/Agent';
import { Login } from '@app/Login/Login';
import { NotFound } from '@app/NotFound/NotFound';
import { Recordings } from '@app/Recordings/Recordings';
import { Archives } from '@app/Archives/Archives';
import { Rules } from '@app/Rules/Rules';
import { CreateRule } from '@app/Rules/CreateRule';
import { Settings } from '@app/Settings/Settings';
import { SecurityPanel } from '@app/SecurityPanel/SecurityPanel';
import { ServiceContext } from '@app/Shared/Services/Services';
import { useDocumentTitle } from '@app/utils/useDocumentTitle';
import { accessibleRouteChangeHandler } from '@app/utils/utils';
import { Route, RouteComponentProps, Switch } from 'react-router-dom';
import { LastLocationProvider, useLastLocation } from 'react-router-last-location';
import { About } from './About/About';
import { SessionState } from './Shared/Services/Login.service';

let routeFocusTimer: number;
const OVERVIEW = 'Overview';
const CONSOLE = 'Console';
const navGroups = [OVERVIEW, CONSOLE];

export interface IAppRoute {
  label?: string;
  /* eslint-disable @typescript-eslint/no-explicit-any */
  component: React.ComponentType<RouteComponentProps<any>> | React.ComponentType<any>;
  /* eslint-enable @typescript-eslint/no-explicit-any */
  exact?: boolean;
  path: string;
  title: string;
  description?: string; //non-empty description is used to filter routes for the NotFound page
  isAsync?: boolean;
  navGroup?: string;
  children?: IAppRoute[];
}

const routes: IAppRoute[] = [
  {
    component: Dashboard,
    exact: true,
    label: 'Dashboard',
    path: '/',
    title: 'Dashboard',
    navGroup: OVERVIEW,
  },
  {
    component: About,
    exact: true,
    label: 'About',
    path: '/about',
    title: 'About',
    description: 'Get information, help, or support for Cryostat.',
    navGroup: OVERVIEW,
  },
  {
    component: Rules,
    exact: true,
    label: 'Automated Rules',
    path: '/rules',
    title: 'Automated Rules',
    description:
      'Create recordings on multiple target JVMs at once using Automated Rules consisting of a name, match expression, template, archival period, and more.',
    navGroup: CONSOLE,
    children: [
      {
        component: CreateRule,
        exact: true,
        path: '/rules/create',
        title: 'Create Automated Rule',
      },
    ],
  },
  {
    component: Recordings,
    exact: true,
    label: 'Recordings',
    path: '/recordings',
    title: 'Recordings',
    description: 'Create, view and archive JFR recordings on single target JVMs.',
    navGroup: CONSOLE,
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
    component: Archives,
    exact: true,
    label: 'Archives',
    path: '/archives',
    title: 'Archives',
    description:
      'View archived recordings across all target JVMs, as well as upload recordings directly to the archive.',
    navGroup: CONSOLE,
  },
  {
    component: Events,
    exact: true,
    label: 'Events',
    path: '/events',
    title: 'Events',
    description: 'View available JFR event templates and types for target JVMs, as well as upload custom templates.',
    navGroup: CONSOLE,
  },
  {
    component: Agent,
    exact: true,
    label: 'JMC Agent',
    path: '/jmcagent',
    title: 'JMC Agent',
    description:
      'View available JMC Agent probe templates for target JVMs, as well as upload custom templates and insert probes.',
    navGroup: CONSOLE,
  },
  {
    component: SecurityPanel,
    exact: true,
    label: 'Security',
    path: '/security',
    title: 'Security',
    description: 'Upload SSL certificates for Cryostat to trust when communicating with target applications.',
    navGroup: CONSOLE,
  },
  {
    component: Settings,
    exact: true,
    path: '/settings',
    title: 'Settings',
    description: 'View or modify Cryostat web-client application settings.',
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
  const [showDashboard, setShowDashboard] = React.useState(false);

  React.useEffect(() => {
    const sub = context.login
      .getSessionState()
      .subscribe((sessionState) => setShowDashboard(sessionState === SessionState.USER_SESSION));
    return () => sub.unsubscribe();
  }, [context, context.login, setShowDashboard]);

  return (
    <LastLocationProvider>
      <Switch>
        {showDashboard ? (
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
          <Login />
        )}
        <PageNotFound title="404 Page Not Found" />
      </Switch>
    </LastLocationProvider>
  );
};

export { AppRoutes, routes, navGroups, flatten };
