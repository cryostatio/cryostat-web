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
  archiveFiltersReducer,
  archiveRemoveLineageFilterIntent,
  archiveSetSearchTextIntent,
  archiveSetTimeRangeIntent,
  ArchiveFiltersState,
  defaultArchiveFilters,
  sanitize,
} from '@app/Shared/Redux/Filters/ArchiveFiltersSlice';
import { LineageNode, NodeType } from '@app/Shared/Services/api.types';

describe('ArchiveFiltersSlice', () => {
  const createLineageNode = (name: string, nodeType: NodeType): LineageNode => ({
    name,
    nodeType,
  });

  describe('defaultArchiveFilters', () => {
    it('should have correct default values', () => {
      expect(defaultArchiveFilters).toEqual({
        lineageFilters: [],
        timeRange: null,
        searchText: '',
        _version: '2',
      });
    });
  });

  describe('sanitize', () => {
    it('should return state unchanged for null time range', () => {
      const state: ArchiveFiltersState = {
        ...defaultArchiveFilters,
        timeRange: null,
      };

      const result = sanitize(state);
      expect(result).toEqual(state);
    });

    it('should return state unchanged for valid time range', () => {
      const state: ArchiveFiltersState = {
        ...defaultArchiveFilters,
        timeRange: {
          startTime: new Date('2024-01-01T00:00:00Z').getTime(),
          endTime: new Date('2024-01-31T23:59:59Z').getTime(),
        },
      };

      const result = sanitize(state);
      expect(result).toEqual(state);
    });

    it('should reset to null for invalid time range (negative timestamps)', () => {
      const state: ArchiveFiltersState = {
        ...defaultArchiveFilters,
        timeRange: {
          startTime: -1,
          endTime: 1000,
        },
      };

      const result = sanitize(state);
      expect(result.timeRange).toBeNull();
    });

    it('should reset to null for invalid time range (end before start)', () => {
      const state: ArchiveFiltersState = {
        ...defaultArchiveFilters,
        timeRange: {
          startTime: 2000,
          endTime: 1000,
        },
      };

      const result = sanitize(state);
      expect(result.timeRange).toBeNull();
    });

    it('should reset to null for invalid time range (NaN values)', () => {
      const state: ArchiveFiltersState = {
        ...defaultArchiveFilters,
        timeRange: {
          startTime: NaN,
          endTime: NaN,
        },
      };

      const result = sanitize(state);
      expect(result.timeRange).toBeNull();
    });
  });

  describe('archiveAddLineageFilterIntent', () => {
    it('should add a lineage filter node', () => {
      const node = createLineageNode('my-namespace', NodeType.NAMESPACE);
      const action = archiveAddLineageFilterIntent(node);
      const state = archiveFiltersReducer(defaultArchiveFilters, action);

      expect(state.lineageFilters).toHaveLength(1);
      expect(state.lineageFilters[0]).toEqual(node);
    });

    it('should add multiple lineage filter nodes', () => {
      const node1 = createLineageNode('my-namespace', NodeType.NAMESPACE);
      const node2 = createLineageNode('my-deployment', NodeType.DEPLOYMENT);

      let state = archiveFiltersReducer(defaultArchiveFilters, archiveAddLineageFilterIntent(node1));
      state = archiveFiltersReducer(state, archiveAddLineageFilterIntent(node2));

      expect(state.lineageFilters).toHaveLength(2);
      expect(state.lineageFilters[0]).toEqual(node1);
      expect(state.lineageFilters[1]).toEqual(node2);
    });

    it('should not add duplicate lineage filter nodes (same <nodeType, name>)', () => {
      const node1 = createLineageNode('my-namespace', NodeType.NAMESPACE);
      const node2 = createLineageNode('my-namespace', NodeType.NAMESPACE);

      let state = archiveFiltersReducer(defaultArchiveFilters, archiveAddLineageFilterIntent(node1));
      state = archiveFiltersReducer(state, archiveAddLineageFilterIntent(node2));

      expect(state.lineageFilters).toHaveLength(1);
      expect(state.lineageFilters[0]).toEqual(node1); // Original node preserved
    });
  });

  describe('archiveRemoveLineageFilterIntent', () => {
    it('should remove a lineage filter node by <nodeType, name>', () => {
      const node1 = createLineageNode('my-namespace', NodeType.NAMESPACE);
      const node2 = createLineageNode('my-deployment', NodeType.DEPLOYMENT);

      let state = archiveFiltersReducer(defaultArchiveFilters, archiveAddLineageFilterIntent(node1));
      state = archiveFiltersReducer(state, archiveAddLineageFilterIntent(node2));
      state = archiveFiltersReducer(
        state,
        archiveRemoveLineageFilterIntent({ nodeType: NodeType.NAMESPACE, name: 'my-namespace' }),
      );

      expect(state.lineageFilters).toHaveLength(1);
      expect(state.lineageFilters[0]).toEqual(node2);
    });

    it('should handle removing non-existent node gracefully', () => {
      const node = createLineageNode('my-namespace', NodeType.NAMESPACE);

      let state = archiveFiltersReducer(defaultArchiveFilters, archiveAddLineageFilterIntent(node));
      state = archiveFiltersReducer(
        state,
        archiveRemoveLineageFilterIntent({ nodeType: NodeType.DEPLOYMENT, name: 'non-existent' }),
      );

      expect(state.lineageFilters).toHaveLength(1);
      expect(state.lineageFilters[0]).toEqual(node);
    });

    it('should handle removing from empty filters', () => {
      const state = archiveFiltersReducer(
        defaultArchiveFilters,
        archiveRemoveLineageFilterIntent({ nodeType: NodeType.NAMESPACE, name: 'my-namespace' }),
      );

      expect(state.lineageFilters).toHaveLength(0);
    });
  });

  describe('archiveClearLineageFiltersIntent', () => {
    it('should clear all lineage filters', () => {
      const node1 = createLineageNode('my-namespace', NodeType.NAMESPACE);
      const node2 = createLineageNode('my-deployment', NodeType.DEPLOYMENT);

      let state = archiveFiltersReducer(defaultArchiveFilters, archiveAddLineageFilterIntent(node1));
      state = archiveFiltersReducer(state, archiveAddLineageFilterIntent(node2));
      state = archiveFiltersReducer(state, archiveClearLineageFiltersIntent());

      expect(state.lineageFilters).toHaveLength(0);
    });

    it('should not affect other filter state', () => {
      const node = createLineageNode('my-namespace', NodeType.NAMESPACE);
      const timeRange = {
        startTime: new Date('2024-01-01T00:00:00Z').getTime(),
        endTime: new Date('2024-01-31T23:59:59Z').getTime(),
      };

      let state = archiveFiltersReducer(defaultArchiveFilters, archiveAddLineageFilterIntent(node));
      state = archiveFiltersReducer(state, archiveSetSearchTextIntent('test'));
      state = archiveFiltersReducer(state, archiveSetTimeRangeIntent(timeRange));
      state = archiveFiltersReducer(state, archiveClearLineageFiltersIntent());

      expect(state.lineageFilters).toHaveLength(0);
      expect(state.searchText).toBe('test');
      expect(state.timeRange).toEqual(timeRange);
    });
  });

  describe('archiveSetTimeRangeIntent', () => {
    it('should set time range', () => {
      const timeRange = {
        startTime: new Date('2024-01-01T00:00:00Z').getTime(),
        endTime: new Date('2024-01-31T23:59:59Z').getTime(),
      };
      const state = archiveFiltersReducer(defaultArchiveFilters, archiveSetTimeRangeIntent(timeRange));

      expect(state.timeRange).toEqual(timeRange);
    });

    it('should update existing time range', () => {
      const timeRange1 = {
        startTime: new Date('2024-01-01T00:00:00Z').getTime(),
        endTime: new Date('2024-01-31T23:59:59Z').getTime(),
      };
      const timeRange2 = {
        startTime: new Date('2024-02-01T00:00:00Z').getTime(),
        endTime: new Date('2024-02-28T23:59:59Z').getTime(),
      };

      let state = archiveFiltersReducer(defaultArchiveFilters, archiveSetTimeRangeIntent(timeRange1));
      state = archiveFiltersReducer(state, archiveSetTimeRangeIntent(timeRange2));

      expect(state.timeRange).toEqual(timeRange2);
    });
  });

  describe('archiveClearTimeRangeIntent', () => {
    it('should clear time range', () => {
      const timeRange = {
        startTime: new Date('2024-01-01T00:00:00Z').getTime(),
        endTime: new Date('2024-01-31T23:59:59Z').getTime(),
      };

      let state = archiveFiltersReducer(defaultArchiveFilters, archiveSetTimeRangeIntent(timeRange));
      state = archiveFiltersReducer(state, archiveClearTimeRangeIntent());

      expect(state.timeRange).toBeNull();
    });

    it('should not affect other filter state', () => {
      const node = createLineageNode('my-namespace', NodeType.NAMESPACE);
      const timeRange = {
        startTime: new Date('2024-01-01T00:00:00Z').getTime(),
        endTime: new Date('2024-01-31T23:59:59Z').getTime(),
      };

      let state = archiveFiltersReducer(defaultArchiveFilters, archiveAddLineageFilterIntent(node));
      state = archiveFiltersReducer(state, archiveSetSearchTextIntent('test'));
      state = archiveFiltersReducer(state, archiveSetTimeRangeIntent(timeRange));
      state = archiveFiltersReducer(state, archiveClearTimeRangeIntent());

      expect(state.lineageFilters).toHaveLength(1);
      expect(state.searchText).toBe('test');
      expect(state.timeRange).toBeNull();
    });
  });

  describe('archiveSetSearchTextIntent', () => {
    it('should set search text', () => {
      const state = archiveFiltersReducer(defaultArchiveFilters, archiveSetSearchTextIntent('my-search'));

      expect(state.searchText).toBe('my-search');
    });

    it('should update existing search text', () => {
      let state = archiveFiltersReducer(defaultArchiveFilters, archiveSetSearchTextIntent('old-search'));
      state = archiveFiltersReducer(state, archiveSetSearchTextIntent('new-search'));

      expect(state.searchText).toBe('new-search');
    });

    it('should handle empty string', () => {
      let state = archiveFiltersReducer(defaultArchiveFilters, archiveSetSearchTextIntent('test'));
      state = archiveFiltersReducer(state, archiveSetSearchTextIntent(''));

      expect(state.searchText).toBe('');
    });
  });

  describe('archiveClearAllFiltersIntent', () => {
    it('should clear all filters', () => {
      const node = createLineageNode('my-namespace', NodeType.NAMESPACE);
      const timeRange = {
        startTime: new Date('2024-01-01T00:00:00Z').getTime(),
        endTime: new Date('2024-01-31T23:59:59Z').getTime(),
      };

      let state = archiveFiltersReducer(defaultArchiveFilters, archiveAddLineageFilterIntent(node));
      state = archiveFiltersReducer(state, archiveSetSearchTextIntent('test'));
      state = archiveFiltersReducer(state, archiveSetTimeRangeIntent(timeRange));
      state = archiveFiltersReducer(state, archiveClearAllFiltersIntent());

      expect(state.lineageFilters).toHaveLength(0);
      expect(state.searchText).toBe('');
      expect(state.timeRange).toBeNull();
    });

    it('should reset to default state', () => {
      const node = createLineageNode('my-namespace', NodeType.NAMESPACE);

      let state = archiveFiltersReducer(defaultArchiveFilters, archiveAddLineageFilterIntent(node));
      state = archiveFiltersReducer(state, archiveClearAllFiltersIntent());

      expect(state.lineageFilters).toEqual(defaultArchiveFilters.lineageFilters);
      expect(state.searchText).toEqual(defaultArchiveFilters.searchText);
      expect(state.timeRange).toEqual(defaultArchiveFilters.timeRange);
    });
  });

  describe('complex scenarios', () => {
    it('should handle multiple operations in sequence', () => {
      const node1 = createLineageNode('namespace', NodeType.NAMESPACE);
      const node2 = createLineageNode('deployment', NodeType.DEPLOYMENT);
      const node3 = createLineageNode('replicaset', NodeType.REPLICASET);
      const timeRange = {
        startTime: new Date('2024-01-01T00:00:00Z').getTime(),
        endTime: new Date('2024-01-07T23:59:59Z').getTime(),
      };

      let state = defaultArchiveFilters;

      // Add filters
      state = archiveFiltersReducer(state, archiveAddLineageFilterIntent(node1));
      state = archiveFiltersReducer(state, archiveAddLineageFilterIntent(node2));
      state = archiveFiltersReducer(state, archiveAddLineageFilterIntent(node3));
      state = archiveFiltersReducer(state, archiveSetSearchTextIntent('my-app'));
      state = archiveFiltersReducer(state, archiveSetTimeRangeIntent(timeRange));

      expect(state.lineageFilters).toHaveLength(3);
      expect(state.searchText).toBe('my-app');
      expect(state.timeRange).toEqual(timeRange);

      // Remove one filter
      state = archiveFiltersReducer(
        state,
        archiveRemoveLineageFilterIntent({ nodeType: NodeType.DEPLOYMENT, name: 'deployment' }),
      );
      expect(state.lineageFilters).toHaveLength(2);
      expect(
        state.lineageFilters.find((n) => n.nodeType === NodeType.DEPLOYMENT && n.name === 'deployment'),
      ).toBeUndefined();

      // Clear lineage filters only
      state = archiveFiltersReducer(state, archiveClearLineageFiltersIntent());
      expect(state.lineageFilters).toHaveLength(0);
      expect(state.searchText).toBe('my-app');
      expect(state.timeRange).toEqual(timeRange);
    });

    it('should maintain state immutability', () => {
      const node = createLineageNode('namespace', NodeType.NAMESPACE);
      const initialState = defaultArchiveFilters;

      const newState = archiveFiltersReducer(initialState, archiveAddLineageFilterIntent(node));

      expect(initialState).not.toBe(newState);
      expect(initialState.lineageFilters).toHaveLength(0);
      expect(newState.lineageFilters).toHaveLength(1);
    });
  });
});
