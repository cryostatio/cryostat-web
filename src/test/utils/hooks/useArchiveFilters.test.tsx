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

import { defaultArchiveFilters } from '@app/Shared/Redux/Filters/ArchiveFiltersSlice';
import { RootState, setupStore, Store } from '@app/Shared/Redux/ReduxStore';
import { NodeType } from '@app/Shared/Services/api.types';
import { useArchiveFilters } from '@app/utils/hooks/useArchiveFilters';
import { LineageNode } from '@app/utils/targetUtils';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { Provider } from 'react-redux';

// Test component that uses the hook
const TestComponent: React.FC = () => {
  const {
    lineageFilters,
    timeRange,
    searchText,
    hasActiveFilters,
    addLineageFilter,
    removeLineageFilter,
    clearLineageFilters,
    setTimeRange,
    setSearchText,
    clearAllFilters,
  } = useArchiveFilters();

  return (
    <div>
      <div data-testid="lineageFiltersCount">{lineageFilters.length}</div>
      <div data-testid="lineageFilters">{JSON.stringify(lineageFilters)}</div>
      <div data-testid="timeRange">{JSON.stringify(timeRange)}</div>
      <div data-testid="searchText">{searchText}</div>
      <div data-testid="hasActiveFilters">{hasActiveFilters.toString()}</div>
      <button
        data-testid="addLineageFilter"
        onClick={() => addLineageFilter({ name: 'my-namespace', nodeType: NodeType.NAMESPACE })}
      >
        Add Lineage Filter
      </button>
      <button
        data-testid="addSecondLineageFilter"
        onClick={() => addLineageFilter({ name: 'my-deployment', nodeType: NodeType.DEPLOYMENT })}
      >
        Add Second Lineage Filter
      </button>
      <button
        data-testid="removeLineageFilter"
        onClick={() => removeLineageFilter({ nodeType: NodeType.NAMESPACE, name: 'my-namespace' })}
      >
        Remove Lineage Filter
      </button>
      <button data-testid="clearLineageFilters" onClick={() => clearLineageFilters()}>
        Clear Lineage Filters
      </button>
      <button data-testid="setTimeRangePreset" onClick={() => setTimeRange({ type: 'preset', preset: 'last24h' })}>
        Set Time Range Preset
      </button>
      <button
        data-testid="setTimeRangeCustom"
        onClick={() =>
          setTimeRange({
            type: 'custom',
            startTime: '2024-01-01T00:00:00Z',
            endTime: '2024-01-31T23:59:59Z',
          })
        }
      >
        Set Time Range Custom
      </button>
      <button data-testid="setTimeRangeAll" onClick={() => setTimeRange({ type: 'preset', preset: 'all' })}>
        Set Time Range All
      </button>
      <button data-testid="setSearchText" onClick={() => setSearchText('my-search')}>
        Set Search Text
      </button>
      <button data-testid="clearSearchText" onClick={() => setSearchText('')}>
        Clear Search Text
      </button>
      <button data-testid="clearAllFilters" onClick={() => clearAllFilters()}>
        Clear All Filters
      </button>
    </div>
  );
};

