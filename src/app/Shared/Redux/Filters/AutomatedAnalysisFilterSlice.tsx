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
/* eslint-disable @typescript-eslint/no-non-null-assertion */
import {
  AutomatedAnalysisFiltersCategories,
  AutomatedAnalysisGlobalFiltersCategories,
} from '@app/Dashboard/AutomatedAnalysis/AutomatedAnalysisFilters';
import { createAction, createReducer } from '@reduxjs/toolkit';
import { WritableDraft } from 'immer/dist/internal';
import { getPersistedState } from '../utils';
import { UpdateFilterOptions } from './Common';

const _version = '2';

// Common action string format: "resource(s)/action"
export enum AutomatedAnalysisFilterAction {
  GLOBAL_FILTER_ADD = 'automated-analysis-global-filter/add',
  FILTER_ADD = 'automated-analysis-filter/add',
  FILTER_DELETE = 'automated-analysis-filter/delete',
  FILTER_DELETE_ALL = 'automated-analysis-filter/delete_all', // Delete all filters in all categories
  CATEGORY_FILTERS_DELETE = 'automated-analysis-filters/delete', // Delete all filters of the same category
  CATEGORY_UPDATE = 'automated-analysis-category/update',
  TARGET_ADD = 'automated-analysis-target/add',
  TARGET_DELETE = 'automated-analysis-target/delete',
}

export const enumValues = new Set(Object.values(AutomatedAnalysisFilterAction));

export const emptyAutomatedAnalysisFilters = {
  Name: [],
  Topic: [],
} as AutomatedAnalysisFiltersCategories;

export const allowedAutomatedAnalysisFilters = Object.keys(emptyAutomatedAnalysisFilters);

export interface AutomatedAnalysisFilterActionPayload {
  target: string;
  category: string;
  filter?: unknown;
}

export const automatedAnalysisAddGlobalFilterIntent = createAction(
  AutomatedAnalysisFilterAction.GLOBAL_FILTER_ADD,
  (category: string, filter: unknown) => ({
    payload: {
      category: category,
      filter: filter,
    },
  }),
);

export const automatedAnalysisAddFilterIntent = createAction(
  AutomatedAnalysisFilterAction.FILTER_ADD,
  (target: string, category: string, filter: unknown) => ({
    payload: {
      target: target,
      category: category,
      filter: filter,
    } as AutomatedAnalysisFilterActionPayload,
  }),
);

export const automatedAnalysisDeleteFilterIntent = createAction(
  AutomatedAnalysisFilterAction.FILTER_DELETE,
  (target: string, category: string, filter: unknown) => ({
    payload: {
      target: target,
      category: category,
      filter: filter,
    } as AutomatedAnalysisFilterActionPayload,
  }),
);

export const automatedAnalysisDeleteCategoryFiltersIntent = createAction(
  AutomatedAnalysisFilterAction.CATEGORY_FILTERS_DELETE,
  (target: string, category: string) => ({
    payload: {
      target: target,
      category: category,
    } as AutomatedAnalysisFilterActionPayload,
  }),
);

export const automatedAnalysisDeleteAllFiltersIntent = createAction(
  AutomatedAnalysisFilterAction.FILTER_DELETE_ALL,
  (target: string) => ({
    payload: {
      target: target,
    } as Pick<AutomatedAnalysisFilterActionPayload, 'target'>,
  }),
);

export const automatedAnalysisUpdateCategoryIntent = createAction(
  AutomatedAnalysisFilterAction.CATEGORY_UPDATE,
  (target: string, category: string) => ({
    payload: {
      target: target,
      category: category,
    } as Pick<AutomatedAnalysisFilterActionPayload, 'target' | 'category'>,
  }),
);

export const automatedAnalysisAddTargetIntent = createAction(
  AutomatedAnalysisFilterAction.TARGET_ADD,
  (target: string) => ({
    payload: {
      target: target,
    } as Pick<AutomatedAnalysisFilterActionPayload, 'target'>,
  }),
);

