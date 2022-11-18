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
import { act as doAct, cleanup, screen, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { of } from 'rxjs';
import { ProbeTemplate } from '@app/Shared/Services/Api.service';
import {
  MessageMeta,
  MessageType,
  NotificationCategory,
  NotificationMessage,
} from '@app/Shared/Services/NotificationChannel.service';
import { ServiceContext, defaultServices } from '@app/Shared/Services/Services';
import { DeleteProbeTemplates } from '@app/Modal/DeleteWarningUtils';
import { AgentProbeTemplates } from '@app/Agent/AgentProbeTemplates';
import { renderWithServiceContext } from '../Common';
import { NotificationsContext, NotificationsInstance } from '@app/Notifications/Notifications';

const mockMessageType = { type: 'application', subtype: 'json' } as MessageType;

const mockProbeTemplate: ProbeTemplate = {
  name: 'someProbeTemplate',
  xml: '<some><dummy><xml></xml></dummy></some>',
};

const mockAnotherProbeTemplate: ProbeTemplate = {
  name: 'anotherProbeTemplate',
  xml: '<some><other><xml></xml></dummy></some>',
};

const mockFileUpload = new File([mockProbeTemplate.xml], 'probe_template.xml', { type: 'xml' });

const mockCreateTemplateNotification = {
  meta: {
    category: NotificationCategory.ProbeTemplateUploaded,
    type: mockMessageType,
  } as MessageMeta,
  message: {
    template: mockAnotherProbeTemplate,
  },
} as NotificationMessage;

const mockDeleteTemplateNotification = {
  meta: {
    category: NotificationCategory.ProbeTemplateDeleted,
    type: mockMessageType,
  },
  message: {
    template: mockProbeTemplate,
  },
} as NotificationMessage;

jest
  .spyOn(defaultServices.settings, 'deletionDialogsEnabledFor')
  .mockReturnValueOnce(false) // should delete a probe template when Delete is clicked
  .mockReturnValue(true); // should show warning modal and delete a probe template when confirmed

const uploadRequestSpy = jest.spyOn(defaultServices.api, 'addCustomProbeTemplate').mockReturnValue(of(true));

jest
  .spyOn(defaultServices.api, 'getProbeTemplates')
  .mockReturnValueOnce(of([mockProbeTemplate])) // renders Correctly

  .mockReturnValueOnce(of([mockProbeTemplate])) // should add a probe template after receiving a notification
  .mockReturnValueOnce(of([mockProbeTemplate, mockAnotherProbeTemplate]))

  .mockReturnValueOnce(of([mockProbeTemplate])) // should remove a probe template after receiving a notification
  .mockReturnValueOnce(of([]))

  .mockReturnValue(of([mockProbeTemplate])); // All other tests

jest
  .spyOn(defaultServices.notificationChannel, 'messages')
  .mockReturnValueOnce(of()) // renders correctly
  .mockReturnValueOnce(of())

  .mockReturnValueOnce(of(mockCreateTemplateNotification)) // adds a template after receiving a notification
  .mockReturnValueOnce(of())

  .mockReturnValueOnce(of())
  .mockReturnValueOnce(of(mockDeleteTemplateNotification)) // removes a template after receiving a notification

  .mockReturnValue(of()); // All other tests

describe('<AgentProbeTemplates />', () => {
  afterEach(cleanup);

  it('renders correctly', async () => {
    let tree;
    await act(async () => {
      tree = renderer.create(
        <ServiceContext.Provider value={defaultServices}>
          <NotificationsContext.Provider value={NotificationsInstance}>
            <AgentProbeTemplates agentDetected={true} />
          </NotificationsContext.Provider>
        </ServiceContext.Provider>
      );
    });
    expect(tree.toJSON()).toMatchSnapshot();
  });

  it('should add a probe template after receiving a notification', async () => {
    renderWithServiceContext(<AgentProbeTemplates agentDetected={true} />);

    const addTemplateName = screen.getByText('anotherProbeTemplate');
    expect(addTemplateName).toBeInTheDocument();
    expect(addTemplateName).toBeVisible();
  });

  it('should remove a probe template after receiving a notification', async () => {
    renderWithServiceContext(<AgentProbeTemplates agentDetected={true} />);

    expect(screen.queryByText('someProbeTemplate')).not.toBeInTheDocument();
  });

  it('should display the column header fields', async () => {
    renderWithServiceContext(<AgentProbeTemplates agentDetected={true} />);

    const nameHeader = screen.getByText('Name');
    expect(nameHeader).toBeInTheDocument();
    expect(nameHeader).toBeVisible();

    const xmlHeader = screen.getByText('XML');
    expect(xmlHeader).toBeInTheDocument();
    expect(xmlHeader).toBeVisible();
  });

  it('should show modal when uploading', async () => {
    const { user } = renderWithServiceContext(<AgentProbeTemplates agentDetected={true} />);

    const uploadButton = screen.getByRole('button', { name: 'Upload' });
    expect(uploadButton).toBeInTheDocument();
    expect(uploadButton).toBeVisible();

    await user.click(uploadButton);

    const uploadModal = await screen.findByRole('dialog');
    expect(uploadModal).toBeInTheDocument();
    expect(uploadModal).toBeVisible();

    const modalTitle = within(uploadModal).getByText('Create Custom Probe Template');
    expect(modalTitle).toBeInTheDocument();
    expect(modalTitle).toBeVisible();
  });

  it('should upload a probe template when form is filled and Submit is clicked', async () => {
    const { user } = renderWithServiceContext(<AgentProbeTemplates agentDetected={true} />);

    const uploadButton = screen.getByRole('button', { name: 'Upload' });
    expect(uploadButton).toBeInTheDocument();
    expect(uploadButton).toBeVisible();

    await user.click(uploadButton);

    const uploadModal = await screen.findByRole('dialog');
    expect(uploadModal).toBeInTheDocument();
    expect(uploadModal).toBeVisible();

    const modalTitle = within(uploadModal).getByText('Create Custom Probe Template');
    expect(modalTitle).toBeInTheDocument();
    expect(modalTitle).toBeVisible();

    const fileUploadDropZone = within(uploadModal).getByLabelText(
      'Drag a file here or browse to upload'
    ) as HTMLInputElement;
    expect(fileUploadDropZone).toBeInTheDocument();
    expect(fileUploadDropZone).toBeVisible();

    const browseButton = within(uploadModal).getByRole('button', { name: 'Browse...' });
    expect(browseButton).toBeInTheDocument();
    expect(browseButton).toBeVisible();

    const uploadInput = uploadModal.querySelector("input[accept='.xml'][type='file']") as HTMLInputElement;
    expect(uploadInput).toBeInTheDocument();
    expect(uploadInput).not.toBeVisible();

    await user.click(browseButton);
    await user.upload(uploadInput, mockFileUpload);

    expect(uploadInput.files).not.toBe(null);
    expect(uploadInput.files![0]).toStrictEqual(mockFileUpload);

    const submitButton = screen.getByRole('button', { name: 'Submit' }) as HTMLButtonElement;
    await waitFor(() => expect(submitButton).not.toBeDisabled());
    await doAct(async () => {
      await user.click(submitButton);
    });

    expect(uploadRequestSpy).toHaveBeenCalledTimes(1);
    expect(uploadRequestSpy).toHaveBeenCalledWith(mockFileUpload);
  });

  it('should delete a probe template when Delete is clicked', async () => {
    const deleteRequestSpy = jest.spyOn(defaultServices.api, 'deleteCustomProbeTemplate').mockReturnValue(of(true));
    const { user } = renderWithServiceContext(<AgentProbeTemplates agentDetected={true} />);

    await user.click(screen.getByLabelText('Actions'));

    const deleteButton = await screen.findByText('Delete');
    expect(deleteButton).toBeInTheDocument();
    expect(deleteButton).toBeVisible();

    await user.click(deleteButton);

    expect(deleteRequestSpy).toHaveBeenCalledTimes(1);
    expect(deleteRequestSpy).toBeCalledWith('someProbeTemplate');
  });

  it('should show warning modal and delete a probe template when confirmed', async () => {
    const deleteRequestSpy = jest.spyOn(defaultServices.api, 'deleteCustomProbeTemplate').mockReturnValue(of(true));
    const { user } = renderWithServiceContext(<AgentProbeTemplates agentDetected={true} />);

    await user.click(screen.getByLabelText('Actions'));

    const deleteButton = await screen.findByText('Delete');
    expect(deleteButton).toBeInTheDocument();
    expect(deleteButton).toBeVisible();

    await user.click(deleteButton);

    const warningModal = await screen.findByRole('dialog');
    expect(warningModal).toBeInTheDocument();
    expect(warningModal).toBeVisible();

    const modalTitle = within(warningModal).getByText(DeleteProbeTemplates.title);
    expect(modalTitle).toBeInTheDocument();
    expect(modalTitle).toBeVisible();

    const confirmButton = within(warningModal).getByText('Delete');
    expect(confirmButton).toBeInTheDocument();
    expect(confirmButton).toBeVisible();

    await user.click(confirmButton);

    expect(deleteRequestSpy).toHaveBeenCalledTimes(1);
    expect(deleteRequestSpy).toBeCalledWith('someProbeTemplate');
  });

  it('should insert probes if agent is enabled', async () => {
    const insertProbesSpy = jest.spyOn(defaultServices.api, 'insertProbes').mockReturnValue(of(true));
    const { user } = renderWithServiceContext(<AgentProbeTemplates agentDetected={true} />);

    await user.click(screen.getByLabelText('Actions'));

    const insertButton = await screen.findByText('Insert Probes...');
    expect(insertButton).toBeInTheDocument();
    expect(insertButton).toBeVisible();
    expect(insertButton.getAttribute('aria-disabled')).toBe('false');

    await user.click(insertButton);

    expect(insertProbesSpy).toHaveBeenCalledTimes(1);
    expect(insertProbesSpy).toHaveBeenCalledWith(mockProbeTemplate.name);
  });

  it('should disable inserting probes if agent is not enabled', async () => {
    const { user } = renderWithServiceContext(<AgentProbeTemplates agentDetected={false} />);

    await user.click(screen.getByLabelText('Actions'));

    const insertButton = await screen.findByText('Insert Probes...');
    expect(insertButton).toBeInTheDocument();
    expect(insertButton).toBeVisible();
    expect(insertButton.getAttribute('aria-disabled')).toBe('true');
  });

  it('should shown empty state when table is empty', async () => {
    const { user } = renderWithServiceContext(<AgentProbeTemplates agentDetected={true} />);

    const filterInput = screen.getByLabelText('Probe template filter');
    expect(filterInput).toBeInTheDocument();
    expect(filterInput).toBeVisible();

    await user.type(filterInput, 'someveryoddname');

    expect(screen.queryByText('someProbeTemplate')).not.toBeInTheDocument();

    const hintText = screen.getByText('No Probe Templates');
    expect(hintText).toBeInTheDocument();
    expect(hintText).toBeVisible();
  });
});
