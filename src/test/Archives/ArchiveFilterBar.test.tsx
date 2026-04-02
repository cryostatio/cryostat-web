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

import { ArchiveFilterBar } from '@app/Archives/ArchiveFilterBar';
import { defaultArchiveFilters } from '@app/Shared/Redux/Filters/ArchiveFiltersSlice';
import { RootState } from '@app/Shared/Redux/ReduxStore';
import { LineageNode, NodeType } from '@app/Shared/Services/api.types';
import { cleanup, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { render, testT } from '../utils';

const mockLineageNode1: LineageNode = {
  nodeType: NodeType.NAMESPACE,
  name: 'my-namespace',
};

const mockLineageNode2: LineageNode = {
  nodeType: NodeType.DEPLOYMENT,
  name: 'my-app',
};

describe('<ArchiveFilterBar />', () => {
  let preloadedState: Partial<RootState>;

  beforeEach(() => {
    preloadedState = {
      archiveFilters: defaultArchiveFilters,
    };
  });

  afterEach(cleanup);

  it('should not render when no filters are active', () => {
    const { container } = render({
      routerConfigs: {
        routes: [
          {
            path: '/archives',
            element: <ArchiveFilterBar />,
          },
        ],
      },
      preloadedState,
    });

    expect(container.firstChild).toBeNull();
  });

  it('should render lineage filters as chips', () => {
    preloadedState.archiveFilters = {
      ...defaultArchiveFilters,
      lineageFilters: [mockLineageNode1, mockLineageNode2],
    };

    render({
      routerConfigs: {
        routes: [
          {
            path: '/archives',
            element: <ArchiveFilterBar />,
          },
        ],
      },
      preloadedState,
    });

    // Verify lineage filter chips are visible
    expect(screen.getByText(/Namespace: my-namespace/i)).toBeInTheDocument();
    expect(screen.getByText(/Deployment: my-app/i)).toBeInTheDocument();
  });

  it('should render time range filter when not "all"', () => {
    preloadedState.archiveFilters = {
      ...defaultArchiveFilters,
      timeRange: { type: 'preset', preset: 'last24h' },
    };

    render({
      routerConfigs: {
        routes: [
          {
            path: '/archives',
            element: <ArchiveFilterBar />,
          },
        ],
      },
      preloadedState,
    });

    // Verify time range filter is visible
    expect(screen.getByText('Last 24 Hours')).toBeInTheDocument();
  });

  it('should not render time range filter when set to "all"', () => {
    preloadedState.archiveFilters = {
      ...defaultArchiveFilters,
      timeRange: { type: 'preset', preset: 'all' },
    };

    render({
      routerConfigs: {
        routes: [
          {
            path: '/archives',
            element: <ArchiveFilterBar />,
          },
        ],
      },
      preloadedState,
    });

    expect(screen.queryByText('Time Range')).not.toBeInTheDocument();
  });

  it('should render custom time range filter', () => {
    preloadedState.archiveFilters = {
      ...defaultArchiveFilters,
      timeRange: {
        type: 'custom',
        startTime: '2024-01-01T00:00:00Z',
        endTime: '2024-01-31T23:59:59Z',
      },
    };

    render({
      routerConfigs: {
        routes: [
          {
            path: '/archives',
            element: <ArchiveFilterBar />,
          },
        ],
      },
      preloadedState,
    });

    expect(screen.getByText('Time Range')).toBeInTheDocument();
    expect(screen.getByText('2024-01-01 - 2024-01-31')).toBeInTheDocument();
  });

  it('should render search text filter', () => {
    preloadedState.archiveFilters = {
      ...defaultArchiveFilters,
      searchText: 'my-recording',
    };

    render({
      routerConfigs: {
        routes: [
          {
            path: '/archives',
            element: <ArchiveFilterBar />,
          },
        ],
      },
      preloadedState,
    });

    // Verify search text filter is visible
    expect(screen.getByText('my-recording')).toBeInTheDocument();
  });

  it('should render "Clear all filters" button when filters are active', () => {
    preloadedState.archiveFilters = {
      ...defaultArchiveFilters,
      lineageFilters: [mockLineageNode1],
    };

    render({
      routerConfigs: {
        routes: [
          {
            path: '/archives',
            element: <ArchiveFilterBar />,
          },
        ],
      },
      preloadedState,
    });

    expect(screen.getByRole('button', { name: /clear all filters/i })).toBeInTheDocument();
  });

  it('should render all filter types together', () => {
    preloadedState.archiveFilters = {
      ...defaultArchiveFilters,
      lineageFilters: [mockLineageNode1, mockLineageNode2],
      timeRange: { type: 'preset', preset: 'last7d' },
      searchText: 'test-search',
    };

    render({
      routerConfigs: {
        routes: [
          {
            path: '/archives',
            element: <ArchiveFilterBar />,
          },
        ],
      },
      preloadedState,
    });

    // Verify all filter values are visible
    expect(screen.getByText(/Namespace: my-namespace/i)).toBeInTheDocument();
    expect(screen.getByText(/Deployment: my-app/i)).toBeInTheDocument();
    expect(screen.getByText('Last 7 Days')).toBeInTheDocument();
    expect(screen.getByText('test-search')).toBeInTheDocument();

    // Verify clear all button is present
    expect(screen.getByRole('button', { name: /clear all filters/i })).toBeInTheDocument();
  });

  it('should handle removing individual lineage filter', async () => {
    preloadedState.archiveFilters = {
      ...defaultArchiveFilters,
      lineageFilters: [mockLineageNode1, mockLineageNode2],
    };

    const { user, store } = render({
      routerConfigs: {
        routes: [
          {
            path: '/archives',
            element: <ArchiveFilterBar />,
          },
        ],
      },
      preloadedState,
    });

    // Verify both chips are initially visible
    expect(screen.getByText(/Namespace: my-namespace/i)).toBeInTheDocument();
    expect(screen.getByText(/Deployment: my-app/i)).toBeInTheDocument();

    // Find and click the close button for the first chip
    const closeButton = screen.getByRole('button', { name: /Close Namespace: my-namespace/i });
    await user.click(closeButton);

    // Verify the filter was removed from state
    const state = store.getState();
    expect(state.archiveFilters.lineageFilters).toHaveLength(1);
    expect(state.archiveFilters.lineageFilters[0]).toEqual(mockLineageNode2);
  });

  it('should handle clearing all lineage filters', async () => {
    preloadedState.archiveFilters = {
      ...defaultArchiveFilters,
      lineageFilters: [mockLineageNode1, mockLineageNode2],
    };

    const { user, store } = render({
      routerConfigs: {
        routes: [
          {
            path: '/archives',
            element: <ArchiveFilterBar />,
          },
        ],
      },
      preloadedState,
    });

    // Verify both chips are initially visible
    expect(screen.getByText(/Namespace: my-namespace/i)).toBeInTheDocument();
    expect(screen.getByText(/Deployment: my-app/i)).toBeInTheDocument();

    // Find and click the label group close button
    const groupCloseButton = screen.getByRole('button', { name: /Close label group/i });
    await user.click(groupCloseButton);

    // Verify all lineage filters were removed
    const state = store.getState();
    expect(state.archiveFilters.lineageFilters).toHaveLength(0);
  });

  it('should handle clearing time range filter', async () => {
    preloadedState.archiveFilters = {
      ...defaultArchiveFilters,
      timeRange: { type: 'preset', preset: 'last24h' },
    };

    const { user, store } = render({
      routerConfigs: {
        routes: [
          {
            path: '/archives',
            element: <ArchiveFilterBar />,
          },
        ],
      },
      preloadedState,
    });

    // Verify time range is initially visible
    expect(screen.getByText('Last 24 Hours')).toBeInTheDocument();

    // Find and click the close button for time range filter
    const closeButton = screen.getByRole('button', { name: /Close Last 24 Hours/i });
    await user.click(closeButton);

    // Verify time range was reset to "all"
    const state = store.getState();
    expect(state.archiveFilters.timeRange).toEqual({ type: 'preset', preset: 'all' });
  });

  it('should handle clearing search text filter', async () => {
    preloadedState.archiveFilters = {
      ...defaultArchiveFilters,
      searchText: 'my-search',
    };

    const { user, store } = render({
      routerConfigs: {
        routes: [
          {
            path: '/archives',
            element: <ArchiveFilterBar />,
          },
        ],
      },
      preloadedState,
    });

    // Verify search text is initially visible
    expect(screen.getByText('my-search')).toBeInTheDocument();

    // Find and click the close button for search filter
    const closeButton = screen.getByRole('button', { name: /Close my-search/i });
    await user.click(closeButton);

    // Verify search text was cleared
    const state = store.getState();
    expect(state.archiveFilters.searchText).toBe('');
  });

  it('should handle clearing all filters', async () => {
    preloadedState.archiveFilters = {
      ...defaultArchiveFilters,
      lineageFilters: [mockLineageNode1],
      timeRange: { type: 'preset', preset: 'last24h' },
      searchText: 'test',
    };

    const { user, store } = render({
      routerConfigs: {
        routes: [
          {
            path: '/archives',
            element: <ArchiveFilterBar />,
          },
        ],
      },
      preloadedState,
    });

    // Click "Clear all filters" button
    const clearAllButton = screen.getByRole('button', { name: /clear all filters/i });
    await user.click(clearAllButton);

    // Verify all filters were cleared
    const state = store.getState();
    expect(state.archiveFilters).toEqual(defaultArchiveFilters);
  });

  it('should apply custom className', () => {
    preloadedState.archiveFilters = {
      ...defaultArchiveFilters,
      lineageFilters: [mockLineageNode1],
    };

    const { container } = render({
      routerConfigs: {
        routes: [
          {
            path: '/archives',
            element: <ArchiveFilterBar className="custom-class" />,
          },
        ],
      },
      preloadedState,
    });

    // Verify the component rendered and has the custom class
    const toolbar = container.querySelector('.custom-class');
    expect(toolbar).toBeInTheDocument();
    // PatternFly v6 uses pf-v6-c-toolbar
    expect(toolbar).toHaveClass('pf-m-sticky');
  });
});
