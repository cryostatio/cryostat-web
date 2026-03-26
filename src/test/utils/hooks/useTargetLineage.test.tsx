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

import { ServiceContext } from '@app/Shared/Services/Services';
import { EnvironmentNode, NodeType, TargetNode } from '@app/Shared/Services/api.types';
import { useTargetLineage } from '@app/utils/hooks/useTargetLineage';
import { render, waitFor } from '@testing-library/react';
import * as React from 'react';
import { of, throwError } from 'rxjs';

const mockGetTargetLineage = jest.fn();

const mockContext = {
  api: {
    getTargetLineage: mockGetTargetLineage,
  },
} as any;

// Test component that uses the hook
const TestComponent: React.FC<{ jvmId: string; connectUrl?: string; alias?: string }> = ({
  jvmId,
  connectUrl,
  alias,
}) => {
  const result = useTargetLineage(jvmId, connectUrl, alias);
  return (
    <div>
      <div data-testid="displayName">{result.displayName}</div>
      <div data-testid="isLoading">{result.isLoading.toString()}</div>
      <div data-testid="error">{result.error?.message || 'null'}</div>
      <div data-testid="targetNode">{result.targetNode ? 'present' : 'null'}</div>
    </div>
  );
};

describe('useTargetLineage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const createMockLineage = (alias: string): EnvironmentNode => ({
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
            name: 'Target',
            nodeType: NodeType.JVM,
            labels: [],
            target: {
              agent: false,
              alias,
              connectUrl: 'service:jmx:rmi:///jndi/rmi://localhost:9091/jmxrmi',
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
  });

  it('should eventually load and display target representation', async () => {
    const alias = 'test-alias';
    const connectUrl = 'service:jmx:rmi:///jndi/rmi://localhost:9091/jmxrmi';
    mockGetTargetLineage.mockReturnValue(of(createMockLineage(alias)));

    const { getByTestId } = render(
      <ServiceContext.Provider value={mockContext}>
        <TestComponent jvmId="test-jvm-id" />
      </ServiceContext.Provider>,
    );

    // Wait for loading to complete
    await waitFor(() => {
      expect(getByTestId('isLoading').textContent).toBe('false');
    });

    expect(getByTestId('displayName').textContent).toBe(`${alias} (${connectUrl})`);
  });

  it('should fetch and display target representation on success', async () => {
    const alias = 'test-alias';
    const connectUrl = 'service:jmx:rmi:///jndi/rmi://localhost:9091/jmxrmi';
    mockGetTargetLineage.mockReturnValue(of(createMockLineage(alias)));

    const { getByTestId } = render(
      <ServiceContext.Provider value={mockContext}>
        <TestComponent jvmId="test-jvm-id" />
      </ServiceContext.Provider>,
    );

    await waitFor(() => {
      expect(getByTestId('isLoading').textContent).toBe('false');
    });

    expect(getByTestId('displayName').textContent).toBe(`${alias} (${connectUrl})`);
    expect(getByTestId('error').textContent).toBe('null');
    expect(getByTestId('targetNode').textContent).toBe('present');
  });

  it('should fallback to jvmId on API error', async () => {
    const jvmId = 'test-jvm-id';
    const error = new Error('API Error');
    mockGetTargetLineage.mockReturnValue(throwError(() => error));

    const { getByTestId } = render(
      <ServiceContext.Provider value={mockContext}>
        <TestComponent jvmId={jvmId} />
      </ServiceContext.Provider>,
    );

    await waitFor(() => {
      expect(getByTestId('isLoading').textContent).toBe('false');
    });

    expect(getByTestId('displayName').textContent).toBe(jvmId);
    expect(getByTestId('error').textContent).toBe('API Error');
    expect(getByTestId('targetNode').textContent).toBe('null');
  });

  it('should use connectUrl in fallback when provided', async () => {
    const jvmId = 'test-jvm-id';
    const connectUrl = 'service:jmx:rmi:///jndi/rmi://localhost:9091/jmxrmi';
    const error = new Error('API Error');
    mockGetTargetLineage.mockReturnValue(throwError(() => error));

    const { getByTestId } = render(
      <ServiceContext.Provider value={mockContext}>
        <TestComponent jvmId={jvmId} connectUrl={connectUrl} />
      </ServiceContext.Provider>,
    );

    await waitFor(() => {
      expect(getByTestId('isLoading').textContent).toBe('false');
    });

    expect(getByTestId('displayName').textContent).toBe(`${connectUrl} (${jvmId})`);
  });

  it('should use alias in fallback when provided', async () => {
    const jvmId = 'test-jvm-id';
    const connectUrl = 'service:jmx:rmi:///jndi/rmi://localhost:9091/jmxrmi';
    const alias = 'cached-alias';
    const error = new Error('API Error');
    mockGetTargetLineage.mockReturnValue(throwError(() => error));

    const { getByTestId } = render(
      <ServiceContext.Provider value={mockContext}>
        <TestComponent jvmId={jvmId} connectUrl={connectUrl} alias={alias} />
      </ServiceContext.Provider>,
    );

    await waitFor(() => {
      expect(getByTestId('isLoading').textContent).toBe('false');
    });

    expect(getByTestId('displayName').textContent).toBe(`${alias} (${connectUrl})`);
  });

  it('should not fetch for empty jvmId', () => {
    const { getByTestId } = render(
      <ServiceContext.Provider value={mockContext}>
        <TestComponent jvmId="" />
      </ServiceContext.Provider>,
    );

    expect(getByTestId('isLoading').textContent).toBe('false');
    expect(getByTestId('displayName').textContent).toBe('');
    expect(mockGetTargetLineage).not.toHaveBeenCalled();
  });

  it('should not fetch for "uploads" jvmId', () => {
    const { getByTestId } = render(
      <ServiceContext.Provider value={mockContext}>
        <TestComponent jvmId="uploads" />
      </ServiceContext.Provider>,
    );

    expect(getByTestId('isLoading').textContent).toBe('false');
    expect(getByTestId('displayName').textContent).toBe('uploads');
    expect(mockGetTargetLineage).not.toHaveBeenCalled();
  });

  it('should use connectUrl for "uploads" when provided', () => {
    const connectUrl = 'uploads-directory';
    const { getByTestId } = render(
      <ServiceContext.Provider value={mockContext}>
        <TestComponent jvmId="uploads" connectUrl={connectUrl} />
      </ServiceContext.Provider>,
    );

    expect(getByTestId('isLoading').textContent).toBe('false');
    expect(getByTestId('displayName').textContent).toBe(connectUrl);
    expect(mockGetTargetLineage).not.toHaveBeenCalled();
  });

  it('should fallback when lineage has no target', async () => {
    const jvmId = 'test-jvm-id';
    const emptyLineage: EnvironmentNode = {
      id: 1,
      name: 'Universe',
      nodeType: NodeType.UNIVERSE,
      labels: [],
      children: [],
    };
    mockGetTargetLineage.mockReturnValue(of(emptyLineage));

    const { getByTestId } = render(
      <ServiceContext.Provider value={mockContext}>
        <TestComponent jvmId={jvmId} />
      </ServiceContext.Provider>,
    );

    await waitFor(() => {
      expect(getByTestId('isLoading').textContent).toBe('false');
    });

    expect(getByTestId('displayName').textContent).toBe(jvmId);
    expect(getByTestId('targetNode').textContent).toBe('null');
  });

  it('should avoid redundant display when connectUrl equals jvmId', async () => {
    const jvmId = 'test-jvm-id';
    const error = new Error('API Error');
    mockGetTargetLineage.mockReturnValue(throwError(() => error));

    const { getByTestId } = render(
      <ServiceContext.Provider value={mockContext}>
        <TestComponent jvmId={jvmId} connectUrl={jvmId} />
      </ServiceContext.Provider>,
    );

    await waitFor(() => {
      expect(getByTestId('isLoading').textContent).toBe('false');
    });

    // Should only show once, not "test-jvm-id (test-jvm-id)"
    expect(getByTestId('displayName').textContent).toBe(jvmId);
  });
});
