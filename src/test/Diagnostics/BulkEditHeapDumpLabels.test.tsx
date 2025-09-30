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
import { BulkEditHeapDumpLabels } from '@app/Diagnostics/BulkEditHeapDumpLabels';
import { NotificationMessage, Target, keyValueToString, HeapDump } from '@app/Shared/Services/api.types';
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

const mockHeapDumpLabels = [
  {
    key: 'someLabel',
    value: 'someValue',
  },
];

const mockArchivedHeapDump: HeapDump = {
  jvmId: mockTarget.jvmId,
  heapDumpId: 'someArchivedRecording_some_random',
  downloadUrl: 'http://downloadUrl',
  metadata: { labels: mockHeapDumpLabels },
  size: 2048,
  lastModified: 2048,
};

const mockHeapDumpLabelsNotification = {
  message: {
    target: mockConnectUrl,
    heapDump: {
      ...mockArchivedHeapDump,
      metadata: {
        labels: [...mockHeapDumpLabels, { key: 'someNewLabel', value: 'someNewValue' }],
      },
    },
  },
} as NotificationMessage;

const mockArchivedHeapDumps = [mockArchivedHeapDump];

jest.spyOn(defaultServices.target, 'target').mockReturnValue(of(mockTarget));
jest.spyOn(defaultServices.api, 'getTargetHeapDumps').mockReturnValue(of(mockArchivedHeapDumps));
jest
  .spyOn(defaultServices.notificationChannel, 'messages')
  .mockReturnValueOnce(of()) // renders correctly
  .mockReturnValueOnce(of()) // should display read-only labels from selected recordings
  .mockReturnValueOnce(of()) // should not display labels for unchecked recordings
  .mockReturnValueOnce(of(mockHeapDumpLabelsNotification)) // should update the archived recording labels after receiving a notification
  .mockReturnValue(of());

describe('<BulkEditHeapDumpLabels />', () => {
  let checkedIndices: number[];
  let emptycheckIndices: number[];

  beforeEach(() => {
    checkedIndices = [-553224758]; // Hash code of "someHeapDump_some_random"
    emptycheckIndices = [];
  });

  afterEach(cleanup);

  it('renders correctly', async () => {
    const tree = await renderSnapshot({
      routerConfigs: {
        routes: [
          {
            path: '/heapdumps',
            element: <BulkEditHeapDumpLabels checkedIndices={checkedIndices} />,
          },
        ],
      },
    });
    expect(tree?.toJSON()).toMatchSnapshot();
  });

  it('should display labels from selected Heap Dumps', async () => {
    render({
      routerConfigs: {
        routes: [
          {
            path: '/heapdumps',
            element: <BulkEditHeapDumpLabels checkedIndices={checkedIndices} />,
          },
        ],
      },
    });

    mockHeapDumpLabels.map(keyValueToString).forEach((value) => {
      const label = screen.getByText(value);
      expect(label).toBeInTheDocument();
      expect(label).toBeVisible();
    });
  });

  it('should not display labels for unchecked Heap Dumps', async () => {
    render({
      routerConfigs: {
        routes: [
          {
            path: '/heapdumps',
            element: <BulkEditHeapDumpLabels checkedIndices={emptycheckIndices} />,
          },
        ],
      },
    });

    expect(screen.queryByText('someLabel')).not.toBeInTheDocument();
    expect(screen.queryByText('someValue')).not.toBeInTheDocument();
  });

  it('should update the Heap Dump Labels after receiving a notification', async () => {
    render({
      routerConfigs: {
        routes: [
          {
            path: '/heapdumps',
            element: <BulkEditHeapDumpLabels checkedIndices={checkedIndices} />,
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

  it('should close panel when cancel button is clicked', async () => {
    const closeFn = jest.fn();
    const { user } = render({
      routerConfigs: {
        routes: [
          {
            path: '/heapdumps',
            element: <BulkEditHeapDumpLabels checkedIndices={checkedIndices} closePanelFn={closeFn} />,
          },
        ],
      },
    });

    const cancelButton = screen.getByText('Cancel');
    expect(cancelButton).toBeInTheDocument();
    expect(cancelButton).toBeVisible();

    await user.click(cancelButton);

    expect(closeFn).toHaveBeenCalledTimes(1);
  });

  it('should save target Heap Dump Labels when Save is clicked', async () => {
    const saveRequestSpy = jest
      .spyOn(defaultServices.api, 'postHeapDumpMetadata')
      .mockReturnValue(of([mockArchivedHeapDump]));
    const { user } = render({
      routerConfigs: {
        routes: [
          {
            path: '/heapdump',
            element: <BulkEditHeapDumpLabels checkedIndices={checkedIndices} />,
          },
        ],
      },
    });

    const saveButton = screen.getByText('Save');
    expect(saveButton).toBeInTheDocument();
    expect(saveButton).toBeVisible();

    await user.click(saveButton);

    expect(saveRequestSpy).toHaveBeenCalledTimes(1);
  });
});
