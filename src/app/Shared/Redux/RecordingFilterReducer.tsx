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

import { filterRecordings, RecordingFiltersCategories } from "@app/Recordings/RecordingFilters"
import { createReducer } from "@reduxjs/toolkit"
import { WritableDraft } from "immer/dist/internal";
import { ArchivedRecording } from "../Services/Api.service";
import { getFromLocalStorage, LocalStorageKey } from "../Storage/LocalStorage";
import { addFilterIntent, deleteFilterIntent, deleteFiltersIntent, updateCategoryIntent, updateRecordingListIntent } from './RecordingFilterActions'

export interface RecordingFilterStates {
  selectedCategory: string,
  filters: RecordingFiltersCategories,
  recordings: ArchivedRecording[]
}

const defaultActiveRecordingFilters = {
  selectedCategory: "Name",
  filters: {
    Name: [],
    Labels: [],
    State: [],
    StartedBeforeDate: [],
    StartedAfterDate: [],
    DurationSeconds: [],
  }
};

const defaultArchivedRecordingFilters= {
  selectedCategory: "Name",
  filters: {
    Name: [],
    Labels: [],
  }
};


export interface UpdateFilterOptions {
  filterKey: string;
  filterValue?: any;
  deleted?: boolean;
  deleteOptions?: FilterDeleteOptions
}

export interface FilterDeleteOptions {
  all: boolean
}

export const updateFilters = (old: RecordingFiltersCategories, {filterValue, filterKey, deleted = false, deleteOptions}: UpdateFilterOptions): RecordingFiltersCategories => {
  if (!old[filterKey]) return old;
  const oldFilterValues = old[filterKey] as any[];
  let newfilterValues: any[];
  if (deleted) {
    if (deleteOptions && (deleteOptions as FilterDeleteOptions).all) {
      newfilterValues = [];
    } else {
      newfilterValues = oldFilterValues.filter((val) => val !== filterValue);
    }
  } else {
    newfilterValues = Array.from(new Set([...oldFilterValues, filterValue]));
  }

  const newFilters = {...old};
  newFilters[filterKey] = newfilterValues;
  return newFilters;
}

export const getRecordingFilterStates = (
  state: WritableDraft<{ activeRecordingFilterStates: RecordingFilterStates; archivedRecordingFilterStates: RecordingFilterStates; }>, 
  isArchived: boolean): RecordingFilterStates => (isArchived? state.archivedRecordingFilterStates: state.activeRecordingFilterStates);

export const updateRecordingFilterStates = (
  state: WritableDraft<{ activeRecordingFilterStates: RecordingFilterStates; archivedRecordingFilterStates: RecordingFilterStates; }>, 
  isArchived: boolean, 
  newFilterStates: RecordingFilterStates) => {
  if (isArchived) {
    state.archivedRecordingFilterStates = newFilterStates
  } else {
    state.activeRecordingFilterStates = newFilterStates;
  }   
}

/**
 * Note: Only filters are saved to local storage. Recordings are later fetched from api server.
 */
 export const getSavedRecordingFilterStates = ({isArchived}): RecordingFilterStates => {
  if (isArchived) {
    return {...getFromLocalStorage("ARCHIVED_RECORDING_FILTER", defaultArchivedRecordingFilters), recordings: []}
  } else {
    return {...getFromLocalStorage("ACTIVE_RECORDING_FILTER", defaultActiveRecordingFilters), recordings: []}
  }
}

/**
 * Initial states are loaded from local storage if there are any.
 */
const initialState = {
  activeRecordingFilterStates: getSavedRecordingFilterStates({isArchived: false}),
  archivedRecordingFilterStates: getSavedRecordingFilterStates({isArchived: false}),
}

export const recordingFilterReducer = createReducer(initialState, (builder) => {
  builder
        .addCase(addFilterIntent, (state, {payload}) => {
          const oldFilterStates = getRecordingFilterStates(state, payload.isArchived);

          const newFilters = updateFilters(oldFilterStates.filters, {filterKey: payload.category, filterValue: payload.filter});
          const newRecordings = filterRecordings(oldFilterStates.recordings, newFilters);

          const newFilterStates = {
            selectedCategory: payload.category,
            filters: newFilters,
            recordings: newRecordings
          } as RecordingFilterStates;

          updateRecordingFilterStates(state, payload.isArchived, newFilterStates);         
        })
        .addCase(deleteFilterIntent, (state, {payload}) => {
          const oldFilterStates = getRecordingFilterStates(state, payload.isArchived);

          const newFilters = updateFilters(oldFilterStates.filters, {filterKey: payload.category, filterValue: payload.filter, deleted: true});
          const newRecordings = filterRecordings(oldFilterStates.recordings, newFilters);

          const newFilterStates = {
            selectedCategory: payload.category,
            filters: newFilters,
            recordings: newRecordings
          } as RecordingFilterStates;

          updateRecordingFilterStates(state, payload.isArchived, newFilterStates); 
        })
        .addCase(deleteFiltersIntent, (state, {payload}) => {
          const oldFilterStates = getRecordingFilterStates(state, payload.isArchived);

          const newFilters = updateFilters(oldFilterStates.filters, {filterKey: payload.category, filterValue: payload.filter, deleted: true, deleteOptions: {all: true}});
          const newRecordings = filterRecordings(oldFilterStates.recordings, newFilters);

          const newFilterStates = {
            selectedCategory: payload.category,
            filters: newFilters,
            recordings: newRecordings
          } as RecordingFilterStates;

          updateRecordingFilterStates(state, payload.isArchived, newFilterStates); 
        })
        .addCase(updateCategoryIntent, (state, {payload}) => {
          const oldFilterStates = getRecordingFilterStates(state, payload.isArchived);
          oldFilterStates.selectedCategory = payload.category;
        })
        .addCase(updateRecordingListIntent, (state, {payload}) => {
          const oldFilterStates = getRecordingFilterStates(state, payload.isArchived);
          oldFilterStates.recordings = filterRecordings(payload.recordings, oldFilterStates.filters);
        });
});

