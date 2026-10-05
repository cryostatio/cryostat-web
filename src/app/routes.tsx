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
import { useLocation, Route, Routes } from 'react-router-dom';
import About from './About/About';
import Archives from './Archives/Archives';
import AsyncProfiler from './AsyncProfiler/AsyncProfiler';
import CreateAsyncProfilerSession from './AsyncProfiler/CreateAsyncProfilerSession';
import Dashboard from './Dashboard/Dashboard';
import DashboardSolo from './Dashboard/DashboardSolo';
import { HeapDumpAnalysis } from './Diagnostics/Analysis/HeapDumps/HeapDumpAnalysis';
import ThreadDumpAnalysis from './Diagnostics/Analysis/ThreadDumpAnalysis';
import { AnalyzeHeapDumps } from './Diagnostics/AnalyzeHeapDumps';
import AnalyzeThreadDumps from './Diagnostics/AnalyzeThreadDumps';
import CaptureDiagnostics from './Diagnostics/CaptureDiagnostics';
import Events from './Events/Events';
import Instrumentation from './Instrumentation/Instrumentation';
import NotFound from './NotFound/NotFound';
import QuickStarts from './QuickStarts/QuickStartsCatalogPage';
import { RecordingAnalytics } from './RecordingAnalytics/RecordingAnalytics';
import Recordings from './Recordings/Recordings';
import Reports from './Reports/Reports';
import {
  IRouteMeta,
  navGroups,
  overviewRouteDefs,
  flightRecorderRouteDefs,
  diagnosticsRouteDefs,
  securityRouteDefs,
  consoleRouteDefs,
  nonNavRouteDefs,
} from './routeDefs';
import RulesTable from './Rules/Rules';
import AuditLog from './Security/AuditLog';
import { Certificates } from './Security/Certificates';
import { StoredCredentialsView } from './Security/Credentials/StoredCredentials';
import Settings from './Settings/Settings';
import { DefaultFallBack, ErrorBoundary } from './Shared/Components/ErrorBoundary';
import Topology from './Topology/Topology';
import CaptureSmartTriggers from './Triggers/CaptureSmartTriggers';
import UnifiedLogs from './UnifiedLogs/UnifiedLogs';
import { useDocumentTitle } from './utils/hooks/useDocumentTitle';
import { useFeatureLevel } from './utils/hooks/useFeatureLevel';
import { accessibleRouteChangeHandler, BASEPATH } from './utils/utils';

let routeFocusTimer: number;

export interface IAppRoute extends IRouteMeta {
  component: React.ComponentType;
  children?: IAppRoute[];
}

/**
 * Merges a component map keyed by path into a metadata tree, producing a full
 * IAppRoute tree.  Paths that do not have a matching component entry are
 * silently omitted.
 */
const withComponents = (defs: IRouteMeta[], components: Record<string, React.ComponentType>): IAppRoute[] => {
  const result: IAppRoute[] = [];
  for (const def of defs) {
    const component = components[def.path];
    if (!component) continue;

    const { children: _children, ...rest } = def;
    const route: IAppRoute = { ...rest, component };
    if (def.children) {
      route.children = withComponents(def.children, components);
    }
    result.push(route);
  }
  return result;
};

const overviewComponents: Record<string, React.ComponentType> = {
  [overviewRouteDefs[0].path]: Dashboard,
  [overviewRouteDefs[0].children![0].path]: DashboardSolo,
  [overviewRouteDefs[1].path]: Topology,
};

const flightRecorderComponents: Record<string, React.ComponentType> = {
  [flightRecorderRouteDefs[0].path]: Recordings,
  [flightRecorderRouteDefs[1].path]: Events,
  [flightRecorderRouteDefs[2].path]: RulesTable,
  [flightRecorderRouteDefs[3].path]: CaptureSmartTriggers,
  [flightRecorderRouteDefs[4].path]: Instrumentation,
  [flightRecorderRouteDefs[5].path]: AsyncProfiler,
  [flightRecorderRouteDefs[5].children![0].path]: CreateAsyncProfilerSession,
  [flightRecorderRouteDefs[6].path]: Archives,
  [flightRecorderRouteDefs[7].path]: Reports,
  [flightRecorderRouteDefs[8].path]: RecordingAnalytics,
};

const diagnosticsComponents: Record<string, React.ComponentType> = {
  [diagnosticsRouteDefs[0].path]: CaptureDiagnostics,
  [diagnosticsRouteDefs[1].path]: AnalyzeThreadDumps,
  [diagnosticsRouteDefs[2].path]: ThreadDumpAnalysis,
  [diagnosticsRouteDefs[3].path]: AnalyzeHeapDumps,
  [diagnosticsRouteDefs[4].path]: HeapDumpAnalysis,
  [diagnosticsRouteDefs[5].path]: UnifiedLogs,
};

const securityComponents: Record<string, React.ComponentType> = {
  [securityRouteDefs[0].path]: Certificates,
  [securityRouteDefs[1].path]: StoredCredentialsView,
  [securityRouteDefs[2].path]: AuditLog,
};

const consoleComponents: Record<string, React.ComponentType> = {
  [consoleRouteDefs[0].path]: About,
};

const nonNavComponents: Record<string, React.ComponentType> = {
  [nonNavRouteDefs[0].path]: Settings,
  [nonNavRouteDefs[1].path]: QuickStarts,
};

const overviewRoutes: IAppRoute[] = withComponents(overviewRouteDefs, overviewComponents);
const flightRecorderRoutes: IAppRoute[] = withComponents(flightRecorderRouteDefs, flightRecorderComponents);
const diagnosticsRoutes: IAppRoute[] = withComponents(diagnosticsRouteDefs, diagnosticsComponents);
const securityRoutes: IAppRoute[] = withComponents(securityRouteDefs, securityComponents);
const consoleRoutes: IAppRoute[] = withComponents(consoleRouteDefs, consoleComponents);
const nonNavRoutes: IAppRoute[] = withComponents(nonNavRouteDefs, nonNavComponents);

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

const routes: IAppRoute[] = [
  ...overviewRoutes,
  ...flightRecorderRoutes,
  ...diagnosticsRoutes,
  ...securityRoutes,
  ...consoleRoutes,
  ...nonNavRoutes,
];

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
