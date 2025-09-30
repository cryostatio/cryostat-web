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

import { ThreadDumpFiltersCategories } from '@app/Diagnostics/Filters/ThreadDumpFilters';
import { createAction, createReducer } from '@reduxjs/toolkit';
import { WritableDraft } from 'immer/dist/internal';
import { getPersistedState } from '../utils';
import { UpdateFilterOptions } from './Common';

const _version = '2';

// Common action string format: "resource(s)/action"
export enum ThreadDumpFilterAction {
  FILTER_ADD = 'threaddump-filter/add',
  FILTER_DELETE = 'threaddump-filter/delete',
  FILTER_DELETE_ALL = 'threaddump-filter/delete-all', // Delete all filters in all categories
  CATEGORY_FILTERS_DELETE = 'threaddump-filter/delete-category', // Delete all filters of the same category
  CATEGORY_UPDATE = 'threaddump-filter-category/update',
  TARGET_ADD = 'threaddump-filter-target/add',
  TARGET_DELETE = 'threaddump-filter-target/delete',
}

export const enumValues = new Set(Object.values(ThreadDumpFilterAction));

export const emptyArchivedThreadDumpFilters = {
  Name: [],
  Label: [],
} as ThreadDumpFiltersCategories;

export const allowedThreadDumpFilters = Object.keys(emptyArchivedThreadDumpFilters);

export interface ThreadDumpFilterActionPayload {
  target: string;
  category: string;
  filter?: unknown;
  filterIdx?: number;
}

export const ThreadDumpAddFilterIntent = createAction(
  ThreadDumpFilterAction.FILTER_ADD,
  (target: string, category: string, filter: unknown) => ({
    payload: {
      target: target,
      category: category,
      filter: filter,
    } as ThreadDumpFilterActionPayload,
  }),
);

export const ThreadDumpDeleteFilterIntent = createAction(
  ThreadDumpFilterAction.FILTER_DELETE,
  (target: string, category: string, filter: unknown, filterIdx?: number) => ({
    payload: {
      target: target,
      category: category,
      filter: filter,
      filterIdx: filterIdx,
    } as ThreadDumpFilterActionPayload,
  }),
);

export const ThreadDumpDeleteCategoryFiltersIntent = createAction(
  ThreadDumpFilterAction.CATEGORY_FILTERS_DELETE,
  (target: string, category: string) => ({
    payload: {
      target: target,
      category: category,
    } as ThreadDumpFilterActionPayload,
  }),
);

export const ThreadDumpDeleteAllFiltersIntent = createAction(
  ThreadDumpFilterAction.FILTER_DELETE_ALL,
  (target: string) => ({
    payload: {
      target: target,
    } as Pick<ThreadDumpFilterActionPayload, 'target'>,
  }),
);

export const ThreadDumpUpdateCategoryIntent = createAction(
  ThreadDumpFilterAction.CATEGORY_UPDATE,
  (target: string, category: string) => ({
    payload: {
      target: target,
      category: category,
    } as ThreadDumpFilterActionPayload,
  }),
);

export const ThreadDumpAddTargetIntent = createAction(ThreadDumpFilterAction.TARGET_ADD, (target: string) => ({
  payload: {
    target: target,
  } as Pick<ThreadDumpFilterActionPayload, 'target'>,
}));

export const ThreadDumpDeleteTargetIntent = createAction(ThreadDumpFilterAction.TARGET_DELETE, (target: string) => ({
  payload: {
    target: target,
  } as Pick<ThreadDumpFilterActionPayload, 'target'>,
}));

export interface TargetThreadDumpFilters {
  target: string; // connectURL
  archived: {
    // archived ThreadDumps
    selectedCategory: string;
    filters: ThreadDumpFiltersCategories;
  };
}

