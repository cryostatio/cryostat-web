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
import { authFailMessage } from '@app/ErrorView/types';
import { EventTemplates } from '@app/Events/EventTemplates';
import { DeleteOrDisableWarningType } from '@app/Modal/types';
import { MessageType, EventTemplate, MessageMeta, NotificationMessage, Target } from '@app/Shared/Services/api.types';
import { ServiceContext, defaultServices, Services } from '@app/Shared/Services/Services';
import { TargetService } from '@app/Shared/Services/Target.service';
import { act, cleanup, screen, within } from '@testing-library/react';
import { of, Subject } from 'rxjs';
import { createMockForPFTableRef, render, renderSnapshot, testT } from '../utils';

const mockConnectUrl = 'service:jmx:rmi://someUrl';
const mockTarget = {
  agent: false,
  connectUrl: mockConnectUrl,
  alias: 'fooTarget',
  jvmId: 'foo',
  labels: [],
  annotations: { cryostat: [], platform: [] },
};

const mockMessageType = { type: 'application', subtype: 'json' } as MessageType;

const mockCustomEventTemplate: EventTemplate = {
  name: 'someEventTemplate',
  description: 'Some Description',
  provider: 'Cryostat',
  type: 'CUSTOM',
};

const mockAnotherTemplate = { ...mockCustomEventTemplate, name: 'anotherEventTemplate' };

const mockCreateTemplateNotification = {
  meta: {
    category: 'TemplateCreated',
    type: mockMessageType,
  } as MessageMeta,
  message: {
    template: mockAnotherTemplate,
  },
} as NotificationMessage;
const mockDeleteTemplateNotification = {
  ...mockCreateTemplateNotification,
  meta: {
    category: 'TemplateDeleted',
    type: mockMessageType,
  },
};

const mockEventTemplateContent = '<some><other><xml></xml></dummy></some>';
const mockFileUpload = new File([mockEventTemplateContent], 'mockEventTemplate.xml', { type: 'xml' });

jest
  .spyOn(defaultServices.settings, 'deletionDialogsEnabledFor')
  .mockReturnValueOnce(true) // show deletion warning
  .mockReturnValue(false); // don't ask again

jest.spyOn(defaultServices.api, 'addCustomEventTemplate').mockReturnValue(of(true));
jest.spyOn(defaultServices.api, 'deleteCustomEventTemplate').mockReturnValue(of(true));
jest.spyOn(defaultServices.api, 'downloadTemplate').mockReturnValue(void 0);

jest.spyOn(defaultServices.api, 'getTargetEventTemplates').mockReturnValue(of([mockCustomEventTemplate]));

jest.spyOn(defaultServices.target, 'target').mockReturnValue(of(mockTarget));
jest.spyOn(defaultServices.target, 'authFailure').mockReturnValue(of());

jest
  .spyOn(defaultServices.notificationChannel, 'messages')
  .mockReturnValueOnce(of()) // renders correctly
  .mockReturnValueOnce(of())

  .mockReturnValueOnce(of(mockCreateTemplateNotification)) // adds a template after receiving a notification
  .mockReturnValueOnce(of())
  .mockReturnValueOnce(of())

  .mockReturnValueOnce(of(mockDeleteTemplateNotification)) // removes a template after receiving a notification
  .mockReturnValue(of()); // all other tests

