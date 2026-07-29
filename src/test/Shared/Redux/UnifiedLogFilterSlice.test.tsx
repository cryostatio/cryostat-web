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
  UnifiedLogFilterReducer,
  UnifiedLogAddFilterIntent,
  UnifiedLogDeleteFilterIntent,
  UnifiedLogDeleteAllFiltersIntent,
  UnifiedLogDeleteCategoryFiltersIntent,
  UnifiedLogUpdateCategoryIntent,
  UnifiedLogAddTargetIntent,
  UnifiedLogDeleteTargetIntent,
  defaultUnifiedLogFilters,
  emptyArchivedUnifiedLogFilters,
} from '@app/Shared/Redux/Filters/UnifiedLogFilterSlice';

const TARGET = 'service:jmx:rmi:///jndi/rmi://localhost:0/jmxrmi';

describe('UnifiedLogFilterSlice', () => {
  describe('defaultUnifiedLogFilters', () => {
    it('should have correct default values', () => {
      expect(defaultUnifiedLogFilters).toEqual({
        list: [],
        _version: '1',
      });
    });
  });

  describe('emptyArchivedUnifiedLogFilters', () => {
    it('should have empty Name and Label arrays', () => {
      expect(emptyArchivedUnifiedLogFilters).toEqual({ Name: [], Label: [] });
    });
  });

  describe('UnifiedLogAddTargetIntent', () => {
    it('should add a new target with empty filters', () => {
      const action = UnifiedLogAddTargetIntent(TARGET);
      const state = UnifiedLogFilterReducer(defaultUnifiedLogFilters, action);

      expect(state.list).toHaveLength(1);
      expect(state.list[0].target).toBe(TARGET);
      expect(state.list[0].archived.filters).toEqual(emptyArchivedUnifiedLogFilters);
      expect(state.list[0].archived.selectedCategory).toBe('Name');
    });

    it('should not duplicate an already-present target', () => {
      let state = UnifiedLogFilterReducer(defaultUnifiedLogFilters, UnifiedLogAddTargetIntent(TARGET));
      state = UnifiedLogFilterReducer(state, UnifiedLogAddTargetIntent(TARGET));

      expect(state.list).toHaveLength(1);
    });
  });

  describe('UnifiedLogDeleteTargetIntent', () => {
    it('should remove a target', () => {
      let state = UnifiedLogFilterReducer(defaultUnifiedLogFilters, UnifiedLogAddTargetIntent(TARGET));
      state = UnifiedLogFilterReducer(state, UnifiedLogDeleteTargetIntent(TARGET));

      expect(state.list).toHaveLength(0);
    });

    it('should handle removing a non-existent target gracefully', () => {
      const state = UnifiedLogFilterReducer(defaultUnifiedLogFilters, UnifiedLogDeleteTargetIntent('nonexistent'));
      expect(state.list).toHaveLength(0);
    });
  });

  describe('UnifiedLogAddFilterIntent', () => {
    it('should add a Name filter', () => {
      const action = UnifiedLogAddFilterIntent(TARGET, 'Name', 'test.log');
      const state = UnifiedLogFilterReducer(defaultUnifiedLogFilters, action);

      const entry = state.list.find((e) => e.target === TARGET);
      expect(entry?.archived.filters.Name).toContain('test.log');
    });

    it('should add a Label filter', () => {
      const action = UnifiedLogAddFilterIntent(TARGET, 'Label', 'env=prod');
      const state = UnifiedLogFilterReducer(defaultUnifiedLogFilters, action);

      const entry = state.list.find((e) => e.target === TARGET);
      expect(entry?.archived.filters.Label).toContain('env=prod');
    });

    it('should not add duplicate filter values', () => {
      let state = UnifiedLogFilterReducer(
        defaultUnifiedLogFilters,
        UnifiedLogAddFilterIntent(TARGET, 'Name', 'test.log'),
      );
      state = UnifiedLogFilterReducer(state, UnifiedLogAddFilterIntent(TARGET, 'Name', 'test.log'));

      const entry = state.list.find((e) => e.target === TARGET)!;
      expect(entry.archived.filters.Name).toHaveLength(1);
    });
  });

  describe('UnifiedLogDeleteFilterIntent', () => {
    it('should remove a specific filter value', () => {
      let state = UnifiedLogFilterReducer(
        defaultUnifiedLogFilters,
        UnifiedLogAddFilterIntent(TARGET, 'Name', 'test.log'),
      );
      state = UnifiedLogFilterReducer(state, UnifiedLogAddFilterIntent(TARGET, 'Name', 'test2.log'));
      state = UnifiedLogFilterReducer(state, UnifiedLogDeleteFilterIntent(TARGET, 'Name', 'test.log'));

      const entry = state.list.find((e) => e.target === TARGET)!;
      expect(entry.archived.filters.Name).toEqual(['test2.log']);
    });
  });

  describe('UnifiedLogDeleteCategoryFiltersIntent', () => {
    it('should clear all filters in the given category', () => {
      let state = UnifiedLogFilterReducer(
        defaultUnifiedLogFilters,
        UnifiedLogAddFilterIntent(TARGET, 'Name', 'test.log'),
      );
      state = UnifiedLogFilterReducer(state, UnifiedLogAddFilterIntent(TARGET, 'Label', 'env=prod'));
      state = UnifiedLogFilterReducer(state, UnifiedLogDeleteCategoryFiltersIntent(TARGET, 'Name'));

      const entry = state.list.find((e) => e.target === TARGET)!;
      expect(entry.archived.filters.Name).toEqual([]);
      expect(entry.archived.filters.Label).toContain('env=prod');
    });
  });

  describe('UnifiedLogDeleteAllFiltersIntent', () => {
    it('should clear all filters in all categories', () => {
      let state = UnifiedLogFilterReducer(
        defaultUnifiedLogFilters,
        UnifiedLogAddFilterIntent(TARGET, 'Name', 'test.log'),
      );
      state = UnifiedLogFilterReducer(state, UnifiedLogAddFilterIntent(TARGET, 'Label', 'env=prod'));
      state = UnifiedLogFilterReducer(state, UnifiedLogDeleteAllFiltersIntent(TARGET));

      const entry = state.list.find((e) => e.target === TARGET)!;
      expect(entry.archived.filters).toEqual(emptyArchivedUnifiedLogFilters);
    });
  });

  describe('UnifiedLogUpdateCategoryIntent', () => {
    it('should update the selected category', () => {
      let state = UnifiedLogFilterReducer(defaultUnifiedLogFilters, UnifiedLogAddTargetIntent(TARGET));
      state = UnifiedLogFilterReducer(state, UnifiedLogUpdateCategoryIntent(TARGET, 'Label'));

      const entry = state.list.find((e) => e.target === TARGET)!;
      expect(entry.archived.selectedCategory).toBe('Label');
    });

    it('should switch back to Name category', () => {
      let state = UnifiedLogFilterReducer(defaultUnifiedLogFilters, UnifiedLogUpdateCategoryIntent(TARGET, 'Label'));
      state = UnifiedLogFilterReducer(state, UnifiedLogUpdateCategoryIntent(TARGET, 'Name'));

      const entry = state.list.find((e) => e.target === TARGET)!;
      expect(entry.archived.selectedCategory).toBe('Name');
    });
  });
});
