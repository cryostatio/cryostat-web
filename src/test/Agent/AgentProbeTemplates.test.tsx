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
import { AgentProbeTemplates } from '@app/Agent/AgentProbeTemplates';
import { DeleteProbeTemplates } from '@app/Modal/types';
import {
  MessageType,
  ProbeTemplate,
  NotificationCategory,
  MessageMeta,
  NotificationMessage,
} from '@app/Shared/Services/api.types';
import { defaultServices } from '@app/Shared/Services/Services';
import '@testing-library/jest-dom';
import { cleanup, screen, within, act } from '@testing-library/react';
import { of, Subject } from 'rxjs';
import { render, testT } from '../utils';

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
    probeTemplate: mockAnotherProbeTemplate.name,
    templateContent: mockAnotherProbeTemplate.xml,
  },
} as NotificationMessage;

const mockDeleteTemplateNotification = {
  meta: {
    category: NotificationCategory.ProbeTemplateDeleted,
    type: mockMessageType,
  },
  message: {
    probeTemplate: mockProbeTemplate.name,
  },
} as NotificationMessage;

jest
  .spyOn(defaultServices.settings, 'deletionDialogsEnabledFor')
  .mockReturnValueOnce(false) // should delete a probe template when Delete is clicked
  .mockReturnValue(true); // should show warning modal and delete a probe template when confirmed

const uploadRequestSpy = jest.spyOn(defaultServices.api, 'addCustomProbeTemplate').mockReturnValue(of(true));

jest
  .spyOn(defaultServices.api, 'getProbeTemplates')
  .mockReturnValueOnce(of([mockProbeTemplate])) // should add a probe template after receiving a notification
  .mockReturnValueOnce(of([mockProbeTemplate, mockAnotherProbeTemplate]))

  .mockReturnValueOnce(of([mockProbeTemplate])) // should remove a probe template after receiving a notification
  .mockReturnValueOnce(of([]))

  .mockReturnValue(of([mockProbeTemplate])); // All other tests

jest
  .spyOn(defaultServices.notificationChannel, 'messages')
  .mockReturnValueOnce(of(mockCreateTemplateNotification)) // adds a template after receiving a notification
  .mockReturnValueOnce(of())

  .mockReturnValueOnce(of())
  .mockReturnValueOnce(of(mockDeleteTemplateNotification)) // removes a template after receiving a notification

  .mockReturnValue(of()); // All other tests

