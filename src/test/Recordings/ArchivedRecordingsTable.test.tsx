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
import renderer, { act } from 'react-test-renderer';
import { render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { of } from 'rxjs';
import userEvent from '@testing-library/user-event';
import { ArchivedRecording } from '@app/Shared/Services/Api.service';
import { NotificationMessage } from '@app/Shared/Services/NotificationChannel.service';

const mockConnectUrl = 'service:jmx:rmi://someUrl';
const mockTarget = { connectUrl: mockConnectUrl, alias: 'fooTarget' };
const mockRecordingLabels = {
  someLabel: 'someValue',
};
const mockRecording: ArchivedRecording = {
  name: 'someRecording',
  downloadUrl: 'http://downloadUrl',
  reportUrl: 'http://reportUrl',
  metadata: { labels: mockRecordingLabels },
};

const mockArchivedRecordingsResponse = {
  data: {
    archivedRecordings: [mockRecording] as ArchivedRecording[],
  },
}

const mockAnotherRecording = { ...mockRecording, name: 'anotherRecording' };
const mockCreateNotification = {
  message: { target: mockConnectUrl, recording: mockAnotherRecording },
} as NotificationMessage;
const mockLabelsNotification = {
  message: {
    target: mockConnectUrl,
    recordingName: 'someRecording',
    metadata: { labels: { someLabel: 'someUpdatedValue' } },
  },
} as NotificationMessage;
const mockDeleteNotification = { message: { target: mockConnectUrl, recording: mockRecording } } as NotificationMessage;

jest.mock('@app/Recordings/RecordingFilters', () => {
  return {
    ...jest.requireActual('@app/Recordings/RecordingFilters'),
    RecordingFilters: jest.fn(() => {
      return <div>
                RecordingFilters
             </div>
    })
  };
});

import { ArchivedRecordingsTable } from '@app/Recordings/ArchivedRecordingsTable';
import { ServiceContext, defaultServices } from '@app/Shared/Services/Services';
import { DeleteActiveRecordings, DeleteArchivedRecordings, DeleteWarningType } from '@app/Modal/DeleteWarningUtils';

jest.spyOn(defaultServices.api, 'deleteArchivedRecording').mockReturnValue(of(true));
jest.spyOn(defaultServices.api, 'downloadRecording').mockReturnValue();
jest.spyOn(defaultServices.api, 'downloadReport').mockReturnValue();
jest.spyOn(defaultServices.api, 'grafanaDatasourceUrl').mockReturnValue(of('/grafanaUrl'));
jest.spyOn(defaultServices.api, 'graphql').mockReturnValue(of(mockArchivedRecordingsResponse));
jest.spyOn(defaultServices.api, 'uploadArchivedRecordingToGrafana').mockReturnValue(of(true));

jest.spyOn(defaultServices.target, 'target').mockReturnValue(of(mockTarget));

jest.spyOn(defaultServices.settings, 'deletionDialogsEnabledFor')
  .mockReturnValueOnce(true);

jest
  .spyOn(defaultServices.notificationChannel, 'messages')
  .mockReturnValueOnce(of()) // renders correctly
  .mockReturnValueOnce(of())
  .mockReturnValueOnce(of())
  .mockReturnValueOnce(of())

  .mockReturnValueOnce(of(mockCreateNotification)) // adds a recording table after receiving a notification
  .mockReturnValueOnce(of())
  .mockReturnValueOnce(of())
  .mockReturnValueOnce(of())

  .mockReturnValueOnce(of()) // updates the recording labels after receiving a notification
  .mockReturnValueOnce(of())
  .mockReturnValueOnce(of())
  .mockReturnValueOnce(of(mockLabelsNotification))

  .mockReturnValueOnce(of()) // removes a recording after receiving a notification
  .mockReturnValueOnce(of())
  .mockReturnValueOnce(of(mockDeleteNotification))
  .mockReturnValue(of()); // all other tests

describe('<ArchivedRecordingsTable />', () => {
  it('renders correctly', async () => {
    let tree;
    await act(async () => {
      tree = renderer.create(
        <ServiceContext.Provider value={defaultServices}>
          <ArchivedRecordingsTable target={of(mockTarget)} isUploadsTable={false}/>
        </ServiceContext.Provider>
      );
    });
    expect(tree.toJSON()).toMatchSnapshot();
  });

  it('adds a recording after receiving a notification', () => {
    render(
      <ServiceContext.Provider value={defaultServices}>
        <ArchivedRecordingsTable target={of(mockTarget)} isUploadsTable={false}/>
      </ServiceContext.Provider>
    );
    expect(screen.getByText('someRecording')).toBeInTheDocument();
    expect(screen.getByText('anotherRecording')).toBeInTheDocument();
  });

  it('updates the recording labels after receiving a notification', () => {
    render(
      <ServiceContext.Provider value={defaultServices}>
        <ArchivedRecordingsTable target={of(mockTarget)} isUploadsTable={false}/>
      </ServiceContext.Provider>
    );
    expect(screen.getByText('someLabel: someUpdatedValue')).toBeInTheDocument();
    expect(screen.queryByText('someLabel: someValue')).not.toBeInTheDocument();
  });

  it('removes a recording after receiving a notification', () => {
    render(
      <ServiceContext.Provider value={defaultServices}>
        <ArchivedRecordingsTable target={of(mockTarget)} isUploadsTable={false}/>
      </ServiceContext.Provider>
    );
    expect(screen.queryByText('someRecording')).not.toBeInTheDocument();
  });

  it('displays the toolbar buttons', () => {
    render(
      <ServiceContext.Provider value={defaultServices}>
        <ArchivedRecordingsTable target={of(mockTarget)} isUploadsTable={false}/>
      </ServiceContext.Provider>
    );

    expect(screen.getByText('Delete')).toBeInTheDocument();
    expect(screen.getByText('Edit Labels')).toBeInTheDocument();
  });

  it('opens the labels drawer when Edit Labels is clicked', () => {
    render(
      <ServiceContext.Provider value={defaultServices}>
        <ArchivedRecordingsTable target={of(mockTarget)} isUploadsTable={false}/>
      </ServiceContext.Provider>
    );

    const checkboxes = screen.getAllByRole('checkbox');
    const selectAllCheck = checkboxes[0];
    userEvent.click(selectAllCheck);
    userEvent.click(screen.getByText('Edit Labels'));
    expect(screen.getByText('Edit Recording Labels')).toBeInTheDocument();
  });

  it('shows a popup when Delete is clicked and then deletes the recording after clicking confirmation Delete', () => {
    render(
      <ServiceContext.Provider value={defaultServices}>
        <ArchivedRecordingsTable />
      </ServiceContext.Provider>
    );

    const checkboxes = screen.getAllByRole('checkbox');
    const selectAllCheck = checkboxes[0];
    userEvent.click(selectAllCheck);
    userEvent.click(screen.getByText('Delete'));

    expect(screen.getByLabelText(DeleteArchivedRecordings.ariaLabel));

    const deleteRequestSpy = jest.spyOn(defaultServices.api, 'deleteArchivedRecording');
    const dialogWarningSpy = jest.spyOn(defaultServices.settings, 'setDeletionDialogsEnabledFor');
    userEvent.click(screen.getByLabelText("Don't ask me again"));
    userEvent.click(within(screen.getByLabelText(DeleteArchivedRecordings.ariaLabel)).getByText('Delete'));

    expect(deleteRequestSpy).toHaveBeenCalledTimes(1);
    expect(deleteRequestSpy).toBeCalledWith('someRecording');
    expect(dialogWarningSpy).toBeCalledTimes(1);
    expect(dialogWarningSpy).toBeCalledWith(DeleteWarningType.DeleteArchivedRecordings, false);
  });

  it('deletes the recording when Delete is clicked w/o popup warning', () => {
    render(
      <ServiceContext.Provider value={defaultServices}>
        <ArchivedRecordingsTable target={of(mockTarget)} isUploadsTable={false}/>
      </ServiceContext.Provider>
    );

    const checkboxes = screen.getAllByRole('checkbox');
    const selectAllCheck = checkboxes[0];
    userEvent.click(selectAllCheck);
    userEvent.click(screen.getByText('Delete'));

    const deleteRequestSpy = jest.spyOn(defaultServices.api, 'deleteArchivedRecording');

    expect(screen.queryByLabelText(DeleteActiveRecordings.ariaLabel)).not.toBeInTheDocument();
    expect(deleteRequestSpy).toHaveBeenCalledTimes(1);
    expect(deleteRequestSpy).toBeCalledWith('someRecording');
  });

  it('downloads a recording when Download Recording is clicked', () => {
    render(
      <ServiceContext.Provider value={defaultServices}>
        <ArchivedRecordingsTable target={of(mockTarget)} isUploadsTable={false}/>
      </ServiceContext.Provider>
    );

    userEvent.click(screen.getByLabelText('Actions'));
    userEvent.click(screen.getByText('Download Recording'));

    const downloadRequestSpy = jest.spyOn(defaultServices.api, 'downloadRecording');

    expect(downloadRequestSpy).toHaveBeenCalledTimes(1);
    expect(downloadRequestSpy).toBeCalledWith(mockRecording);
  });

  it('displays the automated analysis report when View Report is clicked', () => {
    render(
      <ServiceContext.Provider value={defaultServices}>
        <ArchivedRecordingsTable target={of(mockTarget)} isUploadsTable={false}/>
      </ServiceContext.Provider>
    );

    userEvent.click(screen.getByLabelText('Actions'));
    userEvent.click(screen.getByText('View Report ...'));

    const reportRequestSpy = jest.spyOn(defaultServices.api, 'downloadReport');

    expect(reportRequestSpy).toHaveBeenCalledTimes(1);
  });

  it('uploads a recording to Grafana when View in Grafana is clicked', () => {
    render(
      <ServiceContext.Provider value={defaultServices}>
        <ArchivedRecordingsTable target={of(mockTarget)} isUploadsTable={false}/>
      </ServiceContext.Provider>
    );

    userEvent.click(screen.getByLabelText('Actions'));
    userEvent.click(screen.getByText('View in Grafana ...'));

    const grafanaUploadSpy = jest.spyOn(defaultServices.api, 'uploadArchivedRecordingToGrafana');

    expect(grafanaUploadSpy).toHaveBeenCalledTimes(1);
    expect(grafanaUploadSpy).toBeCalledWith('someRecording');
  });
});
