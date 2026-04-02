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

import { TimeRangeOption } from '@app/Shared/Redux/Filters/ArchiveFiltersSlice';
import {
  ArchivedRecording,
  EnvironmentNode,
  LineageNode,
  RecordingDirectory,
  Target,
  TargetNode,
} from '@app/Shared/Services/api.types';
import { extractFilterableLineagePath } from './targetUtils';

// Re-export ArchivedRecording for convenience
export type { ArchivedRecording };

/**
 * Type alias for RecordingDirectory to maintain semantic clarity in filtering context.
 * RecordingDirectory contains connectUrl and jvmId which can be converted to Target using getTargetFromDirectory().
 */
export type ArchiveDirectory = RecordingDirectory;

/**
 * Preset time range durations in milliseconds.
 */
export const TIME_RANGE_PRESETS = {
  last24h: 24 * 60 * 60 * 1000, // 24 hours
  last7d: 7 * 24 * 60 * 60 * 1000, // 7 days
  last30d: 30 * 24 * 60 * 60 * 1000, // 30 days
  all: Number.MAX_SAFE_INTEGER, // All time
} as const;

/**
 * Filters archived recordings by time range.
 *
 * @param archives - Array of archived recordings to filter
 * @param timeRange - Time range filter option (preset or custom)
 * @returns Filtered array of archived recordings
 *
 * @example
 * ```typescript
 * const filtered = filterArchivesByTimeRange(archives, {
 *   type: 'preset',
 *   preset: 'last24h'
 * });
 * ```
 */
export const filterArchivesByTimeRange = (
  archives: ArchivedRecording[],
  timeRange: TimeRangeOption | null,
): ArchivedRecording[] => {
  if (!timeRange) {
    return archives;
  }

  const { start, end } = getTimeRangeBounds(timeRange);

  return archives.filter((archive) => {
    const archivedTime = archive.archivedTime;
    return archivedTime >= start.getTime() && archivedTime <= end.getTime();
  });
};

/**
 * Filters archive directories by lineage nodes using AND logic.
 * A directory matches if its target's lineage contains ALL specified filter nodes.
 *
 * @param directories - Array of archive directories to filter
 * @param lineageFilters - Array of lineage nodes to filter by
 * @param getLineage - Optional function to extract lineage from target (for testing)
 * @returns Filtered array of archive directories
 *
 * @example
 * ```typescript
 * const filtered = filterDirectoriesByLineage(directories, [
 *   { nodeType: NodeType.NAMESPACE, name: 'my-app' },
 *   { nodeType: NodeType.POD, name: 'backend-0' }
 * ]);
 * // Returns only directories where target is in 'my-app' namespace AND 'backend-0' pod
 * ```
 */
export const filterDirectoriesByLineage = (
  directories: ArchiveDirectory[],
  lineageFilters: LineageNode[],
  getLineage?: (directory: ArchiveDirectory) => LineageNode[],
): ArchiveDirectory[] => {
  if (lineageFilters.length === 0) {
    return directories;
  }

  return directories.filter((directory) => {
    // Get lineage for this directory
    // In production, we'd need to fetch the full TargetNode/EnvironmentNode from the API
    // For now, we accept an optional getLineage function for testing
    const lineage = getLineage ? getLineage(directory) : [];

    // AND logic: directory must match ALL filters
    return lineageFilters.every((filter) =>
      lineage.some((node) => node.nodeType === filter.nodeType && node.name === filter.name),
    );
  });
};

/**
 * Converts a TimeRangeOption to start and end Date objects.
 *
 * @param timeRange - Time range option (preset or custom)
 * @returns Object containing start and end Date objects
 *
 * @example
 * ```typescript
 * const { start, end } = getTimeRangeBounds({
 *   type: 'preset',
 *   preset: 'last24h'
 * });
 * // start = 24 hours ago, end = now
 * ```
 */
export const getTimeRangeBounds = (timeRange: TimeRangeOption): { start: Date; end: Date } => {
  const now = new Date();

  if (timeRange.type === 'preset') {
    const duration = TIME_RANGE_PRESETS[timeRange.preset];
    // For "all" preset, use a very old date instead of negative time
    if (timeRange.preset === 'all') {
      return { start: new Date(0), end: now }; // Start from Unix epoch
    }
    const start = new Date(now.getTime() - duration);
    return { start, end: now };
  } else {
    // Custom range - parse ISO strings
    return {
      start: new Date(timeRange.startTime),
      end: new Date(timeRange.endTime),
    };
  }
};

/**
 * Formats a TimeRangeOption into a human-readable label.
 *
 * @param timeRange - Time range option to format
 * @param formatDate - Optional function to format dates (for i18n)
 * @returns Human-readable time range label
 *
 * @example
 * ```typescript
 * formatTimeRangeLabel({ type: 'preset', preset: 'last24h' })
 * // Returns: "Last 24 Hours"
 *
 * formatTimeRangeLabel({
 *   type: 'custom',
 *   startTime: '2024-01-01T00:00:00Z',
 *   endTime: '2024-01-31T23:59:59Z'
 * })
 * // Returns: "2024-01-01 - 2024-01-31"
 * ```
 */
export const formatTimeRangeLabel = (timeRange: TimeRangeOption, formatDate?: (date: Date) => string): string => {
  if (timeRange.type === 'preset') {
    // Map preset values to human-readable labels
    const labels: Record<typeof timeRange.preset, string> = {
      last24h: 'Last 24 Hours',
      last7d: 'Last 7 Days',
      last30d: 'Last 30 Days',
      all: 'All Time',
    };
    return labels[timeRange.preset];
  } else {
    // Custom range - format dates
    const start = new Date(timeRange.startTime);
    const end = new Date(timeRange.endTime);

    const defaultFormat = (date: Date): string => {
      return date.toISOString().split('T')[0]; // YYYY-MM-DD
    };

    const formatter = formatDate || defaultFormat;
    return `${formatter(start)} - ${formatter(end)}`;
  }
};

/**
 * Extracts lineage from a target by fetching its TargetNode from the discovery tree.
 * This is a helper function that would typically call the API to get the full node structure.
 *
 * Note: This is a placeholder for the actual implementation which would need to:
 * 1. Query the discovery tree API to find the TargetNode for this target
 * 2. Extract the lineage path using extractFilterableLineagePath()
 *
 * @param target - Target to extract lineage from
 * @param discoveryTree - Optional discovery tree root (for testing)
 * @returns Array of lineage nodes
 */
export const extractTargetLineage = (target: Target, discoveryTree?: EnvironmentNode | TargetNode): LineageNode[] => {
  if (!discoveryTree) {
    // In production, this would fetch from the API
    // For now, return empty array
    return [];
  }

  // Find the TargetNode matching this target in the discovery tree
  const findTargetNode = (node: EnvironmentNode | TargetNode): TargetNode | null => {
    if ('target' in node) {
      // This is a TargetNode
      if (node.target.jvmId === target.jvmId) {
        return node;
      }
      return null;
    } else {
      // This is an EnvironmentNode - search children
      for (const child of node.children) {
        const found = findTargetNode(child);
        if (found) return found;
      }
      return null;
    }
  };

  const targetNode = findTargetNode(discoveryTree);
  if (!targetNode) {
    return [];
  }

  return extractFilterableLineagePath(targetNode);
};
