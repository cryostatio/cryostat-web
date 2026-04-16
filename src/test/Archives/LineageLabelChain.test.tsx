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

import { LineageLabelChain } from '@app/Archives/LineageLabelChain';
import { LineageNode, NodeType } from '@app/Shared/Services/api.types';
import { useArchiveFilters } from '@app/utils/hooks/useArchiveFilters';
import { cleanup, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import { render, testT } from '../utils';

jest.mock('@app/utils/hooks/useArchiveFilters');
const mockUseArchiveFilters = useArchiveFilters as jest.MockedFunction<typeof useArchiveFilters>;

const mockAddLineageFilter = jest.fn();

describe('<LineageLabelChain />', () => {
  let mockLineageFilters: LineageNode[];

  beforeEach(() => {
    mockLineageFilters = [];
    mockUseArchiveFilters.mockReturnValue({
      lineageFilters: mockLineageFilters,
      addLineageFilter: mockAddLineageFilter,
      timeRange: null,
      searchText: '',
      hasActiveFilters: false,
      removeLineageFilter: jest.fn(),
      clearLineageFilters: jest.fn(),
      setTimeRange: jest.fn(),
      clearTimeRange: jest.fn(),
      setSearchText: jest.fn(),
      clearAllFilters: jest.fn(),
    });
  });

  afterEach(() => {
    cleanup();
    jest.clearAllMocks();
  });

  it('renders nothing when lineagePath is empty', () => {
    const { container } = render({
      routerConfigs: {
        routes: [
          {
            path: '/archives',
            element: <LineageLabelChain lineagePath={[]} />,
          },
        ],
      },
    });

    expect(container.firstChild).toBeNull();
  });

  it('renders a single node label', () => {
    const lineagePath: LineageNode[] = [{ nodeType: NodeType.REALM, name: 'my-cluster' }];

    render({
      routerConfigs: {
        routes: [
          {
            path: '/archives',
            element: <LineageLabelChain lineagePath={lineagePath} />,
          },
        ],
      },
    });

    const chain = screen.getByRole('list', {
      name: testT('LineageLabelChain.ARIA_LABELS.CHAIN'),
    });
    expect(chain).toBeInTheDocument();

    // Labels are rendered in a list
    expect(chain).toHaveTextContent('Realm: my-cluster');
  });

  it('renders multiple nodes in left-to-right order', () => {
    const lineagePath: LineageNode[] = [
      { nodeType: NodeType.REALM, name: 'my-cluster' },
      { nodeType: NodeType.NAMESPACE, name: 'production' },
      { nodeType: NodeType.DEPLOYMENT, name: 'my-app' },
    ];

    render({
      routerConfigs: {
        routes: [
          {
            path: '/archives',
            element: <LineageLabelChain lineagePath={lineagePath} />,
          },
        ],
      },
    });

    const chain = screen.getByRole('list', {
      name: testT('LineageLabelChain.ARIA_LABELS.CHAIN'),
    });

    // All nodes should be present as labels
    expect(chain).toHaveTextContent('Realm: my-cluster');
    expect(chain).toHaveTextContent('Namespace: production');
    expect(chain).toHaveTextContent('Deployment: my-app');
  });

  it('calls addLineageFilter when a node is clicked', async () => {
    const user = userEvent.setup();
    const lineagePath: LineageNode[] = [
      { nodeType: NodeType.REALM, name: 'my-cluster' },
      { nodeType: NodeType.NAMESPACE, name: 'production' },
    ];

    render({
      routerConfigs: {
        routes: [
          {
            path: '/archives',
            element: <LineageLabelChain lineagePath={lineagePath} />,
          },
        ],
      },
    });

    const chain = screen.getByRole('list', {
      name: testT('LineageLabelChain.ARIA_LABELS.CHAIN'),
    });

    // Find the label by its text content and click it
    const productionLabel = within(chain).getByText('Namespace: production');
    await user.click(productionLabel);

    expect(mockAddLineageFilter).toHaveBeenCalledWith({ nodeType: NodeType.NAMESPACE, name: 'production' });
  });

  it('displays filtered nodes as bold text instead of buttons', () => {
    const lineagePath: LineageNode[] = [
      { nodeType: NodeType.REALM, name: 'my-cluster' },
      { nodeType: NodeType.NAMESPACE, name: 'production' },
      { nodeType: NodeType.DEPLOYMENT, name: 'my-app' },
    ];

    mockLineageFilters = [{ nodeType: NodeType.NAMESPACE, name: 'production' }];
    mockUseArchiveFilters.mockReturnValue({
      lineageFilters: mockLineageFilters,
      addLineageFilter: mockAddLineageFilter,
      timeRange: null,
      searchText: '',
      hasActiveFilters: true,
      removeLineageFilter: jest.fn(),
      clearLineageFilters: jest.fn(),
      setTimeRange: jest.fn(),
      clearTimeRange: jest.fn(),
      setSearchText: jest.fn(),
      clearAllFilters: jest.fn(),
    });

    render({
      routerConfigs: {
        routes: [
          {
            path: '/archives',
            element: <LineageLabelChain lineagePath={lineagePath} />,
          },
        ],
      },
    });

    const chain = screen.getByRole('list', {
      name: testT('LineageLabelChain.ARIA_LABELS.CHAIN'),
    });

    // All nodes should be present as labels (filtered ones have close button)
    expect(chain).toHaveTextContent('Realm: my-cluster');
    expect(chain).toHaveTextContent('Namespace: production');
    expect(chain).toHaveTextContent('Deployment: my-app');
  });

  it('applies custom CSS class when provided', () => {
    const lineagePath: LineageNode[] = [{ nodeType: NodeType.REALM, name: 'my-cluster' }];

    const { container } = render({
      routerConfigs: {
        routes: [
          {
            path: '/archives',
            element: <LineageLabelChain lineagePath={lineagePath} className="custom-chain" />,
          },
        ],
      },
    });

    const chain = container.querySelector('.custom-chain');
    expect(chain).toBeInTheDocument();
  });

  it('handles full lineage path', async () => {
    const user = userEvent.setup();
    const lineagePath: LineageNode[] = [
      { nodeType: NodeType.REALM, name: 'kubernetes-cluster' },
      { nodeType: NodeType.NAMESPACE, name: 'production' },
      { nodeType: NodeType.DEPLOYMENT, name: 'backend-api' },
      { nodeType: NodeType.POD, name: 'backend-api-7d9f8c-xyz' },
    ];

    render({
      routerConfigs: {
        routes: [
          {
            path: '/archives',
            element: <LineageLabelChain lineagePath={lineagePath} />,
          },
        ],
      },
    });

    const chain = screen.getByRole('list', {
      name: testT('LineageLabelChain.ARIA_LABELS.CHAIN'),
    });

    // All nodes should be present as labels
    expect(chain).toHaveTextContent('Realm: kubernetes-cluster');
    expect(chain).toHaveTextContent('Namespace: production');
    expect(chain).toHaveTextContent('Deployment: backend-api');
    expect(chain).toHaveTextContent('Pod: backend-api-7d9f8c-xyz');

    // Click on backend-api label
    const backendLabel = within(chain).getByText('Deployment: backend-api');
    await user.click(backendLabel);

    expect(mockAddLineageFilter).toHaveBeenCalledWith({ nodeType: NodeType.DEPLOYMENT, name: 'backend-api' });
  });

  it('handles multiple filtered nodes correctly', () => {
    const lineagePath: LineageNode[] = [
      { nodeType: NodeType.REALM, name: 'my-cluster' },
      { nodeType: NodeType.NAMESPACE, name: 'production' },
      { nodeType: NodeType.DEPLOYMENT, name: 'my-app' },
      { nodeType: NodeType.POD, name: 'my-pod-123' },
    ];

    mockLineageFilters = [
      { nodeType: NodeType.REALM, name: 'my-cluster' },
      { nodeType: NodeType.DEPLOYMENT, name: 'my-app' },
    ];
    mockUseArchiveFilters.mockReturnValue({
      lineageFilters: mockLineageFilters,
      addLineageFilter: mockAddLineageFilter,
      timeRange: null,
      searchText: '',
      hasActiveFilters: true,
      removeLineageFilter: jest.fn(),
      clearLineageFilters: jest.fn(),
      setTimeRange: jest.fn(),
      clearTimeRange: jest.fn(),
      setSearchText: jest.fn(),
      clearAllFilters: jest.fn(),
    });

    render({
      routerConfigs: {
        routes: [
          {
            path: '/archives',
            element: <LineageLabelChain lineagePath={lineagePath} />,
          },
        ],
      },
    });

    const chain = screen.getByRole('list', {
      name: testT('LineageLabelChain.ARIA_LABELS.CHAIN'),
    });

    // All nodes should be present as labels (filtered ones have close button)
    expect(chain).toHaveTextContent('Realm: my-cluster');
    expect(chain).toHaveTextContent('Namespace: production');
    expect(chain).toHaveTextContent('Deployment: my-app');
    expect(chain).toHaveTextContent('Pod: my-pod-123');
  });

  it('renders with correct aria-labels for accessibility', () => {
    const lineagePath: LineageNode[] = [
      { nodeType: NodeType.NAMESPACE, name: 'test-ns' },
      { nodeType: NodeType.DEPLOYMENT, name: 'test-deploy' },
    ];

    render({
      routerConfigs: {
        routes: [
          {
            path: '/archives',
            element: <LineageLabelChain lineagePath={lineagePath} />,
          },
        ],
      },
    });

    const chain = screen.getByRole('list', {
      name: testT('LineageLabelChain.ARIA_LABELS.CHAIN'),
    });
    expect(chain).toBeInTheDocument();

    // Labels should have aria-labels for accessibility
    const testNsLabel = within(chain).getByText('Namespace: test-ns');
    expect(testNsLabel).toBeInTheDocument();
  });
});