describe('<EventTemplates />', () => {
  afterEach(cleanup);

  it('renders correctly', async () => {
    const tree = await renderSnapshot({
      routerConfigs: {
        routes: [
          {
            path: '/events',
            element: <EventTemplates />,
          },
        ],
      },
      createNodeMock: createMockForPFTableRef,
    });
    expect(tree?.toJSON()).toMatchSnapshot();
  });

  it('adds a Recording after receiving a notification', async () => {
    render({
      routerConfigs: {
        routes: [
          {
            path: '/events',
            element: <EventTemplates />,
          },
        ],
      },
    });

    expect(screen.getByText('someEventTemplate')).toBeInTheDocument();
    expect(screen.getByText('anotherEventTemplate')).toBeInTheDocument();
  });

  it('removes a Recording after receiving a notification', async () => {
    render({
      routerConfigs: {
        routes: [
          {
            path: '/events',
            element: <EventTemplates />,
          },
        ],
      },
    });

    expect(screen.queryByText('anotherEventTemplate')).not.toBeInTheDocument();
  });

  it('displays the column header fields', async () => {
    render({
      routerConfigs: {
        routes: [
          {
            path: '/events',
            element: <EventTemplates />,
          },
        ],
      },
    });

    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Description')).toBeInTheDocument();
    expect(screen.getByText('Provider')).toBeInTheDocument();
    expect(screen.getByText('Type')).toBeInTheDocument();
  });

  it('shows a popup when uploading', async () => {
    const { user } = render({
      routerConfigs: {
        routes: [
          {
            path: '/events',
            element: <EventTemplates />,
          },
        ],
      },
    });

    expect(screen.queryByLabelText('Create custom Event Template')).not.toBeInTheDocument();

    await act(async () => {
      const buttons = screen.getAllByRole('button');
      const uploadButton = buttons[0];
      await user.click(uploadButton);

      expect(screen.getByLabelText('Create custom Event Template'));
    });
  });

  it('downloads an Event Template when Download is clicked on template action bar', async () => {
    const downloadRequestSpy = jest.spyOn(defaultServices.api, 'downloadTemplate');
    const { user } = render({
      routerConfigs: {
        routes: [
          {
            path: '/events',
            element: <EventTemplates />,
          },
        ],
      },
    });

    await act(async () => {
      await user.click(screen.getByLabelText('Kebab toggle'));
      await user.click(screen.getByText('Download'));
    });

    expect(downloadRequestSpy).toHaveBeenCalledTimes(1);
    expect(downloadRequestSpy).toHaveBeenCalledWith(mockCustomEventTemplate);
  });

  it('shows a popup when Delete is clicked and then deletes the template after clicking confirmation Delete', async () => {
    const deleteRequestSpy = jest.spyOn(defaultServices.api, 'deleteCustomEventTemplate');
    const dialogWarningSpy = jest.spyOn(defaultServices.settings, 'setDeletionDialogsEnabledFor');
    const { user } = render({
      routerConfigs: {
        routes: [
          {
            path: '/events',
            element: <EventTemplates />,
          },
        ],
      },
    });

    await act(async () => {
      await user.click(screen.getByLabelText('Kebab toggle'));

      expect(screen.getByText('Create Recording...'));
      expect(screen.getByText('Download'));
      expect(screen.getByText('Delete'));

      const deleteAction = screen.getByText('Delete');
      await user.click(deleteAction);

      expect(screen.getByLabelText('Event Template delete warning'));

      await user.click(screen.getByLabelText("Don't ask me again"));
      await user.click(within(screen.getByLabelText('Event Template delete warning')).getByText('Delete'));
    });

    expect(deleteRequestSpy).toHaveBeenCalledTimes(1);
    expect(deleteRequestSpy).toHaveBeenCalledWith('someEventTemplate');
    expect(dialogWarningSpy).toHaveBeenCalledTimes(1);
    expect(dialogWarningSpy).toHaveBeenCalledWith(DeleteOrDisableWarningType.DeleteEventTemplates, false);
  });

  it('deletes the template when Delete is clicked w/o popup warning', async () => {
    const deleteRequestSpy = jest.spyOn(defaultServices.api, 'deleteCustomEventTemplate');
    const { user } = render({
      routerConfigs: {
        routes: [
          {
            path: '/events',
            element: <EventTemplates />,
          },
        ],
      },
    });

    await act(async () => {
      await user.click(screen.getByLabelText('Kebab toggle'));

      expect(screen.getByText('Create Recording...'));
      expect(screen.getByText('Download'));
      expect(screen.getByText('Delete'));

      const deleteAction = screen.getByText('Delete');
      await user.click(deleteAction);
    });

    expect(deleteRequestSpy).toHaveBeenCalledTimes(1);
    expect(screen.queryByLabelText('Event Template delete warning')).not.toBeInTheDocument();
  });

  it('should show error view if failing to retrieve Event Templates', async () => {
    const subj = new Subject<void>();
    const mockTargetSvc = {
      target: () => of(mockTarget as Target),
      authFailure: () => subj.asObservable(),
    } as TargetService;
    const services: Services = {
      ...defaultServices,
      target: mockTargetSvc,
    };

    render({
      routerConfigs: {
        routes: [
          {
            path: '/events',
            element: <EventTemplates />,
          },
        ],
      },
      providers: [{ kind: ServiceContext.Provider, instance: services }],
    });

    await act(async () => subj.next());

    const failTitle = screen.getByText('Error retrieving Event Templates');
    expect(failTitle).toBeInTheDocument();
    expect(failTitle).toBeVisible();

    const authFailText = screen.getByText(authFailMessage);
    expect(authFailText).toBeInTheDocument();
    expect(authFailText).toBeVisible();

    const retryButton = screen.getByText('Retry');
    expect(retryButton).toBeInTheDocument();
    expect(retryButton).toBeVisible();
  });

  it('should shown empty state when table is empty', async () => {
    const { user } = render({
      routerConfigs: {
        routes: [
          {
            path: '/events',
            element: <EventTemplates />,
          },
        ],
      },
    });

    const filterInput = screen.getByLabelText(testT('EventTemplates.ARIA_LABELS.SEARCH_INPUT'));
    expect(filterInput).toBeInTheDocument();
    expect(filterInput).toBeVisible();

    await user.type(filterInput, 'someveryoddname');

    expect(screen.queryByText('someEventTemplate')).not.toBeInTheDocument();

    const hintText = screen.getByText('No Event Templates');
    expect(hintText).toBeInTheDocument();
    expect(hintText).toBeVisible();
  });

  it('should upload Event Template when submit button is clicked', async () => {
    const createSpy = jest.spyOn(defaultServices.api, 'addCustomEventTemplate').mockReturnValueOnce(of(true));
    const { user } = render({
      routerConfigs: {
        routes: [
          {
            path: '/events',
            element: <EventTemplates />,
          },
        ],
      },
    });

    await act(async () => {
      const uploadButton = screen.getByRole('button', { name: 'Upload' });
      expect(uploadButton).toBeInTheDocument();
      expect(uploadButton).toBeVisible();

      await user.click(uploadButton);

      const modal = await screen.findByRole('dialog');
      expect(modal).toBeInTheDocument();
      expect(modal).toBeVisible();

      const modalTitle = await within(modal).findByText('Create custom Event Template');
      expect(modalTitle).toBeInTheDocument();
      expect(modalTitle).toBeVisible();

      const dropZoneText = within(modal).getByText('Drag a file here');
      expect(dropZoneText).toBeInTheDocument();
      expect(dropZoneText).toBeVisible();

      const uploadButtonInModal = within(modal).getByText('Upload');
      expect(uploadButtonInModal).toBeInTheDocument();
      expect(uploadButtonInModal).toBeVisible();

      const uploadInput = modal.querySelector(
        "input[accept='application/xml,.xml,.jfc'][type='file']",
      ) as HTMLInputElement;
      expect(uploadInput).toBeInTheDocument();
      expect(uploadInput).not.toBeVisible();

      await user.click(uploadButton);
      await user.upload(uploadInput, mockFileUpload);

      const fileUploadNameText = within(modal).getByText(mockFileUpload.name);
      expect(fileUploadNameText).toBeInTheDocument();
      expect(fileUploadNameText).toBeVisible();

      const submitButton = within(modal).getByText('Submit');
      expect(submitButton).toBeInTheDocument();
      expect(submitButton).toBeVisible();
      expect(submitButton).not.toBeDisabled();

      await user.click(submitButton);

      expect(createSpy).toHaveBeenCalled();
      expect(createSpy).toHaveBeenCalledWith(mockFileUpload, expect.any(Function), expect.any(Subject));

      expect(within(modal).queryByText('Submit')).not.toBeInTheDocument();
      expect(within(modal).queryByText('Cancel')).not.toBeInTheDocument();

      const closeButton = within(modal).getByText('Close');
      expect(closeButton).toBeInTheDocument();
      expect(closeButton).toBeVisible();
    });
  });
});
