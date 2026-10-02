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

import { FeatureLevel } from './Shared/Services/service.types';
import { toPath } from './utils/utils';

/**
 * Pure route metadata — path, title, labels, nav grouping and feature level.
 * This interface intentionally omits the React component so that route
 * definitions can be imported in non-React contexts (e.g. integration tests)
 * without dragging in the full component tree.
 */
export interface IRouteMeta {
  label?: string;
  path: string;
  title: string;
  description?: string;
  navGroup?: string;
  navSubgroup?: string;
  featureLevel?: FeatureLevel;
  children?: IRouteMeta[];
}

const OVERVIEW = 'Routes.NavGroups.OVERVIEW';
const FLIGHT_RECORDER = 'Routes.NavGroups.FLIGHT_RECORDER';
const DIAGNOSTICS = 'Routes.NavGroups.DIAGNOSTICS';
const SECURITY = 'Routes.NavGroups.SECURITY';
const CONSOLE = 'Routes.NavGroups.CONSOLE';

export const navGroups = [OVERVIEW, FLIGHT_RECORDER, DIAGNOSTICS, SECURITY, CONSOLE];

const ANALYZE = 'Routes.ANALYZE';
const CAPTURE = 'Routes.CAPTURE';

export const overviewRouteDefs: IRouteMeta[] = [
  {
    label: 'Dashboard',
    path: toPath('/'),
    title: 'Dashboard',
    navGroup: OVERVIEW,
    children: [
      {
        path: toPath('/d-solo'),
        title: 'Dashboard',
      },
    ],
  },
  {
    label: 'Topology',
    path: toPath('/topology'),
    title: 'Topology',
    navGroup: OVERVIEW,
  },
];

export const flightRecorderRouteDefs: IRouteMeta[] = [
  {
    label: 'Recordings',
    path: toPath('/recordings'),
    title: 'Recordings',
    description: 'Create, view and archive JFR Recordings on single target JVMs.',
    navGroup: FLIGHT_RECORDER,
    navSubgroup: CAPTURE,
  },
  {
    label: 'Events',
    path: toPath('/events'),
    title: 'Events',
    description: 'View available JFR Event Templates and types for target JVMs, as well as upload custom templates.',
    navGroup: FLIGHT_RECORDER,
    navSubgroup: CAPTURE,
  },
  {
    label: 'Automated Rules',
    path: toPath('/rules'),
    title: 'Automated Rules',
    description:
      'Create Recordings on multiple target JVMs at once using Automated Rules consisting of a name, Match Expression, template, archival period, and more.',
    navGroup: FLIGHT_RECORDER,
    navSubgroup: CAPTURE,
  },
  {
    label: 'Triggers',
    path: toPath('/triggers'),
    title: 'Triggers',
    description: 'Create Smart Triggers on targets that start recordings when specified MBean conditions are met',
    navGroup: FLIGHT_RECORDER,
    navSubgroup: CAPTURE,
  },
  {
    label: 'Instrumentation',
    path: toPath('/instrumentation'),
    title: 'Instrumentation',
    description: 'Instrument Targets to dynamically insert JFR event emission.',
    navGroup: FLIGHT_RECORDER,
    navSubgroup: CAPTURE,
  },
  {
    label: 'async-profiler',
    path: toPath('/async-profiler'),
    title: 'async-profiler',
    description: 'async-profiler',
    navGroup: FLIGHT_RECORDER,
    navSubgroup: CAPTURE,
    featureLevel: FeatureLevel.BETA,
    children: [
      {
        path: toPath('/async-profiler/create'),
        title: 'Create Async Profiler session',
      },
    ],
  },
  {
    label: 'Archives',
    path: toPath('/archives'),
    title: 'Archives',
    description:
      'View Archived Recordings across all target JVMs, as well as upload Recordings directly to the archive.',
    navGroup: FLIGHT_RECORDER,
    navSubgroup: ANALYZE,
  },
  {
    label: 'Automated Reports',
    path: toPath('/reports'),
    title: 'Automated Reports',
    description: 'View Automated Analysis Reports across all target JVMs.',
    navGroup: FLIGHT_RECORDER,
    navSubgroup: ANALYZE,
  },
  {
    label: 'Analytics',
    path: toPath('/recording-analytics'),
    title: 'Analytics',
    description: 'Perform advanced analytics queries on archived Flight Recordings.',
    navGroup: FLIGHT_RECORDER,
    navSubgroup: ANALYZE,
  },
];

