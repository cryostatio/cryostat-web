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

import { HeapDumpFiltersCategories } from '@app/Diagnostics/Filters/HeapDumpFilters';
import { createAction, createReducer } from '@reduxjs/toolkit';
import { WritableDraft } from 'immer/dist/internal';
import { getPersistedState } from '../utils';
import { UpdateFilterOptions } from './Common';

const _version = '2';

// Common action string format: "resource(s)/action"
export enum HeapDumpFilterAction {
  FILTER_ADD = 'heapdump-filter/add',
  FILTER_DELETE = 'heapdump-filter/delete',
  FILTER_DELETE_ALL = 'heapdump-filter/delete-all', // Delete all filters in all categories
  CATEGORY_FILTERS_DELETE = 'heapdump-filter/delete-category', // Delete all filters of the same category
  CATEGORY_UPDATE = 'heapdump-filter-category/update',
  TARGET_ADD = 'heapdump-filter-target/add',
  TARGET_DELETE = 'heapdump-filter-target/delete',
}

export const enumValues = new Set(Object.values(HeapDumpFilterAction));

export const emptyArchivedHeapDumpFilters = {
  Name: [],
  Label: [],
} as HeapDumpFiltersCategories;

export const allowedHeapDumpFilters = Object.keys(emptyArchivedHeapDumpFilters);

export interface HeapDumpFilterActionPayload {
  target: string;
  category: string;
  filter?: unknown;
  filterIdx?: number;
}

export const HeapDumpAddFilterIntent = createAction(
  HeapDumpFilterAction.FILTER_ADD,
  (target: string, category: string, filter: unknown) => ({
    payload: {
      target: target,
      category: category,
      filter: filter,
    } as HeapDumpFilterActionPayload,
  }),
);

export const HeapDumpDeleteFilterIntent = createAction(
  HeapDumpFilterAction.FILTER_DELETE,
  (target: string, category: string, filter: unknown, filterIdx?: number) => ({
    payload: {
      target: target,
      category: category,
      filter: filter,
      filterIdx: filterIdx,
    } as HeapDumpFilterActionPayload,
  }),
);

export const HeapDumpDeleteCategoryFiltersIntent = createAction(
  HeapDumpFilterAction.CATEGORY_FILTERS_DELETE,
  (target: string, category: string) => ({
    payload: {
      target: target,
      category: category,
    } as HeapDumpFilterActionPayload,
  }),
);

export const HeapDumpDeleteAllFiltersIntent = createAction(
  HeapDumpFilterAction.FILTER_DELETE_ALL,
  (target: string) => ({
    payload: {
      target: target,
    } as Pick<HeapDumpFilterActionPayload, 'target'>,
  }),
);

export const HeapDumpUpdateCategoryIntent = createAction(
  HeapDumpFilterAction.CATEGORY_UPDATE,
  (target: string, category: string) => ({
    payload: {
      target: target,
      category: category,
    } as HeapDumpFilterActionPayload,
  }),
);

export const HeapDumpAddTargetIntent = createAction(HeapDumpFilterAction.TARGET_ADD, (target: string) => ({
  payload: {
    target: target,
  } as Pick<HeapDumpFilterActionPayload, 'target'>,
}));

export const HeapDumpDeleteTargetIntent = createAction(HeapDumpFilterAction.TARGET_DELETE, (target: string) => ({
  payload: {
    target: target,
  } as Pick<HeapDumpFilterActionPayload, 'target'>,
}));

export interface TargetHeapDumpFilters {
  target: string; // connectURL
  archived: {
    // archived HeapDumps
    selectedCategory: string;
    filters: HeapDumpFiltersCategories;
  };
}

