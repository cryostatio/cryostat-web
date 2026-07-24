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

import { GcLogFiltersCategories } from '@app/GcLogs/Filters/GcLogFilters';
import { createAction, createReducer } from '@reduxjs/toolkit';
import { WritableDraft } from 'immer/dist/internal';
import { getPersistedState } from '../utils';
import { UpdateFilterOptions } from './Common';

const _version = '1';

// Common action string format: "resource(s)/action"
export enum GcLogFilterAction {
  FILTER_ADD = 'gclog-filter/add',
  FILTER_DELETE = 'gclog-filter/delete',
  FILTER_DELETE_ALL = 'gclog-filter/delete-all', // Delete all filters in all categories
  CATEGORY_FILTERS_DELETE = 'gclog-filter/delete-category', // Delete all filters of the same category
  CATEGORY_UPDATE = 'gclog-filter-category/update',
  TARGET_ADD = 'gclog-filter-target/add',
  TARGET_DELETE = 'gclog-filter-target/delete',
}

export const enumValues = new Set(Object.values(GcLogFilterAction));

export const emptyArchivedGcLogFilters = {
  Name: [],
  Label: [],
} as GcLogFiltersCategories;

export const allowedGcLogFilters = Object.keys(emptyArchivedGcLogFilters);

export interface GcLogFilterActionPayload {
  target: string;
  category: string;
  filter?: unknown;
  filterIdx?: number;
}

export const GcLogAddFilterIntent = createAction(
  GcLogFilterAction.FILTER_ADD,
  (target: string, category: string, filter: unknown) => ({
    payload: {
      target: target,
      category: category,
      filter: filter,
    } as GcLogFilterActionPayload,
  }),
);

export const GcLogDeleteFilterIntent = createAction(
  GcLogFilterAction.FILTER_DELETE,
  (target: string, category: string, filter: unknown, filterIdx?: number) => ({
    payload: {
      target: target,
      category: category,
      filter: filter,
      filterIdx: filterIdx,
    } as GcLogFilterActionPayload,
  }),
);

export const GcLogDeleteCategoryFiltersIntent = createAction(
  GcLogFilterAction.CATEGORY_FILTERS_DELETE,
  (target: string, category: string) => ({
    payload: {
      target: target,
      category: category,
    } as GcLogFilterActionPayload,
  }),
);

export const GcLogDeleteAllFiltersIntent = createAction(GcLogFilterAction.FILTER_DELETE_ALL, (target: string) => ({
  payload: {
    target: target,
  } as Pick<GcLogFilterActionPayload, 'target'>,
}));

export const GcLogUpdateCategoryIntent = createAction(
  GcLogFilterAction.CATEGORY_UPDATE,
  (target: string, category: string) => ({
    payload: {
      target: target,
      category: category,
    } as GcLogFilterActionPayload,
  }),
);

export const GcLogAddTargetIntent = createAction(GcLogFilterAction.TARGET_ADD, (target: string) => ({
  payload: {
    target: target,
  } as Pick<GcLogFilterActionPayload, 'target'>,
}));

export const GcLogDeleteTargetIntent = createAction(GcLogFilterAction.TARGET_DELETE, (target: string) => ({
  payload: {
    target: target,
  } as Pick<GcLogFilterActionPayload, 'target'>,
}));

export interface TargetGcLogFilters {
  target: string; // connectURL
  archived: {
    // archived GcLogs
    selectedCategory: string;
    filters: GcLogFiltersCategories;
  };
}

