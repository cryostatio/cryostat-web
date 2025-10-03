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

import { AllTargetsThreadDumpsTable } from '@app/Diagnostics/AllTargetsThreadDumpsTable';
import { NotificationMessage, Target, ThreadDump } from '@app/Shared/Services/api.types';
import { defaultServices } from '@app/Shared/Services/Services';
import '@testing-library/jest-dom';
import { cleanup, screen, within } from '@testing-library/react';
import { of } from 'rxjs';
import { createMockForPFTableRef, render, renderSnapshot } from '../utils';

const mockNewConnectUrl = 'service:jmx:rmi://someNewUrl';
const mockNewAlias = 'newTarget';
const mockNewTarget: Target = {
  agent: false,
  jvmId: 'target4',
  connectUrl: mockNewConnectUrl,
  alias: mockNewAlias,
  labels: [],
  annotations: {
    cryostat: [],
    platform: [],
  },
};

const mockTargetFoundNotification = {
  message: {
    event: { kind: 'FOUND', serviceRef: mockNewTarget },
  },
} as NotificationMessage;

const mockConnectUrl1 = 'service:jmx:rmi://someUrl1';
const mockAlias1 = 'fooTarget1';
const mockTarget1: Target = {
  agent: false,
  jvmId: 'target1',
  connectUrl: mockConnectUrl1,
  alias: mockAlias1,
  labels: [],
  annotations: {
    cryostat: [],
    platform: [],
  },
};
const mockConnectUrl2 = 'service:jmx:rmi://someUrl2';
const mockAlias2 = 'fooTarget2';
const mockTarget2: Target = {
  agent: false,
  jvmId: 'target2',
  connectUrl: mockConnectUrl2,
  alias: mockAlias2,
  labels: [],
  annotations: {
    cryostat: [],
    platform: [],
  },
};
const mockConnectUrl3 = 'service:jmx:rmi://someUrl3';
const mockAlias3 = 'fooTarget3';
const mockTarget3: Target = {
  agent: false,
  jvmId: 'target3',
  connectUrl: mockConnectUrl3,
  alias: mockAlias3,
  labels: [],
  annotations: {
    cryostat: [],
    platform: [],
  },
};

const mockThreadDump: ThreadDump = {
  downloadUrl: 'someDownloadUrl',
  threadDumpId: 'someUuid',
  jvmId: mockTarget1.jvmId,
  size: 1,
  metadata: { labels: [{ key: 'someLabel', value: 'someUpdatedValue' }] },
};

const mockCount1 = 1;
const mockCount2 = 3;
const mockCount3 = 0;
const mockNewCount = 12;

const mockThreadDumpDeletedNotification = {
  message: {
    jvmId: mockTarget1.jvmId,
    threadDump: {
      jvmId: mockTarget1.jvmId,
      downloadUrl: 'foo',
      threadDumpId: mockThreadDump,
      lastModified: 0,
      size: 0,
    },
  },
} as NotificationMessage;

const mockThreadDumpNotification = {
  message: {
    jvmId: mockTarget1.jvmId,
    threadDump: {
      jvmId: mockTarget1.jvmId,
      downloadUrl: 'foo',
      threadDumpId: mockThreadDump,
      lastModified: 0,
      size: 0,
    },
  },
} as NotificationMessage;

const mockTargetLostNotification = {
  message: {
    event: { kind: 'LOST', serviceRef: mockTarget1 },
  },
} as NotificationMessage;

