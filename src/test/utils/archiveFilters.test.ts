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

import { LineageNode, NodeType } from '@app/Shared/Services/api.types';
import {
  ArchiveDirectory,
  ArchivedRecording,
  filterArchivesByTimeRange,
  filterDirectoriesByLineage,
  formatTimeRangeLabel,
  getTimeRangeBounds,
  TIME_RANGE_PRESETS,
} from '@app/utils/archiveFilters';

describe('archiveFilters', () => {
  describe('filterArchivesByTimeRange', () => {
    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;
    const oneDayAgo = now - 24 * 60 * 60 * 1000;
    const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000;

    const mockArchives: ArchivedRecording[] = [
      {
        name: 'recent.jfr',
        archivedTime: oneHourAgo,
        jvmId: 'jvm1',
        downloadUrl: '/download/1',
        reportUrl: '/report/1',
        metadata: { labels: [] },
        size: 1000,
      },
      {
        name: 'yesterday.jfr',
        archivedTime: oneDayAgo,
        jvmId: 'jvm1',
        downloadUrl: '/download/2',
        reportUrl: '/report/2',
        metadata: { labels: [] },
        size: 2000,
      },
      {
        name: 'lastweek.jfr',
        archivedTime: oneWeekAgo,
        jvmId: 'jvm1',
        downloadUrl: '/download/3',
        reportUrl: '/report/3',
        metadata: { labels: [] },
        size: 3000,
      },
    ];

    it('should return all archives when timeRange is null', () => {
      const result = filterArchivesByTimeRange(mockArchives, null);
      expect(result).toEqual(mockArchives);
    });

    it('should filter by last24h preset', () => {
      const result = filterArchivesByTimeRange(mockArchives, {
        type: 'preset',
        preset: 'last24h',
      });

      // Should include archives from the last 24 hours
      expect(result.length).toBeGreaterThanOrEqual(1);
      expect(result[0].name).toBe('recent.jfr');
      // yesterday.jfr might be just outside 24h depending on exact timing
    });

    it('should filter by last7d preset', () => {
      const result = filterArchivesByTimeRange(mockArchives, {
        type: 'preset',
        preset: 'last7d',
      });

      // Should include archives from the last 7 days
      expect(result.length).toBeGreaterThanOrEqual(2);
      expect(result.length).toBeLessThanOrEqual(3);
    });

    it('should filter by last30d preset', () => {
      const result = filterArchivesByTimeRange(mockArchives, {
        type: 'preset',
        preset: 'last30d',
      });

      expect(result).toHaveLength(3);
    });

    it('should return all archives for "all" preset', () => {
      const result = filterArchivesByTimeRange(mockArchives, {
        type: 'preset',
        preset: 'all',
      });

      expect(result).toHaveLength(3);
    });

    it('should filter by custom time range', () => {
      const startTime = new Date(oneDayAgo - 1000).toISOString();
      const endTime = new Date(oneHourAgo + 1000).toISOString();

      const result = filterArchivesByTimeRange(mockArchives, {
        type: 'custom',
        startTime,
        endTime,
      });

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('recent.jfr');
      expect(result[1].name).toBe('yesterday.jfr');
    });

    it('should return empty array when no archives match time range', () => {
      const futureStart = new Date(now + 1000).toISOString();
      const futureEnd = new Date(now + 2000).toISOString();

      const result = filterArchivesByTimeRange(mockArchives, {
        type: 'custom',
        startTime: futureStart,
        endTime: futureEnd,
      });

      expect(result).toHaveLength(0);
    });

    it('should handle empty archives array', () => {
      const result = filterArchivesByTimeRange([], {
        type: 'preset',
        preset: 'last24h',
      });

      expect(result).toEqual([]);
    });

    it('should include archives at exact boundary times', () => {
      const exactTime = now - 1000;
      const archives: ArchivedRecording[] = [
        {
          name: 'exact.jfr',
          archivedTime: exactTime,
          jvmId: 'jvm1',
          downloadUrl: '/download/1',
          reportUrl: '/report/1',
          metadata: { labels: [] },
          size: 1000,
        },
      ];

      const result = filterArchivesByTimeRange(archives, {
        type: 'custom',
        startTime: new Date(exactTime).toISOString(),
        endTime: new Date(exactTime).toISOString(),
      });

      expect(result).toHaveLength(1);
    });
  });

  describe('filterDirectoriesByLineage', () => {
    const mockDirectories: ArchiveDirectory[] = [
      {
        jvmId: 'jvm1',
        connectUrl: 'service:jmx:rmi:///jndi/rmi://target1:9091/jmxrmi',
        recordings: [],
      },
      {
        jvmId: 'jvm2',
        connectUrl: 'service:jmx:rmi:///jndi/rmi://target2:9091/jmxrmi',
        recordings: [],
      },
    ];

    const mockGetLineage = (directory: ArchiveDirectory): LineageNode[] => {
      if (directory.jvmId === 'jvm1') {
        return [
          { nodeType: NodeType.NAMESPACE, name: 'my-app' },
          { nodeType: NodeType.DEPLOYMENT, name: 'backend' },
          { nodeType: NodeType.POD, name: 'backend-0' },
        ];
      } else {
        return [
          { nodeType: NodeType.NAMESPACE, name: 'other-app' },
          { nodeType: NodeType.DEPLOYMENT, name: 'frontend' },
          { nodeType: NodeType.POD, name: 'frontend-0' },
        ];
      }
    };

    it('should return all directories when lineageFilters is empty', () => {
      const result = filterDirectoriesByLineage(mockDirectories, []);
      expect(result).toEqual(mockDirectories);
    });

    it('should filter by single lineage node', () => {
      const filters: LineageNode[] = [{ nodeType: NodeType.NAMESPACE, name: 'my-app' }];

      const result = filterDirectoriesByLineage(mockDirectories, filters, mockGetLineage);

      expect(result).toHaveLength(1);
      expect(result[0].jvmId).toBe('jvm1');
    });

    it('should filter by multiple lineage nodes with AND logic', () => {
      const filters: LineageNode[] = [
        { nodeType: NodeType.NAMESPACE, name: 'my-app' },
        { nodeType: NodeType.POD, name: 'backend-0' },
      ];

      const result = filterDirectoriesByLineage(mockDirectories, filters, mockGetLineage);

      expect(result).toHaveLength(1);
      expect(result[0].jvmId).toBe('jvm1');
    });

    it('should return empty array when no directories match all filters', () => {
      const filters: LineageNode[] = [
        { nodeType: NodeType.NAMESPACE, name: 'my-app' },
        { nodeType: NodeType.POD, name: 'frontend-0' }, // Wrong pod for my-app namespace
      ];

      const result = filterDirectoriesByLineage(mockDirectories, filters, mockGetLineage);

      expect(result).toHaveLength(0);
    });

    it('should handle empty directories array', () => {
      const filters: LineageNode[] = [{ nodeType: NodeType.NAMESPACE, name: 'my-app' }];

      const result = filterDirectoriesByLineage([], filters, mockGetLineage);

      expect(result).toEqual([]);
    });

    it('should return empty array when getLineage returns empty', () => {
      const filters: LineageNode[] = [{ nodeType: NodeType.NAMESPACE, name: 'my-app' }];

      const result = filterDirectoriesByLineage(mockDirectories, filters, () => []);

      expect(result).toHaveLength(0);
    });

    it('should match by nodeType and name exactly', () => {
      const filters: LineageNode[] = [
        { nodeType: NodeType.DEPLOYMENT, name: 'backend' }, // Exact match
      ];

      const result = filterDirectoriesByLineage(mockDirectories, filters, mockGetLineage);

      expect(result).toHaveLength(1);
      expect(result[0].jvmId).toBe('jvm1');
    });

    it('should not match partial names', () => {
      const filters: LineageNode[] = [
        { nodeType: NodeType.DEPLOYMENT, name: 'back' }, // Partial match should fail
      ];

      const result = filterDirectoriesByLineage(mockDirectories, filters, mockGetLineage);

      expect(result).toHaveLength(0);
    });
  });

  describe('getTimeRangeBounds', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-01-15T12:00:00Z'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should calculate bounds for last24h preset', () => {
      const { start, end } = getTimeRangeBounds({
        type: 'preset',
        preset: 'last24h',
      });

      expect(end.getTime()).toBe(new Date('2024-01-15T12:00:00Z').getTime());
      expect(start.getTime()).toBe(new Date('2024-01-14T12:00:00Z').getTime());
    });

    it('should calculate bounds for last7d preset', () => {
      const { start, end } = getTimeRangeBounds({
        type: 'preset',
        preset: 'last7d',
      });

      expect(end.getTime()).toBe(new Date('2024-01-15T12:00:00Z').getTime());
      expect(start.getTime()).toBe(new Date('2024-01-08T12:00:00Z').getTime());
    });

    it('should calculate bounds for last30d preset', () => {
      const { start, end } = getTimeRangeBounds({
        type: 'preset',
        preset: 'last30d',
      });

      expect(end.getTime()).toBe(new Date('2024-01-15T12:00:00Z').getTime());
      expect(start.getTime()).toBe(new Date('2023-12-16T12:00:00Z').getTime());
    });

    it('should calculate bounds for all preset', () => {
      const { start, end } = getTimeRangeBounds({
        type: 'preset',
        preset: 'all',
      });

      expect(end.getTime()).toBe(new Date('2024-01-15T12:00:00Z').getTime());
      expect(start.getTime()).toBe(0); // Unix epoch (1970-01-01)
    });

    it('should parse custom time range', () => {
      const { start, end } = getTimeRangeBounds({
        type: 'custom',
        startTime: '2024-01-01T00:00:00Z',
        endTime: '2024-01-31T23:59:59Z',
      });

      expect(start.toISOString()).toBe('2024-01-01T00:00:00.000Z');
      expect(end.toISOString()).toBe('2024-01-31T23:59:59.000Z');
    });

    it('should handle custom range with same start and end', () => {
      const { start, end } = getTimeRangeBounds({
        type: 'custom',
        startTime: '2024-01-15T12:00:00Z',
        endTime: '2024-01-15T12:00:00Z',
      });

      expect(start.getTime()).toBe(end.getTime());
    });
  });

  describe('formatTimeRangeLabel', () => {
    it('should format last24h preset', () => {
      const label = formatTimeRangeLabel({
        type: 'preset',
        preset: 'last24h',
      });

      expect(label).toBe('Last 24 Hours');
    });

    it('should format last7d preset', () => {
      const label = formatTimeRangeLabel({
        type: 'preset',
        preset: 'last7d',
      });

      expect(label).toBe('Last 7 Days');
    });

    it('should format last30d preset', () => {
      const label = formatTimeRangeLabel({
        type: 'preset',
        preset: 'last30d',
      });

      expect(label).toBe('Last 30 Days');
    });

    it('should format all preset', () => {
      const label = formatTimeRangeLabel({
        type: 'preset',
        preset: 'all',
      });

      expect(label).toBe('All Time');
    });

    it('should format custom range with default formatter', () => {
      const label = formatTimeRangeLabel({
        type: 'custom',
        startTime: '2024-01-01T00:00:00Z',
        endTime: '2024-01-31T23:59:59Z',
      });

      expect(label).toBe('2024-01-01 - 2024-01-31');
    });

    it('should format custom range with custom formatter', () => {
      const customFormatter = (date: Date) => {
        return date.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          timeZone: 'UTC', // Force UTC to avoid timezone issues
        });
      };

      const label = formatTimeRangeLabel(
        {
          type: 'custom',
          startTime: '2024-01-01T00:00:00Z',
          endTime: '2024-01-31T23:59:59Z',
        },
        customFormatter,
      );

      expect(label).toMatch(/Jan \d+, 2024 - Jan \d+, 2024/);
    });

    it('should handle same start and end date', () => {
      const label = formatTimeRangeLabel({
        type: 'custom',
        startTime: '2024-01-15T00:00:00Z',
        endTime: '2024-01-15T23:59:59Z',
      });

      expect(label).toBe('2024-01-15 - 2024-01-15');
    });
  });

  describe('TIME_RANGE_PRESETS', () => {
    it('should have correct duration for last24h', () => {
      expect(TIME_RANGE_PRESETS.last24h).toBe(24 * 60 * 60 * 1000);
    });

    it('should have correct duration for last7d', () => {
      expect(TIME_RANGE_PRESETS.last7d).toBe(7 * 24 * 60 * 60 * 1000);
    });

    it('should have correct duration for last30d', () => {
      expect(TIME_RANGE_PRESETS.last30d).toBe(30 * 24 * 60 * 60 * 1000);
    });

    it('should have very large duration for all', () => {
      expect(TIME_RANGE_PRESETS.all).toBe(Number.MAX_SAFE_INTEGER);
    });
  });
});
