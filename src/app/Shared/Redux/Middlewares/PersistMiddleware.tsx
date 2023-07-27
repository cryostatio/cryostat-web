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
import { saveToLocalStorage } from '@app/utils/LocalStorage';
import { Middleware } from '@reduxjs/toolkit';
import { enumValues as DashboardConfigActions } from '../Configurations/DashboardConfigSlice';
import { enumValues as TopologyConfigActions } from '../Configurations/TopologyConfigSlice';
import { enumValues as AutomatedAnalysisFilterActions } from '../Filters/AutomatedAnalysisFilterSlice';
import { enumValues as RecordingFilterActions } from '../Filters/RecordingFilterSlice';
import { enumValues as TopologyFilterActions } from '../Filters/TopologyFilterSlice';
import { RootState } from '../ReduxStore';

/* eslint-disable-next-line  @typescript-eslint/ban-types*/
export const persistMiddleware: Middleware<{}, RootState> =
  ({ getState }) =>
  (next) =>
  (action) => {
    const result = next(action);
    // Extract new state here
    const rootState = getState();
    if (AutomatedAnalysisFilterActions.has(action.type)) {
      saveToLocalStorage('AUTOMATED_ANALYSIS_FILTERS', rootState.automatedAnalysisFilters);
    } else if (RecordingFilterActions.has(action.type)) {
      saveToLocalStorage('TARGET_RECORDING_FILTERS', rootState.recordingFilters);
    } else if (DashboardConfigActions.has(action.type)) {
      saveToLocalStorage('DASHBOARD_CFG', rootState.dashboardConfigs);
    } else if (TopologyConfigActions.has(action.type)) {
      saveToLocalStorage('TOPOLOGY_CONFIG', rootState.topologyConfigs);
    } else if (TopologyFilterActions.has(action.type)) {
      saveToLocalStorage('TOPOLOGY_FILTERS', rootState.topologyFilters);
    } else {
      console.warn(`Action ${action.type} does not persist state.`);
    }
    return result;
  };
