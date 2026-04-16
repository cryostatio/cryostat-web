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

import { archiveFiltersReducer } from '@app/Shared/Redux/Filters/ArchiveFiltersSlice';
import { EnvironmentNode, NodeType, TargetNode } from '@app/Shared/Services/api.types';
import { ServiceContext } from '@app/Shared/Services/Services';
import { LineageFilterable, useLineageFiltering } from '@app/utils/hooks/useLineageFiltering';
import { configureStore } from '@reduxjs/toolkit';
import { render, waitFor } from '@testing-library/react';
import * as React from 'react';
import { Provider } from 'react-redux';
import { Observable, of } from 'rxjs';

const mockGetTargetLineage = jest.fn();

const mockContext = {
  api: {
    getTargetLineage: mockGetTargetLineage,
  },
} as any;

// Create a test store with archive filters
const createTestStore = (initialState = {}) => {
  return configureStore({
    reducer: {
      archiveFilters: archiveFiltersReducer,
    },
    preloadedState: {
      archiveFilters: {
        lineageFilters: [],
        timeRange: null,
        searchText: '',
        _version: '2',
        ...initialState,
      },
    },
  });
};

// Test component that uses the hook
const TestComponent: React.FC<{ items: LineageFilterable[] }> = ({ items }) => {
  const { filteredItems, lineageMap, lineageLoading, lineageFilters } = useLineageFiltering(items);
  return (
    <div>
      <div data-testid="filteredCount">{filteredItems.length}</div>
      <div data-testid="lineageMapSize">{lineageMap.size}</div>
      <div data-testid="lineageLoading">{lineageLoading.toString()}</div>
      <div data-testid="lineageFiltersCount">{lineageFilters.length}</div>
      <div data-testid="filteredItems">{JSON.stringify(filteredItems.map((i) => i.jvmId))}</div>
    </div>
  );
};

