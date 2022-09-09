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

import { emptyActiveRecordingFilters, emptyArchivedRecordingFilters, RecordingFiltersCategories } from "@app/Recordings/RecordingFilters"
import { createReducer } from "@reduxjs/toolkit"
import { WritableDraft } from "immer/dist/internal";
import { addFilterIntent, addTargetIntent, deleteAllFiltersIntent, deleteCategoryFiltersIntent, deleteFilterIntent,  deleteTargetIntent, updateCategoryIntent, } from './RecordingFilterActions';

export interface TargetRecordingFilters {
  target: string, // connectURL
  active: { // active recordings
    selectedCategory?: string,
    filters: RecordingFiltersCategories,
  },
  archived:  { // archived recordings
    selectedCategory?: string,
    filters: RecordingFiltersCategories,
  }
}

export interface UpdateFilterOptions {
  filterKey: string;
  filterValue?: any;
  deleted?: boolean;
  deleteOptions?: {
    all: boolean
  }
}

export const createOrUpdateRecordingFilter = (
  old: RecordingFiltersCategories, 
  {filterValue, filterKey, deleted = false, deleteOptions}: UpdateFilterOptions): RecordingFiltersCategories => {
  
  let newfilterValues: any[];
  if (!old[filterKey]) {
    newfilterValues = [];
  } else {
    const oldFilterValues = old[filterKey] as any[];
    if (deleted) {
      if (deleteOptions && deleteOptions.all) {
        newfilterValues = [];
      } else {
        newfilterValues = oldFilterValues.filter((val) => val !== filterValue);
      }
    } else {
      newfilterValues = Array.from(new Set([...oldFilterValues, filterValue]));
    }
  }

  const newFilters = {...old};
  newFilters[filterKey] = newfilterValues;
  return newFilters;
}

export const getTargetRecordingFilter = (state: WritableDraft<{ list: TargetRecordingFilters[]; }>, target: string): TargetRecordingFilters => {
    const targetFilter = state.list.filter((targetFilters) => targetFilters.target === target);
    return targetFilter.length > 0? targetFilter[0]: createEmptyTargetRecordingFilters(target);
};

export const createEmptyTargetRecordingFilters = (target: string) => (
  {
    target: target,
    active: {
      selectedCategory: "Name",
      filters: emptyActiveRecordingFilters,
    },
    archived:  {
      selectedCategory: "Name",
      filters: emptyArchivedRecordingFilters,
    }
  } as TargetRecordingFilters
);

// Initial states are loaded from local storage if there are any (TODO)
const initialState = { list: [] as TargetRecordingFilters[] };

export const recordingFilterReducer = createReducer(initialState, (builder) => {
  builder
        .addCase(addFilterIntent, (state, {payload}) => {
          const oldTargetRecordingFilter = getTargetRecordingFilter(state, payload.target);

          let newTargetRecordingFilter: TargetRecordingFilters;
          if (payload.isArchived) {
            newTargetRecordingFilter = {
              ...oldTargetRecordingFilter, 
              archived: {
                selectedCategory: payload.category,
                filters: createOrUpdateRecordingFilter(oldTargetRecordingFilter.archived.filters, {
                  filterKey: payload.category!,
                  filterValue: payload.filter
                })
              }}
          } else {
            newTargetRecordingFilter = {
              ...oldTargetRecordingFilter, 
              active: {
                selectedCategory: payload.category,
                filters: createOrUpdateRecordingFilter(oldTargetRecordingFilter.active.filters, {
                  filterKey: payload.category!,
                  filterValue: payload.filter
                })
              }}
          }

          state.list = state.list.filter((targetFilters) => targetFilters.target !== newTargetRecordingFilter.target);
          state.list.push(newTargetRecordingFilter);
        })
        .addCase(deleteFilterIntent, (state, {payload}) => {
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
                  deleted: true
                })
              }}
          } else {
            newTargetRecordingFilter = {
              ...oldTargetRecordingFilter, 
              active: {
                selectedCategory: payload.category,
                filters: createOrUpdateRecordingFilter(oldTargetRecordingFilter.active.filters, {
                  filterKey: payload.category!,
                  filterValue: payload.filter,
                  deleted: true
                })
              }}
          }

          state.list = state.list.filter((targetFilters) => targetFilters.target !== newTargetRecordingFilter.target);
          state.list.push(newTargetRecordingFilter);
        })
        .addCase(deleteCategoryFiltersIntent, (state, {payload}) => {
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
                  deleteOptions: {all: true}
                })
              }}
          } else {
            newTargetRecordingFilter = {
              ...oldTargetRecordingFilter, 
              active: {
                selectedCategory: payload.category,
                filters: createOrUpdateRecordingFilter(oldTargetRecordingFilter.active.filters, {
                  filterKey: payload.category!,
                  deleted: true,
                  deleteOptions: {all: true}
                })
              }}
          }

          state.list = state.list.filter((targetFilters) => targetFilters.target !== newTargetRecordingFilter.target);
          state.list.push(newTargetRecordingFilter);
        })
        .addCase(deleteAllFiltersIntent, (state, {payload}) => {
          const newTargetRecordingFilter = createEmptyTargetRecordingFilters(payload.target);
          state.list = state.list.filter((targetFilters) => targetFilters.target !== newTargetRecordingFilter.target);
          state.list.push(newTargetRecordingFilter);
        })
        .addCase(updateCategoryIntent, (state, {payload}) => {
          const oldTargetRecordingFilter = getTargetRecordingFilter(state, payload.target);
          const newTargetRecordingFilter = {...oldTargetRecordingFilter};
          if (payload.isArchived) {
            newTargetRecordingFilter.archived.selectedCategory = payload.category;
          } else {
            newTargetRecordingFilter.active.selectedCategory = payload.category;
          }
          state.list = state.list.filter((targetFilters) => targetFilters.target !== newTargetRecordingFilter.target);
          state.list.push(newTargetRecordingFilter);
        })
        .addCase(addTargetIntent, (state, {payload}) => {
          const targetRecordingFilter = getTargetRecordingFilter(state, payload.target);
          state.list = state.list.filter((targetFilters) => targetFilters.target !== payload.target);
          state.list.push(targetRecordingFilter);
        })
        .addCase(deleteTargetIntent, (state, {payload}) => {
          state.list = state.list.filter((targetFilters) => targetFilters.target !== payload.target);
        })
});

