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
  GcLogFilterReducer,
  GcLogAddFilterIntent,
  GcLogDeleteFilterIntent,
  GcLogDeleteAllFiltersIntent,
  GcLogDeleteCategoryFiltersIntent,
  GcLogUpdateCategoryIntent,
  GcLogAddTargetIntent,
  GcLogDeleteTargetIntent,
  defaultGcLogFilters,
  emptyArchivedGcLogFilters,
} from '@app/Shared/Redux/Filters/GcLogFilterSlice';

const TARGET = 'service:jmx:rmi:///jndi/rmi://localhost:0/jmxrmi';

describe('GcLogFilterSlice', () => {
  describe('defaultGcLogFilters', () => {
    it('should have correct default values', () => {
      expect(defaultGcLogFilters).toEqual({
        list: [],
        _version: '1',
      });
    });
  });

  describe('emptyArchivedGcLogFilters', () => {
    it('should have empty Name and Label arrays', () => {
      expect(emptyArchivedGcLogFilters).toEqual({ Name: [], Label: [] });
    });
  });

  describe('GcLogAddTargetIntent', () => {
    it('should add a new target with empty filters', () => {
      const action = GcLogAddTargetIntent(TARGET);
      const state = GcLogFilterReducer(defaultGcLogFilters, action);

      expect(state.list).toHaveLength(1);
      expect(state.list[0].target).toBe(TARGET);
      expect(state.list[0].archived.filters).toEqual(emptyArchivedGcLogFilters);
      expect(state.list[0].archived.selectedCategory).toBe('Name');
    });

    it('should not duplicate an already-present target', () => {
      let state = GcLogFilterReducer(defaultGcLogFilters, GcLogAddTargetIntent(TARGET));
      state = GcLogFilterReducer(state, GcLogAddTargetIntent(TARGET));

      expect(state.list).toHaveLength(1);
    });
  });

  describe('GcLogDeleteTargetIntent', () => {
    it('should remove a target', () => {
      let state = GcLogFilterReducer(defaultGcLogFilters, GcLogAddTargetIntent(TARGET));
      state = GcLogFilterReducer(state, GcLogDeleteTargetIntent(TARGET));

      expect(state.list).toHaveLength(0);
    });

    it('should handle removing a non-existent target gracefully', () => {
      const state = GcLogFilterReducer(defaultGcLogFilters, GcLogDeleteTargetIntent('nonexistent'));
      expect(state.list).toHaveLength(0);
    });
  });

  describe('GcLogAddFilterIntent', () => {
    it('should add a Name filter', () => {
      const action = GcLogAddFilterIntent(TARGET, 'Name', 'gc.log');
      const state = GcLogFilterReducer(defaultGcLogFilters, action);

      const entry = state.list.find((e) => e.target === TARGET);
      expect(entry?.archived.filters.Name).toContain('gc.log');
    });

    it('should add a Label filter', () => {
      const action = GcLogAddFilterIntent(TARGET, 'Label', 'env=prod');
      const state = GcLogFilterReducer(defaultGcLogFilters, action);

      const entry = state.list.find((e) => e.target === TARGET);
      expect(entry?.archived.filters.Label).toContain('env=prod');
    });

    it('should not add duplicate filter values', () => {
      let state = GcLogFilterReducer(defaultGcLogFilters, GcLogAddFilterIntent(TARGET, 'Name', 'gc.log'));
      state = GcLogFilterReducer(state, GcLogAddFilterIntent(TARGET, 'Name', 'gc.log'));

      const entry = state.list.find((e) => e.target === TARGET)!;
      expect(entry.archived.filters.Name).toHaveLength(1);
    });
  });

  describe('GcLogDeleteFilterIntent', () => {
    it('should remove a specific filter value', () => {
      let state = GcLogFilterReducer(defaultGcLogFilters, GcLogAddFilterIntent(TARGET, 'Name', 'gc.log'));
      state = GcLogFilterReducer(state, GcLogAddFilterIntent(TARGET, 'Name', 'gc2.log'));
      state = GcLogFilterReducer(state, GcLogDeleteFilterIntent(TARGET, 'Name', 'gc.log'));

      const entry = state.list.find((e) => e.target === TARGET)!;
      expect(entry.archived.filters.Name).toEqual(['gc2.log']);
    });
  });

  describe('GcLogDeleteCategoryFiltersIntent', () => {
    it('should clear all filters in the given category', () => {
      let state = GcLogFilterReducer(defaultGcLogFilters, GcLogAddFilterIntent(TARGET, 'Name', 'gc.log'));
      state = GcLogFilterReducer(state, GcLogAddFilterIntent(TARGET, 'Label', 'env=prod'));
      state = GcLogFilterReducer(state, GcLogDeleteCategoryFiltersIntent(TARGET, 'Name'));

      const entry = state.list.find((e) => e.target === TARGET)!;
      expect(entry.archived.filters.Name).toEqual([]);
      expect(entry.archived.filters.Label).toContain('env=prod');
    });
  });

  describe('GcLogDeleteAllFiltersIntent', () => {
    it('should clear all filters in all categories', () => {
      let state = GcLogFilterReducer(defaultGcLogFilters, GcLogAddFilterIntent(TARGET, 'Name', 'gc.log'));
      state = GcLogFilterReducer(state, GcLogAddFilterIntent(TARGET, 'Label', 'env=prod'));
      state = GcLogFilterReducer(state, GcLogDeleteAllFiltersIntent(TARGET));

      const entry = state.list.find((e) => e.target === TARGET)!;
      expect(entry.archived.filters).toEqual(emptyArchivedGcLogFilters);
    });
  });

  describe('GcLogUpdateCategoryIntent', () => {
    it('should update the selected category', () => {
      let state = GcLogFilterReducer(defaultGcLogFilters, GcLogAddTargetIntent(TARGET));
      state = GcLogFilterReducer(state, GcLogUpdateCategoryIntent(TARGET, 'Label'));

      const entry = state.list.find((e) => e.target === TARGET)!;
      expect(entry.archived.selectedCategory).toBe('Label');
    });

    it('should switch back to Name category', () => {
      let state = GcLogFilterReducer(defaultGcLogFilters, GcLogUpdateCategoryIntent(TARGET, 'Label'));
      state = GcLogFilterReducer(state, GcLogUpdateCategoryIntent(TARGET, 'Name'));

      const entry = state.list.find((e) => e.target === TARGET)!;
      expect(entry.archived.selectedCategory).toBe('Name');
    });
  });
});
