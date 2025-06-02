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

import * as React from 'react';
import { useLocation, Route, Routes } from 'react-router-dom-v5-compat';
import About from './About/About';
import Archives from './Archives/Archives';
import CreateRecording from './CreateRecording/CreateRecording';
import Dashboard from './Dashboard/Dashboard';
import DashboardSolo from './Dashboard/DashboardSolo';
import Diagnostics from './Diagnostics/Diagnostics';
import Events from './Events/Events';
import NotFound from './NotFound/NotFound';
import QuickStarts from './QuickStarts/QuickStartsCatalogPage';
import Recordings from './Recordings/Recordings';
import CreateRule from './Rules/CreateRule';
import RulesTable from './Rules/Rules';
import SecurityPanel from './SecurityPanel/SecurityPanel';
import Settings from './Settings/Settings';
import { DefaultFallBack, ErrorBoundary } from './Shared/Components/ErrorBoundary';
import { FeatureLevel } from './Shared/Services/service.types';
import CreateTarget from './Topology/Actions/CreateTarget';
import Topology from './Topology/Topology';
import { useDocumentTitle } from './utils/hooks/useDocumentTitle';
import { useFeatureLevel } from './utils/hooks/useFeatureLevel';
import { accessibleRouteChangeHandler, BASEPATH, toPath } from './utils/utils';

let routeFocusTimer: number;
const OVERVIEW = 'Overview';
const CONSOLE = 'Console';
const navGroups = [OVERVIEW, CONSOLE];

export interface IAppRoute {
  label?: string;
  component: React.ComponentType;
  path: string;
  title: string;
  description?: string; // non-empty description is used to filter routes for the NotFound page
  navGroup?: string;
  featureLevel?: FeatureLevel;
  children?: IAppRoute[];
}

const routes: IAppRoute[] = [
  {
    component: About,
    label: 'About',
    path: toPath('/about'),
    title: 'About',
    description: 'Get information, help, or support for Cryostat.',
    navGroup: OVERVIEW,
  },
  {
    component: Dashboard,
    label: 'Dashboard',
    path: toPath('/'),
    title: 'Dashboard',
    navGroup: OVERVIEW,
    children: [
      {
        component: DashboardSolo,

        path: toPath('/d-solo'),
        title: 'Dashboard',
      },
    ],
  },
  {
    component: QuickStarts,
    label: 'Quick starts',
    path: toPath('/quickstarts'),
    title: 'Quick starts',
    description: 'Get started with Cryostat.',
  },
  {
    component: Topology,
    label: 'Topology',
    path: toPath('/topology'),
    title: 'Topology',
    navGroup: OVERVIEW,
    children: [
      {
        component: CreateTarget,
        path: toPath('/topology/create-custom-target'),
        title: 'Create Custom Target',
      },
    ],
  },
  {
    component: RulesTable,
    label: 'Automated Rules',
    path: toPath('/rules'),
    title: 'Automated Rules',
    description:
      'Create Recordings on multiple target JVMs at once using Automated Rules consisting of a name, Match Expression, template, archival period, and more.',
    navGroup: CONSOLE,
    children: [
      {
        component: CreateRule,
        path: toPath('/rules/create'),
        title: 'Create Automated Rule',
      },
    ],
  },
  {
    component: Recordings,
    label: 'Recordings',
    path: toPath('/recordings'),
    title: 'Recordings',
    description: 'Create, view and archive JFR Recordings on single target JVMs.',
    navGroup: CONSOLE,
    children: [
      {
        component: CreateRecording,
        path: toPath('/recordings/create'),
        title: 'Create Recording',
      },
    ],
  },
  {
    component: Diagnostics,
    label: 'Diagnostics',
    path: toPath('/diagnostics'),
    title: 'Diagnostics',
    description: 'Create and view thread dumps on single target JVMs.',
    navGroup: CONSOLE,
  },
  {
    component: Archives,
    label: 'Archives',
    path: toPath('/archives'),
    title: 'Archives',
    description:
      'View Archived Recordings across all target JVMs, as well as upload Recordings directly to the archive.',
    navGroup: CONSOLE,
  },
  {
    component: Events,
    label: 'Events',
    path: toPath('/events'),
    title: 'Events',
    description: 'View available JFR Event Templates and types for target JVMs, as well as upload custom templates.',
    navGroup: CONSOLE,
  },
  {
    component: SecurityPanel,
    label: 'Security',
    path: toPath('/security'),
    title: 'Security',
    description: 'Upload SSL/TLS certificates for Cryostat to trust when communicating with target applications.',
    navGroup: CONSOLE,
  },
  {
    component: Settings,
    path: toPath('/settings'),
    title: 'Settings',
    description: 'View or modify Cryostat web-client application settings.',
  },
];

const flatten = (routes: IAppRoute[]): IAppRoute[] => {
  const ret: IAppRoute[] = [];
  for (var r of routes) {
    if (BASEPATH) {
      r.path = `/${BASEPATH}/${r.path}`;
    }
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
const useA11yRouteChange = () => {
  const { pathname } = useLocation();
  React.useEffect(() => {
    routeFocusTimer = accessibleRouteChangeHandler();
    return () => {
      window.clearTimeout(routeFocusTimer);
    };
  }, [pathname]);
};

const WithTitleUpdates = ({ children, title }: { children?: React.ReactNode; title: string }) => {
  useA11yRouteChange();
  useDocumentTitle(title);

  const renderFallback = React.useCallback((error: Error) => {
    return <DefaultFallBack error={error} />;
  }, []);

  return <ErrorBoundary renderFallback={renderFallback}>{children}</ErrorBoundary>;
};

const PageNotFound = () => {
  useDocumentTitle('404 Page Not Found');
  return <NotFound />;
};

export interface AppRoutesProps {}

const AppRoutes: React.FC<AppRoutesProps> = (_) => {
  const activeLevel = useFeatureLevel();

  return (
    <Routes>
      {flatten(routes)
        .filter((r) => r.featureLevel === undefined || r.featureLevel >= activeLevel)
        .map(({ path, component: Component, title }) => {
          const content = (
            <WithTitleUpdates title={title}>
              <Component />
            </WithTitleUpdates>
          );
          return <Route key={path} path={path} element={content} />;
        })
        .concat([<Route key={'not-found'} path={'*'} element={<PageNotFound />} />])}
    </Routes>
  );
};

export { AppRoutes, routes, navGroups, flatten };
