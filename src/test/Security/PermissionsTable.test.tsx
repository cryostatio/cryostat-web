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

import { PermissionsTable } from '@app/Security/PermissionsTable';
import { Mapping } from '@app/Shared/Services/api.types';
import { defaultServices } from '@app/Shared/Services/Services';
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { of } from 'rxjs';
import { DEFAULT_DIMENSIONS, render, resize } from '../utils';

const mockMapping: Mapping[] = [
  {
    permission: {
      resource: 'targets',
      action: 'read',
    },
    response: {
      authorized: true,
    },
  },
  {
    permission: {
      resource: 'audit',
      action: 'write',
    },
    response: {
      authorized: false,
    },
  },
];

jest.spyOn(defaultServices.api, 'getPermissions').mockReturnValue(of(mockMapping));

describe('<PermissionsTable />', () => {
  beforeAll(async () => {
    resize(2400, 1080);
  });

  afterEach(cleanup);

  afterAll(() => {
    resize(DEFAULT_DIMENSIONS[0], DEFAULT_DIMENSIONS[1]);
  });

  it('should render the Triggers table correctly', async () => {
    render({
      routerConfigs: {
        routes: [
          {
            path: '/triggers',
            element: <PermissionsTable permissions={mockMapping} />,
          },
        ],
      },
    });

    const rows = screen.getAllByRole('row');
    expect(rows[1].querySelector('td')).toHaveTextContent('audit');
    expect(rows[2].querySelector('td')).toHaveTextContent('targets');
  });

  it('should display the toolbar', async () => {
    const { container } = render({
      routerConfigs: {
        routes: [
          {
            path: '/triggers',
            element: <PermissionsTable permissions={mockMapping} />,
          },
        ],
      },
    });
    const newFilterTool = container.querySelector("input[placeholder='Search by resource, action'][type='text']");
    expect(newFilterTool).toBeInTheDocument();
    expect(newFilterTool).toBeVisible();
  });

  it('should filter permissions by resource and action', () => {
    render({
      routerConfigs: {
        routes: [
          {
            path: '/triggers',
            element: <PermissionsTable permissions={mockMapping} />,
          },
        ],
      },
    });

    const filter = screen.getByPlaceholderText('Search by resource, action');

    fireEvent.change(filter, { target: { value: 'audit' } });
    expect(screen.getByText('audit')).toBeInTheDocument();
    expect(screen.queryByText('targets')).not.toBeInTheDocument();

    fireEvent.change(filter, { target: { value: 'write' } });
    expect(screen.getByText('audit')).toBeInTheDocument();
    expect(screen.queryByText('targets')).not.toBeInTheDocument();
  });

  it('should display an empty state when no permissions are found', async () => {
    render({
      routerConfigs: {
        routes: [
          {
            path: '/triggers',
            element: <PermissionsTable permissions={[]} />,
          },
        ],
      },
    });

    expect(screen.getByText('No User Permissions Found')).toBeInTheDocument();
  });
});
