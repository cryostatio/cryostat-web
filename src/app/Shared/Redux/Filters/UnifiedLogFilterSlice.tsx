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

import { UnifiedLogFiltersCategories } from '@app/UnifiedLogs/Filters/UnifiedLogFilters';
import { createAction, createReducer } from '@reduxjs/toolkit';
import { WritableDraft } from 'immer';
import { getPersistedState } from '../utils';
import { UpdateFilterOptions } from './Common';

const _version = '1';

// Common action string format: "resource(s)/action"
export enum UnifiedLogFilterAction {
  FILTER_ADD = 'unified-log-filter/add',
  FILTER_DELETE = 'unified-log-filter/delete',
  FILTER_DELETE_ALL = 'unified-log-filter/delete-all', // Delete all filters in all categories
  CATEGORY_FILTERS_DELETE = 'unified-log-filter/delete-category', // Delete all filters of the same category
  CATEGORY_UPDATE = 'unified-log-filter-category/update',
  TARGET_ADD = 'unified-log-filter-target/add',
  TARGET_DELETE = 'unified-log-filter-target/delete',
}

export const enumValues = new Set(Object.values(UnifiedLogFilterAction));

export const emptyArchivedUnifiedLogFilters = {
  Name: [],
  Label: [],
} as UnifiedLogFiltersCategories;

export const allowedUnifiedLogFilters = Object.keys(emptyArchivedUnifiedLogFilters);

export interface UnifiedLogFilterActionPayload {
  target: string;
  category: string;
  filter?: unknown;
  filterIdx?: number;
}

export const UnifiedLogAddFilterIntent = createAction(
  UnifiedLogFilterAction.FILTER_ADD,
  (target: string, category: string, filter: unknown) => ({
    payload: {
      target: target,
      category: category,
      filter: filter,
    } as UnifiedLogFilterActionPayload,
  }),
);

export const UnifiedLogDeleteFilterIntent = createAction(
  UnifiedLogFilterAction.FILTER_DELETE,
  (target: string, category: string, filter: unknown, filterIdx?: number) => ({
    payload: {
      target: target,
      category: category,
      filter: filter,
      filterIdx: filterIdx,
    } as UnifiedLogFilterActionPayload,
  }),
);

export const UnifiedLogDeleteCategoryFiltersIntent = createAction(
  UnifiedLogFilterAction.CATEGORY_FILTERS_DELETE,
  (target: string, category: string) => ({
    payload: {
      target: target,
      category: category,
    } as UnifiedLogFilterActionPayload,
  }),
);

export const UnifiedLogDeleteAllFiltersIntent = createAction(
  UnifiedLogFilterAction.FILTER_DELETE_ALL,
  (target: string) => ({
    payload: {
      target: target,
    } as Pick<UnifiedLogFilterActionPayload, 'target'>,
  }),
);

export const UnifiedLogUpdateCategoryIntent = createAction(
  UnifiedLogFilterAction.CATEGORY_UPDATE,
  (target: string, category: string) => ({
    payload: {
      target: target,
      category: category,
    } as UnifiedLogFilterActionPayload,
  }),
);

export const UnifiedLogAddTargetIntent = createAction(UnifiedLogFilterAction.TARGET_ADD, (target: string) => ({
  payload: {
    target: target,
  } as Pick<UnifiedLogFilterActionPayload, 'target'>,
}));

export const UnifiedLogDeleteTargetIntent = createAction(UnifiedLogFilterAction.TARGET_DELETE, (target: string) => ({
  payload: {
    target: target,
  } as Pick<UnifiedLogFilterActionPayload, 'target'>,
}));

export interface TargetUnifiedLogFilters {
  target: string; // connectURL
  archived: {
    // archived logs
    selectedCategory: string;
    filters: UnifiedLogFiltersCategories;
  };
}

export const createOrUpdateUnifiedLogFilter = (
  old: UnifiedLogFiltersCategories,
  { filterValue, filterKey, filterValueIndex, deleted = false, deleteOptions }: UpdateFilterOptions,
): UnifiedLogFiltersCategories => {
  let newFilterValues: unknown[];
  if (!old[filterKey]) {
    newFilterValues = [filterValue];
  } else {
    const oldFilterValues = old[filterKey] as unknown[];
    if (deleted) {
      if (deleteOptions && deleteOptions.all) {
        newFilterValues = [];
      } else if (filterValueIndex !== undefined) {
        // If index is present, use it
        newFilterValues = [
          ...oldFilterValues.slice(0, filterValueIndex),
          ...oldFilterValues.slice(filterValueIndex + 1),
        ];
      } else {
        newFilterValues = oldFilterValues.filter((val) => val !== filterValue);
      }
    } else {
      newFilterValues = Array.from(new Set([...oldFilterValues, filterValue]));
    }
  }

  const newFilters = { ...old };
  newFilters[filterKey] = newFilterValues;
  return newFilters;
};

export const getTargetUnifiedLogFilter = (
  state: WritableDraft<{ list: TargetUnifiedLogFilters[] }>,
  target: string,
): TargetUnifiedLogFilters => {
  const targetFilter = state.list.filter((targetFilters) => targetFilters.target === target);
  return targetFilter.length > 0 ? targetFilter[0] : createEmptyTargetUnifiedLogFilters(target);
};

