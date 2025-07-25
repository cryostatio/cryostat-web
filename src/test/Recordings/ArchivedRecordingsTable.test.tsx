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
import { DeleteArchivedRecordings, DeleteOrDisableWarningType } from '@app/Modal/types';
import { ArchivedRecordingsTable } from '@app/Recordings/ArchivedRecordingsTable';
import {
  emptyActiveRecordingFilters,
  emptyArchivedRecordingFilters,
  TargetRecordingFilters,
} from '@app/Shared/Redux/Filters/RecordingFilterSlice';
import { RootState } from '@app/Shared/Redux/ReduxStore';
import {
  UPLOADS_SUBDIRECTORY,
  ArchivedRecording,
  NotificationMessage,
  Target,
  KeyValue,
  keyValueToString,
} from '@app/Shared/Services/api.types';
import { defaultServices } from '@app/Shared/Services/Services';
import { Text } from '@patternfly/react-core';
import '@testing-library/jest-dom';
import * as tlr from '@testing-library/react';
import { screen, within, cleanup, act } from '@testing-library/react';
import { of, Subject } from 'rxjs';
import { basePreloadedState, DEFAULT_DIMENSIONS, render, resize, testT } from '../utils';

const mockConnectUrl = 'service:jmx:rmi://someUrl';
const mockJvmId = 'id';
const mockTarget: Target = {
  agent: false,
  connectUrl: mockConnectUrl,
  alias: 'fooTarget',
  jvmId: mockJvmId,
  labels: [],
  annotations: { cryostat: [], platform: [] },
};
const mockUploadsTarget = {
  agent: false,
  connectUrl: UPLOADS_SUBDIRECTORY,
  alias: '',
  labels: [],
  annotations: { cryostat: [], platform: [] },
};
const mockRecordingLabels: KeyValue[] = [
  {
    key: 'someLabel',
    value: 'someValue',
  },
];
const mockUploadedRecordingLabels: KeyValue[] = [
  {
    key: 'someUploaded',
    value: 'someUpdatedValue',
  },
];
export const convertLabels = (kv: KeyValue[]): object => {
  const out = {};
  for (const e of kv) {
    out[e.key] = e.value;
  }
  return out;
};
const mockMetadataFileName = 'mock.metadata.json';
const mockMetadataFile = new File([JSON.stringify({ labels: mockUploadedRecordingLabels })], mockMetadataFileName, {
  type: 'json',
});
mockMetadataFile.text = jest.fn(() => Promise.resolve(JSON.stringify({ labels: mockUploadedRecordingLabels })));

const mockRecording: ArchivedRecording = {
  name: 'someRecording',
  jvmId: mockJvmId,
  downloadUrl: 'http://downloadUrl',
  reportUrl: 'http://reportUrl',
  metadata: {
    labels: [
      { key: 'someLabel', value: 'someValue' },
      { key: 'connectUrl', value: 'service:jmx:rmi://someUrl' },
    ],
  },
  size: 2048,
  archivedTime: 2048,
};

const mockAllArchivedRecordingsResponse = {
  data: {
    archivedRecordings: {
      data: [mockRecording],
      aggregate: {
        count: 1,
        size: mockRecording.size,
      },
    },
  },
};

const mockAnotherRecording = { ...mockRecording, name: 'anotherRecording' };
const mockCreateNotification = {
  message: { target: mockConnectUrl, recording: mockAnotherRecording, jvmId: mockJvmId },
} as NotificationMessage;
const mockLabelsNotification = {
  message: {
    target: mockConnectUrl,
    recording: {
      name: 'someRecording',
      jvmId: mockJvmId,
      metadata: { labels: [{ key: 'someLabel', value: 'someUpdatedValue' }] },
    },
  },
} as NotificationMessage;
const mockDeleteNotification = {
  message: { target: mockConnectUrl, recording: mockRecording, jvmId: mockJvmId },
} as NotificationMessage;