describe('<AgentProbeTemplates />', () => {
  afterEach(cleanup);

  it('should add a Probe Template after receiving a notification', async () => {
    render({ routerConfigs: { routes: [{ path: '/events', element: <AgentProbeTemplates agentDetected={true} /> }] } });

    const addTemplateName = screen.getByText('anotherProbeTemplate');
    expect(addTemplateName).toBeInTheDocument();
    expect(addTemplateName).toBeVisible();
  });

  it('should remove a Probe Template after receiving a notification', async () => {
    render({ routerConfigs: { routes: [{ path: '/events', element: <AgentProbeTemplates agentDetected={true} /> }] } });

    expect(screen.queryByText('someProbeTemplate')).not.toBeInTheDocument();
  });

  it('should display the column header fields', async () => {
    render({ routerConfigs: { routes: [{ path: '/events', element: <AgentProbeTemplates agentDetected={true} /> }] } });

    const nameHeader = screen.getByText('Name');
    expect(nameHeader).toBeInTheDocument();
    expect(nameHeader).toBeVisible();

    const xmlHeader = screen.getByText('XML');
    expect(xmlHeader).toBeInTheDocument();
    expect(xmlHeader).toBeVisible();
  });

  it('should show modal when uploading', async () => {
    const { user } = render({
      routerConfigs: { routes: [{ path: '/events', element: <AgentProbeTemplates agentDetected={true} /> }] },
    });

    await act(async () => {
      const uploadButton = screen.getByRole('button', { name: 'Upload' });
      expect(uploadButton).toBeInTheDocument();
      expect(uploadButton).toBeVisible();

      await user.click(uploadButton);

      const modal = await screen.findByRole('dialog');
      expect(modal).toBeInTheDocument();
      expect(modal).toBeVisible();

      const modalTitle = within(modal).getByText('Create custom Probe Template');
      expect(modalTitle).toBeInTheDocument();
      expect(modalTitle).toBeVisible();
    });
  });

  it('should upload a Probe Template when form is filled and Submit is clicked', async () => {
    const { user } = render({
      routerConfigs: { routes: [{ path: '/events', element: <AgentProbeTemplates agentDetected={true} /> }] },
    });

    await act(async () => {
      const uploadButton = screen.getByRole('button', { name: 'Upload' });
      expect(uploadButton).toBeInTheDocument();
      expect(uploadButton).toBeVisible();

      await user.click(uploadButton);

      const modal = await screen.findByRole('dialog');
      expect(modal).toBeInTheDocument();
      expect(modal).toBeVisible();

      const modalTitle = within(modal).getByText('Create custom Probe Template');
      expect(modalTitle).toBeInTheDocument();
      expect(modalTitle).toBeVisible();

      const dropZoneText = within(modal).getByText('Drag a file here');
      expect(dropZoneText).toBeInTheDocument();
      expect(dropZoneText).toBeVisible();

      const uploadButtonInModal = within(modal).getByText('Upload');
      expect(uploadButtonInModal).toBeInTheDocument();
      expect(uploadButtonInModal).toBeVisible();

      const uploadInput = modal.querySelector("input[accept='application/xml,.xml'][type='file']") as HTMLInputElement;
      expect(uploadInput).toBeInTheDocument();
      expect(uploadInput).not.toBeVisible();

      await user.click(uploadButtonInModal);
      await user.upload(uploadInput, mockFileUpload);

      const submitButton = within(modal).getByText('Submit');
      expect(submitButton).toBeInTheDocument();
      expect(submitButton).toBeVisible();
      expect(submitButton).not.toBeDisabled();

      await user.click(submitButton);

      expect(uploadRequestSpy).toHaveBeenCalledTimes(1);
      expect(uploadRequestSpy).toHaveBeenCalledWith(mockFileUpload, expect.any(Function), expect.any(Subject));

      expect(within(modal).queryByText('Submit')).not.toBeInTheDocument();
      expect(within(modal).queryByText('Cancel')).not.toBeInTheDocument();

      const closeButton = within(modal).getByText('Close');
      expect(closeButton).toBeInTheDocument();
      expect(closeButton).toBeVisible();
    });
  });

  it('should delete a Probe Template when Delete is clicked', async () => {
    const deleteRequestSpy = jest.spyOn(defaultServices.api, 'deleteCustomProbeTemplate').mockReturnValue(of(true));
    const { user } = render({
      routerConfigs: { routes: [{ path: '/events', element: <AgentProbeTemplates agentDetected={true} /> }] },
    });

    await act(async () => {
      await user.click(screen.getByLabelText(testT('AgentProbeTemplates.ARIA_LABELS.ROW_ACTION')));

      const deleteButton = await screen.findByText('Delete');
      expect(deleteButton).toBeInTheDocument();
      expect(deleteButton).toBeVisible();

      await user.click(deleteButton);
    });

    expect(deleteRequestSpy).toHaveBeenCalledTimes(1);
    expect(deleteRequestSpy).toBeCalledWith('someProbeTemplate');
  });

  it('should show warning modal and delete a Probe Template when confirmed', async () => {
    const deleteRequestSpy = jest.spyOn(defaultServices.api, 'deleteCustomProbeTemplate').mockReturnValue(of(true));
    const { user } = render({
      routerConfigs: { routes: [{ path: '/events', element: <AgentProbeTemplates agentDetected={true} /> }] },
    });

    await act(async () => {
      await user.click(screen.getByLabelText(testT('AgentProbeTemplates.ARIA_LABELS.ROW_ACTION')));

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
    });

    expect(deleteRequestSpy).toHaveBeenCalledTimes(1);
    expect(deleteRequestSpy).toBeCalledWith('someProbeTemplate');
  });

  it('should insert probes if agent is enabled', async () => {
    const insertProbesSpy = jest.spyOn(defaultServices.api, 'insertProbes').mockReturnValue(of(true));
    const { user } = render({
      routerConfigs: { routes: [{ path: '/events', element: <AgentProbeTemplates agentDetected={true} /> }] },
    });

    await act(async () => {
      await user.click(screen.getByLabelText(testT('AgentProbeTemplates.ARIA_LABELS.ROW_ACTION')));

      const insertButton = await screen.findByLabelText('insert-template');
      expect(insertButton).toBeInTheDocument();
      expect(insertButton).toBeVisible();
      expect(insertButton.getAttribute('aria-disabled')).toBeNull();

      await user.click(insertButton);
    });

    expect(insertProbesSpy).toHaveBeenCalledTimes(1);
    expect(insertProbesSpy).toHaveBeenCalledWith(mockProbeTemplate.name);
  });

  it('should disable inserting probes if agent is not enabled', async () => {
    const { user } = render({
      routerConfigs: { routes: [{ path: '/events', element: <AgentProbeTemplates agentDetected={false} /> }] },
    });

    await act(async () => {
      await user.click(screen.getByLabelText(testT('AgentProbeTemplates.ARIA_LABELS.ROW_ACTION')));

      const insertButton = await screen.findByLabelText('insert-template');
      expect(insertButton).toBeInTheDocument();
      expect(insertButton).toBeVisible();
      expect(insertButton.getAttribute('aria-disabled')).toBe('true');
    });
  });

  it('should shown empty state when table is empty', async () => {
    const { user } = render({
      routerConfigs: { routes: [{ path: '/events', element: <AgentProbeTemplates agentDetected={true} /> }] },
    });

    const filterInput = screen.getByLabelText(testT('AgentProbeTemplates.ARIA_LABELS.SEARCH_INPUT'));
    expect(filterInput).toBeInTheDocument();
    expect(filterInput).toBeVisible();

    await user.type(filterInput, 'someveryoddname');

    expect(screen.queryByText('someProbeTemplate')).not.toBeInTheDocument();

    const hintText = screen.getByText('No Probe Templates');
    expect(hintText).toBeInTheDocument();
    expect(hintText).toBeVisible();
  });
});
