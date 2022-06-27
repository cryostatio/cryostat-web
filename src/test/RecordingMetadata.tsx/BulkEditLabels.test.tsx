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
import userEvent from '@testing-library/user-event';
import renderer, { act } from 'react-test-renderer';
import { render, screen } from '@testing-library/react';
import { of } from 'rxjs';
import '@testing-library/jest-dom';
import { BulkEditLabels } from '@app/RecordingMetadata/BulkEditLabels';
import { ServiceContext, defaultServices } from '@app/Shared/Services/Services';
import { ActiveRecording, ArchivedRecording } from '@app/Shared/Services/Api.service';
import { NotificationMessage } from '@app/Shared/Services/NotificationChannel.service';
import { Button, TextInput } from '@patternfly/react-core';

jest.mock('@patternfly/react-core', () => ({
  ...jest.requireActual('@patternfly/react-core'),
  Tooltip: ({ t }) => <>{t}</>,
}));

const mockRecordingLabels = {
  someLabel: 'someValue',
};
const mockConnectUrl = 'service:jmx:rmi://someUrl';
const mockTarget = { connectUrl: mockConnectUrl, alias: 'fooTarget' };
const mockRecording: ArchivedRecording = {
  name: 'someRecording',
  downloadUrl: 'http://downloadUrl',
  reportUrl: 'http://reportUrl',
  metadata: { labels: mockRecordingLabels },
};
const mockLabelsNotification = {
  message: {
    target: mockConnectUrl,
    recordingName: 'someRecording',
    metadata: { labels: { someLabel: 'someValue', someNewLabel: 'someNewValue' } },
  },
} as NotificationMessage;
const mockDeleteNotification = { message: { target: mockConnectUrl, recording: mockRecording } } as NotificationMessage;
const mockArchivedRecordingsResponse = {
  data: {
    targetNodes: [
      {
        recordings: {
          archived: [mockRecording] as ArchivedRecording[],
        },
      },
    ],
  },
};
jest.spyOn(defaultServices.target, 'target').mockReturnValue(of(mockTarget));
jest.spyOn(defaultServices.api, 'doGet').mockReturnValue(of([mockRecording]));
jest.spyOn(defaultServices.api, 'postTargetRecordingMetadata').mockReturnValue(of());
jest.spyOn(defaultServices.api, 'postRecordingMetadata').mockReturnValue(of());
jest.spyOn(defaultServices.api, 'graphql').mockReturnValue(of(mockArchivedRecordingsResponse));
jest.spyOn(defaultServices.notificationChannel, 'messages').mockReturnValue(of());
jest
  .spyOn(defaultServices.notificationChannel, 'messages')
  .mockReturnValueOnce(of()) // renders correctly
  .mockReturnValueOnce(of())
  .mockReturnValueOnce(of())

  .mockReturnValueOnce(of()) // updates the recording labels after receiving a notification
  .mockReturnValueOnce(of())
  .mockReturnValueOnce(of(mockLabelsNotification))

  .mockReturnValueOnce(of()) // removes applicable recording labels after receiving a notification
  .mockReturnValueOnce(of(mockDeleteNotification))
  .mockReturnValue(of());

