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

import { ThreadDumpsTable } from '@app/Diagnostics/ThreadDumpsTable';
import { DeleteThreadDump } from '@app/Modal/types';
import {
  MessageMeta,
  MessageType,
  NotificationCategory,
  NotificationMessage,
  ThreadDump,
} from '@app/Shared/Services/api.types';
import { defaultServices } from '@app/Shared/Services/Services';
import '@testing-library/jest-dom';
import { defaultDatetimeFormat } from '@i18n/datetime';
import { cleanup, screen, within, act } from '@testing-library/react';
import { of } from 'rxjs';
import { render, testT } from '../utils';

const mockMessageType = { type: 'application', subtype: 'json' } as MessageType;

const mockThreadDump: ThreadDump = {
  downloadUrl: 'someDownloadUrl',
  uuid: 'someUuid',
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

const mockThreadDumpNotification = {
  meta: {
    category: NotificationCategory.ThreadDumpSuccess,
    type: mockMessageType,
  } as MessageMeta,
  message: {
    targetId: mockThreadDump.jvmId,
  },
} as NotificationMessage;

jest.spyOn(defaultServices.settings, 'deletionDialogsEnabledFor').mockReturnValue(true);
jest.spyOn(defaultServices.settings, 'datetimeFormat').mockReturnValue(of(defaultDatetimeFormat));

jest.spyOn(defaultServices.api, 'getThreadDumps').mockReturnValue(of([mockThreadDump]));

jest.spyOn(defaultServices.target, 'target').mockReturnValue(of(mockTarget));

jest
  .spyOn(defaultServices.notificationChannel, 'messages')
  .mockReturnValueOnce(of(mockThreadDumpNotification))
  .mockReturnValue(of());

const dumpThreadsSpy = jest.spyOn(defaultServices.api, 'runThreadDump').mockReturnValue(of('someJobId'));

describe('<ThreadDumpsTable />', () => {
  afterEach(cleanup);

  it('should add a Thread Dump after receiving a notification', async () => {
    render({ routerConfigs: { routes: [{ path: '/threaddumps', element: <ThreadDumpsTable /> }] } });

    const addTemplateName = screen.getByText('someUuid');
    expect(addTemplateName).toBeInTheDocument();
    expect(addTemplateName).toBeVisible();
  });

  it('should display the column header fields', async () => {
    render({ routerConfigs: { routes: [{ path: '/threaddumps', element: <ThreadDumpsTable /> }] } });

    const nameHeader = screen.getByText('ID');
    expect(nameHeader).toBeInTheDocument();
    expect(nameHeader).toBeVisible();

    const xmlHeader = screen.getByText('Last Modified');
    expect(xmlHeader).toBeInTheDocument();
    expect(xmlHeader).toBeVisible();
  });

  it('should upload a Thread Dump when button is clicked', async () => {
    const { user } = render({
      routerConfigs: { routes: [{ path: '/threaddumps', element: <ThreadDumpsTable /> }] },
    });

    await act(async () => {
      const uploadButton = screen.getByRole('button', { name: 'dump-threads' });
      expect(uploadButton).toBeInTheDocument();
      expect(uploadButton).toBeVisible();

      await user.click(uploadButton);
      expect(dumpThreadsSpy).toHaveBeenCalledTimes(1);
    });
  });

  it('should show warning modal and delete a Thread Dump when confirmed', async () => {
    const deleteRequestSpy = jest.spyOn(defaultServices.api, 'deleteThreadDump').mockReturnValue(of(true));
    const { user } = render({
      routerConfigs: { routes: [{ path: '/threaddumps', element: <ThreadDumpsTable /> }] },
    });

    await act(async () => {
      await user.click(screen.getByLabelText(testT('ThreadDumps.ARIA_LABELS.ROW_ACTION')));

      const deleteButton = await screen.findByText('Delete');
      expect(deleteButton).toBeInTheDocument();
      expect(deleteButton).toBeVisible();

      await user.click(deleteButton);

      const warningModal = await screen.findByRole('dialog');
      expect(warningModal).toBeInTheDocument();
      expect(warningModal).toBeVisible();

      const modalTitle = within(warningModal).getByText(DeleteThreadDump.title);
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
      routerConfigs: { routes: [{ path: '/threaddumps', element: <ThreadDumpsTable /> }] },
    });

    const filterInput = screen.getByLabelText(testT('ThreadDumps.ARIA_LABELS.SEARCH_INPUT'));
    expect(filterInput).toBeInTheDocument();
    expect(filterInput).toBeVisible();

    await user.type(filterInput, 'someveryoddname');

    expect(screen.queryByText('someThreadDump')).not.toBeInTheDocument();

    const hintText = screen.getByText('No Thread Dumps');
    expect(hintText).toBeInTheDocument();
    expect(hintText).toBeVisible();
  });
});
