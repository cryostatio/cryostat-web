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
import { MessageType, EventTemplate, MessageMeta, NotificationMessage } from '@app/Shared/Services/api.types';
import { NotificationsContext, NotificationsInstance } from '@app/Shared/Services/Notifications.service';
import { ServiceContext, defaultServices, Services } from '@app/Shared/Services/Services';
import { TargetService } from '@app/Shared/Services/Target.service';
import '@testing-library/jest-dom';
import { act as doAct, cleanup, screen, within } from '@testing-library/react';
import renderer, { act } from 'react-test-renderer';
import { of, Subject } from 'rxjs';
import { renderWithServiceContextAndRouter } from '../Common';

const mockConnectUrl = 'service:jmx:rmi://someUrl';
const mockTarget = { connectUrl: mockConnectUrl, alias: 'fooTarget' };

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

const mockHistoryPush = jest.fn();

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useRouteMatch: () => ({ url: '/baseUrl' }),
  useHistory: () => ({
    push: mockHistoryPush,
  }),
}));

jest
  .spyOn(defaultServices.settings, 'deletionDialogsEnabledFor')
  .mockReturnValueOnce(true) // show deletion warning
  .mockReturnValue(false); // don't ask again

jest.spyOn(defaultServices.api, 'addCustomEventTemplate').mockReturnValue(of(true));
jest.spyOn(defaultServices.api, 'deleteCustomEventTemplate').mockReturnValue(of(true));
jest.spyOn(defaultServices.api, 'downloadTemplate').mockReturnValue(void 0);

