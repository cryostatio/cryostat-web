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
import { DeleteHeapDump } from '@app/Modal/types';
import {
  MessageMeta,
  MessageType,
  NotificationCategory,
  NotificationMessage,
  HeapDump,
} from '@app/Shared/Services/api.types';
import { defaultServices } from '@app/Shared/Services/Services';
import '@testing-library/jest-dom';
import { defaultDatetimeFormat } from '@i18n/datetime';
import { cleanup, screen, within, act } from '@testing-library/react';
import { of } from 'rxjs';
import { render, testT } from '../utils';

const mockMessageType = { type: 'application', subtype: 'json' } as MessageType;

const mockHeapDump: HeapDump = {
  downloadUrl: 'someDownloadUrl',
  heapDumpId: 'someUuid',
  jvmId: 'someJvmId',
};

const mockConnectUrl = 'service:jmx:rmi://someUrl';
const mockTarget = {
  agent: false,
  connectUrl: mockConnectUrl,
  alias: 'fooTarget',
  jvmId: 'foo',
  labels: [],
  annotations: { cryostat: [], platform: [] },
};

const mockHeapDumpNotification = {
  meta: {
    category: NotificationCategory.HeapDumpUploaded,
    type: mockMessageType,
  } as MessageMeta,
  message: {
    targetId: mockHeapDump.jvmId,
  },
} as NotificationMessage;

jest.spyOn(defaultServices.settings, 'deletionDialogsEnabledFor').mockReturnValue(true);
jest.spyOn(defaultServices.settings, 'datetimeFormat').mockReturnValue(of(defaultDatetimeFormat));

jest.spyOn(defaultServices.api, 'getHeapDumps').mockReturnValue(of([mockHeapDump]));

jest.spyOn(defaultServices.target, 'target').mockReturnValue(of(mockTarget));

jest
  .spyOn(defaultServices.notificationChannel, 'messages')
  .mockReturnValueOnce(of(mockHeapDumpNotification))
  .mockReturnValue(of());

describe('<HeapDumpsTable />', () => {
  afterEach(cleanup);

  it('should add a Heap Dump after receiving a notification', async () => {
    render({ routerConfigs: { routes: [{ path: '/heapdumps', element: <HeapDumpsTable target={of(mockTarget)}/> }] } });

    const addTemplateName = screen.getByText('someUuid');
    expect(addTemplateName).toBeInTheDocument();
    expect(addTemplateName).toBeVisible();
  });

  it('should display the column header fields', async () => {
    render({ routerConfigs: { routes: [{ path: '/heapdumps', element: <HeapDumpsTable target={of(mockTarget)}/> }] } });

    const nameHeader = screen.getByText('ID');
    expect(nameHeader).toBeInTheDocument();
    expect(nameHeader).toBeVisible();

    const modifiedHeader = screen.getByText('Last Modified');
    expect(modifiedHeader).toBeInTheDocument();
    expect(modifiedHeader).toBeVisible();

    const sizeHeader = screen.getByText('Size');
    expect(sizeHeader).toBeInTheDocument();
    expect(sizeHeader).toBeVisible();
  });

  it('should show warning modal and delete a Heap Dump when confirmed', async () => {
    const deleteRequestSpy = jest.spyOn(defaultServices.api, 'deleteHeapDump').mockReturnValue(of(true));
    const { user } = render({
      routerConfigs: { routes: [{ path: '/heapdumps', element: <HeapDumpsTable target={of(mockTarget)}/> }] },
    });

    await act(async () => {
      await user.click(screen.getByLabelText(testT('HeapDumps.ARIA_LABELS.ROW_ACTION')));

      const deleteButton = await screen.findByText('Delete');
      expect(deleteButton).toBeInTheDocument();
      expect(deleteButton).toBeVisible();

      await user.click(deleteButton);

      const warningModal = await screen.findByRole('dialog');
      expect(warningModal).toBeInTheDocument();
      expect(warningModal).toBeVisible();

      const modalTitle = within(warningModal).getByText(DeleteHeapDump.title);
      expect(modalTitle).toBeInTheDocument();
      expect(modalTitle).toBeVisible();

      const confirmButton = within(warningModal).getByText('Delete');
      expect(confirmButton).toBeInTheDocument();
      expect(confirmButton).toBeVisible();

      await user.click(confirmButton);
    });

    expect(deleteRequestSpy).toHaveBeenCalledTimes(1);
    expect(deleteRequestSpy).toHaveBeenCalledWith('someUuid');
  });

  it('should shown empty state when table is empty', async () => {
    const { user } = render({
      routerConfigs: { routes: [{ path: '/heapdumps', element: <HeapDumpsTable target={of(mockTarget)}/> }] },
    });

    const filterInput = screen.getByLabelText(testT('HeapDumps.ARIA_LABELS.SEARCH_INPUT'));
    expect(filterInput).toBeInTheDocument();
    expect(filterInput).toBeVisible();

    await user.type(filterInput, 'someveryoddname');

    expect(screen.queryByText('someHeapDump')).not.toBeInTheDocument();

    const hintText = screen.getByText('No Heap Dumps');
    expect(hintText).toBeInTheDocument();
    expect(hintText).toBeVisible();
  });
});
