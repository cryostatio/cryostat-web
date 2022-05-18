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
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { of } from 'rxjs';
import { ActiveRecording, RecordingState } from '@app/Shared/Services/Api.service';
import { NotificationMessage } from '@app/Shared/Services/NotificationChannel.service';

const mockConnectUrl = 'service:jmx:rmi://someUrl';
const mockTarget = { connectUrl: mockConnectUrl, alias: 'fooTarget' };
const mockRecordingLabels = {
  someLabel: 'someValue',
};
const mockRecording: ActiveRecording = {
  name: 'someRecording',
  downloadUrl: 'http://downloadUrl',
  reportUrl: 'http://reportUrl',
  metadata: { labels: mockRecordingLabels },
  startTime: 1234567890,
  id: 0,
  state: RecordingState.RUNNING,
  duration: 0,
  continuous: false,
  toDisk: false,
  maxSize: 0,
  maxAge: 0,
};
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
const mockStopNotification = { message: { target: mockConnectUrl, recording: mockRecording } } as NotificationMessage;
const mockDeleteNotification = mockStopNotification;

const mockHistoryPush = jest.fn();

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useRouteMatch: () => ({ url: '/baseUrl' }),
  useHistory: () => ({
    push: mockHistoryPush,
  }),
}));

import { ActiveRecordingsTable } from '@app/Recordings/ActiveRecordingsTable';
import { ServiceContext, defaultServices } from '@app/Shared/Services/Services';

jest.spyOn(defaultServices.api, 'archiveRecording').mockReturnValue(of(true));
jest.spyOn(defaultServices.api, 'deleteRecording').mockReturnValue(of(true));
jest.spyOn(defaultServices.api, 'doGet').mockReturnValue(of([mockRecording]));
jest.spyOn(defaultServices.api, 'downloadRecording').mockReturnValue();
jest.spyOn(defaultServices.api, 'downloadReport').mockReturnValue();
jest.spyOn(defaultServices.api, 'grafanaDatasourceUrl').mockReturnValue(of('/grafanaUrl'));
jest.spyOn(defaultServices.api, 'stopRecording').mockReturnValue(of(true));
jest.spyOn(defaultServices.api, 'uploadActiveRecordingToGrafana').mockReturnValue(of(true));

jest.spyOn(defaultServices.target, 'target').mockReturnValue(of(mockTarget));
jest.spyOn(defaultServices.target, 'authFailure').mockReturnValue(of());

jest.spyOn(defaultServices.reports, 'delete').mockReturnValue();

