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

import { HeapDumpsTable } from '@app/Diagnostics/HeapDumpsTable';
import { DeleteHeapDump, DeleteOrDisableWarningType } from '@app/Modal/types';
import { emptyArchivedHeapDumpFilters, TargetHeapDumpFilters } from '@app/Shared/Redux/Filters/HeapDumpFilterSlice';
import { RootState } from '@app/Shared/Redux/ReduxStore';
import {
  HeapDump,
  KeyValue,
  keyValueToString,
} from '@app/Shared/Services/api.types';
import { defaultServices } from '@app/Shared/Services/Services';
import { defaultDatetimeFormat } from '@i18n/datetime';
import { Text } from '@patternfly/react-core';
import '@testing-library/jest-dom';
import { cleanup, screen, within, act } from '@testing-library/react';
import * as tlr from '@testing-library/react';
import { of } from 'rxjs';
import { basePreloadedState, DEFAULT_DIMENSIONS, render, resize, testT } from '../utils';

const mockHeapDumpLabels: KeyValue[] = [
  {
    key: 'someLabel',
    value: 'someValue',
  },
];

const mockConnectUrl = 'service:jmx:rmi://someUrl';

const mockTarget = {
  agent: false,
  connectUrl: mockConnectUrl,
  alias: 'someTarget',
  jvmId: 'someJvmId',
  labels: [],
  annotations: { cryostat: [], platform: [] },
};

const mockHeapDump: HeapDump = {
  downloadUrl: 'someDownloadUrl',
  heapDumpId: 'someUuid',
  jvmId: mockTarget.jvmId,
  size: 1,
  lastModified: 2,
  metadata: { labels: [{ key: 'someLabel', value: 'someValue' }] },
};

const anotherMockHeapDump: HeapDump = {
  downloadUrl: 'someDownloadUrl',
  heapDumpId: 'anotherUuid',
  jvmId: mockTarget.jvmId,
  size: 1,
  lastModified: 2,
  metadata: { labels: [{ key: 'someLabel', value: 'someValue' }] },
};

jest.mock('@app/Diagnostics/BulkEditHeapDumpLabels', () => {
  return {
    BulkEditHeapDumpLabels: (_) => <Text>Edit Heap Dump Labels</Text>,
  };
});

jest.mock('@app/Diagnostics/Filters/HeapDumpFilters', () => {
  return {
    ...jest.requireActual('@app/Diagnostics/Filters/HeapDumpFilters'),
    HeapDumpFilters: jest.fn(() => {
      return <div>HeapDumpFilters</div>;
    }),
  };
});

jest.spyOn(defaultServices.settings, 'datetimeFormat').mockReturnValue(of(defaultDatetimeFormat));

jest
  .spyOn(defaultServices.api, 'getTargetHeapDumps')
  .mockReturnValueOnce(of([mockHeapDump])) // Renders Correctly
  .mockReturnValueOnce(of([mockHeapDump]))
  .mockReturnValueOnce(of([mockHeapDump, anotherMockHeapDump])) // Adds after a notification
  .mockReturnValue(of([mockHeapDump])); // All other tests

jest.spyOn(defaultServices.api, 'deleteHeapDump').mockReturnValue(of(true));

jest.spyOn(defaultServices.target, 'target').mockReturnValue(of(mockTarget));

jest
  .spyOn(defaultServices.settings, 'deletionDialogsEnabledFor')
  .mockReturnValueOnce(true) // shows a popup when Delete is clicked and then deletes the recording after clicking confirmation Delete
  .mockReturnValueOnce(false) // deletes the recording when Delete is clicked w/o popup warning
  .mockReturnValue(true);

jest.spyOn(defaultServices.notificationChannel, 'messages').mockReturnValue(of());