export const diagnosticsRouteDefs: IRouteMeta[] = [
  {
    label: 'Capture',
    path: toPath('/diagnostics'),
    title: 'Capture',
    description: 'Perform garbage collection and create thread dumps on single target JVMs.',
    navGroup: DIAGNOSTICS,
  },
  {
    label: 'Thread Dump Archives',
    path: toPath('/thread-dumps'),
    title: 'Thread Dump Archives',
    description: 'View thread dumps on single target JVMs.',
    navGroup: DIAGNOSTICS,
    navSubgroup: ANALYZE,
  },
  {
    label: 'Analyze Thread Dumps',
    path: toPath('/analyze-thread-dumps'),
    title: 'Analyze Thread Dumps',
    description: 'Analyze Thread Dump Data',
    navGroup: DIAGNOSTICS,
    navSubgroup: ANALYZE,
  },
  {
    label: 'Heap Dump Archives',
    path: toPath('/heapdumps'),
    title: 'Heap Dump Archives',
    description: 'Create and view heap dumps on single target JVMs.',
    navGroup: DIAGNOSTICS,
    navSubgroup: ANALYZE,
  },
  {
    label: 'Analyze Heap Dumps',
    path: toPath('/analyze-heap-dumps'),
    title: 'Analyze Heap Dumps',
    description: 'Analyze Heap Dump Data',
    navGroup: DIAGNOSTICS,
    navSubgroup: ANALYZE,
  },
  {
    label: 'Unified Log Archives',
    path: toPath('/unified-logs'),
    title: 'Unified Log Archives',
    description: 'Manage Unified Logging sessions and view collected log archives.',
    navGroup: DIAGNOSTICS,
    navSubgroup: ANALYZE,
    featureLevel: FeatureLevel.BETA,
  },
];

export const securityRouteDefs: IRouteMeta[] = [
  {
    label: 'Certificates',
    path: toPath('/certificates'),
    title: 'Certificates',
    description: 'View SSL/TLS certificates Cryostat trusts when communicating with target applications.',
    navGroup: SECURITY,
  },
  {
    label: 'Credentials',
    path: toPath('/credentials'),
    title: 'Credentials',
    description: 'Encrypted credentials keyring which Cryostat uses to authenticate to target applications.',
    navGroup: SECURITY,
  },
  {
    label: 'Audit Log',
    path: toPath('/audit-log'),
    title: 'Audit Log',
    description: 'View audit log of changes to Cryostat entities.',
    navGroup: SECURITY,
  },
];

export const consoleRouteDefs: IRouteMeta[] = [
  {
    label: 'About',
    path: toPath('/about'),
    title: 'About',
    description: 'Get information, help, or support for Cryostat.',
    navGroup: CONSOLE,
  },
];

export const nonNavRouteDefs: IRouteMeta[] = [
  {
    path: toPath('/settings'),
    title: 'Settings',
    description: 'View or modify Cryostat web-client application settings.',
  },
  {
    label: 'Quick starts',
    path: toPath('/quickstarts'),
    title: 'Quick starts',
    description: 'Get started with Cryostat.',
  },
];

export const routeDefs: IRouteMeta[] = [
  ...overviewRouteDefs,
  ...flightRecorderRouteDefs,
  ...diagnosticsRouteDefs,
  ...securityRouteDefs,
  ...consoleRouteDefs,
  ...nonNavRouteDefs,
];

/**
 * Recursively flattens the route metadata tree into a single list.
 * Unlike the `flatten` in routes.tsx this function does not mutate the
 * path values and does not apply BASEPATH prefixing — callers that need
 * runtime BASEPATH handling should use the `flatten` export from routes.tsx.
 */
export const flattenMeta = (defs: IRouteMeta[]): IRouteMeta[] => {
  const ret: IRouteMeta[] = [];
  for (const r of defs) {
    ret.push(r);
    if (r.children) {
      ret.push(...flattenMeta(r.children));
    }
  }
  return ret;
};
