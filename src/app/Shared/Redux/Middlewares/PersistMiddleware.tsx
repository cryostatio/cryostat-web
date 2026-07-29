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
import { enumValues as NavMenuConfigActions } from '../Configurations/NavMenuConfigSlice';
import { enumValues as TopologyConfigActions } from '../Configurations/TopologyConfigSlice';
import { enumValues as ArchiveFilterActions } from '../Filters/ArchiveFiltersSlice';
import { enumValues as AutomatedAnalysisFilterActions } from '../Filters/AutomatedAnalysisFilterSlice';
import { enumValues as HeapDumpFilterActions } from '../Filters/HeapDumpFilterSlice';
import { enumValues as RecordingFilterActions } from '../Filters/RecordingFilterSlice';
import { enumValues as ThreadDumpFilterActions } from '../Filters/ThreadDumpFilterSlice';
import { enumValues as TopologyFilterActions } from '../Filters/TopologyFilterSlice';
import { enumValues as ModalPrefillActions } from '../ModalPrefillSlice';
import type { RootState } from '../ReduxStore';

export const persistMiddleware: Middleware<{}, RootState> =
  ({ getState }) =>
  (next) =>
  (action) => {
    const result = next(action);
    // Extract new state here
    const rootState = getState();
    const actionType = (action as { type: string }).type;
    const actionSet = (s: Set<string>) => s.has(actionType);
    if (actionSet(ArchiveFilterActions as Set<string>)) {
      saveToLocalStorage('ARCHIVE_FILTERS', rootState.archiveFilters);
    } else if (actionSet(AutomatedAnalysisFilterActions as Set<string>)) {
      saveToLocalStorage('AUTOMATED_ANALYSIS_FILTERS', rootState.automatedAnalysisFilters);
    } else if (actionSet(RecordingFilterActions as Set<string>)) {
      saveToLocalStorage('TARGET_RECORDING_FILTERS', rootState.recordingFilters);
    } else if (actionSet(HeapDumpFilterActions as Set<string>)) {
      saveToLocalStorage('TARGET_HEAP_DUMP_FILTERS', rootState.heapDumpFilters);
    } else if (actionSet(ThreadDumpFilterActions as Set<string>)) {
      saveToLocalStorage('TARGET_THREAD_DUMP_FILTERS', rootState.threadDumpFilters);
    } else if (actionSet(NavMenuConfigActions as Set<string>)) {
      saveToLocalStorage('NAV_MENU_CFG', rootState.navMenuConfigs);
    } else if (actionSet(DashboardConfigActions as Set<string>)) {
      saveToLocalStorage('DASHBOARD_CFG', rootState.dashboardConfigs);
    } else if (actionSet(TopologyConfigActions as Set<string>)) {
      saveToLocalStorage('TOPOLOGY_CONFIG', rootState.topologyConfigs);
    } else if (actionSet(TopologyFilterActions as Set<string>)) {
      saveToLocalStorage('TOPOLOGY_FILTERS', rootState.topologyFilters);
    } else if (actionSet(ModalPrefillActions as Set<string>)) {
      // Intentionally not persisted — transient state for modal open/prefill
    } else {
      console.warn(`Action ${actionType} does not persist state.`);
    }
    return result;
  };