export const automatedAnalysisDeleteTargetIntent = createAction(
  AutomatedAnalysisFilterAction.TARGET_DELETE,
  (target: string) => ({
    payload: {
      target: target,
    } as Pick<AutomatedAnalysisFilterActionPayload, 'target'>,
  }),
);

export interface AutomatedAnalysisFilters {
  targetFilters: TargetAutomatedAnalysisFilters[];
  globalFilters: TargetAutomatedAnalysisGlobalFilters;
  readonly _version: string;
}
export interface TargetAutomatedAnalysisGlobalFilters {
  filters: AutomatedAnalysisGlobalFiltersCategories;
}
export interface TargetAutomatedAnalysisFilters {
  target: string; // connectURL
  selectedCategory: string;
  filters: AutomatedAnalysisFiltersCategories;
}

export const createOrUpdateAutomatedAnalysisGlobalFilter = (
  old: AutomatedAnalysisGlobalFiltersCategories,
  { filterValue, filterKey },
): AutomatedAnalysisGlobalFiltersCategories => {
  const newFilters = { ...old };
  newFilters[filterKey] = filterValue;
  return newFilters;
};

export const createOrUpdateAutomatedAnalysisFilter = (
  old: AutomatedAnalysisFiltersCategories,
  { filterValue, filterKey, deleted = false, deleteOptions }: UpdateFilterOptions,
): AutomatedAnalysisFiltersCategories => {
  let newFilterValues: unknown[];

  if (!old[filterKey]) {
    newFilterValues = [filterValue];
  } else {
    const oldFilterValues = old[filterKey];
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

export const getAutomatedAnalysisGlobalFilter = (
  state: WritableDraft<{ globalFilters: TargetAutomatedAnalysisGlobalFilters }>,
) => {
  return state.globalFilters;
};

export const getAutomatedAnalysisFilter = (
  state: WritableDraft<{ targetFilters: TargetAutomatedAnalysisFilters[] }>,
  target: string,
): TargetAutomatedAnalysisFilters => {
  const targetFilter = state.targetFilters.filter((targetFilters) => targetFilters.target === target);
  return targetFilter.length > 0 ? targetFilter[0] : createEmptyAutomatedAnalysisFilters(target);
};

export const createEmptyAutomatedAnalysisFilters = (target: string) =>
  ({
    target: target,
    selectedCategory: 'Name',
    filters: emptyAutomatedAnalysisFilters,
  }) as TargetAutomatedAnalysisFilters;

export const deleteAllAutomatedAnalysisFilters = (automatedAnalysisFilter: TargetAutomatedAnalysisFilters) => {
  return {
    ...automatedAnalysisFilter,
    selectedCategory: automatedAnalysisFilter.selectedCategory,
    filters: emptyAutomatedAnalysisFilters,
  };
};

export const defaultAutomatedAnalysisFilters: AutomatedAnalysisFilters = {
  targetFilters: [],
  globalFilters: { filters: { Score: 0 } },
  _version: _version,
};

const INITIAL_STATE = getPersistedState('AUTOMATED_ANALYSIS_FILTERS', _version, defaultAutomatedAnalysisFilters);

export const automatedAnalysisFilterReducer = createReducer(INITIAL_STATE, (builder) => {
  builder
    .addCase(automatedAnalysisAddGlobalFilterIntent, (state, { payload }) => {
      const oldAutomatedAnalysisGlobalFilter = getAutomatedAnalysisGlobalFilter(state);
      state.globalFilters = {
        filters: createOrUpdateAutomatedAnalysisGlobalFilter(oldAutomatedAnalysisGlobalFilter.filters, {
          filterKey: payload.category,
          filterValue: payload.filter,
        }),
      };
    })
    .addCase(automatedAnalysisAddFilterIntent, (state, { payload }) => {
      const oldAutomatedAnalysisFilter = getAutomatedAnalysisFilter(state, payload.target);
      const newAutomatedAnalysisFilter: TargetAutomatedAnalysisFilters = {
        ...oldAutomatedAnalysisFilter,
        selectedCategory: payload.category,
        filters: createOrUpdateAutomatedAnalysisFilter(oldAutomatedAnalysisFilter.filters, {
          filterKey: payload.category!,
          filterValue: payload.filter,
        }),
      };
      state.targetFilters = state.targetFilters.filter(
        (targetFilters) => targetFilters.target !== newAutomatedAnalysisFilter.target,
      );
      state.targetFilters.push(newAutomatedAnalysisFilter);
    })
    .addCase(automatedAnalysisDeleteFilterIntent, (state, { payload }) => {
      const oldAutomatedAnalysisFilter = getAutomatedAnalysisFilter(state, payload.target);

      const newAutomatedAnalysisFilter: TargetAutomatedAnalysisFilters = {
        ...oldAutomatedAnalysisFilter,
        selectedCategory: payload.category,
        filters: createOrUpdateAutomatedAnalysisFilter(oldAutomatedAnalysisFilter.filters, {
          filterKey: payload.category!,
          filterValue: payload.filter,
          deleted: true,
        }),
      };

      state.targetFilters = state.targetFilters.filter(
        (targetFilters) => targetFilters.target !== newAutomatedAnalysisFilter.target,
      );
      state.targetFilters.push(newAutomatedAnalysisFilter);
    })
    .addCase(automatedAnalysisDeleteCategoryFiltersIntent, (state, { payload }) => {
      const oldAutomatedAnalysisFilter = getAutomatedAnalysisFilter(state, payload.target);

      const newAutomatedAnalysisFilter: TargetAutomatedAnalysisFilters = {
        ...oldAutomatedAnalysisFilter,
        selectedCategory: payload.category,
        filters: createOrUpdateAutomatedAnalysisFilter(oldAutomatedAnalysisFilter.filters, {
          filterKey: payload.category!,
          deleted: true,
          deleteOptions: { all: true },
        }),
      };
      state.targetFilters = state.targetFilters.filter(
        (targetFilters) => targetFilters.target !== newAutomatedAnalysisFilter.target,
      );
      state.targetFilters.push(newAutomatedAnalysisFilter);
    })
    .addCase(automatedAnalysisDeleteAllFiltersIntent, (state, { payload }) => {
      const oldAutomatedAnalysisFilter = getAutomatedAnalysisFilter(state, payload.target);
      const newAutomatedAnalysisFilter = deleteAllAutomatedAnalysisFilters(oldAutomatedAnalysisFilter);
      state.targetFilters = state.targetFilters.filter(
        (targetFilters) => targetFilters.target !== newAutomatedAnalysisFilter.target,
      );
      state.targetFilters.push(newAutomatedAnalysisFilter);
    })
    .addCase(automatedAnalysisUpdateCategoryIntent, (state, { payload }) => {
      const oldAutomatedAnalysisFilter = getAutomatedAnalysisFilter(state, payload.target);
      const newAutomatedAnalysisFilter = { ...oldAutomatedAnalysisFilter };

      newAutomatedAnalysisFilter.selectedCategory = payload.category;

      state.targetFilters = state.targetFilters.filter(
        (targetFilters) => targetFilters.target !== newAutomatedAnalysisFilter.target,
      );
      state.targetFilters.push(newAutomatedAnalysisFilter);
    })
    .addCase(automatedAnalysisAddTargetIntent, (state, { payload }) => {
      const AutomatedAnalysisFilter = getAutomatedAnalysisFilter(state, payload.target);
      state.targetFilters = state.targetFilters.filter((targetFilters) => targetFilters.target !== payload.target);
      state.targetFilters.push(AutomatedAnalysisFilter);
    })
    .addCase(automatedAnalysisDeleteTargetIntent, (state, { payload }) => {
      state.targetFilters = state.targetFilters.filter((targetFilters) => targetFilters.target !== payload.target);
    });
});

export default automatedAnalysisFilterReducer;
