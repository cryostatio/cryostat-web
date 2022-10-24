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
import { cleanup, render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { of } from 'rxjs';
import { EventProbe } from '@app/Shared/Services/Api.service';
import {
  MessageMeta,
  MessageType,
  NotificationCategory,
  NotificationMessage,
} from '@app/Shared/Services/NotificationChannel.service';
import { ServiceContext, defaultServices } from '@app/Shared/Services/Services';
import userEvent from '@testing-library/user-event';
import { DeleteActiveProbes } from '@app/Modal/DeleteWarningUtils';
import { AgentLiveProbes } from '@app/Agent/AgentLiveProbes';

const mockConnectUrl = 'service:jmx:rmi://someUrl';
const mockTarget = { connectUrl: mockConnectUrl, alias: 'fooTarget' };

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
    template: mockProbe,
  },
} as NotificationMessage;

const mockRemoveProbesNotification = {
  meta: {
    category: NotificationCategory.ProbesRemoved,
    type: mockMessageType,
  } as MessageMeta,
  message: {
    target: mockTarget,
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
  .mockReturnValueOnce(of([mockProbe])) // renders correctly

  .mockReturnValueOnce(of([mockProbe])) // should add a probe after receiving a notification
  .mockReturnValueOnce(of([mockProbe, mockAnotherProbe]))

  .mockReturnValue(of([mockProbe])); // All other tests

jest
  .spyOn(defaultServices.notificationChannel, 'messages')
  .mockReturnValueOnce(of()) // renders correctly
  .mockReturnValueOnce(of())

  .mockReturnValueOnce(of(mockApplyTemplateNotification)) // should add a probe after receiving a notification
  .mockReturnValueOnce(of())

  .mockReturnValueOnce(of())
  .mockReturnValueOnce(of(mockRemoveProbesNotification)) // should remove a probe after receiving a notification

  .mockReturnValue(of()); // All other tests

describe('<AgentLiveProbes />', () => {
  afterEach(cleanup);

  it('renders correctly', async () => {
    let tree;
    await act(async () => {
      tree = renderer.create(
        <ServiceContext.Provider value={defaultServices}>
          <AgentLiveProbes />
        </ServiceContext.Provider>
      );
    });
    expect(tree.toJSON()).toMatchSnapshot();
  });

  it('should add a probe after receiving a notification', () => {
    render(
      <ServiceContext.Provider value={defaultServices}>
        <AgentLiveProbes />
      </ServiceContext.Provider>
    );

    const addTemplateName = screen.getByText('another_name');
    expect(addTemplateName).toBeInTheDocument();
    expect(addTemplateName).toBeVisible();
  });

  it('should remove all probes after receiving a notification', () => {
    render(
      <ServiceContext.Provider value={defaultServices}>
        <AgentLiveProbes />
      </ServiceContext.Provider>
    );
    expect(screen.queryByText('some_name')).not.toBeInTheDocument();
    expect(screen.queryByText('another_name')).not.toBeInTheDocument();
  });

  it('should display the column header fields', () => {
    render(
      <ServiceContext.Provider value={defaultServices}>
        <AgentLiveProbes />
      </ServiceContext.Provider>
    );

    const headers = ['ID', 'Name', 'Class', 'Description', 'Method'];
    headers.forEach((header) => {
      const nameHeader = screen.getByText(header);
      expect(nameHeader).toBeInTheDocument();
      expect(nameHeader).toBeVisible();
    });
  });

  it('should remove all probes when Remove All Probe is clicked', () => {
    const deleteRequestSpy = jest.spyOn(defaultServices.api, 'removeProbes').mockReturnValue(of(true));
    render(
      <ServiceContext.Provider value={defaultServices}>
        <AgentLiveProbes />
      </ServiceContext.Provider>
    );

    const removeButton = screen.getByText('Remove All Probes');
    expect(removeButton).toBeInTheDocument();
    expect(removeButton).toBeInTheDocument();

    userEvent.click(removeButton);

    expect(deleteRequestSpy).toBeCalledTimes(1);
  });

  it.skip('should show warning modal and remove all probes when confirmed', async () => {
    const deleteRequestSpy = jest.spyOn(defaultServices.api, 'removeProbes').mockReturnValue(of(true));
    render(
      <ServiceContext.Provider value={defaultServices}>
        <AgentLiveProbes />
      </ServiceContext.Provider>
    );

    const removeButton = screen.getByText('Remove All Probes');
    expect(removeButton).toBeInTheDocument();
    expect(removeButton).toBeInTheDocument();

    userEvent.click(removeButton);

    const warningModal = await screen.findByRole('dialog');
    expect(warningModal).toBeInTheDocument();
    expect(warningModal).toBeVisible();

    const modalTitle = within(warningModal).getByText(DeleteActiveProbes.title);
    expect(modalTitle).toBeInTheDocument();
    expect(modalTitle).toBeVisible();

    const confirmButton = within(warningModal).getByText('Delete');
    expect(confirmButton).toBeInTheDocument();
    expect(confirmButton).toBeVisible();

    userEvent.click(confirmButton);

    expect(deleteRequestSpy).toBeCalledTimes(1);
  });
});