export const createOrUpdateThreadDumpFilter = (
  old: ThreadDumpFiltersCategories,
  { filterValue, filterKey, filterValueIndex, deleted = false, deleteOptions }: UpdateFilterOptions,
): ThreadDumpFiltersCategories => {
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

export const getTargetThreadDumpFilter = (
  state: WritableDraft<{ list: TargetThreadDumpFilters[] }>,
  target: string,
): TargetThreadDumpFilters => {
  const targetFilter = state.list.filter((targetFilters) => targetFilters.target === target);
  return targetFilter.length > 0 ? targetFilter[0] : createEmptyTargetThreadDumpFilters(target);
};

export const createEmptyTargetThreadDumpFilters = (target: string) =>
  ({
    target: target,
    archived: {
      selectedCategory: 'Name',
      filters: emptyArchivedThreadDumpFilters,
    },
  }) as TargetThreadDumpFilters;

export const deleteAllTargetThreadDumpFilters = (targetThreadDumpFilter: TargetThreadDumpFilters) => {
  return {
    ...targetThreadDumpFilter,
    archived: {
      selectedCategory: targetThreadDumpFilter.archived.selectedCategory,
      filters: emptyArchivedThreadDumpFilters,
    },
  };
};

export interface ThreadDumpFilters {
  list: TargetThreadDumpFilters[];
  readonly _version: string;
}

export const defaultThreadDumpFilters: ThreadDumpFilters = {
  list: [] as TargetThreadDumpFilters[],
  _version: _version,
};

const INITIAL_STATE = getPersistedState('TARGET_THREAD_DUMP_FILTERS', _version, defaultThreadDumpFilters);

export const ThreadDumpFilterReducer = createReducer(INITIAL_STATE, (builder) => {
  builder
    .addCase(ThreadDumpAddFilterIntent, (state, { payload }) => {
      const oldTargetThreadDumpFilter = getTargetThreadDumpFilter(state, payload.target);

      let newTargetThreadDumpFilter: TargetThreadDumpFilters;

      newTargetThreadDumpFilter = {
        ...oldTargetThreadDumpFilter,
        archived: {
          selectedCategory: payload.category,
          filters: createOrUpdateThreadDumpFilter(oldTargetThreadDumpFilter.archived.filters, {
            filterKey: payload.category!,
            filterValue: payload.filter,
          }),
        },
      };

      state.list = state.list.filter((targetFilters) => targetFilters.target !== newTargetThreadDumpFilter.target);
      state.list.push(newTargetThreadDumpFilter);
    })
    .addCase(ThreadDumpDeleteFilterIntent, (state, { payload }) => {
      const oldTargetThreadDumpFilter = getTargetThreadDumpFilter(state, payload.target);

      let newTargetThreadDumpFilter: TargetThreadDumpFilters;

      newTargetThreadDumpFilter = {
        ...oldTargetThreadDumpFilter,
        archived: {
          selectedCategory: payload.category,
          filters: createOrUpdateThreadDumpFilter(oldTargetThreadDumpFilter.archived.filters, {
            filterKey: payload.category!,
            filterValue: payload.filter,
            filterValueIndex: payload.filterIdx,
            deleted: true,
          }),
        },
      };

      state.list = state.list.filter((targetFilters) => targetFilters.target !== newTargetThreadDumpFilter.target);
      state.list.push(newTargetThreadDumpFilter);
    })
    .addCase(ThreadDumpDeleteCategoryFiltersIntent, (state, { payload }) => {
      const oldTargetThreadDumpFilter = getTargetThreadDumpFilter(state, payload.target);

      let newTargetThreadDumpFilter: TargetThreadDumpFilters;
      newTargetThreadDumpFilter = {
        ...oldTargetThreadDumpFilter,
        archived: {
          selectedCategory: payload.category,
          filters: createOrUpdateThreadDumpFilter(oldTargetThreadDumpFilter.archived.filters, {
            filterKey: payload.category!,
            deleted: true,
            deleteOptions: { all: true },
          }),
        },
      };

      state.list = state.list.filter((targetFilters) => targetFilters.target !== newTargetThreadDumpFilter.target);
      state.list.push(newTargetThreadDumpFilter);
    })
    .addCase(ThreadDumpDeleteAllFiltersIntent, (state, { payload }) => {
      const oldTargetThreadDumpFilter = getTargetThreadDumpFilter(state, payload.target);
      const newTargetThreadDumpFilter = deleteAllTargetThreadDumpFilters(oldTargetThreadDumpFilter);
      state.list = state.list.filter((targetFilters) => targetFilters.target !== newTargetThreadDumpFilter.target);
      state.list.push(newTargetThreadDumpFilter);
    })
    .addCase(ThreadDumpUpdateCategoryIntent, (state, { payload }) => {
      const oldTargetThreadDumpFilter = getTargetThreadDumpFilter(state, payload.target);
      const newTargetThreadDumpFilter = { ...oldTargetThreadDumpFilter };
      newTargetThreadDumpFilter.archived.selectedCategory = payload.category;
      state.list = state.list.filter((targetFilters) => targetFilters.target !== newTargetThreadDumpFilter.target);
      state.list.push(newTargetThreadDumpFilter);
    })
    .addCase(ThreadDumpAddTargetIntent, (state, { payload }) => {
      const targetThreadDumpFilter = getTargetThreadDumpFilter(state, payload.target);
      state.list = state.list.filter((targetFilters) => targetFilters.target !== payload.target);
      state.list.push(targetThreadDumpFilter);
    })
    .addCase(ThreadDumpDeleteTargetIntent, (state, { payload }) => {
      state.list = state.list.filter((targetFilters) => targetFilters.target !== payload.target);
    });
});

export default ThreadDumpFilterReducer;