describe('<HeapDumpsTable />', () => {
  let preloadedState: RootState;

  beforeAll(async () => {
    await act(async () => {
      resize(2400, 1080);
    });
  });

  beforeEach(() => {
    preloadedState = {
      ...basePreloadedState,
      heapDumpFilters: {
        list: [
          {
            target: mockTarget.connectUrl,
            archived: {
              selectedCategory: 'Name',
              filters: emptyArchivedHeapDumpFilters,
            },
          } as TargetHeapDumpFilters,
        ],
        _version: '0',
      },
    };
  });

  afterEach(cleanup);

  afterAll(() => {
    resize(DEFAULT_DIMENSIONS[0], DEFAULT_DIMENSIONS[1]);
  });

  it('should render the Heap Dump table correctly', async () => {
    render({
      routerConfigs: {
        routes: [
          {
            path: '/heapdumps',
            element: (
              <HeapDumpsTable target={of(mockTarget)} isNestedTable={false} toolbarBreakReference={document.body} />
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

    ['ID', 'Size', 'Labels'].map((text) => {
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

    const name = screen.getByText(mockHeapDump.heapDumpId);
    expect(name).toBeInTheDocument();
    expect(name).toBeVisible();

    mockHeapDumpLabels.map(keyValueToString).forEach((entry) => {
      const label = screen.getByText(entry);
      expect(label).toBeInTheDocument();
      expect(label).toBeVisible();
    });
  });

  it('should display the toolbar buttons', async () => {
    render({
      routerConfigs: {
        routes: [
          {
            path: '/heapdumps',
            element: (
              <HeapDumpsTable target={of(mockTarget)} isNestedTable={false} toolbarBreakReference={document.body} />
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
            path: '/heapdumps',
            element: (
              <HeapDumpsTable target={of(mockTarget)} isNestedTable={false} toolbarBreakReference={document.body} />
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
    expect(screen.getByText('Edit Heap Dump Labels')).toBeInTheDocument();
  });

  it('should show a popup when Delete is clicked and then deletes the Heap Dump after clicking confirmation Delete', async () => {
    const { user } = render({
      routerConfigs: {
        routes: [
          {
            path: '/heapdumps',
            element: (
              <HeapDumpsTable target={of(mockTarget)} isNestedTable={false} toolbarBreakReference={document.body} />
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

    const deleteModal = await screen.findByLabelText(DeleteHeapDump.ariaLabel);
    expect(deleteModal).toBeInTheDocument();
    expect(deleteModal).toBeVisible();

    const deleteRequestSpy = jest.spyOn(defaultServices.api, 'deleteHeapDump');
    const dialogWarningSpy = jest.spyOn(defaultServices.settings, 'setDeletionDialogsEnabledFor');
    await user.click(screen.getByLabelText("Don't ask me again"));
    await user.click(within(screen.getByLabelText(DeleteHeapDump.ariaLabel)).getByText('Delete'));

    expect(deleteRequestSpy).toHaveBeenCalledTimes(1);
    expect(deleteRequestSpy).toHaveBeenCalledWith(mockTarget, 'someUuid');
    expect(dialogWarningSpy).toHaveBeenCalledTimes(1);
    expect(dialogWarningSpy).toHaveBeenCalledWith(DeleteOrDisableWarningType.DeleteHeapDump, false);
  });

  it('should delete the Heap Dump when Delete is clicked w/o popup warning', async () => {
    const { user } = render({
      routerConfigs: {
        routes: [
          {
            path: '/heapdumps',
            element: (
              <HeapDumpsTable target={of(mockTarget)} isNestedTable={false} toolbarBreakReference={document.body} />
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

    const deleteRequestSpy = jest.spyOn(defaultServices.api, 'deleteHeapDump');

    expect(screen.queryByLabelText(DeleteHeapDump.ariaLabel)).not.toBeInTheDocument();
    expect(deleteRequestSpy).toHaveBeenCalledTimes(1);
    expect(deleteRequestSpy).toHaveBeenCalledWith(mockTarget, 'someUuid');
  });

  it('should download a Heap Dump when Download Heap Dump is clicked', async () => {
    const { user } = render({
      routerConfigs: {
        routes: [
          {
            path: '/heapdumps',
            element: <HeapDumpsTable target={of(mockTarget)} isNestedTable={false} />,
          },
        ],
      },
      preloadedState: preloadedState,
    });

    await tlr.act(async () => {
      await user.click(screen.getByLabelText(testT('HeapDumpActions.ARIA_LABELS.MENU_TOGGLE')));
      await user.click(screen.getByText('Download Heap Dump'));
    });

    const downloadRequestSpy = jest.spyOn(defaultServices.api, 'downloadHeapDump');

    expect(downloadRequestSpy).toHaveBeenCalledTimes(1);
    expect(downloadRequestSpy).toHaveBeenCalledWith(mockHeapDump);
  });
});
