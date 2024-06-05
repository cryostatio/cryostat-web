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
import { AllTargetsArchivedRecordingsTable } from '@app/Archives/AllTargetsArchivedRecordingsTable';
import { Target, NotificationMessage } from '@app/Shared/Services/api.types';
import { defaultServices } from '@app/Shared/Services/Services';
import '@testing-library/jest-dom';
import { cleanup, screen, within } from '@testing-library/react';
import { of } from 'rxjs';
import { render, renderSnapshot } from '../utils';

const mockConnectUrl1 = 'service:jmx:rmi://someUrl1';
const mockAlias1 = 'fooTarget1';
const mockTarget1: Target = {
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
  jvmId: 'target3',
  connectUrl: mockConnectUrl3,
  alias: mockAlias3,
  labels: [],
  annotations: {
    cryostat: [],
    platform: [],
  },
};
const mockNewConnectUrl = 'service:jmx:rmi://someNewUrl';
const mockNewAlias = 'newTarget';
const mockNewTarget: Target = {
  jvmId: 'target4',
  connectUrl: mockNewConnectUrl,
  alias: mockNewAlias,
  labels: [],
  annotations: {
    cryostat: [],
    platform: [],
  },
};
const mockCount1 = 1;
const mockCount2 = 3;
const mockCount3 = 0;
const mockNewCount = 12;

const mockTargetFoundNotification = {
  message: {
    event: { kind: 'FOUND', serviceRef: mockNewTarget },
  },
} as NotificationMessage;

const mockRecording = {
  jvmId: mockTarget1.jvmId,
  name: 'SampleRecording',
  downloadUrl: 'http://downloadurl.com/sample',
  reportUrl: 'http://reporturl.com/sample',
  metadata: {
    labels: [
      { key: 'someLabel', value: 'someValue' },
      { key: 'connectUrl', value: 'service:jmx:rmi://someNewUrl' },
    ],
  },
  size: 1234,
  archivedTime: 987654321,
};

const mockTargetLostNotification = {
  message: {
    event: { kind: 'LOST', serviceRef: mockTarget1 },
  },
} as NotificationMessage;

const mockRecordingNotification = {
  message: {
    target: mockTarget1,
    recording: mockRecording,
  },
} as NotificationMessage;