export const createOrUpdateHeapDumpFilter = (
  old: HeapDumpFiltersCategories,
  { filterValue, filterKey, filterValueIndex, deleted = false, deleteOptions }: UpdateFilterOptions,
): HeapDumpFiltersCategories => {
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

export const getTargetHeapDumpFilter = (
  state: WritableDraft<{ list: TargetHeapDumpFilters[] }>,
  target: string,
): TargetHeapDumpFilters => {
  const targetFilter = state.list.filter((targetFilters) => targetFilters.target === target);
  return targetFilter.length > 0 ? targetFilter[0] : createEmptyTargetHeapDumpFilters(target);
};

export const createEmptyTargetHeapDumpFilters = (target: string) =>
  ({
    target: target,
    archived: {
      selectedCategory: 'Name',
      filters: emptyArchivedHeapDumpFilters,
    },
  }) as TargetHeapDumpFilters;

export const deleteAllTargetHeapDumpFilters = (targetHeapDumpFilter: TargetHeapDumpFilters) => {
  return {
    ...targetHeapDumpFilter,
    archived: {
      selectedCategory: targetHeapDumpFilter.archived.selectedCategory,
      filters: emptyArchivedHeapDumpFilters,
    },
  };
};

export interface HeapDumpFilters {
  list: TargetHeapDumpFilters[];
  readonly _version: string;
}

export const defaultHeapDumpFilters: HeapDumpFilters = {
  list: [] as TargetHeapDumpFilters[],
  _version: _version,
};

const INITIAL_STATE = getPersistedState('TARGET_HEAP_DUMP_FILTERS', _version, defaultHeapDumpFilters);

export const HeapDumpFilterReducer = createReducer(INITIAL_STATE, (builder) => {
  builder
    .addCase(HeapDumpAddFilterIntent, (state, { payload }) => {
      const oldTargetHeapDumpFilter = getTargetHeapDumpFilter(state, payload.target);

      let newTargetHeapDumpFilter: TargetHeapDumpFilters;

      newTargetHeapDumpFilter = {
        ...oldTargetHeapDumpFilter,
        archived: {
          selectedCategory: payload.category,
          filters: createOrUpdateHeapDumpFilter(oldTargetHeapDumpFilter.archived.filters, {
            filterKey: payload.category!,
            filterValue: payload.filter,
          }),
        },
      };

      state.list = state.list.filter((targetFilters) => targetFilters.target !== newTargetHeapDumpFilter.target);
      state.list.push(newTargetHeapDumpFilter);
    })
    .addCase(HeapDumpDeleteFilterIntent, (state, { payload }) => {
      const oldTargetHeapDumpFilter = getTargetHeapDumpFilter(state, payload.target);

      let newTargetHeapDumpFilter: TargetHeapDumpFilters;

      newTargetHeapDumpFilter = {
        ...oldTargetHeapDumpFilter,
        archived: {
          selectedCategory: payload.category,
          filters: createOrUpdateHeapDumpFilter(oldTargetHeapDumpFilter.archived.filters, {
            filterKey: payload.category!,
            filterValue: payload.filter,
            filterValueIndex: payload.filterIdx,
            deleted: true,
          }),
        },
      };

      state.list = state.list.filter((targetFilters) => targetFilters.target !== newTargetHeapDumpFilter.target);
      state.list.push(newTargetHeapDumpFilter);
    })
    .addCase(HeapDumpDeleteCategoryFiltersIntent, (state, { payload }) => {
      const oldTargetHeapDumpFilter = getTargetHeapDumpFilter(state, payload.target);

      let newTargetHeapDumpFilter: TargetHeapDumpFilters;
      newTargetHeapDumpFilter = {
        ...oldTargetHeapDumpFilter,
        archived: {
          selectedCategory: payload.category,
          filters: createOrUpdateHeapDumpFilter(oldTargetHeapDumpFilter.archived.filters, {
            filterKey: payload.category!,
            deleted: true,
            deleteOptions: { all: true },
          }),
        },
      };

      state.list = state.list.filter((targetFilters) => targetFilters.target !== newTargetHeapDumpFilter.target);
      state.list.push(newTargetHeapDumpFilter);
    })
    .addCase(HeapDumpDeleteAllFiltersIntent, (state, { payload }) => {
      const oldTargetHeapDumpFilter = getTargetHeapDumpFilter(state, payload.target);
      const newTargetHeapDumpFilter = deleteAllTargetHeapDumpFilters(oldTargetHeapDumpFilter);
      state.list = state.list.filter((targetFilters) => targetFilters.target !== newTargetHeapDumpFilter.target);
      state.list.push(newTargetHeapDumpFilter);
    })
    .addCase(HeapDumpUpdateCategoryIntent, (state, { payload }) => {
      const oldTargetHeapDumpFilter = getTargetHeapDumpFilter(state, payload.target);
      const newTargetHeapDumpFilter = { ...oldTargetHeapDumpFilter };
      newTargetHeapDumpFilter.archived.selectedCategory = payload.category;
      state.list = state.list.filter((targetFilters) => targetFilters.target !== newTargetHeapDumpFilter.target);
      state.list.push(newTargetHeapDumpFilter);
    })
    .addCase(HeapDumpAddTargetIntent, (state, { payload }) => {
      const targetHeapDumpFilter = getTargetHeapDumpFilter(state, payload.target);
      state.list = state.list.filter((targetFilters) => targetFilters.target !== payload.target);
      state.list.push(targetHeapDumpFilter);
    })
    .addCase(HeapDumpDeleteTargetIntent, (state, { payload }) => {
      state.list = state.list.filter((targetFilters) => targetFilters.target !== payload.target);
    });
});

export default HeapDumpFilterReducer;