jest
  .spyOn(defaultServices.notificationChannel, 'messages')
  .mockReturnValueOnce(of()) // renders correctly
  .mockReturnValueOnce(of())
  .mockReturnValueOnce(of())
  .mockReturnValueOnce(of())
  .mockReturnValueOnce(of())
  .mockReturnValueOnce(of())

  .mockReturnValueOnce(of(mockCreateNotification)) // adds a recording table after receiving a notification
  .mockReturnValueOnce(of())
  .mockReturnValueOnce(of())
  .mockReturnValueOnce(of())
  .mockReturnValueOnce(of())
  .mockReturnValueOnce(of())

  .mockReturnValueOnce(of()) // updates the recording labels after receiving a notification
  .mockReturnValueOnce(of())
  .mockReturnValueOnce(of())
  .mockReturnValueOnce(of())
  .mockReturnValueOnce(of())
  .mockReturnValueOnce(of(mockLabelsNotification))

  .mockReturnValueOnce(of()) // stops a recording after receiving a notification
  .mockReturnValueOnce(of())
  .mockReturnValueOnce(of())
  .mockReturnValueOnce(of())
  .mockReturnValueOnce(of(mockStopNotification))
  .mockReturnValueOnce(of())

  .mockReturnValueOnce(of()) // removes a recording after receiving a notification
  .mockReturnValueOnce(of())
  .mockReturnValueOnce(of(mockDeleteNotification))
  .mockReturnValue(of()); // all other tests

  describe('<ActiveRecordingsTable />', () => {
    beforeEach(() => {
      mockRecording.metadata.labels = mockRecordingLabels;
      mockRecording.state = RecordingState.RUNNING;
    });

    it('renders correctly', async () => {
      let tree;
      await act(async () => {
        tree = renderer.create(
          <ServiceContext.Provider value={defaultServices}>
            <ActiveRecordingsTable archiveEnabled={true} />
          </ServiceContext.Provider>
        );
      });
      expect(tree.toJSON()).toMatchSnapshot();
    });

    it('adds a recording after receiving a notification', () => {
      render(
        <ServiceContext.Provider value={defaultServices}>
          <ActiveRecordingsTable archiveEnabled={true} />
        </ServiceContext.Provider>
      );
      expect(screen.getByText('someRecording')).toBeInTheDocument();
      expect(screen.getByText('anotherRecording')).toBeInTheDocument();
    });

    it('updates the recording labels after receiving a notification', () => {
      render(
        <ServiceContext.Provider value={defaultServices}>
          <ActiveRecordingsTable archiveEnabled={true} />
        </ServiceContext.Provider>
      );
      expect(screen.getByText('someLabel: someUpdatedValue')).toBeInTheDocument();
      expect(screen.queryByText('someLabel: someValue')).not.toBeInTheDocument();
    });

    it('stops a recording after receiving a notification', () => {
      render(
        <ServiceContext.Provider value={defaultServices}>
          <ActiveRecordingsTable archiveEnabled={true} />
        </ServiceContext.Provider>
      );
      expect(screen.getByText('STOPPED')).toBeInTheDocument();
      expect(screen.queryByText('RUNNING')).not.toBeInTheDocument();
    });

    it('removes a recording after receiving a notification', () => {
      render(
        <ServiceContext.Provider value={defaultServices}>
          <ActiveRecordingsTable archiveEnabled={true} />
        </ServiceContext.Provider>
      );
      expect(screen.queryByText('someRecording')).not.toBeInTheDocument();
    });

    it('displays the toolbar buttons', () => {
      render(
        <ServiceContext.Provider value={defaultServices}>
          <ActiveRecordingsTable archiveEnabled={true} />
        </ServiceContext.Provider>
      );

      expect(screen.getByText('Create')).toBeInTheDocument();
      expect(screen.getByText('Archive')).toBeInTheDocument();
      expect(screen.getByText('Edit Labels')).toBeInTheDocument();
      expect(screen.getByText('Stop')).toBeInTheDocument();
      expect(screen.getByText('Delete')).toBeInTheDocument();
    });

    it('routes to the Create Flight Recording form when Create is clicked', () => {
      render(
        <ServiceContext.Provider value={defaultServices}>
          <ActiveRecordingsTable archiveEnabled={true} />
        </ServiceContext.Provider>
      );

      userEvent.click(screen.getByText('Create'));

      expect(mockHistoryPush).toHaveBeenCalledWith('/baseUrl/create');
    });

    it('archives the selected recording when Archive is clicked', () => {
      render(
        <ServiceContext.Provider value={defaultServices}>
          <ActiveRecordingsTable archiveEnabled={true} />
        </ServiceContext.Provider>
      );

      const checkboxes = screen.getAllByRole('checkbox');
      const selectAllCheck = checkboxes[0];
      userEvent.click(selectAllCheck);
      userEvent.click(screen.getByText('Archive'));

      const archiveRequestSpy = jest.spyOn(defaultServices.api, 'archiveRecording');

      expect(archiveRequestSpy).toHaveBeenCalledTimes(1);
      expect(archiveRequestSpy).toBeCalledWith('someRecording');
    });

    it('stops the selected recording when Stop is clicked', () => {
      render(
        <ServiceContext.Provider value={defaultServices}>
          <ActiveRecordingsTable archiveEnabled={true} />
        </ServiceContext.Provider>
      );

      const checkboxes = screen.getAllByRole('checkbox');
      const selectAllCheck = checkboxes[0];
      userEvent.click(selectAllCheck);
      userEvent.click(screen.getByText('Stop'));

      const stopRequestSpy = jest.spyOn(defaultServices.api, 'stopRecording');

      expect(stopRequestSpy).toHaveBeenCalledTimes(1);
      expect(stopRequestSpy).toBeCalledWith('someRecording');
    });

    it('opens the labels drawer when Edit Labels is clicked', () => {
      render(
        <ServiceContext.Provider value={defaultServices}>
          <ActiveRecordingsTable archiveEnabled={true} />
        </ServiceContext.Provider>
      );

      const checkboxes = screen.getAllByRole('checkbox');
      const selectAllCheck = checkboxes[0];
      userEvent.click(selectAllCheck);
      userEvent.click(screen.getByText('Edit Labels'));
      expect(screen.getByText('Edit Recording Labels')).toBeInTheDocument();
    });

    it('deletes a recording when Delete is clicked', () => {
      render(
        <ServiceContext.Provider value={defaultServices}>
          <ActiveRecordingsTable archiveEnabled={true} />
        </ServiceContext.Provider>
      );

      const checkboxes = screen.getAllByRole('checkbox');
      const selectAllCheck = checkboxes[0];
      userEvent.click(selectAllCheck);
      userEvent.click(screen.getByText('Delete'));

      const deleteRequestSpy = jest.spyOn(defaultServices.api, 'deleteRecording');

      expect(deleteRequestSpy).toHaveBeenCalledTimes(1);
      expect(deleteRequestSpy).toBeCalledWith('someRecording');
    });

    it('downloads a recording when Download Recording is clicked', () => {
      render(
        <ServiceContext.Provider value={defaultServices}>
          <ActiveRecordingsTable archiveEnabled={true} />
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
          <ActiveRecordingsTable archiveEnabled={true} />
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
          <ActiveRecordingsTable archiveEnabled={true} />
        </ServiceContext.Provider>
      );

      userEvent.click(screen.getByLabelText('Actions'));
      userEvent.click(screen.getByText('View in Grafana ...'));

      const grafanaUploadSpy = jest.spyOn(defaultServices.api, 'uploadActiveRecordingToGrafana');

      expect(grafanaUploadSpy).toHaveBeenCalledTimes(1);
      expect(grafanaUploadSpy).toBeCalledWith('someRecording');
    });
  });
