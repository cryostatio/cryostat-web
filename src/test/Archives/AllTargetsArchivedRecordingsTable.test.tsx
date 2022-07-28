/*
 * Copyright The Cryostat Authors
 *
 * The Universal Permissive License (UPL), Version 1.0
 *
 * Subject to the condition set forth below, permission is hereby granted to any
 * person obtaining a copy of this software, associated documentation and/or data
 * (collectively the "Software"), free of charge and under any and all copyright
 * rights in the Software, and any and all patent rights owned or freely
 * licensable by each licensor hereunder covering either (i) the unmodified
 * Software as contributed to or provided by such licensor, or (ii) the Larger
 * Works (as defined below), to deal in both
 *
 * (a) the Software, and
 * (b) any piece of software and/or hardware listed in the lrgrwrks.txt file if
 * one is included with the Software (each a "Larger Work" to which the Software
 * is contributed by such licensors),
 *
 * without restriction, including without limitation the rights to copy, create
 * derivative works of, display, perform, and distribute the Software and make,
 * use, sell, offer for sale, import, export, have made, and have sold the
 * Software and the Larger Work(s), and to sublicense the foregoing rights on
 * either these or other terms.
 *
 * This license is subject to the following condition:
 * The above copyright notice and either this complete permission notice or at
 * a minimum a reference to the UPL must be included in all copies or
 * substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */
import * as React from 'react';
import renderer, { act } from 'react-test-renderer'
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom';
import { expand, of } from 'rxjs';
import { ServiceContext, defaultServices } from '@app/Shared/Services/Services'
import { ArchivedRecording } from '@app/Shared/Services/Api.service';
import { ArchivedRecordingsTable } from '@app/Recordings/ArchivedRecordingsTable';
import { NotificationMessage } from '@app/Shared/Services/NotificationChannel.service';
import { AllTargetsArchivedRecordingsTable } from '@app/Archives/AllTargetsArchivedRecordingsTable';

const mockConnectUrl1 = 'service:jmx:rmi://someUrl1';
const mockAlias1 = 'fooTarget1';
const mockConnectUrl2 = 'service:jmx:rmi://someUrl2';
const mockAlias2 = 'fooTarget2';
const mockConnectUrl3 = 'service:jmx:rmi://someUrl3';
const mockAlias3 = 'fooTarget3';
const mockTarget1 = { connectUrl: mockConnectUrl1, alias: mockAlias1 };
const mockTarget2 = { connectUrl: mockConnectUrl2, alias: mockAlias2 };
const mockTarget3 = { connectUrl: mockConnectUrl3, alias: mockAlias3 };
const mockCount1 = 1;
const mockCount2 = 3;
const mockCount3 = 0;

const mockRecordingLabels = {
  someLabel: 'someValue',
};
const mockRecording: ArchivedRecording = {
  name: 'someRecording',
  downloadUrl: 'http://downloadUrl',
  reportUrl: 'http://reportUrl',
  metadata: { labels: mockRecordingLabels },
};
const fakeNotification = {
  message: {
    target: 'fakeServiceUri',
    recording: mockRecording
  }
} as NotificationMessage;

const mockTargetsAndCountsResponse = {
  data: {
    targetNodes: [
      {
        recordings: {
          archived: {
            aggregate: {
              count: mockCount1
            }
          }
        },
        target: {
          alias: mockAlias1,
          serviceUri: mockConnectUrl1
        }
      },
      {
        recordings: {
          archived: {
            aggregate: {
              count: mockCount2
            }
          }
        },
        target: {
          alias: mockAlias2,
          serviceUri: mockConnectUrl2
        }
      },
      {
        recordings: {
          archived: {
            aggregate: {
              count: mockCount3
            }
          }
        },
        target: {
          alias: mockAlias3,
          serviceUri: mockConnectUrl3
        }
      }
    ]
  }
}

jest.mock('@app/Recordings/ArchivedRecordingsTable', () => {
  return {
    ArchivedRecordingsTable: jest.fn((props) => {
      return (
        <div>
          Archived Recordings Table
        </div>
      )
    })
  };
});

jest 
  .spyOn(defaultServices.api, 'graphql')
  .mockReturnValue(of(mockTargetsAndCountsResponse))

jest.spyOn(defaultServices.notificationChannel, 'messages')
  .mockReturnValueOnce(of()) // renders correctly
  .mockReturnValueOnce(of())
  .mockReturnValueOnce(of())
  .mockReturnValueOnce(of())
  .mockReturnValueOnce(of())

  .mockReturnValueOnce(of()) // has the correct table elements
  .mockReturnValueOnce(of())
  .mockReturnValueOnce(of())
  .mockReturnValueOnce(of())
  .mockReturnValueOnce(of())

  .mockReturnValueOnce(of()) // hides targets with zero recordings
  .mockReturnValueOnce(of())
  .mockReturnValueOnce(of())
  .mockReturnValueOnce(of())
  .mockReturnValueOnce(of())

  .mockReturnValueOnce(of()) // correctly handles the search function
  .mockReturnValueOnce(of())
  .mockReturnValueOnce(of())
  .mockReturnValueOnce(of())
  .mockReturnValueOnce(of())

  .mockReturnValueOnce(of()) // expands targets to show their <ArchivedRecordingsTable />
  .mockReturnValueOnce(of())
  .mockReturnValueOnce(of())
  .mockReturnValueOnce(of())
  .mockReturnValueOnce(of())

  

