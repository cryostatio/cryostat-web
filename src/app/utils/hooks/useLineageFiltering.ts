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

import { LineageNode, TargetNode } from '@app/Shared/Services/api.types';
import { ServiceContext } from '@app/Shared/Services/Services';
import { extractFilterableLineagePath, findInnermostTargetNode } from '@app/utils/targetUtils';
import * as React from 'react';
import { firstValueFrom } from 'rxjs';
import { useArchiveFilters } from './useArchiveFilters';

/**
 * Interface for items that can be filtered by lineage.
 * All archive directory types (JFR, Thread Dumps, Heap Dumps) have a jvmId field.
 */
export interface LineageFilterable {
  jvmId: string;
}

/**
 * Result from the useLineageFiltering hook
 */
export interface UseLineageFilteringResult<T extends LineageFilterable> {
  /** Items filtered by active lineage filters */
  filteredItems: T[];
  /** Map of jvmId to TargetNode (or null if not found) */
  lineageMap: Map<string, TargetNode | null>;
  /** Whether lineage data is currently being fetched */
  lineageLoading: boolean;
  /** Active lineage filters from Redux state */
  lineageFilters: LineageNode[];
}

/**
 * Hook to fetch lineage data for archive directories and filter them based on active lineage filters.
 *
 * This hook:
 * 1. Eagerly fetches lineage data for all directories in parallel
 * 2. Stores lineage in a Map for O(1) lookup
 * 3. Filters directories based on active lineage filters (AND semantics)
 * 4. Handles the 'uploads' special case (skips lineage lookup)
 *
 * Works with any archive directory type that has a jvmId field:
 * - RecordingDirectory (JFR Archives)
 * - ThreadDumpDirectory (Thread Dump Archives)
 * - HeapDumpDirectory (Heap Dump Archives)
 *
 * @param items Array of archive directories to filter
 * @returns Filtered items, lineage map, loading state, and active filters
 *
 * @example
 * const { filteredItems, lineageMap, lineageLoading } = useLineageFiltering(directories);
 */
export const useLineageFiltering = <T extends LineageFilterable>(items: T[]): UseLineageFilteringResult<T> => {
  const context = React.useContext(ServiceContext);
  const { lineageFilters } = useArchiveFilters();

  const [lineageMap, setLineageMap] = React.useState<Map<string, TargetNode | null>>(new Map());
  const [lineageLoading, setLineageLoading] = React.useState(false);
  const lineageMapRef = React.useRef(lineageMap);

  // Keep ref in sync with state
  React.useEffect(() => {
    lineageMapRef.current = lineageMap;
  }, [lineageMap]);

  // Fetch lineage only for new jvmIds we haven't seen before
  React.useEffect(() => {
    if (items.length === 0) {
      return;
    }

    // Find jvmIds that we don't have lineage data for yet
    const currentJvmIds = items.map((item) => item.jvmId).filter((jvmId) => jvmId);
    const newJvmIds = currentJvmIds.filter((jvmId) => !lineageMapRef.current.has(jvmId));

    if (newJvmIds.length === 0) {
      // All lineage data already fetched
      return;
    }

    setLineageLoading(true);

    const lineagePromises = newJvmIds.map(async (jvmId) => {
      // Skip lineage lookup for 'uploads' special case
      if (jvmId === 'uploads') {
        return { jvmId, targetNode: null };
      }

      try {
        const lineageRoot = await firstValueFrom(context.api.getTargetLineage(jvmId));
        if (!lineageRoot) {
          return { jvmId, targetNode: null };
        }
        const target = findInnermostTargetNode(lineageRoot);
        return { jvmId, targetNode: target || null };
      } catch (_) {
        return { jvmId, targetNode: null };
      }
    });

    Promise.all(lineagePromises).then((results) => {
      setLineageMap((prevMap) => {
        const updatedMap = new Map(prevMap);
        results.forEach((r) => updatedMap.set(r.jvmId, r.targetNode));
        return updatedMap;
      });
      setLineageLoading(false);
    });
  }, [items, context.api]);

  // Filter items based on active lineage filters (AND semantics)
  const filteredItems = React.useMemo(() => {
    if (lineageFilters.length === 0) {
      return items;
    }

    // If still loading lineage, return all items (don't filter yet)
    if (lineageLoading) {
      return items;
    }

    return items.filter((item) => {
      const targetNode = lineageMap.get(item.jvmId);

      // If no lineage data, item cannot match filters
      if (!targetNode) {
        return false;
      }

      const lineagePath = extractFilterableLineagePath(targetNode);

      // All filters must match (AND semantics)
      return lineageFilters.every((filterNode) =>
        lineagePath.some((pathNode) => pathNode.nodeType === filterNode.nodeType && pathNode.name === filterNode.name),
      );
    });
  }, [items, lineageFilters, lineageLoading, lineageMap]);

  return {
    filteredItems,
    lineageMap,
    lineageLoading,
    lineageFilters,
  };
};
