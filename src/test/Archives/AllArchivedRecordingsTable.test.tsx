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

import { AllArchivedRecordingsTable } from '@app/Archives/AllArchivedRecordingsTable';
import { NotificationMessage, ArchivedRecording, RecordingDirectory } from '@app/Shared/Services/api.types';
import { defaultServices } from '@app/Shared/Services/Services';
import '@testing-library/jest-dom';
import { cleanup, screen, within } from '@testing-library/react';
import { of } from 'rxjs';
import { render, renderSnapshot } from '../utils';

const mockConnectUrl1 = 'service:jmx:rmi://someUrl1';
const mockJvmId1 = 'fooJvmId1';
const mockConnectUrl2 = 'service:jmx:rmi://someUrl2';
const mockJvmId2 = 'fooJvmId2';
const mockConnectUrl3 = 'service:jmx:rmi://someUrl3';
const mockJvmId3 = 'fooJvmId3';
const mockName3 ='someRecording3';

const mockCount1 = 1;

const mockRecordingSavedNotification = {
  message: {
    recording: {
      name: mockName3,
      metadata: {
        labels: {
          key: 'someLabel',
          value: 'someValue',
        }
      }
    }
  },
} as NotificationMessage;

const mockRecordingDeletedNotification = {
  message: {
    recording: {
      name: mockName3,
    }
  },
} as NotificationMessage;

/* const mockRecordingLabels = [
  {
    key: 'someLabel',
    value: 'someValue',
  },
]; */

const mockRecording: ArchivedRecording = {
  name: 'someRecording',
  downloadUrl: 'http://downloadUrl',
  reportUrl: 'http://reportUrl',
  metadata: {
    labels: {
      key: 'someLabel',
      value: 'someValue',
    }
  },
  size: 2048,
  archivedTime: 2048,
};

const mockRecordingDirectory1: RecordingDirectory = {
  connectUrl: mockConnectUrl1,
  jvmId: mockJvmId1,
  recordings: [mockRecording],
};

const mockRecordingDirectory2: RecordingDirectory = {
  connectUrl: mockConnectUrl2,
  jvmId: mockJvmId2,
  recordings: [mockRecording],
};

const mockRecordingDirectory3: RecordingDirectory = {
  connectUrl: mockConnectUrl3,
  jvmId: mockJvmId3,
  recordings: [mockRecording, mockRecording, mockRecording],
};
console.log("++3",mockRecordingDirectory3);

const mockRecordingDirectory3Removed: RecordingDirectory = {
  ...mockRecordingDirectory3,
  recordings: [mockRecording, mockRecording],
};
console.log("++3removed",mockRecordingDirectory3Removed);

const mockRecordingDirectory3Added: RecordingDirectory = {
  connectUrl: mockConnectUrl3,
  jvmId: mockJvmId3,
  recordings: [mockRecording, mockRecording, mockRecording, mockRecording],
};
console.log("++3added",mockRecordingDirectory3Added);


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
  .spyOn(defaultServices.api, 'doGet')
  .mockReturnValueOnce(of([])) // renders correctly

  .mockReturnValueOnce(of([])) // shows no recordings when empty

  .mockReturnValueOnce(of([mockRecordingDirectory1])) // has the correct table elements

  .mockReturnValueOnce(of([mockRecordingDirectory1, mockRecordingDirectory2, mockRecordingDirectory3])) // search function

  .mockReturnValueOnce(of([mockRecordingDirectory1, mockRecordingDirectory2, mockRecordingDirectory3])) // expands targets to show their <ArchivedRecordingsTable />

  // notifications trigger doGet queries
  .mockReturnValueOnce(of([mockRecordingDirectory1, mockRecordingDirectory2, mockRecordingDirectory3])) // increments the count when an archived recording is saved
  .mockReturnValueOnce(of([mockRecordingDirectory1, mockRecordingDirectory2, mockRecordingDirectory3Added]))

  .mockReturnValueOnce(of([mockRecordingDirectory1, mockRecordingDirectory2, mockRecordingDirectory3])) // decrements the count when an archived recording is deleted
  .mockReturnValueOnce(of([mockRecordingDirectory1, mockRecordingDirectory2, mockRecordingDirectory3Removed]));

jest
  .spyOn(defaultServices.notificationChannel, 'messages')
  .mockReturnValueOnce(of()) // renders correctly  // NotificationCategory.RecordingMetadataUpdated
  .mockReturnValueOnce(of()) // NotificationCategory.ActiveRecordingSaved
  .mockReturnValueOnce(of()) // NotificationCategory.ArchivedRecordingCreated
  .mockReturnValueOnce(of()) // NotificationCategory.ArchivedRecordingDeleted

  .mockReturnValueOnce(of()) // shows no recordings when empty
  .mockReturnValueOnce(of())
  .mockReturnValueOnce(of())
  .mockReturnValueOnce(of())

  .mockReturnValueOnce(of()) // has the correct table elements
  .mockReturnValueOnce(of())
  .mockReturnValueOnce(of())
  .mockReturnValueOnce(of())

  .mockReturnValueOnce(of()) // correctly handles the search function
  .mockReturnValueOnce(of())
  .mockReturnValueOnce(of())
  .mockReturnValueOnce(of())

  .mockReturnValueOnce(of()) // expands targets to show their <ArchivedRecordingsTable />
  .mockReturnValueOnce(of())
  .mockReturnValueOnce(of())
  .mockReturnValueOnce(of())

  .mockReturnValueOnce(of(mockRecordingSavedNotification)) // increments the count when an archived recording is saved
  .mockReturnValueOnce(of())
  .mockReturnValueOnce(of())
  .mockReturnValueOnce(of())

  .mockReturnValueOnce(of(mockRecordingDeletedNotification)) // decrements the count when an archived recording is deleted
  .mockReturnValueOnce(of())
  .mockReturnValueOnce(of())
  .mockReturnValueOnce(of());