const mockTargetsAndCountsResponse = {
  data: {
    targetNodes: [
      {
        target: {
          ...mockTarget1,
          archivedRecordings: {
            jvmId: mockTarget1.jvmId,
            name: 'fooRecording1',
            metadata: {
              labels: [
                { key: 'someLabel', value: 'someValue' },
                { key: 'connectUrl', value: 'service:jmx:rmi://someUrl1' },
              ],
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
          archivedRecordings: {
            jvmId: mockTarget2.jvmId,
            name: 'fooRecording2',
            metadata: {
              labels: [
                { key: 'someLabel', value: 'someValue' },
                { key: 'connectUrl', value: 'service:jmx:rmi://someUrl2' },
              ],
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
          archivedRecordings: {
            jvmId: mockTarget3.jvmId,
            name: 'fooRecording3',
            metadata: {
              labels: [
                { key: 'someLabel', value: 'someValue' },
                { key: 'connectUrl', value: 'service:jmx:rmi://someUrl3' },
              ],
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
          archivedRecordings: {
            jvmId: mockNewTarget.jvmId,
            name: 'fooRecording1',
            metadata: {
              labels: [
                { key: 'someLabel', value: 'someValue' },
                { key: 'connectUrl', value: mockNewTarget.connectUrl },
              ],
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

jest.mock('@app/Recordings/ArchivedRecordingsTable', () => {
  return {
    ArchivedRecordingsTable: jest.fn((_) => {
      return <div>Archived Recordings Table</div>;
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
  .mockReturnValueOnce(of(mockTargetsAndCountsResponse)) // expands targets to show their <ArchivedRecordingsTable />
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

  .mockReturnValueOnce(of()) // expands targets to show their <ArchivedRecordingsTable />
  .mockReturnValueOnce(of())
  .mockReturnValueOnce(of())

  .mockReturnValueOnce(of(mockTargetFoundNotification)) // adds a target upon receiving a notification
  .mockReturnValueOnce(of())
  .mockReturnValueOnce(of())

  .mockReturnValueOnce(of(mockTargetLostNotification)) // removes a target upon receiving a notification
  .mockReturnValueOnce(of())
  .mockReturnValueOnce(of())

  .mockReturnValueOnce(of()) // increments the count when an archived recording is saved
  .mockReturnValueOnce(of(mockRecordingNotification))
  .mockReturnValueOnce(of())

  .mockReturnValueOnce(of()) // decrements the count when an archived recording is deleted
  .mockReturnValueOnce(of())
  .mockReturnValueOnce(of(mockRecordingNotification));

describe('<AllTargetsArchivedRecordingsTable />', () => {
  afterEach(cleanup);

  it('renders correctly', async () => {
    const tree = await renderSnapshot({
      routerConfigs: { routes: [{ path: '/archives', element: <AllTargetsArchivedRecordingsTable /> }] },
    });
    expect(tree?.toJSON()).toMatchSnapshot();
  });

  it('has the correct table elements', async () => {
    render({ routerConfigs: { routes: [{ path: '/archives', element: <AllTargetsArchivedRecordingsTable /> }] } });

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

  it('hides targets with zero Recordings', async () => {
    const { user } = render({
      routerConfigs: { routes: [{ path: '/archives', element: <AllTargetsArchivedRecordingsTable /> }] },
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
      routerConfigs: { routes: [{ path: '/archives', element: <AllTargetsArchivedRecordingsTable /> }] },
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
    expect(screen.getByText('No Archived Recordings')).toBeInTheDocument();
    expect(screen.queryByLabelText('all-targets-table')).not.toBeInTheDocument();

    await user.clear(search);
    tableBody = screen.getAllByRole('rowgroup')[1];
    rows = within(tableBody).getAllByRole('row');
    expect(rows).toHaveLength(2);
  });

  it('expands targets to show their <ArchivedRecordingsTable />', async () => {
    const { user } = render({
      routerConfigs: { routes: [{ path: '/archives', element: <AllTargetsArchivedRecordingsTable /> }] },
    });

    expect(screen.queryByText('Archived Recordings Table')).not.toBeInTheDocument();

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
    expect(within(expandedTable).getByText('Archived Recordings Table')).toBeTruthy();

    await user.click(expand);
    tableBody = screen.getAllByRole('rowgroup')[1];
    rows = within(tableBody).getAllByRole('row');
    expect(rows).toHaveLength(2);
    expect(screen.queryByText('Archived Recordings Table')).not.toBeInTheDocument();
  });

  it('adds a target upon receiving a notification', async () => {
    render({ routerConfigs: { routes: [{ path: '/archives', element: <AllTargetsArchivedRecordingsTable /> }] } });

    expect(screen.getByText(`${mockNewTarget.alias} (${mockNewTarget.connectUrl})`)).toBeInTheDocument();
    expect(screen.getByText(`${mockNewCount}`)).toBeInTheDocument();
  });

  it('removes a target upon receiving a notification', async () => {
    render({ routerConfigs: { routes: [{ path: '/archives', element: <AllTargetsArchivedRecordingsTable /> }] } });

    expect(screen.queryByText(`${mockTarget1.alias} (${mockTarget1.connectUrl})`)).not.toBeInTheDocument();
    expect(screen.queryByText(`${mockCount1}`)).not.toBeInTheDocument();
  });

  it('increments the count when an Archived Recording is saved', async () => {
    render({ routerConfigs: { routes: [{ path: '/archives', element: <AllTargetsArchivedRecordingsTable /> }] } });

    const tableBody = screen.getAllByRole('rowgroup')[1];
    const rows = within(tableBody).getAllByRole('row');
    expect(rows).toHaveLength(2);

    const firstTarget = rows[0];
    expect(within(firstTarget).getByText(`${mockCount1 + 1}`)).toBeTruthy();
  });

  it('decrements the count when an Archived Recording is deleted', async () => {
    const { user } = render({
      routerConfigs: { routes: [{ path: '/archives', element: <AllTargetsArchivedRecordingsTable /> }] },
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