const mockTargetsAndCountsResponse = {
  data: {
    targetNodes: [
      {
        target: {
          ...mockTarget1,
          threadDumps: {
            data: {
              jvmId: mockAlias1,
              downloadUrl: 'foo',
              threadDumpId: 'fooDump',
              lastModified: 0,
              size: 123,
            },
            aggregate: {
              count: mockCount1,
            },
          },
        },
      },
      {
        target: {
          ...mockTarget2,
          threadDumps: {
            data: {
              jvmId: mockAlias2,
              downloadUrl: 'bar',
              threadDumpId: 'barDump',
              lastModified: 1,
              size: 456,
            },
            aggregate: {
              count: mockCount2,
            },
          },
        },
      },
      {
        target: {
          ...mockTarget3,
          threadDumps: {
            data: {
              jvmId: mockAlias3,
              downloadUrl: 'foobar',
              threadDumpId: 'foobarDump',
              lastModified: 3,
              size: 789,
            },
            aggregate: {
              count: mockCount3,
            },
          },
        },
      },
    ],
  },
};
const mockNewTargetCountResponse = {
  data: {
    targetNodes: [
      {
        target: {
          ...mockNewTarget,
          threadDumps: {
            data: {
              jvmId: mockNewTarget.jvmId,
              downloadUrl: 'foobar',
              threadDumpId: 'foobarDump1',
              lastModified: 4,
              size: 101112,
            },
            aggregate: {
              count: mockNewCount,
            },
          },
        },
      },
    ],
  },
};

jest.mock('@app/Diagnostics/ThreadDumpsTable', () => {
  return {
    ThreadDumpsTable: jest.fn((_) => {
      return <div>Thread Dumps Table</div>;
    }),
  };
});

jest.mock('@app/Shared/Services/Target.service', () => ({
  ...jest.requireActual('@app/Shared/Services/Target.service'), // Require actual implementation of utility functions for Target
}));

jest
  .spyOn(defaultServices.api, 'graphql')
  .mockReturnValueOnce(of(mockTargetsAndCountsResponse)) // renders correctly
  .mockReturnValueOnce(of(mockTargetsAndCountsResponse)) // has the correct table elements
  .mockReturnValueOnce(of(mockTargetsAndCountsResponse)) // hides targets with zero recordings
  .mockReturnValueOnce(of(mockTargetsAndCountsResponse)) // correctly handles the search function
  .mockReturnValueOnce(of(mockTargetsAndCountsResponse)) // expands targets to show their <ThreadDumpsTable />
  .mockReturnValueOnce(of(mockTargetsAndCountsResponse)) // adds a target upon receiving a notification (on load)
  .mockReturnValueOnce(of(mockNewTargetCountResponse)) // adds a target upon receiving a notification (on notification)
  .mockReturnValueOnce(of(mockTargetsAndCountsResponse)) // removes a target upon receiving a notification)
  .mockReturnValue(of(mockTargetsAndCountsResponse)); // remaining tests

jest
  .spyOn(defaultServices.notificationChannel, 'messages')
  .mockReturnValueOnce(of()) // renders correctly
  .mockReturnValueOnce(of())
  .mockReturnValueOnce(of())

  .mockReturnValueOnce(of()) // has the correct table elements
  .mockReturnValueOnce(of())
  .mockReturnValueOnce(of())

  .mockReturnValueOnce(of()) // hides targets with zero recordings
  .mockReturnValueOnce(of())
  .mockReturnValueOnce(of())

  .mockReturnValueOnce(of()) // correctly handles the search function
  .mockReturnValueOnce(of())
  .mockReturnValueOnce(of())

  .mockReturnValueOnce(of()) // expands targets to show their <ArchivedThreadDumpsTable />
  .mockReturnValueOnce(of())
  .mockReturnValueOnce(of())

  .mockReturnValueOnce(of(mockTargetFoundNotification)) // adds a target upon receiving a notification
  .mockReturnValueOnce(of())
  .mockReturnValueOnce(of())
  .mockReturnValueOnce(of())

  .mockReturnValueOnce(of(mockTargetLostNotification)) // removes a target upon receiving a notification
  .mockReturnValueOnce(of())
  .mockReturnValueOnce(of())

  .mockReturnValueOnce(of(mockThreadDumpNotification))
  .mockReturnValueOnce(of())
  .mockReturnValueOnce(of())

  .mockReturnValueOnce(of())
  .mockReturnValueOnce(of(mockThreadDumpDeletedNotification)) // decrements the count when an archived recording is deleted
  .mockReturnValueOnce(of());

