/*
 * Copyright The Cryostat Authors
 *
 * The Universal Permissive License (UPL), Version 1.0
 *
 * Subject to the condition set forth below, permission is hereby granted to any
 * person obtaining a copy of this software, associated documentation and/or data
 * (collectively the "Software"), free of charge and under any and all copyright
 * rights in the Software, and any and all patent rights owned or freely
 * licensable by each licensor hereunder covering either (i) the unmodified
 * Software as contributed to or provided by such licensor, or (ii) the Larger
 * Works (as defined below), to deal in both
 *
 * (a) the Software, and
 * (b) any piece of software and/or hardware listed in the lrgrwrks.txt file if
 * one is included with the Software (each a "Larger Work" to which the Software
 * is contributed by such licensors),
 *
 * without restriction, including without limitation the rights to copy, create
 * derivative works of, display, perform, and distribute the Software and make,
 * use, sell, offer for sale, import, export, have made, and have sold the
 * Software and the Larger Work(s), and to sublicense the foregoing rights on
 * either these or other terms.
 *
 * This license is subject to the following condition:
 * The above copyright notice and either this complete permission notice or at
 * a minimum a reference to the UPL must be included in all copies or
 * substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

import { AutomatedAnalysisFiltersCategories, emptyAutomatedAnalysisFilters } from '@app/Dashboard/AutomatedAnalysis/AutomatedAnalysisFilters';
  import { getFromLocalStorage } from '@app/utils/LocalStorage';
  import { createReducer } from '@reduxjs/toolkit';
  import { WritableDraft } from 'immer/dist/internal';
import { automatedAnalysisAddFilterIntent, automatedAnalysisAddTargetIntent, automatedAnalysisDeleteAllFiltersIntent, automatedAnalysisDeleteCategoryFiltersIntent, automatedAnalysisDeleteFilterIntent, automatedAnalysisDeleteTargetIntent, automatedAnalysisUpdateCategoryIntent } from './AutomatedAnalysisFilterActions';
import { UpdateFilterOptions } from './RecordingFilterReducer';

  export interface TargetAutomatedAnalysisFilters {
    target: string; // connectURL
    selectedCategory?: string;
    filters: AutomatedAnalysisFiltersCategories;
};
  
  export const createOrUpdateAutomatedAnalysisFilter = (
    old: AutomatedAnalysisFiltersCategories,
    { filterValue, filterKey, deleted = false, deleteOptions }: UpdateFilterOptions
  ): AutomatedAnalysisFiltersCategories => {
    let newFilterValues: any[];
    if (!old[filterKey]) {
      newFilterValues = [];
    } else {
      const oldFilterValues = old[filterKey] as any[];
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
  
  export const getAutomatedAnalysisFilter = (
    state: WritableDraft<{ list: TargetAutomatedAnalysisFilters[] }>,
    target: string
  ): TargetAutomatedAnalysisFilters => {
    const targetFilter = state.list.filter((targetFilters) => targetFilters.target === target);
    return targetFilter.length > 0 ? targetFilter[0] : createEmptyAutomatedAnalysisFilters(target);
  };
  
  export const createEmptyAutomatedAnalysisFilters = (target: string) =>
  ({
    target: target,
    selectedCategory: 'Name',
    filters: emptyAutomatedAnalysisFilters,
  } as TargetAutomatedAnalysisFilters);

export const deleteAllAutomatedAnalysisFilters = (automatedAnalysisFilter: TargetAutomatedAnalysisFilters) => {
  return {
    ...automatedAnalysisFilter,
      selectedCategory: automatedAnalysisFilter.selectedCategory,
      filters: emptyAutomatedAnalysisFilters,
  };
};
  
  // Initial states are loaded from local storage if there are any
  const initialState = {
    list: getFromLocalStorage('AUTOMATED_ANALYSIS_FILTERS', []) as TargetAutomatedAnalysisFilters[],
  };
  
  export const automatedAnalysisFilterReducer = createReducer(initialState, (builder) => {
    builder
      .addCase(automatedAnalysisAddFilterIntent, (state, { payload }) => {
        const oldAutomatedAnalysisFilter = getAutomatedAnalysisFilter(state, payload.target);
  
        let newAutomatedAnalysisFilter: TargetAutomatedAnalysisFilters = {
            ...oldAutomatedAnalysisFilter,
              selectedCategory: payload.category,
              filters: createOrUpdateAutomatedAnalysisFilter(oldAutomatedAnalysisFilter.filters, {
                filterKey: payload.category!,
                filterValue: payload.filter,
              }),
          };
        state.list = state.list.filter((targetFilters) => targetFilters.target !== newAutomatedAnalysisFilter.target);
        state.list.push(newAutomatedAnalysisFilter);
      })
      .addCase(automatedAnalysisDeleteFilterIntent, (state, { payload }) => {
        const oldAutomatedAnalysisFilter = getAutomatedAnalysisFilter(state, payload.target);
  
        let newAutomatedAnalysisFilter: TargetAutomatedAnalysisFilters = {
            ...oldAutomatedAnalysisFilter,
              selectedCategory: payload.category,
              filters: createOrUpdateAutomatedAnalysisFilter(oldAutomatedAnalysisFilter.filters, {
                filterKey: payload.category!,
                filterValue: payload.filter,
                deleted: true,
              }),
          };

        state.list = state.list.filter((targetFilters) => targetFilters.target !== newAutomatedAnalysisFilter.target);
        state.list.push(newAutomatedAnalysisFilter);
      })
      .addCase(automatedAnalysisDeleteCategoryFiltersIntent, (state, { payload }) => {
        const oldAutomatedAnalysisFilter = getAutomatedAnalysisFilter(state, payload.target);
  
        let newAutomatedAnalysisFilter: TargetAutomatedAnalysisFilters = {
            ...oldAutomatedAnalysisFilter,
              selectedCategory: payload.category,
              filters: createOrUpdateAutomatedAnalysisFilter(oldAutomatedAnalysisFilter.filters, {
                filterKey: payload.category!,
                deleted: true,
                deleteOptions: { all: true },
              }),
          };
        state.list = state.list.filter((targetFilters) => targetFilters.target !== newAutomatedAnalysisFilter.target);
        state.list.push(newAutomatedAnalysisFilter);
      })
      .addCase(automatedAnalysisDeleteAllFiltersIntent, (state, { payload }) => {
        const oldAutomatedAnalysisFilter = getAutomatedAnalysisFilter(state, payload.target);
        const newAutomatedAnalysisFilter = deleteAllAutomatedAnalysisFilters(oldAutomatedAnalysisFilter);
        state.list = state.list.filter((targetFilters) => targetFilters.target !== newAutomatedAnalysisFilter.target);
        state.list.push(newAutomatedAnalysisFilter);
      })
      .addCase(automatedAnalysisUpdateCategoryIntent, (state, { payload }) => {
        const oldAutomatedAnalysisFilter = getAutomatedAnalysisFilter(state, payload.target);
        const newAutomatedAnalysisFilter = { ...oldAutomatedAnalysisFilter };

        newAutomatedAnalysisFilter.selectedCategory = payload.category;
        
        state.list = state.list.filter((targetFilters) => targetFilters.target !== newAutomatedAnalysisFilter.target);
        state.list.push(newAutomatedAnalysisFilter);
      })
      .addCase(automatedAnalysisAddTargetIntent, (state, { payload }) => {
        const AutomatedAnalysisFilter = getAutomatedAnalysisFilter(state, payload.target);
        state.list = state.list.filter((targetFilters) => targetFilters.target !== payload.target);
        state.list.push(AutomatedAnalysisFilter);
      })
      .addCase(automatedAnalysisDeleteTargetIntent, (state, { payload }) => {
        state.list = state.list.filter((targetFilters) => targetFilters.target !== payload.target);
      });
  });