const mockFileName = 'mock.jfr';
const mockFileUpload = new File([JSON.stringify(mockAnotherRecording)], mockFileName, { type: 'jfr' });

jest.mock('@app/RecordingMetadata/BulkEditLabels', () => {
  return {
    BulkEditLabels: (_) => <Text>Edit Recording Labels</Text>,
  };
});

jest.mock('@app/Recordings/RecordingFilters', () => {
  return {
    ...jest.requireActual('@app/Recordings/RecordingFilters'),
    RecordingFilters: jest.fn(() => {
      return <div>RecordingFilters</div>;
    }),
  };
});

jest.spyOn(defaultServices.api, 'deleteArchivedRecording').mockReturnValue(of(true));
jest.spyOn(defaultServices.api, 'downloadRecording').mockReturnValue();
jest.spyOn(defaultServices.api, 'grafanaDatasourceUrl').mockReturnValue(of('/datasource'));
jest.spyOn(defaultServices.api, 'grafanaDashboardUrl').mockReturnValue(of('/grafanaUrl'));
jest.spyOn(defaultServices.api, 'getTargetArchivedRecordings').mockReturnValue(of([mockRecording]));
jest.spyOn(defaultServices.api, 'getUploadedRecordings').mockReturnValue(of([mockRecording]));
jest.spyOn(defaultServices.api, 'graphql').mockImplementation((query: string) => {
  if (query.includes('AllTargetsArchives')) {
    return of(mockAllArchivedRecordingsResponse);
  }
  throw new Error(`unknown query: ${query}`);
});
jest.spyOn(defaultServices.api, 'uploadArchivedRecordingToGrafana').mockReturnValue(of());

jest
  .spyOn(defaultServices.settings, 'deletionDialogsEnabledFor')
  .mockReturnValueOnce(true) // shows a popup when Delete is clicked and then deletes the recording after clicking confirmation Delete
  .mockReturnValueOnce(false) // deletes the recording when Delete is clicked w/o popup warning
  .mockReturnValue(true);

jest
  .spyOn(defaultServices.notificationChannel, 'messages')
  .mockReturnValueOnce(of())
  .mockReturnValueOnce(of()) // renders the recording table correctly
  .mockReturnValueOnce(of())
  .mockReturnValueOnce(of())
  .mockReturnValueOnce(of())

  .mockReturnValueOnce(of(mockCreateNotification)) // adds a recording table after receiving a notification
  .mockReturnValueOnce(of())
  .mockReturnValueOnce(of())
  .mockReturnValueOnce(of())
  .mockReturnValueOnce(of())

  .mockReturnValueOnce(of()) // updates the recording labels after receiving a notification
  .mockReturnValueOnce(of())
  .mockReturnValueOnce(of())
  .mockReturnValueOnce(of())
  .mockReturnValueOnce(of(mockLabelsNotification))

  .mockReturnValueOnce(of()) // removes a recording after receiving a notification
  .mockReturnValueOnce(of())
  .mockReturnValueOnce(of())
  .mockReturnValueOnce(of(mockDeleteNotification))

  .mockReturnValue(of()); // all other tests

jest.spyOn(window, 'open').mockReturnValue(null);

