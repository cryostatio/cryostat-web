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
import { BulkEditThreadDumpLabels } from '@app/Diagnostics/BulkEditThreadDumpLabels';
import { NotificationMessage, Target, keyValueToString, ThreadDump } from '@app/Shared/Services/api.types';
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

const mockThreadDumpLabels = [
  {
    key: 'someLabel',
    value: 'someValue',
  },
];

const mockArchivedThreadDump: ThreadDump = {
  jvmId: mockTarget.jvmId,
  threadDumpId: 'someArchivedRecording_some_random',
  downloadUrl: 'http://downloadUrl',
  metadata: { labels: mockThreadDumpLabels },
  size: 2048,
  lastModified: 2048,
};

const mockThreadDumpLabelsNotification = {
  message: {
    target: mockConnectUrl,
    threadDump: {
      ...mockArchivedThreadDump,
      metadata: {
        labels: [...mockThreadDumpLabels, { key: 'someNewLabel', value: 'someNewValue' }],
      },
    },
  },
} as NotificationMessage;

const mockArchivedThreadDumps = [mockArchivedThreadDump];

jest.spyOn(defaultServices.target, 'target').mockReturnValue(of(mockTarget));
jest.spyOn(defaultServices.api, 'getTargetThreadDumps').mockReturnValue(of(mockArchivedThreadDumps));
jest
  .spyOn(defaultServices.notificationChannel, 'messages')
  .mockReturnValueOnce(of()) // renders correctly
  .mockReturnValueOnce(of()) // should display read-only labels from selected recordings
  .mockReturnValueOnce(of()) // should not display labels for unchecked recordings
  .mockReturnValueOnce(of(mockThreadDumpLabelsNotification)) // should update the archived recording labels after receiving a notification
  .mockReturnValue(of());

describe('<BulkEditThreadDumpLabels />', () => {
  let checkedIndices: number[];
  let emptycheckIndices: number[];

  beforeEach(() => {
    checkedIndices = [-553224758]; // Hash code of "someThreadDump_some_random"
    emptycheckIndices = [];
  });

  afterEach(cleanup);

  it('renders correctly', async () => {
    const tree = await renderSnapshot({
      routerConfigs: {
        routes: [
          {
            path: '/thread-dumps',
            element: <BulkEditThreadDumpLabels checkedIndices={checkedIndices} />,
          },
        ],
      },
    });
    expect(tree?.toJSON()).toMatchSnapshot();
  });

  it('should display labels from selected Thread Dumps', async () => {
    render({
      routerConfigs: {
        routes: [
          {
            path: '/thread-dumps',
            element: <BulkEditThreadDumpLabels checkedIndices={checkedIndices} />,
          },
        ],
      },
    });

    mockThreadDumpLabels.map(keyValueToString).forEach((value) => {
      const label = screen.getByText(value);
      expect(label).toBeInTheDocument();
      expect(label).toBeVisible();
    });
  });

  it('should not display labels for unchecked Thread Dumps', async () => {
    render({
      routerConfigs: {
        routes: [
          {
            path: '/thread-dumps',
            element: <BulkEditThreadDumpLabels checkedIndices={emptycheckIndices} />,
          },
        ],
      },
    });

    expect(screen.queryByText('someLabel')).not.toBeInTheDocument();
    expect(screen.queryByText('someValue')).not.toBeInTheDocument();
  });

  it('should update the Thread Dump Labels after receiving a notification', async () => {
    render({
      routerConfigs: {
        routes: [
          {
            path: '/thread-dumps',
            element: <BulkEditThreadDumpLabels checkedIndices={checkedIndices} />,
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
            path: '/thread-dumps',
            element: <BulkEditThreadDumpLabels checkedIndices={checkedIndices} closePanelFn={closeFn} />,
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

  it('should save target Thread Dump Labels when Save is clicked', async () => {
    const saveRequestSpy = jest
      .spyOn(defaultServices.api, 'postThreadDumpMetadata')
      .mockReturnValue(of([mockArchivedThreadDump]));
    const { user } = render({
      routerConfigs: {
        routes: [
          {
            path: '/thread-dump',
            element: <BulkEditThreadDumpLabels checkedIndices={checkedIndices} />,
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
