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

import {
  archiveAddLineageFilterIntent,
  archiveClearAllFiltersIntent,
  archiveClearLineageFiltersIntent,
  archiveClearTimeRangeIntent,
  archiveRemoveLineageFilterIntent,
  archiveSetSearchTextIntent,
  archiveSetTimeRangeIntent,
  TimeRangeOption,
} from '@app/Shared/Redux/Filters/ArchiveFiltersSlice';
import { RootState } from '@app/Shared/Redux/ReduxStore';
import { LineageNode } from '@app/Shared/Services/api.types';

import { useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';

/**
 * Custom hook for managing archive filters.
 * Provides access to filter state and actions.
 */
export const useArchiveFilters = () => {
  const dispatch = useDispatch();

  // Select filter state from Redux
  const lineageFilters = useSelector((state: RootState) => state.archiveFilters.lineageFilters);
  const timeRange = useSelector((state: RootState) => state.archiveFilters.timeRange);
  const searchText = useSelector((state: RootState) => state.archiveFilters.searchText);

  // Compute whether any filters are active
  const hasActiveFilters = useMemo(() => {
    return lineageFilters.length > 0 || timeRange !== null || searchText.trim().length > 0;
  }, [lineageFilters, timeRange, searchText]);

  // Action creators
  const addLineageFilter = useCallback(
    (node: LineageNode) => {
      dispatch(archiveAddLineageFilterIntent(node));
    },
    [dispatch],
  );

  const removeLineageFilter = useCallback(
    (node: Pick<LineageNode, 'nodeType' | 'name'>) => {
      dispatch(archiveRemoveLineageFilterIntent(node));
    },
    [dispatch],
  );

  const clearLineageFilters = useCallback(() => {
    dispatch(archiveClearLineageFiltersIntent());
  }, [dispatch]);

  const setTimeRange = useCallback(
    (range: TimeRangeOption) => {
      dispatch(archiveSetTimeRangeIntent(range));
    },
    [dispatch],
  );

  const clearTimeRange = useCallback(() => {
    dispatch(archiveClearTimeRangeIntent());
  }, [dispatch]);

  const setSearchText = useCallback(
    (text: string) => {
      dispatch(archiveSetSearchTextIntent(text));
    },
    [dispatch],
  );

  const clearAllFilters = useCallback(() => {
    dispatch(archiveClearAllFiltersIntent());
  }, [dispatch]);

  return {
    // State
    lineageFilters,
    timeRange,
    searchText,
    hasActiveFilters,

    // Actions
    addLineageFilter,
    removeLineageFilter,
    clearLineageFilters,
    setTimeRange,
    clearTimeRange,
    setSearchText,
    clearAllFilters,
  };
};