jest.spyOn(window, 'open').mockReturnValue(null);

describe('<AllTargetsThreadDumpsTable />', () => {
  afterEach(cleanup);

  it('renders correctly', async () => {
    const tree = await renderSnapshot({
      routerConfigs: { routes: [{ path: '/thread-dumps', element: <AllTargetsThreadDumpsTable /> }] },
      createNodeMock: createMockForPFTableRef,
    });
    expect(tree?.toJSON()).toMatchSnapshot();
  });

  it('has the correct table elements', async () => {
    render({ routerConfigs: { routes: [{ path: '/thread-dumps', element: <AllTargetsThreadDumpsTable /> }] } });

    expect(screen.getByLabelText('all-targets-table')).toBeInTheDocument();
    expect(screen.getByText('Target')).toBeInTheDocument();
    expect(screen.getByText('Archives')).toBeInTheDocument();
    expect(screen.getByText(`${mockTarget1.alias} (${mockTarget1.connectUrl})`)).toBeInTheDocument();
    expect(screen.getByText(`${mockCount1}`)).toBeInTheDocument();
    expect(screen.getByText(`${mockTarget2.alias} (${mockTarget2.connectUrl})`)).toBeInTheDocument();
    expect(screen.getByText(`${mockCount2}`)).toBeInTheDocument();
    // Default to hide target with 0 archives
    expect(screen.queryByText(`${mockTarget3.alias} (${mockTarget3.connectUrl})`)).not.toBeInTheDocument();
    expect(screen.queryByText(`${mockCount3}`)).not.toBeInTheDocument();
  });

  it('hides targets with zero Thread Dumps', async () => {
    const { user } = render({
      routerConfigs: { routes: [{ path: '/thread-dumps', element: <AllTargetsThreadDumpsTable /> }] },
    });

    // By default targets with zero recordings are hidden so the only rows
    // in the table should be mockTarget1 (mockCount1 == 1) and mockTarget2 (mockCount2 == 3)
    let tableBody = screen.getAllByRole('rowgroup')[1];
    let rows = within(tableBody).getAllByRole('row');
    expect(rows).toHaveLength(2);
    const firstTarget = rows[0];
    expect(within(firstTarget).getByText(`${mockTarget1.alias} (${mockTarget1.connectUrl})`)).toBeTruthy();
    expect(within(firstTarget).getByText(`${mockCount1}`)).toBeTruthy();
    const secondTarget = rows[1];
    expect(within(secondTarget).getByText(`${mockTarget2.alias} (${mockTarget2.connectUrl})`)).toBeTruthy();
    expect(within(secondTarget).getByText(`${mockCount2}`)).toBeTruthy();

    const checkbox = screen.getByLabelText('all-targets-hide-check');
    await user.click(checkbox);

    tableBody = screen.getAllByRole('rowgroup')[1];
    rows = within(tableBody).getAllByRole('row');
    expect(rows).toHaveLength(3);
    const thirdTarget = rows[2];
    expect(within(thirdTarget).getByText(`${mockTarget3.alias} (${mockTarget3.connectUrl})`)).toBeTruthy();
    expect(within(thirdTarget).getByText(`${mockCount3}`)).toBeTruthy();
  });

  it('correctly handles the search function', async () => {
    const { user } = render({
      routerConfigs: { routes: [{ path: '/thread-dumps', element: <AllTargetsThreadDumpsTable /> }] },
    });
    const search = screen.getByLabelText('Search input');

    let tableBody = screen.getAllByRole('rowgroup')[1];
    let rows = within(tableBody).getAllByRole('row');
    expect(rows).toHaveLength(2);

    await user.type(search, '1');
    tableBody = screen.getAllByRole('rowgroup')[1];
    rows = within(tableBody).getAllByRole('row');
    expect(rows).toHaveLength(1);
    const firstTarget = rows[0];
    expect(within(firstTarget).getByText(`${mockTarget1.alias} (${mockTarget1.connectUrl})`)).toBeTruthy();
    expect(within(firstTarget).getByText(`${mockCount1}`)).toBeTruthy();

    await user.type(search, 'asdasdjhj');
    expect(screen.getByText('No Thread Dumps')).toBeInTheDocument();
    expect(screen.queryByLabelText('all-targets-table')).not.toBeInTheDocument();

    await user.clear(search);
    tableBody = screen.getAllByRole('rowgroup')[1];
    rows = within(tableBody).getAllByRole('row');
    expect(rows).toHaveLength(2);
  });

  it('expands targets to show their <ThreadDumpsTable />', async () => {
    const { user } = render({
      routerConfigs: { routes: [{ path: '/thread-dumps', element: <AllTargetsThreadDumpsTable /> }] },
    });

    expect(screen.queryByText('Thread Dumps Table')).not.toBeInTheDocument();

    let tableBody = screen.getAllByRole('rowgroup')[1];
    let rows = within(tableBody).getAllByRole('row');
    expect(rows).toHaveLength(2);

    const firstTarget = rows[0];
    const expand = within(firstTarget).getByLabelText('Details');
    await user.click(expand);

    tableBody = screen.getAllByRole('rowgroup')[1];
    rows = within(tableBody).getAllByRole('row');
    expect(rows).toHaveLength(3);

    const expandedTable = rows[1];
    expect(within(expandedTable).getByText('Thread Dumps Table')).toBeTruthy();

    await user.click(expand);
    tableBody = screen.getAllByRole('rowgroup')[1];
    rows = within(tableBody).getAllByRole('row');
    expect(rows).toHaveLength(2);
    expect(screen.queryByText('Thread Dumps Table')).not.toBeInTheDocument();
  });

  it('adds a target upon receiving a notification', async () => {
    render({ routerConfigs: { routes: [{ path: '/thread-dumps', element: <AllTargetsThreadDumpsTable /> }] } });

    expect(screen.getByText(`${mockNewTarget.alias} (${mockNewTarget.connectUrl})`)).toBeInTheDocument();
    expect(screen.getByText(`${mockNewCount}`)).toBeInTheDocument();
  });

  it('removes a target upon receiving a notification', async () => {
    render({ routerConfigs: { routes: [{ path: '/thread-dumps', element: <AllTargetsThreadDumpsTable /> }] } });

    expect(screen.queryByText(`${mockTarget1.alias} (${mockTarget1.connectUrl})`)).not.toBeInTheDocument();
    expect(screen.queryByText(`${mockCount1}`)).not.toBeInTheDocument();
  });

  it('increments the count when a Thread Dump is saved', async () => {
    render({ routerConfigs: { routes: [{ path: '/thread-dumps', element: <AllTargetsThreadDumpsTable /> }] } });

    const tableBody = screen.getAllByRole('rowgroup')[1];
    const rows = within(tableBody).getAllByRole('row');
    expect(rows).toHaveLength(2);

    const firstTarget = rows[0];
    expect(within(firstTarget).getByText(`${mockCount1 + 1}`)).toBeTruthy();
  });

  it('decrements the count when a Thread Dump is deleted', async () => {
    const { user } = render({
      routerConfigs: { routes: [{ path: '/thread-dumps', element: <AllTargetsThreadDumpsTable /> }] },
    });

    const checkbox = screen.getByLabelText('all-targets-hide-check');
    await user.click(checkbox);

    const tableBody = screen.getAllByRole('rowgroup')[1];
    const rows = within(tableBody).getAllByRole('row');

    const firstTarget = rows[0];
    expect(within(firstTarget).getByText(`${mockTarget1.alias} (${mockTarget1.connectUrl})`)).toBeTruthy();
    expect(within(firstTarget).getByText(`${mockCount1 - 1}`)).toBeTruthy();
  });
});