describe('useLineageFiltering', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const createMockLineage = (namespace: string, deployment: string): EnvironmentNode => ({
    id: 1,
    name: 'Universe',
    nodeType: NodeType.UNIVERSE,
    labels: [],
    children: [
      {
        id: 2,
        name: 'Realm',
        nodeType: NodeType.REALM,
        labels: [],
        children: [
          {
            id: 3,
            name: namespace,
            nodeType: NodeType.NAMESPACE,
            labels: [],
            children: [
              {
                id: 4,
                name: deployment,
                nodeType: NodeType.DEPLOYMENT,
                labels: [],
                children: [
                  {
                    id: 5,
                    name: 'Target',
                    nodeType: NodeType.JVM,
                    labels: [],
                    target: {
                      agent: false,
                      alias: 'test-alias',
                      connectUrl: 'service:jmx:rmi:///jndi/rmi://localhost:9091/jmxrmi',
                      jvmId: 'test-jvm-id',
                      labels: [],
                      annotations: {
                        cryostat: [],
                        platform: [],
                      },
                    },
                  } as TargetNode,
                ],
              },
            ],
          },
        ],
      },
    ],
  });

  it('should return all items when no filters are active', async () => {
    const items: LineageFilterable[] = [{ jvmId: 'jvm-1' }, { jvmId: 'jvm-2' }, { jvmId: 'jvm-3' }];

    mockGetTargetLineage.mockImplementation((_: string) => {
      return of(createMockLineage('default', 'app'));
    });

    const store = createTestStore();
    const { getByTestId } = render(
      <Provider store={store}>
        <ServiceContext.Provider value={mockContext}>
          <TestComponent items={items} />
        </ServiceContext.Provider>
      </Provider>,
    );

    await waitFor(() => {
      expect(getByTestId('lineageLoading').textContent).toBe('false');
    });

    expect(getByTestId('filteredCount').textContent).toBe('3');
    expect(getByTestId('lineageFiltersCount').textContent).toBe('0');
  });

  it('should fetch lineage for all items', async () => {
    const items: LineageFilterable[] = [{ jvmId: 'jvm-1' }, { jvmId: 'jvm-2' }];

    mockGetTargetLineage.mockImplementation((_: string) => {
      return of(createMockLineage('default', 'app'));
    });

    const store = createTestStore();
    render(
      <Provider store={store}>
        <ServiceContext.Provider value={mockContext}>
          <TestComponent items={items} />
        </ServiceContext.Provider>
      </Provider>,
    );

    await waitFor(() => {
      expect(mockGetTargetLineage).toHaveBeenCalledTimes(2);
    });

    expect(mockGetTargetLineage).toHaveBeenCalledWith('jvm-1');
    expect(mockGetTargetLineage).toHaveBeenCalledWith('jvm-2');
  });

  it('should skip "uploads" jvmId', async () => {
    const items: LineageFilterable[] = [{ jvmId: 'uploads' }, { jvmId: 'jvm-1' }];

    mockGetTargetLineage.mockImplementation((_: string) => {
      return of(createMockLineage('prod', 'app'));
    });

    const store = createTestStore();
    const { getByTestId } = render(
      <Provider store={store}>
        <ServiceContext.Provider value={mockContext}>
          <TestComponent items={items} />
        </ServiceContext.Provider>
      </Provider>,
    );

    await waitFor(() => {
      expect(getByTestId('lineageLoading').textContent).toBe('false');
    });

    // Should only fetch lineage for jvm-1, not uploads
    expect(mockGetTargetLineage).toHaveBeenCalledTimes(1);
    expect(mockGetTargetLineage).toHaveBeenCalledWith('jvm-1');
    expect(mockGetTargetLineage).not.toHaveBeenCalledWith('uploads');
  });

  it('should handle empty items array', () => {
    const items: LineageFilterable[] = [];

    const store = createTestStore();
    const { getByTestId } = render(
      <Provider store={store}>
        <ServiceContext.Provider value={mockContext}>
          <TestComponent items={items} />
        </ServiceContext.Provider>
      </Provider>,
    );

    expect(getByTestId('filteredCount').textContent).toBe('0');
    expect(getByTestId('lineageMapSize').textContent).toBe('0');
    expect(getByTestId('lineageLoading').textContent).toBe('false');
    expect(mockGetTargetLineage).not.toHaveBeenCalled();
  });

  it('should only fetch lineage for new jvmIds (incremental fetching)', async () => {
    const initialItems: LineageFilterable[] = [{ jvmId: 'jvm-1' }];

    mockGetTargetLineage.mockImplementation((_: string) => {
      return of(createMockLineage('prod', 'app'));
    });

    const store = createTestStore();
    const { getByTestId, rerender } = render(
      <Provider store={store}>
        <ServiceContext.Provider value={mockContext}>
          <TestComponent items={initialItems} />
        </ServiceContext.Provider>
      </Provider>,
    );

    await waitFor(() => {
      expect(getByTestId('lineageLoading').textContent).toBe('false');
    });

    expect(mockGetTargetLineage).toHaveBeenCalledTimes(1);
    expect(mockGetTargetLineage).toHaveBeenCalledWith('jvm-1');

    // Add new items
    const updatedItems: LineageFilterable[] = [{ jvmId: 'jvm-1' }, { jvmId: 'jvm-2' }, { jvmId: 'jvm-3' }];

    rerender(
      <Provider store={store}>
        <ServiceContext.Provider value={mockContext}>
          <TestComponent items={updatedItems} />
        </ServiceContext.Provider>
      </Provider>,
    );

    await waitFor(() => {
      expect(mockGetTargetLineage).toHaveBeenCalledTimes(3);
    });

    // Should only fetch jvm-2 and jvm-3 (jvm-1 already fetched)
    expect(mockGetTargetLineage).toHaveBeenCalledWith('jvm-2');
    expect(mockGetTargetLineage).toHaveBeenCalledWith('jvm-3');
  });

  it('should populate lineageMap with fetched data', async () => {
    const items: LineageFilterable[] = [{ jvmId: 'jvm-1' }, { jvmId: 'jvm-2' }];

    mockGetTargetLineage.mockImplementation((_: string) => {
      return of(createMockLineage('prod', 'app'));
    });

    const store = createTestStore();
    const { getByTestId } = render(
      <Provider store={store}>
        <ServiceContext.Provider value={mockContext}>
          <TestComponent items={items} />
        </ServiceContext.Provider>
      </Provider>,
    );

    await waitFor(() => {
      expect(getByTestId('lineageLoading').textContent).toBe('false');
    });

    expect(getByTestId('lineageMapSize').textContent).toBe('2');
  });

  it('should set loading state during fetch', async () => {
    const items: LineageFilterable[] = [{ jvmId: 'jvm-1' }];

    // Create an observable that we can control
    let emitValue: (value: any) => void;
    const delayedObservable = new Observable((subscriber) => {
      emitValue = (value: any) => {
        subscriber.next(value);
        subscriber.complete();
      };
    });

    mockGetTargetLineage.mockReturnValue(delayedObservable);

    const store = createTestStore();
    const { getByTestId } = render(
      <Provider store={store}>
        <ServiceContext.Provider value={mockContext}>
          <TestComponent items={items} />
        </ServiceContext.Provider>
      </Provider>,
    );

    // Should be loading initially
    await waitFor(() => {
      expect(getByTestId('lineageLoading').textContent).toBe('true');
    });

    // Emit the value
    emitValue!(createMockLineage('prod', 'app'));

    // Should finish loading
    await waitFor(() => {
      expect(getByTestId('lineageLoading').textContent).toBe('false');
    });
  });
});
