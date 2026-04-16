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

import { LineageNode } from '@app/Shared/Services/api.types';
import { createAction, createReducer } from '@reduxjs/toolkit';
import { getPersistedState } from '../utils';

const _version = '2'; // Incremented due to breaking change in TimeRangeOption

/**
 * Time range filter for archives.
 * Stores timestamps in milliseconds since epoch.
 */
export interface TimeRangeOption {
  startTime: number;
  endTime: number;
}

/**
 * Archive filters state structure.
 */
export interface ArchiveFiltersState {
  lineageFilters: LineageNode[]; // Active lineage label filters
  timeRange: TimeRangeOption | null; // Time range filter (null = no filter)
  searchText: string; // Search text filter
  readonly _version: string;
}

/**
 * Default archive filters state.
 */
export const defaultArchiveFilters: ArchiveFiltersState = {
  lineageFilters: [],
  timeRange: null,
  searchText: '',
  _version: _version,
};

/**
 * Archive filter action types.
 */
export enum ArchiveFilterAction {
  LINEAGE_FILTER_ADD = 'archive-filter/lineage-add',
  LINEAGE_FILTER_REMOVE = 'archive-filter/lineage-remove',
  LINEAGE_FILTERS_CLEAR = 'archive-filter/lineage-clear',
  TIME_RANGE_SET = 'archive-filter/time-range-set',
  TIME_RANGE_CLEAR = 'archive-filter/time-range-clear',
  SEARCH_TEXT_SET = 'archive-filter/search-text-set',
  FILTERS_CLEAR_ALL = 'archive-filter/clear-all',
}

export const enumValues = new Set(Object.values(ArchiveFilterAction));

/**
 * Add a lineage filter node.
 */
export const archiveAddLineageFilterIntent = createAction(
  ArchiveFilterAction.LINEAGE_FILTER_ADD,
  (node: LineageNode) => ({
    payload: node,
  }),
);

/**
 * Remove a lineage filter node by <nodeType, name> key.
 */
export const archiveRemoveLineageFilterIntent = createAction(
  ArchiveFilterAction.LINEAGE_FILTER_REMOVE,
  (node: Pick<LineageNode, 'nodeType' | 'name'>) => ({
    payload: node,
  }),
);

/**
 * Clear all lineage filters.
 */
export const archiveClearLineageFiltersIntent = createAction(ArchiveFilterAction.LINEAGE_FILTERS_CLEAR);

/**
 * Set the time range filter.
 */
export const archiveSetTimeRangeIntent = createAction(
  ArchiveFilterAction.TIME_RANGE_SET,
  (timeRange: TimeRangeOption) => ({
    payload: timeRange,
  }),
);

/**
 * Clear the time range filter.
 */
export const archiveClearTimeRangeIntent = createAction(ArchiveFilterAction.TIME_RANGE_CLEAR);

/**
 * Set the search text filter.
 */
export const archiveSetSearchTextIntent = createAction(ArchiveFilterAction.SEARCH_TEXT_SET, (searchText: string) => ({
  payload: searchText,
}));

/**
 * Clear all filters (lineage, time range, and search text).
 */
export const archiveClearAllFiltersIntent = createAction(ArchiveFilterAction.FILTERS_CLEAR_ALL);

/**
 * Sanitize the persisted state.
 */
export const sanitize = (initState: ArchiveFiltersState): ArchiveFiltersState => {
  // Validate time range if present
  if (initState.timeRange) {
    const { startTime, endTime } = initState.timeRange;

    // Check if timestamps are valid numbers
    if (
      typeof startTime !== 'number' ||
      typeof endTime !== 'number' ||
      isNaN(startTime) ||
      isNaN(endTime) ||
      startTime < 0 ||
      endTime < 0 ||
      endTime <= startTime
    ) {
      // Invalid time range, reset to null
      return {
        ...initState,
        timeRange: null,
      };
    }
  }
  return initState;
};

const INITIAL_STATE = sanitize(getPersistedState('ARCHIVE_FILTERS', _version, defaultArchiveFilters));

/**
 * Archive filters reducer.
 */
export const archiveFiltersReducer = createReducer(INITIAL_STATE, (builder) => {
  builder
    .addCase(archiveAddLineageFilterIntent, (state, { payload }) => {
      // Add node if not already present (check by <nodeType, name>)
      const exists = state.lineageFilters.some(
        (node) => node.nodeType === payload.nodeType && node.name === payload.name,
      );
      if (!exists) {
        state.lineageFilters.push(payload);
      }
    })
    .addCase(archiveRemoveLineageFilterIntent, (state, { payload }) => {
      // Remove node by <nodeType, name>
      state.lineageFilters = state.lineageFilters.filter(
        (node) => !(node.nodeType === payload.nodeType && node.name === payload.name),
      );
    })
    .addCase(archiveClearLineageFiltersIntent, (state) => {
      state.lineageFilters = [];
    })
    .addCase(archiveSetTimeRangeIntent, (state, { payload }) => {
      state.timeRange = payload;
    })
    .addCase(archiveClearTimeRangeIntent, (state) => {
      state.timeRange = null;
    })
    .addCase(archiveSetSearchTextIntent, (state, { payload }) => {
      state.searchText = payload;
    })
    .addCase(archiveClearAllFiltersIntent, (state) => {
      state.lineageFilters = [];
      state.timeRange = null;
      state.searchText = '';
    });
});

export default archiveFiltersReducer;
