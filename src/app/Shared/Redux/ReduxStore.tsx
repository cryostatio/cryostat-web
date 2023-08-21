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

import { combineReducers, configureStore, PreloadedState } from '@reduxjs/toolkit';
import dashboardConfigReducer, * as dashboardConfigSlice from './Configurations/DashboardConfigSlice';
import topologyConfigReducer, * as topologyConfigSlice from './Configurations/TopologyConfigSlice';
import automatedAnalysisFilterReducer, * as automatedAnalysisFilterSlice from './Filters/AutomatedAnalysisFilterSlice';
import recordingFilterReducer, * as recordingFilterSlice from './Filters/RecordingFilterSlice';
import topologyFilterReducer, * as topologyFilterSlice from './Filters/TopologyFilterSlice';
import { persistMiddleware } from './Middlewares/PersistMiddleware';

// Export actions
export const {
  dashboardConfigAddCardIntent,
  dashboardConfigDeleteCardIntent,
  dashboardConfigReorderCardIntent,
  dashboardConfigResizeCardIntent,
  dashboardConfigFirstRunIntent,
  dashboardConfigCreateLayoutIntent,
  dashboardConfigDeleteLayoutIntent,
  dashboardConfigRenameLayoutIntent,
  dashboardConfigReplaceLayoutIntent,
  dashboardConfigFavoriteLayoutIntent,
  dashboardConfigCreateTemplateIntent,
  dashboardConfigDeleteTemplateIntent,
  dashboardConfigClearAllCardsIntent,
  dashboardConfigTemplateHistoryPushIntent,
  dashboardConfigTemplateHistoryClearIntent,
  defaultDashboardConfigs,
} = dashboardConfigSlice;
export const {
  recordingAddFilterIntent,
  recordingDeleteFilterIntent,
  recordingAddTargetIntent,
  recordingDeleteTargetIntent,
  recordingDeleteCategoryFiltersIntent,
  recordingUpdateCategoryIntent,
  recordingDeleteAllFiltersIntent,
  defaultRecordingFilters,
} = recordingFilterSlice;
export const {
  automatedAnalysisAddGlobalFilterIntent,
  automatedAnalysisAddFilterIntent,
  automatedAnalysisAddTargetIntent,
  automatedAnalysisDeleteAllFiltersIntent,
  automatedAnalysisDeleteCategoryFiltersIntent,
  automatedAnalysisDeleteFilterIntent,
  automatedAnalysisDeleteTargetIntent,
  automatedAnalysisUpdateCategoryIntent,
  defaultAutomatedAnalysisFilters,
} = automatedAnalysisFilterSlice;

export const { topologyConfigSetViewModeIntent, topologyDisplayOptionsSetIntent, defaultTopologyConfig } =
  topologyConfigSlice;

export const {
  topologyUpdateCategoryTypeIntent,
  topologyUpdateCategoryIntent,
  topologyAddFilterIntent,
  topologyDeleteAllFiltersIntent,
  topologyDeleteCategoryFiltersIntent,
  topologyDeleteFilterIntent,
  defaultTopologyFilters,
} = topologyFilterSlice;

export const rootReducer = combineReducers({
  dashboardConfigs: dashboardConfigReducer,
  recordingFilters: recordingFilterReducer,
  automatedAnalysisFilters: automatedAnalysisFilterReducer,
  topologyConfigs: topologyConfigReducer,
  topologyFilters: topologyFilterReducer,
});

export const setupStore = (preloadedState?: PreloadedState<RootState>) =>
  configureStore({
    reducer: rootReducer,
    preloadedState,
    middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(persistMiddleware),
  });

export const store = setupStore();

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof rootReducer>;
export type StateDispatch = typeof store.dispatch;
export type Store = ReturnType<typeof setupStore>;
