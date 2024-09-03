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
import { BulkEditLabels } from '@app/RecordingMetadata/BulkEditLabels';
import {
  ArchivedRecording,
  ActiveRecording,
  RecordingState,
  NotificationMessage,
  Target,
} from '@app/Shared/Services/api.types';
import { defaultServices } from '@app/Shared/Services/Services';
import '@testing-library/jest-dom';
import { cleanup, screen } from '@testing-library/react';
import { of } from 'rxjs';
import { renderSnapshot, render } from '../utils';

jest.mock('@patternfly/react-core', () => ({
  ...jest.requireActual('@patternfly/react-core'),
  Tooltip: ({ t }) => <>{t}</>,
}));

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

const mockRecordingLabels = [
  {
    key: 'someLabel',
    value: 'someValue',
  },
];

const mockArchivedRecording: ArchivedRecording = {
  name: 'someArchivedRecording_some_random',
  downloadUrl: 'http://downloadUrl',
  reportUrl: 'http://reportUrl',
  metadata: { labels: mockRecordingLabels },
  size: 2048,
  archivedTime: 2048,
};

const mockActiveRecording: ActiveRecording = {
  name: 'someActiveRecording',
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

const mockActiveLabelsNotification = {
  message: {
    target: mockConnectUrl,
    recording: {
      name: 'someActiveRecording',
      jvmId: mockJvmId,
      metadata: {
        labels: [
          { key: 'someLabel', value: 'someValue' },
          { key: 'someNewLabel', value: 'someNewValue' },
        ],
      },
    },
  },
} as NotificationMessage;

const mockActiveRecordingResponse = [mockActiveRecording];

const mockArchivedLabelsNotification = {
  message: {
    target: mockConnectUrl,
    recording: {
      name: 'someArchivedRecording_some_random',
      jvmId: mockJvmId,
      metadata: {
        labels: [
          { key: 'someLabel', value: 'someValue' },
          { key: 'someNewLabel', value: 'someNewValue' },
        ],
      },
    },
  },
} as NotificationMessage;

const mockArchivedRecordingsResponse = {
  data: {
    targetNodes: [
      {
        target: {
          archivedRecordings: {
            data: [mockArchivedRecording] as ArchivedRecording[],
          },
        },
      },
    ],
  },
};

jest.spyOn(defaultServices.target, 'target').mockReturnValue(of(mockTarget));
jest.spyOn(defaultServices.api, 'graphql').mockReturnValue(of(mockArchivedRecordingsResponse));
jest.spyOn(defaultServices.api, 'doGet').mockReturnValue(of(mockActiveRecordingResponse));
jest
  .spyOn(defaultServices.notificationChannel, 'messages')
  .mockReturnValueOnce(of()) // renders correctly
  .mockReturnValueOnce(of()) // should display read-only labels from selected recordings
  .mockReturnValueOnce(of()) // should display editable labels form when in edit mode
  .mockReturnValueOnce(of()) // should not display labels for unchecked recordings
  .mockReturnValueOnce(of(mockActiveLabelsNotification)) // should update the target recording labels after receiving a notification
  .mockReturnValueOnce(of(mockArchivedLabelsNotification)) // should update the archived recording labels after receiving a notification
  .mockReturnValue(of());

describe('<BulkEditLabels />', () => {
  let activeCheckedIndices: number[];
  let archivedCheckedIndices: number[];
  let emptycheckIndices: number[];

  beforeEach(() => {
    activeCheckedIndices = [mockActiveRecording.id];
    archivedCheckedIndices = [-553224758]; // Hash code of "someArchivedRecording_some_random"
    emptycheckIndices = [];
  });

  afterEach(cleanup);

  it('renders correctly', async () => {
    const tree = await renderSnapshot({
      routerConfigs: {
        routes: [
          {
            path: '/recordings',
            element: <BulkEditLabels checkedIndices={activeCheckedIndices} isTargetRecording={true} />,
          },
        ],
      },
    });
    expect(tree?.toJSON()).toMatchSnapshot();
  });

  it('should display read-only Labels from selected Recordings', async () => {
    render({
      routerConfigs: {
        routes: [
          {
            path: '/recordings',
            element: <BulkEditLabels checkedIndices={activeCheckedIndices} isTargetRecording={true} />,
          },
        ],
      },
    });

    const label = screen.getByLabelText('someLabel=someValue');
    expect(label).toBeInTheDocument();
    expect(label).toBeVisible();
    expect(label.onclick).toBeNull();

    const addLabelButton = screen.queryByRole('button', { name: 'Add Label' });
    expect(addLabelButton).not.toBeInTheDocument();

    const editButton = screen.getByRole('button', { name: 'Edit Labels' });
    expect(editButton).toBeInTheDocument();
    expect(editButton).toBeVisible();
    expect(editButton).not.toBeDisabled();
  });

  it('should not display Labels for unchecked Recordings', async () => {
    render({
      routerConfigs: {
        routes: [
          {
            path: '/recordings',
            element: <BulkEditLabels checkedIndices={emptycheckIndices} isTargetRecording={true} />,
          },
        ],
      },
    });

    expect(screen.queryByText('someLabel')).not.toBeInTheDocument();
    expect(screen.queryByText('someValue')).not.toBeInTheDocument();

    const placeHolder = screen.getByText('-');
    expect(placeHolder).toBeInTheDocument();
    expect(placeHolder).toBeVisible();
  });

  it('should display editable Labels form when in edit mode', async () => {
    const { user } = render({
      routerConfigs: {
        routes: [
          {
            path: '/recordings',
            element: <BulkEditLabels checkedIndices={activeCheckedIndices} isTargetRecording={true} />,
          },
        ],
      },
    });

    const editButton = screen.getByRole('button', { name: 'Edit Labels' });
    expect(editButton).toBeInTheDocument();
    expect(editButton).toBeVisible();

    await user.click(editButton);

    const addLabelButton = screen.getByRole('button', { name: 'Add Label' });
    expect(addLabelButton).toBeInTheDocument();
    expect(addLabelButton).toBeVisible();

    const labelKeyInput = screen.getAllByDisplayValue('someLabel')[0];
    expect(labelKeyInput).toHaveClass('pf-c-form-control');
    expect(labelKeyInput).toHaveClass('pf-c-form-control');
    expect(labelKeyInput).toBeInTheDocument();
    expect(labelKeyInput).toBeVisible();

    const labelValueInput = screen.getAllByDisplayValue('someValue')[0];
    expect(labelValueInput).toHaveClass('pf-c-form-control');
    expect(labelValueInput).toHaveClass('pf-c-form-control');
    expect(labelValueInput).toBeInTheDocument();
    expect(labelValueInput).toBeVisible();

    const saveButton = screen.getByText('Save');
    expect(saveButton).toBeInTheDocument();
    expect(saveButton).toBeVisible();

    const cancelButton = screen.getByText('Cancel');
    expect(cancelButton).toBeInTheDocument();
    expect(cancelButton).toBeVisible();
  });

  it('should update the target Recording labels after receiving a notification', async () => {
    render({
      routerConfigs: {
        routes: [
          {
            path: '/recordings',
            element: <BulkEditLabels checkedIndices={activeCheckedIndices} isTargetRecording={true} />,
          },
        ],
      },
    });

    const newLabel = screen.getByLabelText('someNewLabel=someNewValue');
    expect(newLabel).toBeInTheDocument();
    expect(newLabel).toBeVisible();

    const oldLabel = screen.getByLabelText('someLabel=someValue');
    expect(oldLabel).toBeInTheDocument();
    expect(oldLabel).toBeVisible();
  });

  it('should update the Archived Recording Labels after receiving a notification', async () => {
    render({
      routerConfigs: {
        routes: [
          {
            path: '/recordings',
            element: <BulkEditLabels checkedIndices={archivedCheckedIndices} isTargetRecording={false} />,
          },
        ],
      },
    });

    const newLabel = screen.getByLabelText('someNewLabel=someNewValue');
    expect(newLabel).toBeInTheDocument();
    expect(newLabel).toBeVisible();

    const oldLabel = screen.getByLabelText('someLabel=someValue');
    expect(oldLabel).toBeInTheDocument();
    expect(oldLabel).toBeVisible();
  });

  it('should return to read-only view when edited Labels are cancelled', async () => {
    const { user } = render({
      routerConfigs: {
        routes: [
          {
            path: '/recordings',
            element: <BulkEditLabels checkedIndices={archivedCheckedIndices} isTargetRecording={false} />,
          },
        ],
      },
    });

    let editButton = screen.getByRole('button', { name: 'Edit Labels' });
    expect(editButton).toBeInTheDocument();
    expect(editButton).toBeVisible();

    await user.click(editButton);

    const addLabelButton = screen.getByRole('button', { name: 'Add Label' });
    expect(addLabelButton).toBeInTheDocument();
    expect(addLabelButton).toBeVisible();

    const labelKeyInput = screen.getAllByDisplayValue('someLabel')[0];
    expect(labelKeyInput).toHaveClass('pf-c-form-control');
    expect(labelKeyInput).toHaveClass('pf-c-form-control');
    expect(labelKeyInput).toBeInTheDocument();
    expect(labelKeyInput).toBeVisible();

    const labelValueInput = screen.getAllByDisplayValue('someValue')[0];
    expect(labelValueInput).toHaveClass('pf-c-form-control');
    expect(labelValueInput).toHaveClass('pf-c-form-control');
    expect(labelValueInput).toBeInTheDocument();
    expect(labelValueInput).toBeVisible();

    const saveButton = screen.getByText('Save');
    expect(saveButton).toBeInTheDocument();
    expect(saveButton).toBeVisible();

    const cancelButton = screen.getByText('Cancel');
    expect(cancelButton).toBeInTheDocument();
    expect(cancelButton).toBeVisible();

    await user.click(cancelButton);

    editButton = screen.getByRole('button', { name: 'Edit Labels' });
    expect(editButton).toBeInTheDocument();
    expect(editButton).toBeVisible();
    expect(addLabelButton).not.toBeInTheDocument();
  });

  it('should save target Recording Labels when Save is clicked', async () => {
    const saveRequestSpy = jest
      .spyOn(defaultServices.api, 'postTargetRecordingMetadata')
      .mockReturnValue(of([mockActiveRecording]));
    const { user } = render({
      routerConfigs: {
        routes: [
          {
            path: '/recordings',
            element: <BulkEditLabels checkedIndices={activeCheckedIndices} isTargetRecording={true} />,
          },
        ],
      },
    });

    const editButton = screen.getByRole('button', { name: 'Edit Labels' });
    expect(editButton).toBeInTheDocument();
    expect(editButton).toBeVisible();

    await user.click(editButton);

    const addLabelButton = screen.getByRole('button', { name: 'Add Label' });
    expect(addLabelButton).toBeInTheDocument();
    expect(addLabelButton).toBeVisible();

    const labelKeyInput = screen.getAllByDisplayValue('someLabel')[0];
    expect(labelKeyInput).toHaveClass('pf-c-form-control');
    expect(labelKeyInput).toHaveClass('pf-c-form-control');
    expect(labelKeyInput).toBeInTheDocument();
    expect(labelKeyInput).toBeVisible();

    const labelValueInput = screen.getAllByDisplayValue('someValue')[0];
    expect(labelValueInput).toHaveClass('pf-c-form-control');
    expect(labelValueInput).toHaveClass('pf-c-form-control');
    expect(labelValueInput).toBeInTheDocument();
    expect(labelValueInput).toBeVisible();

    const saveButton = screen.getByText('Save');
    expect(saveButton).toBeInTheDocument();
    expect(saveButton).toBeVisible();

    const cancelButton = screen.getByText('Cancel');
    expect(cancelButton).toBeInTheDocument();
    expect(cancelButton).toBeVisible();

    await user.click(saveButton);

    expect(saveRequestSpy).toHaveBeenCalledTimes(1);
  });

  it('should save Archived Recording Labels when Save is clicked', async () => {
    const saveRequestSpy = jest
      .spyOn(defaultServices.api, 'postRecordingMetadata')
      .mockReturnValue(of([mockArchivedRecording]));
    const { user } = render({
      routerConfigs: {
        routes: [
          {
            path: '/recordings',
            element: <BulkEditLabels checkedIndices={archivedCheckedIndices} isTargetRecording={false} />,
          },
        ],
      },
    });

    const editButton = screen.getByRole('button', { name: 'Edit Labels' });
    expect(editButton).toBeInTheDocument();
    expect(editButton).toBeVisible();

    await user.click(editButton);

    const addLabelButton = screen.getByRole('button', { name: 'Add Label' });
    expect(addLabelButton).toBeInTheDocument();
    expect(addLabelButton).toBeVisible();

    const labelKeyInput = screen.getAllByDisplayValue('someLabel')[0];
    expect(labelKeyInput).toHaveClass('pf-c-form-control');
    expect(labelKeyInput).toHaveClass('pf-c-form-control');
    expect(labelKeyInput).toBeInTheDocument();
    expect(labelKeyInput).toBeVisible();

    const labelValueInput = screen.getAllByDisplayValue('someValue')[0];
    expect(labelValueInput).toHaveClass('pf-c-form-control');
    expect(labelValueInput).toHaveClass('pf-c-form-control');
    expect(labelValueInput).toBeInTheDocument();
    expect(labelValueInput).toBeVisible();

    const saveButton = screen.getByText('Save');
    expect(saveButton).toBeInTheDocument();
    expect(saveButton).toBeVisible();

    const cancelButton = screen.getByText('Cancel');
    expect(cancelButton).toBeInTheDocument();
    expect(cancelButton).toBeVisible();

    await user.click(saveButton);

    expect(saveRequestSpy).toHaveBeenCalledTimes(1);
  });
});