jest.spyOn(defaultServices.api, 'doGet').mockReturnValue(of([mockCustomEventTemplate]));

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
    let tree;
    await act(async () => {
      tree = renderer.create(
        <ServiceContext.Provider value={defaultServices}>
          <NotificationsContext.Provider value={NotificationsInstance}>
            <EventTemplates />
          </NotificationsContext.Provider>
        </ServiceContext.Provider>,
      );
    });
    expect(tree.toJSON()).toMatchSnapshot();
  });

  it('adds a recording after receiving a notification', async () => {
    renderWithServiceContextAndRouter(<EventTemplates />);

    expect(screen.getByText('someEventTemplate')).toBeInTheDocument();
    expect(screen.getByText('anotherEventTemplate')).toBeInTheDocument();
  });

  it('removes a recording after receiving a notification', async () => {
    renderWithServiceContextAndRouter(<EventTemplates />);

    expect(screen.queryByText('anotherEventTemplate')).not.toBeInTheDocument();
  });

  it('displays the column header fields', async () => {
    renderWithServiceContextAndRouter(<EventTemplates />);

    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Description')).toBeInTheDocument();
    expect(screen.getByText('Provider')).toBeInTheDocument();
    expect(screen.getByText('Type')).toBeInTheDocument();
  });

  it('shows a popup when uploading', async () => {
    const { user } = renderWithServiceContextAndRouter(<EventTemplates />);

    expect(screen.queryByLabelText('Create Custom Event Template')).not.toBeInTheDocument();

    const buttons = screen.getAllByRole('button');
    const uploadButton = buttons[0];
    await user.click(uploadButton);

    expect(screen.getByLabelText('Create Custom Event Template'));
  });

  it('downloads an event template when Download is clicked on template action bar', async () => {
    const { user } = renderWithServiceContextAndRouter(<EventTemplates />);

    await user.click(screen.getByLabelText('Actions'));
    await user.click(screen.getByText('Download'));

    const downloadRequestSpy = jest.spyOn(defaultServices.api, 'downloadTemplate');

    expect(downloadRequestSpy).toHaveBeenCalledTimes(1);
    expect(downloadRequestSpy).toBeCalledWith(mockCustomEventTemplate);
  });

  it('shows a popup when Delete is clicked and then deletes the template after clicking confirmation Delete', async () => {
    const { user } = renderWithServiceContextAndRouter(<EventTemplates />);

    await user.click(screen.getByLabelText('Actions'));

    expect(screen.getByText('Create Recording...'));
    expect(screen.getByText('Download'));
    expect(screen.getByText('Delete'));

    const deleteAction = screen.getByText('Delete');
    await user.click(deleteAction);

    expect(screen.getByLabelText('Event template delete warning'));

    const deleteRequestSpy = jest.spyOn(defaultServices.api, 'deleteCustomEventTemplate');
    const dialogWarningSpy = jest.spyOn(defaultServices.settings, 'setDeletionDialogsEnabledFor');
    await user.click(screen.getByLabelText("Don't ask me again"));
    await user.click(within(screen.getByLabelText('Event template delete warning')).getByText('Delete'));

    expect(deleteRequestSpy).toHaveBeenCalledTimes(1);
    expect(deleteRequestSpy).toBeCalledWith('someEventTemplate');
    expect(dialogWarningSpy).toBeCalledTimes(1);
    expect(dialogWarningSpy).toBeCalledWith(DeleteOrDisableWarningType.DeleteEventTemplates, false);
  });

  it('deletes the template when Delete is clicked w/o popup warning', async () => {
    const { user } = renderWithServiceContextAndRouter(<EventTemplates />);

    await user.click(screen.getByLabelText('Actions'));

    expect(screen.getByText('Create Recording...'));
    expect(screen.getByText('Download'));
    expect(screen.getByText('Delete'));

    const deleteRequestSpy = jest.spyOn(defaultServices.api, 'deleteCustomEventTemplate');
    const deleteAction = screen.getByText('Delete');
    await user.click(deleteAction);

    expect(deleteRequestSpy).toHaveBeenCalledTimes(1);
    expect(screen.queryByLabelText('Event template delete warning')).not.toBeInTheDocument();
  });

  it('should show error view if failing to retrieve event templates', async () => {
    const subj = new Subject<void>();
    const mockTargetSvc = {
      target: () => of(mockTarget),
      authFailure: () => subj.asObservable(),
    } as TargetService;
    const services: Services = {
      ...defaultServices,
      target: mockTargetSvc,
    };

    renderWithServiceContextAndRouter(<EventTemplates />, { services: services });

    await doAct(async () => subj.next());

    const failTitle = screen.getByText('Error retrieving event templates');
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
    const { user } = renderWithServiceContextAndRouter(<EventTemplates />);

    const filterInput = screen.getByLabelText('Event template filter');
    expect(filterInput).toBeInTheDocument();
    expect(filterInput).toBeVisible();

    await user.type(filterInput, 'someveryoddname');

    expect(screen.queryByText('someEventTemplate')).not.toBeInTheDocument();

    const hintText = screen.getByText('No Event Templates');
    expect(hintText).toBeInTheDocument();
    expect(hintText).toBeVisible();
  });

  it('should upload event template when submit button is clicked', async () => {
    const createSpy = jest.spyOn(defaultServices.api, 'addCustomEventTemplate').mockReturnValueOnce(of(true));
    const { user } = renderWithServiceContextAndRouter(<EventTemplates />);

    const uploadButton = screen.getByRole('button', { name: 'Upload' });
    expect(uploadButton).toBeInTheDocument();
    expect(uploadButton).toBeVisible();

    await user.click(uploadButton);

    const modal = await screen.findByRole('dialog');
    expect(modal).toBeInTheDocument();
    expect(modal).toBeVisible();

    const modalTitle = await within(modal).findByText('Create Custom Event Template');
    expect(modalTitle).toBeInTheDocument();
    expect(modalTitle).toBeVisible();

    const dropZoneText = within(modal).getByText('Drag a file here');
    expect(dropZoneText).toBeInTheDocument();
    expect(dropZoneText).toBeVisible();

    const uploadButtonInModal = within(modal).getByText('Upload');
    expect(uploadButtonInModal).toBeInTheDocument();
    expect(uploadButtonInModal).toBeVisible();

    const uploadInput = modal.querySelector("input[accept='.xml,.jfc'][type='file']") as HTMLInputElement;
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