describe('<AllArchivedRecordingsTable />', () => {
  afterEach(cleanup);

  it('renders correctly', async () => {
    const tree = await renderSnapshot({
      routerConfigs: { routes: [{ path: '/archives', element: <AllArchivedRecordingsTable /> }] },
    });
    expect(tree?.toJSON()).toMatchSnapshot();
  });

  it('shows no recordings when empty', async () => {
    render({ routerConfigs: { routes: [{ path: '/archives', element: <AllArchivedRecordingsTable /> }] } });

    expect(screen.getByText('No Archived Recordings')).toBeInTheDocument();
  });

  it('has the correct table elements', async () => {
    render({ routerConfigs: { routes: [{ path: '/archives', element: <AllArchivedRecordingsTable /> }] } });

    expect(screen.getByLabelText('all-archives-table')).toBeInTheDocument();
    expect(screen.getByText('Directory')).toBeInTheDocument();
    expect(screen.getByText('Archives')).toBeInTheDocument();
    expect(screen.getByText(`${mockConnectUrl1}`)).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('correctly handles the search function', async () => {
    const { user } = render({
      routerConfigs: { routes: [{ path: '/archives', element: <AllArchivedRecordingsTable /> }] },
    });

    const search = screen.getByLabelText('Search input');

    let tableBody = screen.getAllByRole('rowgroup')[1];
    let rows = within(tableBody).getAllByRole('row');
    expect(rows).toHaveLength(3);

    await user.type(search, '1');
    tableBody = screen.getAllByRole('rowgroup')[1];
    rows = within(tableBody).getAllByRole('row');
    expect(rows).toHaveLength(1);
    const firstTarget = rows[0];
    expect(within(firstTarget).getByText(`${mockConnectUrl1}`)).toBeTruthy();
    expect(within(firstTarget).getByText(`${mockCount1}`)).toBeTruthy();

    await user.type(search, 'asdasdjhj');
    expect(screen.getByText('No Archived Recordings')).toBeInTheDocument();
    expect(screen.queryByLabelText('all-archives-table')).not.toBeInTheDocument();

    await user.clear(search);
    tableBody = screen.getAllByRole('rowgroup')[1];
    rows = within(tableBody).getAllByRole('row');
    expect(rows).toHaveLength(3);
  });

  it('expands targets to show their <ArchivedRecordingsTable />', async () => {
    const { user } = render({
      routerConfigs: { routes: [{ path: '/archives', element: <AllArchivedRecordingsTable /> }] },
    });

    expect(screen.queryByText('Archived Recordings Table')).not.toBeInTheDocument();

    let tableBody = screen.getAllByRole('rowgroup')[1];
    let rows = within(tableBody).getAllByRole('row');
    expect(rows).toHaveLength(3);

    const firstTarget = rows[0];
    const expand = within(firstTarget).getByLabelText('Details');
    await user.click(expand);

    tableBody = screen.getAllByRole('rowgroup')[1];
    rows = within(tableBody).getAllByRole('row');
    expect(rows).toHaveLength(4);

    const expandedTable = rows[1];
    expect(within(expandedTable).getByText('Archived Recordings Table')).toBeTruthy();

    await user.click(expand);
    tableBody = screen.getAllByRole('rowgroup')[1];
    rows = within(tableBody).getAllByRole('row');
    expect(rows).toHaveLength(3);
    expect(screen.queryByText('Archived Recordings Table')).not.toBeInTheDocument();
  });

  it('increments the count when an archived recording is saved', async () => {
    render({ routerConfigs: { routes: [{ path: '/archives', element: <AllArchivedRecordingsTable /> }] } });

    const tableBody = screen.getAllByRole('rowgroup')[1];
    const rows = within(tableBody).getAllByRole('row');
    console.log('++Rows length before adding a recording:', rows.length);  // Log the number of rows

    expect(rows).toHaveLength(3);

    const thirdTarget = rows[2];
    console.log('++Details of third target:', thirdTarget);  // Detailed text content of the row

    expect(within(thirdTarget).getByText(`${mockConnectUrl3}`)).toBeTruthy();
    await waitFor(() => {
      expect(within(thirdTarget).getByText('4')).toBeInTheDocument();
    });
  });

  it('decrements the count when an archived recording is deleted', async () => {
    render({ routerConfigs: { routes: [{ path: '/archives', element: <AllArchivedRecordingsTable /> }] } });

    const tableBody = screen.getAllByRole('rowgroup')[1];
    const rows = within(tableBody).getAllByRole('row');

    const thirdTarget = rows[2];
    expect(within(thirdTarget).getByText(`${mockConnectUrl3}`)).toBeTruthy();
    expect(within(thirdTarget).getByText(2)).toBeTruthy();
  });
});