describe('<ArchivedRecordingsTable />', () => {
  let preloadedState: RootState;

  beforeAll(async () => {
    await act(async () => {
      resize(2400, 1080);
    });
  });

  beforeEach(() => {
    preloadedState = {
      ...basePreloadedState,
      recordingFilters: {
        list: [
          {
            target: mockTarget.connectUrl,
            active: {
              selectedCategory: 'Labels',
              filters: emptyActiveRecordingFilters,
            },
            archived: {
              selectedCategory: 'Name',
              filters: emptyArchivedRecordingFilters,
            },
          } as TargetRecordingFilters,
        ],
        _version: '0',
      },
    };
  });

  afterEach(cleanup);

  afterAll(() => {
    resize(DEFAULT_DIMENSIONS[0], DEFAULT_DIMENSIONS[1]);
  });

  it('should render the Recording table correctly', async () => {
    render({
      routerConfigs: {
        routes: [
          {
            path: '/recordings',
            element: (
              <ArchivedRecordingsTable
                target={of(mockTarget)}
                isUploadsTable={false}
                isNestedTable={false}
                toolbarBreakReference={document.body}
              />
            ),
          },
        ],
      },
    });

    ['Delete', 'Edit Labels'].map((text) => {
      const button = screen.getByText(text);
      expect(button).toBeInTheDocument();
      expect(button).toBeVisible();
    });

    ['Name', 'Size', 'Labels'].map((text) => {
      const header = screen.getByText(text);
      expect(header).toBeInTheDocument();
      expect(header).toBeVisible();
    });

    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes.length).toBe(2);
    checkboxes.forEach((checkbox) => {
      expect(checkbox).toBeInTheDocument();
      expect(checkbox).toBeVisible();
    });

    const name = screen.getByText(mockRecording.name);
    expect(name).toBeInTheDocument();
    expect(name).toBeVisible();

    const size = screen.getByText('2 KB');
    expect(size).toBeInTheDocument();
    expect(size).toBeVisible();

    mockRecordingLabels.map(keyValueToString).forEach((entry) => {
      const label = screen.getByText(entry);
      expect(label).toBeInTheDocument();
      expect(label).toBeVisible();
    });

    const actionIcon = screen.getByLabelText(testT('RecordingActions.ARIA_LABELS.MENU_TOGGLE'));
    expect(actionIcon).toBeInTheDocument();
    expect(actionIcon).toBeVisible();

    const totalSize = screen.getByText(`Total size: 2 KB`);
    expect(totalSize).toBeInTheDocument();
    expect(totalSize).toBeVisible();
  });

  it('should add a Recording after receiving a notification', async () => {
    render({
      routerConfigs: {
        routes: [
          {
            path: '/recordings',
            element: <ArchivedRecordingsTable target={of(mockTarget)} isUploadsTable={false} isNestedTable={false} />,
          },
        ],
      },
      preloadedState: preloadedState,
    });
    expect(screen.getByText('someRecording')).toBeInTheDocument();
    expect(screen.getByText('anotherRecording')).toBeInTheDocument();
  });

  it('should update the Recording labels after receiving a notification', async () => {
    render({
      routerConfigs: {
        routes: [
          {
            path: '/recordings',
            element: <ArchivedRecordingsTable target={of(mockTarget)} isUploadsTable={false} isNestedTable={false} />,
          },
        ],
      },
      preloadedState: preloadedState,
    });
    expect(screen.getByText('someLabel=someUpdatedValue')).toBeInTheDocument();
    expect(screen.queryByText('someLabel=someValue')).not.toBeInTheDocument();
  });

  it('should remove a Recording after receiving a notification', async () => {
    render({
      routerConfigs: {
        routes: [
          {
            path: '/recordings',
            element: <ArchivedRecordingsTable target={of(mockTarget)} isUploadsTable={false} isNestedTable={false} />,
          },
        ],
      },
      preloadedState: preloadedState,
    });
    expect(screen.queryByText('someRecording')).not.toBeInTheDocument();
  });

  it('should display the toolbar buttons', async () => {
    render({
      routerConfigs: {
        routes: [
          {
            path: '/recordings',
            element: (
              <ArchivedRecordingsTable
                target={of(mockTarget)}
                isUploadsTable={false}
                isNestedTable={false}
                toolbarBreakReference={document.body}
              />
            ),
          },
        ],
      },
      preloadedState: preloadedState,
    });

    expect(screen.getByText('Delete')).toBeInTheDocument();
    expect(screen.getByText('Edit Labels')).toBeInTheDocument();
  });

  it('should open the labels drawer when Edit Labels is clicked', async () => {
    const { user } = render({
      routerConfigs: {
        routes: [
          {
            path: '/recordings',
            element: (
              <ArchivedRecordingsTable
                target={of(mockTarget)}
                isUploadsTable={false}
                isNestedTable={false}
                toolbarBreakReference={document.body}
              />
            ),
          },
        ],
      },
      preloadedState: preloadedState,
    });

    const checkboxes = screen.getAllByRole('checkbox');
    const selectAllCheck = checkboxes[0];
    await user.click(selectAllCheck);
    await user.click(screen.getByText('Edit Labels'));
    expect(screen.getByText('Edit Recording Labels')).toBeInTheDocument();
  });

  it('should show a popup when Delete is clicked and then deletes the Recording after clicking confirmation Delete', async () => {
    const { user } = render({
      routerConfigs: {
        routes: [
          {
            path: '/recordings',
            element: (
              <ArchivedRecordingsTable
                target={of(mockTarget)}
                isUploadsTable={false}
                isNestedTable={false}
                toolbarBreakReference={document.body}
              />
            ),
          },
        ],
      },
      preloadedState: preloadedState,
    });

    const checkboxes = screen.getAllByRole('checkbox');
    const selectAllCheck = checkboxes[0];
    await user.click(selectAllCheck);
    await user.click(screen.getByText('Delete'));

    const deleteModal = await screen.findByLabelText(DeleteArchivedRecordings.ariaLabel);
    expect(deleteModal).toBeInTheDocument();
    expect(deleteModal).toBeVisible();

    const deleteRequestSpy = jest.spyOn(defaultServices.api, 'deleteArchivedRecording');
    const dialogWarningSpy = jest.spyOn(defaultServices.settings, 'setDeletionDialogsEnabledFor');
    await user.click(screen.getByLabelText("Don't ask me again"));
    await user.click(within(screen.getByLabelText(DeleteArchivedRecordings.ariaLabel)).getByText('Delete'));

    expect(deleteRequestSpy).toHaveBeenCalledTimes(1);
    expect(deleteRequestSpy).toHaveBeenCalledWith(mockTarget.connectUrl, 'someRecording');
    expect(dialogWarningSpy).toHaveBeenCalledTimes(1);
    expect(dialogWarningSpy).toHaveBeenCalledWith(DeleteOrDisableWarningType.DeleteArchivedRecordings, false);
  });

  it('should delete the Recording when Delete is clicked w/o popup warning', async () => {
    const { user } = render({
      routerConfigs: {
        routes: [
          {
            path: '/recordings',
            element: (
              <ArchivedRecordingsTable
                target={of(mockTarget)}
                isUploadsTable={false}
                isNestedTable={false}
                toolbarBreakReference={document.body}
              />
            ),
          },
        ],
      },
      preloadedState: preloadedState,
    });

    const checkboxes = screen.getAllByRole('checkbox');
    const selectAllCheck = checkboxes[0];
    await user.click(selectAllCheck);
    await user.click(screen.getByText('Delete'));

    const deleteRequestSpy = jest.spyOn(defaultServices.api, 'deleteArchivedRecording');

    expect(screen.queryByLabelText(DeleteArchivedRecordings.ariaLabel)).not.toBeInTheDocument();
    expect(deleteRequestSpy).toHaveBeenCalledTimes(1);
    expect(deleteRequestSpy).toHaveBeenCalledWith(mockTarget.connectUrl, 'someRecording');
  });

  it('should download a Recording when Download Recording is clicked', async () => {
    const { user } = render({
      routerConfigs: {
        routes: [
          {
            path: '/recordings',
            element: <ArchivedRecordingsTable target={of(mockTarget)} isUploadsTable={false} isNestedTable={false} />,
          },
        ],
      },
      preloadedState: preloadedState,
    });

    await tlr.act(async () => {
      await user.click(screen.getByLabelText(testT('RecordingActions.ARIA_LABELS.MENU_TOGGLE')));
      await user.click(screen.getByText('Download Recording'));
    });

    const downloadRequestSpy = jest.spyOn(defaultServices.api, 'downloadRecording');

    expect(downloadRequestSpy).toHaveBeenCalledTimes(1);
    expect(downloadRequestSpy).toHaveBeenCalledWith(mockRecording);
  });

  it('should upload a Recording to Grafana when View in Grafana is clicked', async () => {
    const { user } = render({
      routerConfigs: {
        routes: [
          {
            path: '/recordings',
            element: <ArchivedRecordingsTable target={of(mockTarget)} isUploadsTable={false} isNestedTable={false} />,
          },
        ],
      },
      preloadedState: preloadedState,
    });

    await tlr.act(async () => {
      await user.click(screen.getByLabelText(testT('RecordingActions.ARIA_LABELS.MENU_TOGGLE')));
      await user.click(screen.getByText('View in Grafana ...'));
    });

    const grafanaUploadSpy = jest.spyOn(defaultServices.api, 'uploadArchivedRecordingToGrafana');

    expect(grafanaUploadSpy).toHaveBeenCalledTimes(1);
  });

  it('should render correctly the Uploads table', async () => {
    const { user } = render({
      routerConfigs: {
        routes: [
          {
            path: '/recordings',
            element: (
              <ArchivedRecordingsTable
                target={of(mockUploadsTarget)}
                isUploadsTable={true}
                isNestedTable={false}
                toolbarBreakReference={document.body}
              />
            ),
          },
        ],
      },
      preloadedState: preloadedState,
    });

    expect(screen.getByText('someRecording')).toBeInTheDocument();

    const uploadButton = screen.getByLabelText('upload-recording');
    expect(uploadButton).toHaveAttribute('type', 'button');

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await user.click(uploadButton);

    const uploadModal = await screen.findByRole('dialog');
    expect(uploadModal).toBeInTheDocument();
    expect(uploadModal).toBeVisible();
  });

  it('should upload an Archived Recording without labels when Submit is clicked', async () => {
    const uploadSpy = jest.spyOn(defaultServices.api, 'uploadRecording').mockReturnValue(of(mockFileName));

    const { user } = render({
      routerConfigs: {
        routes: [
          {
            path: '/recordings',
            element: (
              <ArchivedRecordingsTable target={of(mockUploadsTarget)} isUploadsTable={true} isNestedTable={false} />
            ),
          },
        ],
      },
      preloadedState: preloadedState,
    });

    await act(async () => {
      await user.click(screen.getByLabelText('upload-recording'));

      const modal = await screen.findByRole('dialog');

      const modalTitle = await within(modal).findByText('Re-Upload Archived Recording');
      expect(modalTitle).toBeInTheDocument();
      expect(modalTitle).toBeVisible();

      const fileLabel = await within(modal).findByText('JFR File');
      expect(fileLabel).toBeInTheDocument();
      expect(fileLabel).toBeInTheDocument();

      const dropZoneText = within(modal).getByText('Drag a file here');
      expect(dropZoneText).toBeInTheDocument();
      expect(dropZoneText).toBeVisible();

      const uploadButton = within(modal).getByText('Upload');
      expect(uploadButton).toBeInTheDocument();
      expect(uploadButton).toBeVisible();

      const uploadInput = modal.querySelector(
        "input[accept='application/octet-stream,.jfr'][type='file']",
      ) as HTMLInputElement;
      expect(uploadInput).toBeInTheDocument();
      expect(uploadInput).not.toBeVisible();

      await user.click(uploadButton);
      await user.upload(uploadInput, mockFileUpload);

      const fileUploadNameText = within(modal).getByText(mockFileUpload.name);
      expect(fileUploadNameText).toBeInTheDocument();
      expect(fileUploadNameText).toBeVisible();

      const submitButton = within(modal).getByText('Submit');
      expect(submitButton).toBeInTheDocument();
      expect(submitButton).toBeVisible();
      expect(submitButton).not.toBeDisabled();

      await user.click(submitButton);

      expect(uploadSpy).toHaveBeenCalled();
      expect(uploadSpy).toHaveBeenCalledWith(mockFileUpload, {}, expect.any(Function), expect.any(Subject));

      expect(within(modal).queryByText('Submit')).not.toBeInTheDocument();
      expect(within(modal).queryByText('Cancel')).not.toBeInTheDocument();

      const closeButton = within(modal).getByText('Close');
      expect(closeButton).toBeInTheDocument();
      expect(closeButton).toBeVisible();
    });
  });

  it('should upload an Archived Recording with labels from editors when Submit is clicked', async () => {
    const uploadSpy = jest.spyOn(defaultServices.api, 'uploadRecording').mockReturnValue(of(mockFileName));

    const { user } = render({
      routerConfigs: {
        routes: [
          {
            path: '/recordings',
            element: (
              <ArchivedRecordingsTable target={of(mockUploadsTarget)} isUploadsTable={true} isNestedTable={false} />
            ),
          },
        ],
      },
      preloadedState: preloadedState,
    });

    await act(async () => {
      await user.click(screen.getByLabelText('upload-recording'));

      const modal = await screen.findByRole('dialog');

      const modalTitle = await within(modal).findByText('Re-Upload Archived Recording');
      expect(modalTitle).toBeInTheDocument();
      expect(modalTitle).toBeVisible();

      const fileLabel = await within(modal).findByText('JFR File');
      expect(fileLabel).toBeInTheDocument();
      expect(fileLabel).toBeInTheDocument();

      const dropZoneText = within(modal).getByText('Drag a file here');
      expect(dropZoneText).toBeInTheDocument();
      expect(dropZoneText).toBeVisible();

      const uploadButton = within(modal).getByText('Upload');
      expect(uploadButton).toBeInTheDocument();
      expect(uploadButton).toBeVisible();

      const uploadInput = modal.querySelector(
        "input[accept='application/octet-stream,.jfr'][type='file']",
      ) as HTMLInputElement;
      expect(uploadInput).toBeInTheDocument();
      expect(uploadInput).not.toBeVisible();

      await user.click(uploadButton);
      await user.upload(uploadInput, mockFileUpload);

      const fileUploadNameText = within(modal).getByText(mockFileUpload.name);
      expect(fileUploadNameText).toBeInTheDocument();
      expect(fileUploadNameText).toBeVisible();

      const metadataEditorToggle = within(modal).getByText('Show metadata options');
      expect(metadataEditorToggle).toBeInTheDocument();
      expect(metadataEditorToggle).toBeVisible();

      await user.click(metadataEditorToggle);

      const addBtn = within(modal).getByText('Add label');
      expect(addBtn).toBeInTheDocument();
      expect(addBtn).toBeVisible();

      await user.click(addBtn);

      const labelWrapper = screen.getByLabelText('key=value');
      expect(labelWrapper).toBeInTheDocument();
      expect(labelWrapper).toBeVisible();

      const label = within(labelWrapper).getByText('key=value');
      expect(label).toBeInTheDocument();
      expect(label).toBeVisible();

      await act(async () => {
        await user.click(label);
      });

      const input = labelWrapper.querySelector("input[type='text']") as HTMLInputElement;
      expect(input).toBeInTheDocument();

      await user.clear(input);
      await user.type(input, 'someLabel=someValue');
      await user.keyboard('{enter}');

      const submitBtn = within(modal).getByText('Submit');
      expect(submitBtn).toBeInTheDocument();
      expect(submitBtn).toBeVisible();
      expect(submitBtn).not.toBeDisabled();

      await user.click(submitBtn);

      expect(uploadSpy).toHaveBeenCalled();
      expect(uploadSpy).toHaveBeenCalledWith(
        mockFileUpload,
        { someLabel: 'someValue' },
        expect.any(Function),
        expect.any(Subject),
      );

      expect(within(modal).queryByText('Submit')).not.toBeInTheDocument();
      expect(within(modal).queryByText('Cancel')).not.toBeInTheDocument();

      const closeBtn = within(modal).getByText('Close');
      expect(closeBtn).toBeInTheDocument();
      expect(closeBtn).toBeVisible();
    });
  });

  it('should upload an Archived Recording with labels from uploads when Submit is clicked', async () => {
    const uploadSpy = jest.spyOn(defaultServices.api, 'uploadRecording').mockReturnValue(of(mockFileName));

    const { user } = render({
      routerConfigs: {
        routes: [
          {
            path: '/recordings',
            element: (
              <ArchivedRecordingsTable target={of(mockUploadsTarget)} isUploadsTable={true} isNestedTable={false} />
            ),
          },
        ],
      },
      preloadedState: preloadedState,
    });

    await act(async () => {
      await user.click(screen.getByLabelText('upload-recording'));

      const modal = await screen.findByRole('dialog');

      const modalTitle = await within(modal).findByText('Re-Upload Archived Recording');
      expect(modalTitle).toBeInTheDocument();
      expect(modalTitle).toBeVisible();

      const fileLabel = await within(modal).findByText('JFR File');
      expect(fileLabel).toBeInTheDocument();
      expect(fileLabel).toBeInTheDocument();

      const dropZoneText = within(modal).getByText('Drag a file here');
      expect(dropZoneText).toBeInTheDocument();
      expect(dropZoneText).toBeVisible();

      const uploadButton = within(modal).getByText('Upload');
      expect(uploadButton).toBeInTheDocument();
      expect(uploadButton).toBeVisible();

      const uploadInput = modal.querySelector(
        "input[accept='application/octet-stream,.jfr'][type='file']",
      ) as HTMLInputElement;
      expect(uploadInput).toBeInTheDocument();
      expect(uploadInput).not.toBeVisible();

      await user.click(uploadButton);
      await user.upload(uploadInput, mockFileUpload);

      const fileUploadNameText = within(modal).getByText(mockFileUpload.name);
      expect(fileUploadNameText).toBeInTheDocument();
      expect(fileUploadNameText).toBeVisible();

      const metadataEditorToggle = within(modal).getByText('Show metadata options');
      expect(metadataEditorToggle).toBeInTheDocument();
      expect(metadataEditorToggle).toBeVisible();

      await user.click(metadataEditorToggle);

      const uploadeLabelButton = within(modal).getByRole('button', { name: 'Upload Labels' });
      expect(uploadeLabelButton).toBeInTheDocument();
      expect(uploadeLabelButton).toBeVisible();

      await user.click(uploadeLabelButton);

      const labelUploadInput = modal.querySelector("input[accept='.json'][type='file']") as HTMLInputElement;
      expect(labelUploadInput).toBeInTheDocument();

      await user.upload(labelUploadInput, mockMetadataFile);

      expect(labelUploadInput.files).not.toBe(null);

      expect(labelUploadInput.files![0]).toStrictEqual(mockMetadataFile);

      const submitButton = within(modal).getByText('Submit');
      expect(submitButton).toBeInTheDocument();
      expect(submitButton).toBeVisible();

      expect(submitButton).not.toBeDisabled();
      await user.click(submitButton);

      expect(uploadSpy).toHaveBeenCalled();
      expect(uploadSpy).toHaveBeenCalledWith(
        mockFileUpload,
        convertLabels(mockUploadedRecordingLabels),
        expect.any(Function),
        expect.any(Subject),
      );

      expect(within(modal).queryByText('Submit')).not.toBeInTheDocument();
      expect(within(modal).queryByText('Cancel')).not.toBeInTheDocument();

      const closeButton = within(modal).getByText('Close');
      expect(closeButton).toBeInTheDocument();
      expect(closeButton).toBeVisible();
    });
  });

  it('should show warning popover if any metadata file upload has invalid contents', async () => {
    const { user } = render({
      routerConfigs: {
        routes: [
          {
            path: '/recordings',
            element: (
              <ArchivedRecordingsTable target={of(mockUploadsTarget)} isUploadsTable={true} isNestedTable={false} />
            ),
          },
        ],
      },
      preloadedState: preloadedState,
    });

    await act(async () => {
      await user.click(screen.getByLabelText('upload-recording'));

      const modal = await screen.findByRole('dialog');

      const modalTitle = await within(modal).findByText('Re-Upload Archived Recording');
      expect(modalTitle).toBeInTheDocument();
      expect(modalTitle).toBeVisible();

      const fileLabel = await within(modal).findByText('JFR File');
      expect(fileLabel).toBeInTheDocument();
      expect(fileLabel).toBeInTheDocument();

      const dropZoneText = within(modal).getByText('Drag a file here');
      expect(dropZoneText).toBeInTheDocument();
      expect(dropZoneText).toBeVisible();

      const uploadButton = within(modal).getByText('Upload');
      expect(uploadButton).toBeInTheDocument();
      expect(uploadButton).toBeVisible();

      const uploadInput = modal.querySelector(
        "input[accept='application/octet-stream,.jfr'][type='file']",
      ) as HTMLInputElement;
      expect(uploadInput).toBeInTheDocument();
      expect(uploadInput).not.toBeVisible();

      const metadataEditorToggle = within(modal).getByText('Show metadata options');
      expect(metadataEditorToggle).toBeInTheDocument();
      expect(metadataEditorToggle).toBeVisible();

      await user.click(metadataEditorToggle);

      const invalidMetadataFileName = 'invalid.metadata.json';
      const invalidMetadataFile = new File(['asdfg'], invalidMetadataFileName, { type: 'json' });
      invalidMetadataFile.text = jest.fn(() => Promise.resolve('asdfg'));

      const uploadeLabelButton = within(modal).getByRole('button', { name: 'Upload Labels' });
      expect(uploadeLabelButton).toBeInTheDocument();
      expect(uploadeLabelButton).toBeVisible();

      await user.click(uploadeLabelButton);

      const labelUploadInput = modal.querySelector("input[accept='.json'][type='file']") as HTMLInputElement;
      expect(labelUploadInput).toBeInTheDocument();

      await tlr.act(async () => {
        await user.upload(labelUploadInput, invalidMetadataFile);
      });

      expect(labelUploadInput.files).not.toBe(null);

      expect(labelUploadInput.files![0]).toStrictEqual(invalidMetadataFile);

      const warningTitle = screen.getByText('Invalid Selection');
      expect(warningTitle).toBeInTheDocument();
      expect(warningTitle).toBeVisible();

      const invalidFileText = screen.getByText(invalidMetadataFileName);
      expect(invalidFileText).toBeInTheDocument();
      expect(invalidFileText).toBeVisible();
    });
  });

  it('should show error view if failing to retrieve Recordings', async () => {
    jest.spyOn(defaultServices.api, 'getTargetArchivedRecordings').mockImplementationOnce((_query) => {
      throw new Error('Something wrong');
    });

    render({
      routerConfigs: {
        routes: [
          {
            path: '/recordings',
            element: <ArchivedRecordingsTable target={of(mockTarget)} isUploadsTable={false} isNestedTable={false} />,
          },
        ],
      },
      preloadedState: preloadedState,
    });

    const failTitle = screen.getByText('Error retrieving Recordings');
    expect(failTitle).toBeInTheDocument();
    expect(failTitle).toBeVisible();

    const authFailText = screen.getByText('Something wrong');
    expect(authFailText).toBeInTheDocument();
    expect(authFailText).toBeVisible();

    const toolbar = screen.queryByLabelText('archived-recording-toolbar');
    expect(toolbar).not.toBeInTheDocument();
  });
});