describe('<AllTargetsArchivedRecordingsTable />', () => {
  it('renders correctly', async () => {
    let tree;
    await act(async () => {
      tree = renderer.create(
        <ServiceContext.Provider value={defaultServices}>
          <AllTargetsArchivedRecordingsTable />
        </ServiceContext.Provider>
      );
    });
    expect(tree.toJSON()).toMatchSnapshot();
  });

  it('has the correct table elements', () => {
    render(
      <ServiceContext.Provider value={defaultServices}>
        <AllTargetsArchivedRecordingsTable />
      </ServiceContext.Provider>
    );

    const table = screen.getByLabelText('all-archives-table');
    expect(within(table).getByText('Target')).toBeInTheDocument();
    expect(within(table).getByText('Count')).toBeInTheDocument();
    expect(within(table).getByText(`${mockAlias1} (${mockConnectUrl1})`)).toBeInTheDocument();
    expect(within(table).getByText(`${mockCount1}`)).toBeInTheDocument();
    expect(within(table).getByText(`${mockAlias2} (${mockConnectUrl2})`)).toBeInTheDocument();
    expect(within(table).getByText(`${mockCount2}`)).toBeInTheDocument();
    expect(within(table).getByText(`${mockAlias3} (${mockConnectUrl3})`)).toBeInTheDocument();
    expect(within(table).getByText(`${mockCount3}`)).toBeInTheDocument();
  });

  it('hides targets with zero recordings', () => {
    render(
      <ServiceContext.Provider value={defaultServices}>
        <AllTargetsArchivedRecordingsTable />
      </ServiceContext.Provider>
    );

    // By default targets with zero recordings are hidden so the only rows 
    // in the table should be mockTarget1 (mockCount1 == 1) and mockTarget2 (mockCount2 == 3)
    let tableBody = screen.getAllByRole('rowgroup')[1];
    let rows = within(tableBody).getAllByRole('row');
    expect(rows).toHaveLength(2); 
    const firstTarget = rows[0];
    expect(within(firstTarget).getByText(`${mockAlias1} (${mockConnectUrl1})`)).toBeTruthy();
    expect(within(firstTarget).getByText(`${mockCount1}`)).toBeTruthy();
    const secondTarget = rows[1];
    expect(within(secondTarget).getByText(`${mockAlias2} (${mockConnectUrl2})`)).toBeTruthy();
    expect(within(secondTarget).getByText(`${mockCount2}`)).toBeTruthy();

    const checkbox = screen.getByLabelText('all-archives-hide-check');
    userEvent.click(checkbox);

    tableBody = screen.getAllByRole('rowgroup')[1];
    rows = within(tableBody).getAllByRole('row');
    expect(rows).toHaveLength(3); 
    const thirdTarget = rows[2];
    expect(within(thirdTarget).getByText(`${mockAlias3} (${mockConnectUrl3})`)).toBeTruthy();
    expect(within(thirdTarget).getByText(`${mockCount3}`)).toBeTruthy();
  });

  it('correctly handles the search function', () => {
    render(
      <ServiceContext.Provider value={defaultServices}>
        <AllTargetsArchivedRecordingsTable />
      </ServiceContext.Provider>
    );

    const search = screen.getByLabelText('Search input');
    
    let tableBody = screen.getAllByRole('rowgroup')[1];
    let rows = within(tableBody).getAllByRole('row');
    expect(rows).toHaveLength(2); 
    
    userEvent.type(search, '1');
    tableBody = screen.getAllByRole('rowgroup')[1];
    rows = within(tableBody).getAllByRole('row');
    expect(rows).toHaveLength(1); 
    const firstTarget = rows[0];
    expect(within(firstTarget).getByText(`${mockAlias1} (${mockConnectUrl1})`)).toBeTruthy();
    expect(within(firstTarget).getByText(`${mockCount1}`)).toBeTruthy();

    userEvent.type(search, 'asdasdjhj');
    expect(screen.getByText('No Targets')).toBeInTheDocument();
    expect(screen.queryByLabelText('all-archives-table')).not.toBeInTheDocument();

    userEvent.clear(search);
    tableBody = screen.getAllByRole('rowgroup')[1];
    rows = within(tableBody).getAllByRole('row');
    expect(rows).toHaveLength(2); 
  });

  it('expands targets to show their <ArchivedRecordingsTable />', () => {
    render(
      <ServiceContext.Provider value={defaultServices}>
        <AllTargetsArchivedRecordingsTable />
      </ServiceContext.Provider>
    );

    screen.debug(undefined, Infinity);

    expect(screen.queryByText('Archived Recordings Table')).not.toBeInTheDocument();
    
    let tableBody = screen.getAllByRole('rowgroup')[1];
    let rows = within(tableBody).getAllByRole('row');
    expect(rows).toHaveLength(2);

    let firstTarget = rows[0];
    const expand = within(firstTarget).getByLabelText('Details');
    userEvent.click(expand);

    tableBody = screen.getAllByRole('rowgroup')[1];
    rows = within(tableBody).getAllByRole('row');
    expect(rows).toHaveLength(3);

    let expandedTable = rows[1];
    expect(within(expandedTable).getByText('Archived Recordings Table')).toBeTruthy();
  });
});