describe('useArchiveFilters', () => {
  let store: Store;

  const createLineageNode = (name: string, nodeType: NodeType): LineageNode => ({
    name,
    nodeType,
  });

  beforeEach(() => {
    store = setupStore();
  });

  describe('initial state', () => {
    it('should return default filter state', () => {
      render(
        <Provider store={store}>
          <TestComponent />
        </Provider>,
      );

      expect(screen.getByTestId('lineageFiltersCount').textContent).toBe('0');
      expect(screen.getByTestId('timeRange').textContent).toBe('{"type":"preset","preset":"all"}');
      expect(screen.getByTestId('searchText').textContent).toBe('');
      expect(screen.getByTestId('hasActiveFilters').textContent).toBe('false');
    });
  });

  describe('addLineageFilter', () => {
    it('should add a lineage filter', async () => {
      const user = userEvent.setup();
      render(
        <Provider store={store}>
          <TestComponent />
        </Provider>,
      );

      await user.click(screen.getByTestId('addLineageFilter'));

      expect(screen.getByTestId('lineageFiltersCount').textContent).toBe('1');
      expect(screen.getByTestId('hasActiveFilters').textContent).toBe('true');
    });

    it('should add multiple lineage filters', async () => {
      const user = userEvent.setup();
      render(
        <Provider store={store}>
          <TestComponent />
        </Provider>,
      );

      await user.click(screen.getByTestId('addLineageFilter'));
      await user.click(screen.getByTestId('addSecondLineageFilter'));

      expect(screen.getByTestId('lineageFiltersCount').textContent).toBe('2');
      expect(screen.getByTestId('hasActiveFilters').textContent).toBe('true');
    });
  });

  describe('removeLineageFilter', () => {
    it('should remove a lineage filter by ID', async () => {
      const user = userEvent.setup();
      render(
        <Provider store={store}>
          <TestComponent />
        </Provider>,
      );

      await user.click(screen.getByTestId('addLineageFilter'));
      await user.click(screen.getByTestId('addSecondLineageFilter'));

      expect(screen.getByTestId('lineageFiltersCount').textContent).toBe('2');

      await user.click(screen.getByTestId('removeLineageFilter'));

      expect(screen.getByTestId('lineageFiltersCount').textContent).toBe('1');
      const filters = JSON.parse(screen.getByTestId('lineageFilters').textContent || '[]');
      expect(filters[0].nodeType).toBe(NodeType.DEPLOYMENT);
      expect(filters[0].name).toBe('my-deployment');
    });
  });

  describe('clearLineageFilters', () => {
    it('should clear all lineage filters', async () => {
      const user = userEvent.setup();
      render(
        <Provider store={store}>
          <TestComponent />
        </Provider>,
      );

      await user.click(screen.getByTestId('addLineageFilter'));
      await user.click(screen.getByTestId('addSecondLineageFilter'));

      expect(screen.getByTestId('lineageFiltersCount').textContent).toBe('2');

      await user.click(screen.getByTestId('clearLineageFilters'));

      expect(screen.getByTestId('lineageFiltersCount').textContent).toBe('0');
    });

    it('should not affect other filters', async () => {
      const user = userEvent.setup();
      render(
        <Provider store={store}>
          <TestComponent />
        </Provider>,
      );

      await user.click(screen.getByTestId('addLineageFilter'));
      await user.click(screen.getByTestId('setSearchText'));
      await user.click(screen.getByTestId('setTimeRangePreset'));

      await user.click(screen.getByTestId('clearLineageFilters'));

      expect(screen.getByTestId('lineageFiltersCount').textContent).toBe('0');
      expect(screen.getByTestId('searchText').textContent).toBe('my-search');
      expect(screen.getByTestId('timeRange').textContent).toBe('{"type":"preset","preset":"last24h"}');
      expect(screen.getByTestId('hasActiveFilters').textContent).toBe('true');
    });
  });

  describe('setTimeRange', () => {
    it('should set preset time range', async () => {
      const user = userEvent.setup();
      render(
        <Provider store={store}>
          <TestComponent />
        </Provider>,
      );

      await user.click(screen.getByTestId('setTimeRangePreset'));

      expect(screen.getByTestId('timeRange').textContent).toBe('{"type":"preset","preset":"last24h"}');
      expect(screen.getByTestId('hasActiveFilters').textContent).toBe('true');
    });

    it('should set custom time range', async () => {
      const user = userEvent.setup();
      render(
        <Provider store={store}>
          <TestComponent />
        </Provider>,
      );

      await user.click(screen.getByTestId('setTimeRangeCustom'));

      expect(screen.getByTestId('timeRange').textContent).toBe(
        '{"type":"custom","startTime":"2024-01-01T00:00:00Z","endTime":"2024-01-31T23:59:59Z"}',
      );
      expect(screen.getByTestId('hasActiveFilters').textContent).toBe('true');
    });

    it('should update existing time range', async () => {
      const user = userEvent.setup();
      render(
        <Provider store={store}>
          <TestComponent />
        </Provider>,
      );

      await user.click(screen.getByTestId('setTimeRangePreset'));
      expect(screen.getByTestId('timeRange').textContent).toBe('{"type":"preset","preset":"last24h"}');

      await user.click(screen.getByTestId('setTimeRangeAll'));
      expect(screen.getByTestId('timeRange').textContent).toBe('{"type":"preset","preset":"all"}');
    });
  });

  describe('setSearchText', () => {
    it('should set search text', async () => {
      const user = userEvent.setup();
      render(
        <Provider store={store}>
          <TestComponent />
        </Provider>,
      );

      await user.click(screen.getByTestId('setSearchText'));

      expect(screen.getByTestId('searchText').textContent).toBe('my-search');
      expect(screen.getByTestId('hasActiveFilters').textContent).toBe('true');
    });

    it('should handle empty string', async () => {
      const user = userEvent.setup();
      render(
        <Provider store={store}>
          <TestComponent />
        </Provider>,
      );

      await user.click(screen.getByTestId('setSearchText'));
      expect(screen.getByTestId('hasActiveFilters').textContent).toBe('true');

      await user.click(screen.getByTestId('clearSearchText'));

      expect(screen.getByTestId('searchText').textContent).toBe('');
      expect(screen.getByTestId('hasActiveFilters').textContent).toBe('false');
    });
  });

  describe('clearAllFilters', () => {
    it('should clear all filters', async () => {
      const user = userEvent.setup();
      render(
        <Provider store={store}>
          <TestComponent />
        </Provider>,
      );

      await user.click(screen.getByTestId('addLineageFilter'));
      await user.click(screen.getByTestId('setSearchText'));
      await user.click(screen.getByTestId('setTimeRangePreset'));

      expect(screen.getByTestId('hasActiveFilters').textContent).toBe('true');

      await user.click(screen.getByTestId('clearAllFilters'));

      expect(screen.getByTestId('lineageFiltersCount').textContent).toBe('0');
      expect(screen.getByTestId('searchText').textContent).toBe('');
      expect(screen.getByTestId('timeRange').textContent).toBe('{"type":"preset","preset":"all"}');
      expect(screen.getByTestId('hasActiveFilters').textContent).toBe('false');
    });
  });

  describe('hasActiveFilters', () => {
    it('should return false when no filters are active', () => {
      render(
        <Provider store={store}>
          <TestComponent />
        </Provider>,
      );

      expect(screen.getByTestId('hasActiveFilters').textContent).toBe('false');
    });

    it('should return true when lineage filters are active', async () => {
      const user = userEvent.setup();
      render(
        <Provider store={store}>
          <TestComponent />
        </Provider>,
      );

      await user.click(screen.getByTestId('addLineageFilter'));

      expect(screen.getByTestId('hasActiveFilters').textContent).toBe('true');
    });

    it('should return true when time range is not "all"', async () => {
      const user = userEvent.setup();
      render(
        <Provider store={store}>
          <TestComponent />
        </Provider>,
      );

      await user.click(screen.getByTestId('setTimeRangePreset'));

      expect(screen.getByTestId('hasActiveFilters').textContent).toBe('true');
    });

    it('should return true when search text is not empty', async () => {
      const user = userEvent.setup();
      render(
        <Provider store={store}>
          <TestComponent />
        </Provider>,
      );

      await user.click(screen.getByTestId('setSearchText'));

      expect(screen.getByTestId('hasActiveFilters').textContent).toBe('true');
    });

    it('should return true when any combination of filters is active', async () => {
      const user = userEvent.setup();
      render(
        <Provider store={store}>
          <TestComponent />
        </Provider>,
      );

      await user.click(screen.getByTestId('addLineageFilter'));
      await user.click(screen.getByTestId('setSearchText'));

      expect(screen.getByTestId('hasActiveFilters').textContent).toBe('true');
    });

    it('should return false when time range is "all" preset', async () => {
      const user = userEvent.setup();
      render(
        <Provider store={store}>
          <TestComponent />
        </Provider>,
      );

      await user.click(screen.getByTestId('setTimeRangePreset'));
      expect(screen.getByTestId('hasActiveFilters').textContent).toBe('true');

      await user.click(screen.getByTestId('setTimeRangeAll'));
      expect(screen.getByTestId('hasActiveFilters').textContent).toBe('false');
    });
  });

  describe('with preloaded state', () => {
    it('should initialize with preloaded filter state', () => {
      const node = createLineageNode('my-namespace', NodeType.NAMESPACE);
      const preloadedState: Partial<RootState> = {
        archiveFilters: {
          ...defaultArchiveFilters,
          lineageFilters: [node],
          searchText: 'preloaded',
          timeRange: { type: 'preset', preset: 'last7d' },
        },
      };

      store = setupStore(preloadedState as any);
      render(
        <Provider store={store}>
          <TestComponent />
        </Provider>,
      );

      expect(screen.getByTestId('lineageFiltersCount').textContent).toBe('1');
      const filters = JSON.parse(screen.getByTestId('lineageFilters').textContent || '[]');
      expect(filters[0]).toEqual(node);
      expect(screen.getByTestId('searchText').textContent).toBe('preloaded');
      expect(screen.getByTestId('timeRange').textContent).toBe('{"type":"preset","preset":"last7d"}');
      expect(screen.getByTestId('hasActiveFilters').textContent).toBe('true');
    });
  });
});