export const createOrUpdateGcLogFilter = (
  old: GcLogFiltersCategories,
  { filterValue, filterKey, filterValueIndex, deleted = false, deleteOptions }: UpdateFilterOptions,
): GcLogFiltersCategories => {
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

export const getTargetGcLogFilter = (
  state: WritableDraft<{ list: TargetGcLogFilters[] }>,
  target: string,
): TargetGcLogFilters => {
  const targetFilter = state.list.filter((targetFilters) => targetFilters.target === target);
  return targetFilter.length > 0 ? targetFilter[0] : createEmptyTargetGcLogFilters(target);
};

export const createEmptyTargetGcLogFilters = (target: string) =>
  ({
    target: target,
    archived: {
      selectedCategory: 'Name',
      filters: emptyArchivedGcLogFilters,
    },
  }) as TargetGcLogFilters;

export const deleteAllTargetGcLogFilters = (targetGcLogFilter: TargetGcLogFilters) => {
  return {
    ...targetGcLogFilter,
    archived: {
      selectedCategory: targetGcLogFilter.archived.selectedCategory,
      filters: emptyArchivedGcLogFilters,
    },
  };
};

export interface GcLogFilters {
  list: TargetGcLogFilters[];
  readonly _version: string;
}

export const defaultGcLogFilters: GcLogFilters = {
  list: [] as TargetGcLogFilters[],
  _version: _version,
};

const INITIAL_STATE = getPersistedState('TARGET_GC_LOG_FILTERS', _version, defaultGcLogFilters);

export const GcLogFilterReducer = createReducer(INITIAL_STATE, (builder) => {
  builder
    .addCase(GcLogAddFilterIntent, (state, { payload }) => {
      const oldTargetGcLogFilter = getTargetGcLogFilter(state, payload.target);

      let newTargetGcLogFilter: TargetGcLogFilters;

      newTargetGcLogFilter = {
        ...oldTargetGcLogFilter,
        archived: {
          selectedCategory: payload.category,
          filters: createOrUpdateGcLogFilter(oldTargetGcLogFilter.archived.filters, {
            filterKey: payload.category!,
            filterValue: payload.filter,
          }),
        },
      };

      state.list = state.list.filter((targetFilters) => targetFilters.target !== newTargetGcLogFilter.target);
      state.list.push(newTargetGcLogFilter);
    })
    .addCase(GcLogDeleteFilterIntent, (state, { payload }) => {
      const oldTargetGcLogFilter = getTargetGcLogFilter(state, payload.target);

      let newTargetGcLogFilter: TargetGcLogFilters;

      newTargetGcLogFilter = {
        ...oldTargetGcLogFilter,
        archived: {
          selectedCategory: payload.category,
          filters: createOrUpdateGcLogFilter(oldTargetGcLogFilter.archived.filters, {
            filterKey: payload.category!,
            filterValue: payload.filter,
            filterValueIndex: payload.filterIdx,
            deleted: true,
          }),
        },
      };

      state.list = state.list.filter((targetFilters) => targetFilters.target !== newTargetGcLogFilter.target);
      state.list.push(newTargetGcLogFilter);
    })
    .addCase(GcLogDeleteCategoryFiltersIntent, (state, { payload }) => {
      const oldTargetGcLogFilter = getTargetGcLogFilter(state, payload.target);

      let newTargetGcLogFilter: TargetGcLogFilters;
      newTargetGcLogFilter = {
        ...oldTargetGcLogFilter,
        archived: {
          selectedCategory: payload.category,
          filters: createOrUpdateGcLogFilter(oldTargetGcLogFilter.archived.filters, {
            filterKey: payload.category!,
            deleted: true,
            deleteOptions: { all: true },
          }),
        },
      };

      state.list = state.list.filter((targetFilters) => targetFilters.target !== newTargetGcLogFilter.target);
      state.list.push(newTargetGcLogFilter);
    })
    .addCase(GcLogDeleteAllFiltersIntent, (state, { payload }) => {
      const oldTargetGcLogFilter = getTargetGcLogFilter(state, payload.target);
      const newTargetGcLogFilter = deleteAllTargetGcLogFilters(oldTargetGcLogFilter);
      state.list = state.list.filter((targetFilters) => targetFilters.target !== newTargetGcLogFilter.target);
      state.list.push(newTargetGcLogFilter);
    })
    .addCase(GcLogUpdateCategoryIntent, (state, { payload }) => {
      const oldTargetGcLogFilter = getTargetGcLogFilter(state, payload.target);
      const newTargetGcLogFilter = { ...oldTargetGcLogFilter };
      newTargetGcLogFilter.archived.selectedCategory = payload.category;
      state.list = state.list.filter((targetFilters) => targetFilters.target !== newTargetGcLogFilter.target);
      state.list.push(newTargetGcLogFilter);
    })
    .addCase(GcLogAddTargetIntent, (state, { payload }) => {
      const targetGcLogFilter = getTargetGcLogFilter(state, payload.target);
      state.list = state.list.filter((targetFilters) => targetFilters.target !== payload.target);
      state.list.push(targetGcLogFilter);
    })
    .addCase(GcLogDeleteTargetIntent, (state, { payload }) => {
      state.list = state.list.filter((targetFilters) => targetFilters.target !== payload.target);
    });
});

export default GcLogFilterReducer;
