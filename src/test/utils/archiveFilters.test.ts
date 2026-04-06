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

    it('should filter by timestamp range', () => {
      const startTime = oneDayAgo - 1000;
      const endTime = oneHourAgo + 1000;

      const result = filterArchivesByTimeRange(mockArchives, {
        startTime,
        endTime,
      });

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('recent.jfr');
      expect(result[1].name).toBe('yesterday.jfr');
    });

    it('should return empty array when no archives match time range', () => {
      const futureStart = now + 1000;
      const futureEnd = now + 2000;

      const result = filterArchivesByTimeRange(mockArchives, {
        startTime: futureStart,
        endTime: futureEnd,
      });

      expect(result).toHaveLength(0);
    });

    it('should handle empty archives array', () => {
      const result = filterArchivesByTimeRange([], {
        startTime: oneDayAgo,
        endTime: now,
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
        startTime: exactTime,
        endTime: exactTime,
      });

      expect(result).toHaveLength(1);
    });

    it('should filter archives within a week range', () => {
      const startTime = oneWeekAgo - 1000;
      const endTime = now;

      const result = filterArchivesByTimeRange(mockArchives, {
        startTime,
        endTime,
      });

      expect(result).toHaveLength(3);
    });

    it('should filter archives within a day range', () => {
      const startTime = oneDayAgo - 1000;
      const endTime = now;

      const result = filterArchivesByTimeRange(mockArchives, {
        startTime,
        endTime,
      });

      expect(result.length).toBeGreaterThanOrEqual(2);
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

  describe('formatTimeRangeLabel', () => {
    it('should format timestamp range with default formatter', () => {
      const label = formatTimeRangeLabel({
        startTime: new Date('2024-01-01T00:00:00Z').getTime(),
        endTime: new Date('2024-01-31T23:59:59Z').getTime(),
      });

      expect(label).toBe('2024-01-01 - 2024-01-31');
    });

    it('should format timestamp range with custom formatter', () => {
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
          startTime: new Date('2024-01-01T00:00:00Z').getTime(),
          endTime: new Date('2024-01-31T23:59:59Z').getTime(),
        },
        customFormatter,
      );

      expect(label).toMatch(/Jan \d+, 2024 - Jan \d+, 2024/);
    });

    it('should handle same start and end date', () => {
      const label = formatTimeRangeLabel({
        startTime: new Date('2024-01-15T00:00:00Z').getTime(),
        endTime: new Date('2024-01-15T23:59:59Z').getTime(),
      });

      expect(label).toBe('2024-01-15 - 2024-01-15');
    });

    it('should handle timestamps at exact same moment', () => {
      const timestamp = new Date('2024-01-15T12:00:00Z').getTime();
      const label = formatTimeRangeLabel({
        startTime: timestamp,
        endTime: timestamp,
      });

      expect(label).toBe('2024-01-15 - 2024-01-15');
    });
  });
});
