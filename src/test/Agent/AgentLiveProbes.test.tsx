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
import { AgentLiveProbes } from '@app/Agent/AgentLiveProbes';
import { DeleteActiveProbes } from '@app/Modal/types';
import {
  MessageType,
  EventProbe,
  NotificationCategory,
  MessageMeta,
  NotificationMessage,
} from '@app/Shared/Services/api.types';
import { defaultServices } from '@app/Shared/Services/Services';
import '@testing-library/jest-dom';
import { act, cleanup, screen, within } from '@testing-library/react';
import { of } from 'rxjs';
import { render, renderSnapshot, testT } from '../utils';

const mockConnectUrl = 'service:jmx:rmi://someUrl';
const mockJvmId = 'id';
const mockTarget = {
  agent: false,
  connectUrl: mockConnectUrl,
  alias: 'fooTarget',
  jvmId: mockJvmId,
  labels: [],
  annotations: { cryostat: [], platform: [] },
};

const mockMessageType = { type: 'application', subtype: 'json' } as MessageType;

const mockProbe: EventProbe = {
  id: 'some_id',
  name: 'some_name',
  clazz: 'some_clazz',
  description: 'some_desc',
  recordStackTrace: true,
  useRethrow: true,
  methodName: 'a_method',
  methodDescriptor: 'method_desc',
  location: 'some_loc',
  returnValue: 'a_value',
  parameters: 'some_params',
  fields: 'some_fields',
  path: 'some_path',
};

const mockAnotherProbe: EventProbe = {
  ...mockProbe,
  id: 'another_id',
  name: 'another_name',
};

const mockApplyTemplateNotification = {
  meta: {
    category: NotificationCategory.ProbeTemplateApplied,
    type: mockMessageType,
  } as MessageMeta,
  message: {
    jvmId: mockJvmId,
    events: [mockAnotherProbe],
  },
} as NotificationMessage;

const mockRemoveProbesNotification = {
  meta: {
    category: NotificationCategory.ProbesRemoved,
    type: mockMessageType,
  } as MessageMeta,
  message: {
    jvmId: mockJvmId,
  },
} as NotificationMessage;

jest.spyOn(defaultServices.target, 'target').mockReturnValue(of(mockTarget));
jest.spyOn(defaultServices.target, 'authFailure').mockReturnValue(of());

jest
  .spyOn(defaultServices.settings, 'deletionDialogsEnabledFor')
  .mockReturnValueOnce(false) // should remove all probes when Remove All Probe is clicked
  .mockReturnValue(true); // should show warning modal and remove all probes when confirmed

jest
  .spyOn(defaultServices.api, 'getActiveProbes')
  // .mockReturnValueOnce(of([mockProbe])) // renders correctly

  .mockReturnValueOnce(of([])) // should disable remove button if there is no probe

  .mockReturnValueOnce(of([mockProbe])) // should add a probe after receiving a notification

  .mockReturnValue(of([mockProbe])); // All other tests

jest
  .spyOn(defaultServices.notificationChannel, 'messages')
  // .mockReturnValueOnce(of()) // renders correctly
  // .mockReturnValueOnce(of())

  .mockReturnValueOnce(of()) // should disable remove button if there is no probe
  .mockReturnValueOnce(of())

  .mockReturnValueOnce(of(mockApplyTemplateNotification)) // should add a probe after receiving a notification
  .mockReturnValueOnce(of())

  .mockReturnValueOnce(of())
  .mockReturnValueOnce(of(mockRemoveProbesNotification)) // should remove a probe after receiving a notification

  .mockReturnValue(of()); // All other tests

describe('<AgentLiveProbes />', () => {
  afterEach(cleanup);

  it.skip('renders correctly', async () => {
    const tree = await renderSnapshot({
      routerConfigs: { routes: [{ path: '/events', element: <AgentLiveProbes /> }] },
    });
    expect(tree?.toJSON()).toMatchSnapshot();
  });

  it('should disable remove button if there is no probe', async () => {
    render({ routerConfigs: { routes: [{ path: '/events', element: <AgentLiveProbes /> }] } });

    const removeButton = screen.getByText('Remove all probes');
    expect(removeButton).toBeInTheDocument();
    expect(removeButton).toBeVisible();
    expect(removeButton).toBeDisabled();
  });

  it('should add a probe after receiving a notification', async () => {
    render({ routerConfigs: { routes: [{ path: '/events', element: <AgentLiveProbes /> }] } });

    const addTemplateName = screen.getByText('another_name');
    expect(addTemplateName).toBeInTheDocument();
    expect(addTemplateName).toBeVisible();
  });

  it('should remove all probes after receiving a notification', async () => {
    render({ routerConfigs: { routes: [{ path: '/events', element: <AgentLiveProbes /> }] } });

    expect(screen.queryByText('some_name')).not.toBeInTheDocument();
    expect(screen.queryByText('another_name')).not.toBeInTheDocument();
  });

  it('should display the column header fields', async () => {
    render({ routerConfigs: { routes: [{ path: '/events', element: <AgentLiveProbes /> }] } });

    const headers = ['ID', 'Name', 'Class', 'Description', 'Method'];
    headers.forEach((header) => {
      const nameHeader = screen.getByText(header);
      expect(nameHeader).toBeInTheDocument();
      expect(nameHeader).toBeVisible();
    });
  });

  it('should remove all probes when remove all probe is clicked', async () => {
    const deleteRequestSpy = jest.spyOn(defaultServices.api, 'removeProbes').mockReturnValue(of(true));
    const { user } = render({ routerConfigs: { routes: [{ path: '/events', element: <AgentLiveProbes /> }] } });

    const removeButton = screen.getByText('Remove all probes');
    expect(removeButton).toBeInTheDocument();
    expect(removeButton).toBeVisible();

    await user.click(removeButton);

    expect(deleteRequestSpy).toBeCalledTimes(1);
  });

  it('should show warning modal and remove all probes when confirmed', async () => {
    const deleteRequestSpy = jest.spyOn(defaultServices.api, 'removeProbes').mockReturnValue(of(true));
    const { user } = render({ routerConfigs: { routes: [{ path: '/events', element: <AgentLiveProbes /> }] } });

    await act(async () => {
      const removeButton = screen.getByText('Remove all probes');
      expect(removeButton).toBeInTheDocument();
      expect(removeButton).toBeVisible();

      await user.click(removeButton);

      const warningModal = await screen.findByRole('dialog');
      expect(warningModal).toBeInTheDocument();
      expect(warningModal).toBeVisible();

      const modalTitle = within(warningModal).getByText(DeleteActiveProbes.title);
      expect(modalTitle).toBeInTheDocument();
      expect(modalTitle).toBeVisible();

      const confirmButton = within(warningModal).getByText('Delete');
      expect(confirmButton).toBeInTheDocument();
      expect(confirmButton).toBeVisible();

      await user.click(confirmButton);
    });

    expect(deleteRequestSpy).toBeCalledTimes(1);
  });

  it('should shown empty state when table is empty', async () => {
    const { user } = render({ routerConfigs: { routes: [{ path: '/events', element: <AgentLiveProbes /> }] } });

    const filterInput = screen.getByLabelText(testT('AgentLiveProves.ARIA_LABELS.SEARCH_INPUT'));
    expect(filterInput).toBeInTheDocument();
    expect(filterInput).toBeVisible();

    await user.type(filterInput, 'someveryoddname');

    expect(screen.queryByText('some_name')).not.toBeInTheDocument();

    const hintText = screen.getByText('No active probes');
    expect(hintText).toBeInTheDocument();
    expect(hintText).toBeVisible();
  });
});
