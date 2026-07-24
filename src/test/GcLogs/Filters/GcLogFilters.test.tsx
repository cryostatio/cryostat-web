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

import { filterGcLogs, GcLogFiltersCategories } from '@app/GcLogs/Filters/GcLogFilters';
import { GcLog } from '@app/Shared/Services/api.types';

const mockGcLog1: GcLog = {
  gcLogId: 'gc-log-1.log',
  jvmId: 'jvm-1',
  size: 1024,
  lastModified: 1700000000,
  metadata: {
    labels: [
      { key: 'env', value: 'prod' },
      { key: 'app', value: 'myapp' },
    ],
  },
};

const mockGcLog2: GcLog = {
  gcLogId: 'gc-log-2.log',
  jvmId: 'jvm-1',
  size: 2048,
  lastModified: 1700000001,
  metadata: {
    labels: [{ key: 'env', value: 'dev' }],
  },
};

const mockGcLog3: GcLog = {
  gcLogId: 'gc-log-3.log',
  jvmId: 'jvm-2',
  size: 512,
  lastModified: 1700000002,
  metadata: { labels: [] },
};

const mockGcLogNoMetadata: GcLog = {
  gcLogId: 'gc-log-4.log',
  jvmId: 'jvm-3',
  size: 256,
  lastModified: 1700000003,
};

const allLogs = [mockGcLog1, mockGcLog2, mockGcLog3, mockGcLogNoMetadata];

const emptyFilters: GcLogFiltersCategories = { Name: [], Label: [] };

describe('filterGcLogs', () => {
  it('should return all logs when no filters are set', () => {
    const result = filterGcLogs(allLogs, emptyFilters);
    expect(result).toHaveLength(4);
  });

  it('should return the original array reference unchanged when no filters are set', () => {
    const result = filterGcLogs(allLogs, emptyFilters);
    expect(result).toBe(allLogs);
  });

  it('should return an empty array when given an empty array', () => {
    const result = filterGcLogs([], emptyFilters);
    expect(result).toEqual([]);
  });

  describe('Name filter', () => {
    it('should filter by exact gcLogId match', () => {
      const filters: GcLogFiltersCategories = { Name: ['gc-log-1.log'], Label: [] };
      const result = filterGcLogs(allLogs, filters);
      expect(result).toHaveLength(1);
      expect(result[0].gcLogId).toBe('gc-log-1.log');
    });

    it('should return multiple results when multiple names match', () => {
      const filters: GcLogFiltersCategories = { Name: ['gc-log-1.log', 'gc-log-3.log'], Label: [] };
      const result = filterGcLogs(allLogs, filters);
      expect(result).toHaveLength(2);
    });

    it('should return empty when no name matches', () => {
      const filters: GcLogFiltersCategories = { Name: ['nonexistent.log'], Label: [] };
      const result = filterGcLogs(allLogs, filters);
      expect(result).toHaveLength(0);
    });
  });

  describe('Label filter', () => {
    it('should filter by label key=value string', () => {
      const filters: GcLogFiltersCategories = { Name: [], Label: ['env=prod'] };
      const result = filterGcLogs(allLogs, filters);
      expect(result).toHaveLength(1);
      expect(result[0].gcLogId).toBe('gc-log-1.log');
    });

    it('should match any of the filter labels (OR semantics)', () => {
      const filters: GcLogFiltersCategories = { Name: [], Label: ['env=prod', 'env=dev'] };
      const result = filterGcLogs(allLogs, filters);
      expect(result).toHaveLength(2);
    });

    it('should exclude logs without metadata', () => {
      const filters: GcLogFiltersCategories = { Name: [], Label: ['env=prod'] };
      const result = filterGcLogs(allLogs, filters);
      const ids = result.map((l) => l.gcLogId);
      expect(ids).not.toContain('gc-log-4.log');
    });

    it('should exclude logs with empty labels', () => {
      const filters: GcLogFiltersCategories = { Name: [], Label: ['env=prod'] };
      const result = filterGcLogs(allLogs, filters);
      const ids = result.map((l) => l.gcLogId);
      expect(ids).not.toContain('gc-log-3.log');
    });
  });

  describe('combined Name + Label filters', () => {
    it('should apply Name filter first then Label filter', () => {
      const filters: GcLogFiltersCategories = { Name: ['gc-log-1.log', 'gc-log-2.log'], Label: ['env=prod'] };
      const result = filterGcLogs(allLogs, filters);
      expect(result).toHaveLength(1);
      expect(result[0].gcLogId).toBe('gc-log-1.log');
    });

    it('should return empty when Name and Label filters together yield no results', () => {
      const filters: GcLogFiltersCategories = { Name: ['gc-log-2.log'], Label: ['env=prod'] };
      const result = filterGcLogs(allLogs, filters);
      expect(result).toHaveLength(0);
    });
  });
});