describe('<BulkEditLabels />', () => {
  const mockProps = {
    isTargetRecording: true,
    checkedIndices: [0],
  };

  it('renders correctly', async () => {
    let tree;
    await act(async () => {
      tree = renderer.create(
        <ServiceContext.Provider value={defaultServices}>
          <BulkEditLabels {...mockProps} />
        </ServiceContext.Provider>
      );
    });
    expect(tree.toJSON()).toMatchSnapshot();
  });

  it('updates the recording labels after receiving a notification', () => {
    render(
      <ServiceContext.Provider value={defaultServices}>
        <BulkEditLabels {...mockProps} />
      </ServiceContext.Provider>
    );

    expect(screen.getByText('someNewLabel: someNewValue')).toBeInTheDocument();
    expect(screen.getByText('someLabel: someValue')).toBeInTheDocument();
  });

  it('removes applicable recording labels after receiving a notification', () => {
    render(
      <ServiceContext.Provider value={defaultServices}>
        <BulkEditLabels {...mockProps} />
      </ServiceContext.Provider>
    );

    expect(screen.queryByText('someLabel: someValue')).not.toBeInTheDocument();
    expect(screen.queryByText('Add Label')).not.toBeInTheDocument();
  });

  it('displays read-only labels from selected recordings', () => {
    render(
      <ServiceContext.Provider value={defaultServices}>
        <BulkEditLabels {...mockProps} />
      </ServiceContext.Provider>
    );

    expect(screen.getByText('someLabel: someValue')).toBeInTheDocument();
    expect(screen.queryByText('Add Label')).not.toBeInTheDocument();
    expect(screen.getByText('Edit')).toBeInTheDocument();
  });

  it('does not display labels for unchecked recordings', () => {
    render(
      <ServiceContext.Provider value={defaultServices}>
        <BulkEditLabels {...mockProps} checkedIndices={[]} />
      </ServiceContext.Provider>
    );

    expect(screen.queryByText('someLabel')).not.toBeInTheDocument();
    expect(screen.queryByText('someValue')).not.toBeInTheDocument();
  });

  it('displays editable labels form when in edit mode', () => {
    render(
      <ServiceContext.Provider value={defaultServices}>
        <BulkEditLabels {...mockProps} />
      </ServiceContext.Provider>
    );

    userEvent.click(screen.getByText('Edit'));

    const labelKeyInput = screen.getAllByDisplayValue('someLabel')[0];
    const labelValueInput = screen.getAllByDisplayValue('someValue')[0];

    expect(screen.getByText('Add Label')).toBeInTheDocument();
    expect(labelKeyInput).toHaveClass('pf-c-form-control');
    expect(labelValueInput).toHaveClass('pf-c-form-control');
    expect(screen.getByText('Save')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  it('returns to read-only view when edited labels are cancelled', async () => {
    render(
      <ServiceContext.Provider value={defaultServices}>
        <BulkEditLabels {...mockProps} />
      </ServiceContext.Provider>
    );

    userEvent.click(screen.getByText('Edit'));

    const labelKeyInput = screen.getAllByDisplayValue('someLabel')[0];
    const labelValueInput = screen.getAllByDisplayValue('someValue')[0];
    expect(labelKeyInput).toHaveClass('pf-c-form-control');
    expect(labelValueInput).toHaveClass('pf-c-form-control');

    expect(screen.getByText('Add Label')).toBeInTheDocument();

    userEvent.click(screen.getByText('Cancel'));

    expect(screen.getByText('Edit')).toBeInTheDocument();
    expect(screen.queryByText('Add Label')).not.toBeInTheDocument();
  });

  it('saves target recording labels when Save is clicked', async () => {
    render(
      <ServiceContext.Provider value={defaultServices}>
        <BulkEditLabels {...mockProps} />
      </ServiceContext.Provider>
    );

    userEvent.click(screen.getByText('Edit'));
    userEvent.click(screen.getByText('Save'));

    const saveRequestSpy = jest.spyOn(defaultServices.api, 'postTargetRecordingMetadata');
    expect(saveRequestSpy).toHaveBeenCalledTimes(1);
  });

  it('saves archived recording labels when Save is clicked', async () => {
    render(
      <ServiceContext.Provider value={defaultServices}>
        <BulkEditLabels {...mockProps} isTargetRecording={false} />
      </ServiceContext.Provider>
    );

    userEvent.click(screen.getByText('Edit'));
    userEvent.click(screen.getByText('Save'));

    const saveRequestSpy = jest.spyOn(defaultServices.api, 'postRecordingMetadata');
    expect(saveRequestSpy).toHaveBeenCalledTimes(1);
  });
});
