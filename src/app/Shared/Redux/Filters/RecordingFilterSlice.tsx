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
/* eslint-disable  @typescript-eslint/no-non-null-assertion */
import { RecordingFiltersCategories } from '@app/Recordings/RecordingFilters';
import { createAction, createReducer } from '@reduxjs/toolkit';
import { WritableDraft } from 'immer/dist/internal';
import { getPersistedState } from '../utils';
import { UpdateFilterOptions } from './Common';

const _version = '1';

// Common action string format: "resource(s)/action"
export enum RecordingFilterAction {
  FILTER_ADD = 'recording-filter/add',
  FILTER_DELETE = 'recording-filter/delete',
  FILTER_DELETE_ALL = 'recording-filter/delete-all', // Delete all filters in all categories
  CATEGORY_FILTERS_DELETE = 'recording-filter/delete-category', // Delete all filters of the same category
  CATEGORY_UPDATE = 'recording-filter-category/update',
  TARGET_ADD = 'recording-filter-target/add',
  TARGET_DELETE = 'recording-filter-target/delete',
}

export const enumValues = new Set(Object.values(RecordingFilterAction));

export const emptyActiveRecordingFilters = {
  Name: [],
  Label: [],
  State: [],
  StartedBeforeDate: [],
  StartedAfterDate: [],
  DurationSeconds: [],
} as RecordingFiltersCategories;

export const allowedActiveRecordingFilters = Object.keys(emptyActiveRecordingFilters);

export const emptyArchivedRecordingFilters = {
  Name: [],
  Label: [],
} as RecordingFiltersCategories;

export const allowedArchivedRecordingFilters = Object.keys(emptyArchivedRecordingFilters);

export interface RecordingFilterActionPayload {
  target: string;
  category?: string;
  filter?: unknown;
  isArchived?: boolean;
}

export const recordingAddFilterIntent = createAction(
  RecordingFilterAction.FILTER_ADD,
  (target: string, category: string, filter: unknown, isArchived: boolean) => ({
    payload: {
      target: target,
      category: category,
      filter: filter,
      isArchived: isArchived,
    } as RecordingFilterActionPayload,
  })
);

export const recordingDeleteFilterIntent = createAction(
  RecordingFilterAction.FILTER_DELETE,
  (target: string, category: string, filter: unknown, isArchived: boolean) => ({
    payload: {
      target: target,
      category: category,
      filter: filter,
      isArchived: isArchived,
    } as RecordingFilterActionPayload,
  })
);

export const recordingDeleteCategoryFiltersIntent = createAction(
  RecordingFilterAction.CATEGORY_FILTERS_DELETE,
  (target: string, category: string, isArchived: boolean) => ({
    payload: {
      target: target,
      category: category,
      isArchived: isArchived,
    } as RecordingFilterActionPayload,
  })
);

export const recordingDeleteAllFiltersIntent = createAction(
  RecordingFilterAction.FILTER_DELETE_ALL,
  (target: string, isArchived: boolean) => ({
    payload: {
      target: target,
      isArchived: isArchived,
    } as RecordingFilterActionPayload,
  })
);

export const recordingUpdateCategoryIntent = createAction(
  RecordingFilterAction.CATEGORY_UPDATE,
  (target: string, category: string, isArchived: boolean) => ({
    payload: {
      target: target,
      category: category,
      isArchived: isArchived,
    } as RecordingFilterActionPayload,
  })
);

export const recordingAddTargetIntent = createAction(RecordingFilterAction.TARGET_ADD, (target: string) => ({
  payload: {
    target: target,
  } as RecordingFilterActionPayload,
}));

export const recordingDeleteTargetIntent = createAction(RecordingFilterAction.TARGET_DELETE, (target: string) => ({
  payload: {
    target: target,
  } as RecordingFilterActionPayload,
}));

export interface TargetRecordingFilters {
  target: string; // connectURL
  active: {
    // active recordings
    selectedCategory?: string;
    filters: RecordingFiltersCategories;
  };
  archived: {
    // archived recordings
    selectedCategory?: string;
    filters: RecordingFiltersCategories;
  };
}

