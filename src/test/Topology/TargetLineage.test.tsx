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

import { EnvironmentNode, NodeType } from '@app/Shared/Services/api.types';
import { defaultServices } from '@app/Shared/Services/Services';
import { TargetLineage } from '@app/Topology/TargetLineage';
import '@testing-library/jest-dom';
import { cleanup, screen, within } from '@testing-library/react';
import { of, throwError } from 'rxjs';
import { render } from '../utils';

const mockJvmId = 'test-jvm-id';

const mockLineageData: EnvironmentNode = {
  id: 0,
  name: 'JDP',
  nodeType: NodeType.REALM,
  labels: [],
  children: [
    {
      id: 1,
      name: 'test-target',
      nodeType: NodeType.JVM,
      labels: [],
      target: {
        id: 1,
        connectUrl: 'service:jmx:rmi:///jndi/rmi://test:9091/jmxrmi',
        alias: 'test-target',
        jvmId: mockJvmId,
        labels: [],
        annotations: { cryostat: [], platform: [] },
        agent: false,
      },
    },
  ],
};

jest.mock('@app/Topology/GraphView/TopologyGraphView', () => ({
  TopologyGraphView: jest.fn(() => <div>Topology Graph View</div>),
}));

describe('<TargetLineage />', () => {
  let consoleWarnSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    cleanup();
    consoleWarnSpy.mockRestore();
  });

  it('should display topology graph when lineage data is successfully fetched', async () => {
    jest.spyOn(defaultServices.api, 'getTargetLineage').mockReturnValue(of(mockLineageData));

    render({
      routerConfigs: {
        routes: [
          {
            path: '/lineage',
            element: <TargetLineage jvmId={mockJvmId} />,
          },
        ],
      },
    });

    expect(await screen.findByText('Topology Graph View')).toBeInTheDocument();
    expect(screen.queryByText('Target Lineage Unavailable')).not.toBeInTheDocument();
  });

  it('should display empty state when 404 error occurs', async () => {
    const error404 = { status: 404, message: 'Not Found' };
    jest.spyOn(defaultServices.api, 'getTargetLineage').mockReturnValue(throwError(() => error404));

    render({
      routerConfigs: {
        routes: [
          {
            path: '/lineage',
            element: <TargetLineage jvmId={mockJvmId} />,
          },
        ],
      },
    });

    expect(await screen.findByText('Target Lineage Unavailable')).toBeInTheDocument();
    expect(screen.queryByText('Topology Graph View')).not.toBeInTheDocument();
    expect(consoleWarnSpy).toHaveBeenCalledWith('Target lineage unavailable:', error404);
  });

  it('should display empty state when 403 error occurs (auditing disabled)', async () => {
    const error403 = { status: 403, message: 'Forbidden' };
    jest.spyOn(defaultServices.api, 'getTargetLineage').mockReturnValue(throwError(() => error403));

    render({
      routerConfigs: {
        routes: [
          {
            path: '/lineage',
            element: <TargetLineage jvmId={mockJvmId} />,
          },
        ],
      },
    });

    expect(await screen.findByText('Target Lineage Unavailable')).toBeInTheDocument();
    expect(screen.queryByText('Topology Graph View')).not.toBeInTheDocument();
    expect(consoleWarnSpy).toHaveBeenCalledWith('Target lineage unavailable:', error403);
  });

  it('should display empty state when network error occurs', async () => {
    const networkError = new Error('Network error');
    jest.spyOn(defaultServices.api, 'getTargetLineage').mockReturnValue(throwError(() => networkError));

    render({
      routerConfigs: {
        routes: [
          {
            path: '/lineage',
            element: <TargetLineage jvmId={mockJvmId} />,
          },
        ],
      },
    });

    expect(await screen.findByText('Target Lineage Unavailable')).toBeInTheDocument();
    expect(screen.queryByText('Topology Graph View')).not.toBeInTheDocument();
    expect(consoleWarnSpy).toHaveBeenCalledWith('Target lineage unavailable:', networkError);
  });

  it('should display empty state with correct icon and heading level', async () => {
    const error = new Error('Test error');
    jest.spyOn(defaultServices.api, 'getTargetLineage').mockReturnValue(throwError(() => error));

    render({
      routerConfigs: {
        routes: [
          {
            path: '/lineage',
            element: <TargetLineage jvmId={mockJvmId} />,
          },
        ],
      },
    });

    const emptyState = await screen.findByText('Target Lineage Unavailable');
    expect(emptyState).toBeInTheDocument();

    const heading = emptyState.closest('h4');
    expect(heading).toBeInTheDocument();

    const emptyStateContainer = screen
      .getByText('Target Lineage Unavailable')
      .closest('.pf-v5-c-empty-state') as HTMLElement;
    expect(emptyStateContainer).toBeInTheDocument();

    const icon = within(emptyStateContainer).getByRole('img', { hidden: true });
    expect(icon).toBeInTheDocument();
  });

  it('should log console warning on error', async () => {
    const testError = { status: 500, message: 'Internal Server Error' };
    jest.spyOn(defaultServices.api, 'getTargetLineage').mockReturnValue(throwError(() => testError));

    render({
      routerConfigs: {
        routes: [
          {
            path: '/lineage',
            element: <TargetLineage jvmId={mockJvmId} />,
          },
        ],
      },
    });

    await screen.findByText('Target Lineage Unavailable');

    expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
    expect(consoleWarnSpy).toHaveBeenCalledWith('Target lineage unavailable:', testError);
  });
});