export const createEmptyTargetUnifiedLogFilters = (target: string) =>
  ({
    target: target,
    archived: {
      selectedCategory: 'Name',
      filters: emptyArchivedUnifiedLogFilters,
    },
  }) as TargetUnifiedLogFilters;

export const deleteAllTargetUnifiedLogFilters = (targetUnifiedLogFilter: TargetUnifiedLogFilters) => {
  return {
    ...targetUnifiedLogFilter,
    archived: {
      selectedCategory: targetUnifiedLogFilter.archived.selectedCategory,
      filters: emptyArchivedUnifiedLogFilters,
    },
  };
};

export interface UnifiedLogFilters {
  list: TargetUnifiedLogFilters[];
  readonly _version: string;
}

export const defaultUnifiedLogFilters: UnifiedLogFilters = {
  list: [] as TargetUnifiedLogFilters[],
  _version: _version,
};

const INITIAL_STATE = getPersistedState('TARGET_UNIFIED_LOG_FILTERS', _version, defaultUnifiedLogFilters);

export const UnifiedLogFilterReducer = createReducer(INITIAL_STATE, (builder) => {
  builder
    .addCase(UnifiedLogAddFilterIntent, (state, { payload }) => {
      const oldTargetUnifiedLogFilter = getTargetUnifiedLogFilter(state, payload.target);

      let newTargetUnifiedLogFilter: TargetUnifiedLogFilters;

      newTargetUnifiedLogFilter = {
        ...oldTargetUnifiedLogFilter,
        archived: {
          selectedCategory: payload.category,
          filters: createOrUpdateUnifiedLogFilter(oldTargetUnifiedLogFilter.archived.filters, {
            filterKey: payload.category!,
            filterValue: payload.filter,
          }),
        },
      };

      state.list = state.list.filter((targetFilters) => targetFilters.target !== newTargetUnifiedLogFilter.target);
      state.list.push(newTargetUnifiedLogFilter);
    })
    .addCase(UnifiedLogDeleteFilterIntent, (state, { payload }) => {
      const oldTargetUnifiedLogFilter = getTargetUnifiedLogFilter(state, payload.target);

      let newTargetUnifiedLogFilter: TargetUnifiedLogFilters;

      newTargetUnifiedLogFilter = {
        ...oldTargetUnifiedLogFilter,
        archived: {
          selectedCategory: payload.category,
          filters: createOrUpdateUnifiedLogFilter(oldTargetUnifiedLogFilter.archived.filters, {
            filterKey: payload.category!,
            filterValue: payload.filter,
            filterValueIndex: payload.filterIdx,
            deleted: true,
          }),
        },
      };

      state.list = state.list.filter((targetFilters) => targetFilters.target !== newTargetUnifiedLogFilter.target);
      state.list.push(newTargetUnifiedLogFilter);
    })
    .addCase(UnifiedLogDeleteCategoryFiltersIntent, (state, { payload }) => {
      const oldTargetUnifiedLogFilter = getTargetUnifiedLogFilter(state, payload.target);

      let newTargetUnifiedLogFilter: TargetUnifiedLogFilters;
      newTargetUnifiedLogFilter = {
        ...oldTargetUnifiedLogFilter,
        archived: {
          selectedCategory: payload.category,
          filters: createOrUpdateUnifiedLogFilter(oldTargetUnifiedLogFilter.archived.filters, {
            filterKey: payload.category!,
            deleted: true,
            deleteOptions: { all: true },
          }),
        },
      };

      state.list = state.list.filter((targetFilters) => targetFilters.target !== newTargetUnifiedLogFilter.target);
      state.list.push(newTargetUnifiedLogFilter);
    })
    .addCase(UnifiedLogDeleteAllFiltersIntent, (state, { payload }) => {
      const oldTargetUnifiedLogFilter = getTargetUnifiedLogFilter(state, payload.target);
      const newTargetUnifiedLogFilter = deleteAllTargetUnifiedLogFilters(oldTargetUnifiedLogFilter);
      state.list = state.list.filter((targetFilters) => targetFilters.target !== newTargetUnifiedLogFilter.target);
      state.list.push(newTargetUnifiedLogFilter);
    })
    .addCase(UnifiedLogUpdateCategoryIntent, (state, { payload }) => {
      const oldTargetUnifiedLogFilter = getTargetUnifiedLogFilter(state, payload.target);
      const newTargetUnifiedLogFilter = { ...oldTargetUnifiedLogFilter };
      newTargetUnifiedLogFilter.archived.selectedCategory = payload.category;
      state.list = state.list.filter((targetFilters) => targetFilters.target !== newTargetUnifiedLogFilter.target);
      state.list.push(newTargetUnifiedLogFilter);
    })
    .addCase(UnifiedLogAddTargetIntent, (state, { payload }) => {
      const targetUnifiedLogFilter = getTargetUnifiedLogFilter(state, payload.target);
      state.list = state.list.filter((targetFilters) => targetFilters.target !== payload.target);
      state.list.push(targetUnifiedLogFilter);
    })
    .addCase(UnifiedLogDeleteTargetIntent, (state, { payload }) => {
      state.list = state.list.filter((targetFilters) => targetFilters.target !== payload.target);
    });
});

export default UnifiedLogFilterReducer;