export const createOrUpdateRecordingFilter = (
  old: RecordingFiltersCategories,
  { filterValue, filterKey, deleted = false, deleteOptions }: UpdateFilterOptions
): RecordingFiltersCategories => {
  let newFilterValues: unknown[];
  if (!old[filterKey]) {
    newFilterValues = [filterValue];
  } else {
    const oldFilterValues = old[filterKey] as unknown[];
    if (deleted) {
      if (deleteOptions && deleteOptions.all) {
        newFilterValues = [];
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

export const getTargetRecordingFilter = (
  state: WritableDraft<{ list: TargetRecordingFilters[] }>,
  target: string
): TargetRecordingFilters => {
  const targetFilter = state.list.filter((targetFilters) => targetFilters.target === target);
  return targetFilter.length > 0 ? targetFilter[0] : createEmptyTargetRecordingFilters(target);
};

export const createEmptyTargetRecordingFilters = (target: string) =>
  ({
    target: target,
    active: {
      selectedCategory: 'Name',
      filters: emptyActiveRecordingFilters,
    },
    archived: {
      selectedCategory: 'Name',
      filters: emptyArchivedRecordingFilters,
    },
  } as TargetRecordingFilters);

export const deleteAllTargetRecordingFilters = (targetRecordingFilter: TargetRecordingFilters, isArchived: boolean) => {
  if (isArchived) {
    return {
      ...targetRecordingFilter,
      archived: {
        selectedCategory: targetRecordingFilter.archived.selectedCategory,
        filters: emptyArchivedRecordingFilters,
      },
    };
  }
  return {
    ...targetRecordingFilter,
    active: {
      selectedCategory: targetRecordingFilter.active.selectedCategory,
      filters: emptyActiveRecordingFilters,
    },
  };
};

const INITIAL_STATE = getPersistedState('TARGET_RECORDING_FILTERS', _version, {
  list: [] as TargetRecordingFilters[],
});

export const recordingFilterReducer = createReducer(INITIAL_STATE, (builder) => {
  builder
    .addCase(recordingAddFilterIntent, (state, { payload }) => {
      const oldTargetRecordingFilter = getTargetRecordingFilter(state, payload.target);

      let newTargetRecordingFilter: TargetRecordingFilters;
      if (payload.isArchived) {
        newTargetRecordingFilter = {
          ...oldTargetRecordingFilter,
          archived: {
            selectedCategory: payload.category,
            filters: createOrUpdateRecordingFilter(oldTargetRecordingFilter.archived.filters, {
              filterKey: payload.category!,
              filterValue: payload.filter,
            }),
          },
        };
      } else {
        newTargetRecordingFilter = {
          ...oldTargetRecordingFilter,
          active: {
            selectedCategory: payload.category,
            filters: createOrUpdateRecordingFilter(oldTargetRecordingFilter.active.filters, {
              filterKey: payload.category!,
              filterValue: payload.filter,
            }),
          },
        };
      }

      state.list = state.list.filter((targetFilters) => targetFilters.target !== newTargetRecordingFilter.target);
      state.list.push(newTargetRecordingFilter);
    })
    .addCase(recordingDeleteFilterIntent, (state, { payload }) => {
      const oldTargetRecordingFilter = getTargetRecordingFilter(state, payload.target);

      let newTargetRecordingFilter: TargetRecordingFilters;
      if (payload.isArchived) {
        newTargetRecordingFilter = {
          ...oldTargetRecordingFilter,
          archived: {
            selectedCategory: payload.category,
            filters: createOrUpdateRecordingFilter(oldTargetRecordingFilter.archived.filters, {
              filterKey: payload.category!,
              filterValue: payload.filter,
              deleted: true,
            }),
          },
        };
      } else {
        newTargetRecordingFilter = {
          ...oldTargetRecordingFilter,
          active: {
            selectedCategory: payload.category,
            filters: createOrUpdateRecordingFilter(oldTargetRecordingFilter.active.filters, {
              filterKey: payload.category!,
              filterValue: payload.filter,
              deleted: true,
            }),
          },
        };
      }

      state.list = state.list.filter((targetFilters) => targetFilters.target !== newTargetRecordingFilter.target);
      state.list.push(newTargetRecordingFilter);
    })
    .addCase(recordingDeleteCategoryFiltersIntent, (state, { payload }) => {
      const oldTargetRecordingFilter = getTargetRecordingFilter(state, payload.target);

      let newTargetRecordingFilter: TargetRecordingFilters;
      if (payload.isArchived) {
        newTargetRecordingFilter = {
          ...oldTargetRecordingFilter,
          archived: {
            selectedCategory: payload.category,
            filters: createOrUpdateRecordingFilter(oldTargetRecordingFilter.archived.filters, {
              filterKey: payload.category!,
              deleted: true,
              deleteOptions: { all: true },
            }),
          },
        };
      } else {
        newTargetRecordingFilter = {
          ...oldTargetRecordingFilter,
          active: {
            selectedCategory: payload.category,
            filters: createOrUpdateRecordingFilter(oldTargetRecordingFilter.active.filters, {
              filterKey: payload.category!,
              deleted: true,
              deleteOptions: { all: true },
            }),
          },
        };
      }

      state.list = state.list.filter((targetFilters) => targetFilters.target !== newTargetRecordingFilter.target);
      state.list.push(newTargetRecordingFilter);
    })
    .addCase(recordingDeleteAllFiltersIntent, (state, { payload }) => {
      const oldTargetRecordingFilter = getTargetRecordingFilter(state, payload.target);
      const newTargetRecordingFilter = deleteAllTargetRecordingFilters(oldTargetRecordingFilter, payload.isArchived!);
      state.list = state.list.filter((targetFilters) => targetFilters.target !== newTargetRecordingFilter.target);
      state.list.push(newTargetRecordingFilter);
    })
    .addCase(recordingUpdateCategoryIntent, (state, { payload }) => {
      const oldTargetRecordingFilter = getTargetRecordingFilter(state, payload.target);
      const newTargetRecordingFilter = { ...oldTargetRecordingFilter };
      if (payload.isArchived) {
        newTargetRecordingFilter.archived.selectedCategory = payload.category;
      } else {
        newTargetRecordingFilter.active.selectedCategory = payload.category;
      }
      state.list = state.list.filter((targetFilters) => targetFilters.target !== newTargetRecordingFilter.target);
      state.list.push(newTargetRecordingFilter);
    })
    .addCase(recordingAddTargetIntent, (state, { payload }) => {
      const targetRecordingFilter = getTargetRecordingFilter(state, payload.target);
      state.list = state.list.filter((targetFilters) => targetFilters.target !== payload.target);
      state.list.push(targetRecordingFilter);
    })
    .addCase(recordingDeleteTargetIntent, (state, { payload }) => {
      state.list = state.list.filter((targetFilters) => targetFilters.target !== payload.target);
    });
});

export default recordingFilterReducer;
