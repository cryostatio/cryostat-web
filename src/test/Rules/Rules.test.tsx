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
import { DeleteAutomatedRules, DeleteOrDisableWarningType, DisableAutomatedRules } from '@app/Modal/types';
import { RulesTable } from '@app/Rules/Rules';
import { Rule, NotificationMessage, NotificationCategory } from '@app/Shared/Services/api.types';
import { NotificationChannel } from '@app/Shared/Services/NotificationChannel.service';
import { ServiceContext, defaultServices, Services } from '@app/Shared/Services/Services';
import '@testing-library/jest-dom';
import { act as doAct, cleanup, screen, within } from '@testing-library/react';
import { of, Subject } from 'rxjs';
import { render, renderSnapshot } from '../utils';

const mockRule: Rule = {
  name: 'mockRule',
  description: 'A mock rule',
  matchExpression: "target.alias == 'io.cryostat.Cryostat' || target.annotations.cryostat['PORT'] == 9091",
  enabled: true,
  eventSpecifier: 'template=Profiling,type=TARGET',
  archivalPeriodSeconds: 0,
  initialDelaySeconds: 0,
  preservedArchives: 0,
  maxAgeSeconds: 0,
  maxSizeBytes: 0,
};
const mockRuleListResponse: Rule[] = [mockRule];
const mockRuleListEmptyResponse: Rule[] = [];

const mockFileUpload = new File([JSON.stringify(mockRule)], `${mockRule.name}.json`, { type: 'application/json' });
mockFileUpload.text = jest.fn(() => Promise.resolve(JSON.stringify(mockRule)));

const mockDeleteNotification = { message: { ...mockRule } } as NotificationMessage;

const mockUpdateNotification = { message: { ...mockRule, enabled: false } } as NotificationMessage;

const downloadSpy = jest.spyOn(defaultServices.api, 'downloadRule');
const uploadSpy = jest.spyOn(defaultServices.api, 'uploadRule').mockReturnValue(of(true));
const updateSpy = jest.spyOn(defaultServices.api, 'updateRule').mockReturnValue(of(true));

jest
  .spyOn(defaultServices.api, 'getRules')
  .mockReturnValueOnce(of(mockRuleListEmptyResponse)) // renders correctly empty
  .mockReturnValue(of(mockRuleListResponse));

jest
  .spyOn(defaultServices.settings, 'deletionDialogsEnabledFor')
  .mockReturnValueOnce(true) // shows a popup when Delete is clicked and then deletes the Rule after clicking confirmation Delete
  .mockReturnValueOnce(false) // deletes a rule when Delete is clicked w/o popup warning
  .mockReturnValueOnce(false) // updates a rule when the switch is clicked
  .mockReturnValueOnce(true); // shows a popup when toggle disables rule and then disable the Rule after clicking confirmation Disable

jest
  .spyOn(defaultServices.notificationChannel, 'messages')
  .mockReturnValueOnce(of()) // renders correctly
  .mockReturnValueOnce(of())
  .mockReturnValueOnce(of())

  .mockReturnValueOnce(of()) // open view to create rules
  .mockReturnValueOnce(of())
  .mockReturnValueOnce(of())

  .mockReturnValueOnce(of()) // opens upload modal
  .mockReturnValueOnce(of())
  .mockReturnValueOnce(of())

  .mockReturnValueOnce(of()) // delete a rule when clicked with popup
  .mockReturnValueOnce(of())
  .mockReturnValueOnce(of())

  .mockReturnValueOnce(of()) // delete a rule when clicked w/o popup
  .mockReturnValueOnce(of())
  .mockReturnValueOnce(of())

  .mockReturnValueOnce(of()) // remove a rule when receiving notification
  .mockReturnValueOnce(of(mockDeleteNotification))
  .mockReturnValueOnce(of())

  .mockReturnValue(of()); // other tests

describe('<Rules />', () => {
  beforeEach(() => {
    [updateSpy, uploadSpy, downloadSpy].forEach((spy) => jest.mocked(spy).mockClear());
  });

  afterEach(cleanup);

  it('renders correctly', async () => {
    const tree = await renderSnapshot({
      routerConfigs: {
        routes: [
          {
            path: '/rules',
            element: <RulesTable />,
          },
        ],
      },
    });
    expect(tree?.toJSON()).toMatchSnapshot();
  });

  // TODO: Use RouterProvider
  it('opens create rule view when Create is clicked', async () => {
    const { user } = render({
      routerConfigs: {
        routes: [
          {
            path: '/rules',
            element: <RulesTable />,
          },
        ],
      },
    });

    await user.click(screen.getByRole('button', { name: /Create/ }));

    // expect(history.entries.map((entry) => entry.pathname)).toStrictEqual(['/rules', '/rules/create']);
  });

  it('opens upload modal when upload icon is clicked', async () => {
    const { user } = render({
      routerConfigs: {
        routes: [
          {
            path: '/rules',
            element: <RulesTable />,
          },
        ],
      },
    });

    await user.click(screen.getByRole('button', { name: 'Upload' }));

    const modal = await screen.findByRole('dialog');
    expect(modal).toBeInTheDocument();
    expect(modal).toBeVisible();

    const modalTitle = await within(modal).findByText('Upload Automated rules');
    expect(modalTitle).toBeInTheDocument();
    expect(modalTitle).toBeVisible();

    const dropZoneText = within(modal).getByText('Drag a file here');
    expect(dropZoneText).toBeInTheDocument();
    expect(dropZoneText).toBeVisible();
  });

  it('shows a popup when Delete is clicked and then deletes the Rule after clicking confirmation Delete', async () => {
    const { user } = render({
      routerConfigs: {
        routes: [
          {
            path: '/rules',
            element: <RulesTable />,
          },
        ],
      },
    });

    const deleteRequestSpy = jest.spyOn(defaultServices.api, 'deleteRule').mockReturnValue(of(true));
    const dialogWarningSpy = jest.spyOn(defaultServices.settings, 'setDeletionDialogsEnabledFor');

    await user.click(screen.getByLabelText('Actions'));
    await user.click(await screen.findByText('Delete'));

    expect(screen.getByLabelText(DeleteAutomatedRules.ariaLabel));

    await user.click(screen.getByLabelText("Don't ask me again"));
    await user.click(within(screen.getByLabelText(DeleteAutomatedRules.ariaLabel)).getByText('Delete'));

    expect(deleteRequestSpy).toHaveBeenCalledTimes(1);
    expect(deleteRequestSpy).toBeCalledWith(mockRule.name, true);
    expect(dialogWarningSpy).toBeCalledTimes(1);
    expect(dialogWarningSpy).toBeCalledWith(DeleteOrDisableWarningType.DeleteAutomatedRules, false);
  });

  it('deletes a rule when Delete is clicked w/o popup warning', async () => {
    const { user } = render({
      routerConfigs: {
        routes: [
          {
            path: '/rules',
            element: <RulesTable />,
          },
        ],
      },
    });

    const deleteRequestSpy = jest.spyOn(defaultServices.api, 'deleteRule').mockReturnValue(of(true));

    await user.click(screen.getByLabelText('Actions'));
    await user.click(await screen.findByText('Delete'));

    expect(screen.queryByLabelText(DeleteAutomatedRules.ariaLabel)).not.toBeInTheDocument();
    expect(deleteRequestSpy).toHaveBeenCalledTimes(1);
    expect(deleteRequestSpy).toBeCalledWith(mockRule.name, true);
  });

  it('remove a rule when receiving a notification', async () => {
    render({
      routerConfigs: {
        routes: [
          {
            path: '/rules',
            element: <RulesTable />,
          },
        ],
      },
    });

    expect(screen.queryByText(mockRule.name)).not.toBeInTheDocument();
  });

  it('update a rule when receiving a notification', async () => {
    const subj = new Subject<NotificationMessage>();
    const mockNotifications = {
      messages: (category: string) => (category === NotificationCategory.RuleUpdated ? subj.asObservable() : of()),
    } as NotificationChannel;
    const services: Services = {
      ...defaultServices,
      notificationChannel: mockNotifications,
    };
    const { container } = render({
      routerConfigs: {
        routes: [
          {
            path: '/rules',
            element: <RulesTable />,
          },
        ],
      },
      providers: [{ kind: ServiceContext.Provider, instance: services }],
    });

    expect(await screen.findByText(mockRule.name)).toBeInTheDocument();

    let labels = container.querySelectorAll('label');
    expect(labels).toHaveLength(1);
    let label = labels[0];
    expect(label).toHaveClass('switch-toggle-true');
    expect(label).not.toHaveClass('switch-toggle-false');

    doAct(() => subj.next(mockUpdateNotification));

    labels = container.querySelectorAll('label');
    expect(labels).toHaveLength(1);
    label = labels[0];
    expect(label).not.toHaveClass('switch-toggle-true');
    expect(label).toHaveClass('switch-toggle-false');
  });

  it('downloads a rule when Download is clicked', async () => {
    const { user } = render({
      routerConfigs: {
        routes: [
          {
            path: '/rules',
            element: <RulesTable />,
          },
        ],
      },
    });

    await user.click(screen.getByLabelText('Actions'));
    await user.click(await screen.findByText('Download'));

    expect(downloadSpy).toHaveBeenCalledTimes(1);
    expect(downloadSpy).toBeCalledWith(mockRule.name);
  });

  it('updates a rule when the switch is clicked', async () => {
    const { user } = render({
      routerConfigs: {
        routes: [
          {
            path: '/rules',
            element: <RulesTable />,
          },
        ],
      },
    });

    await user.click(screen.getByRole('checkbox', { name: `${mockRule.name} is enabled` }));
    expect(updateSpy).toHaveBeenCalledTimes(1);
    expect(updateSpy).toBeCalledWith({ ...mockRule, enabled: !mockRule.enabled }, expect.any(Boolean));
  });

  it('shows a popup when toggle disables rule and then disable the Rule after clicking confirmation Disable', async () => {
    const updateSpy = jest.spyOn(defaultServices.api, 'updateRule').mockReturnValue(of(true));
    const { user } = render({
      routerConfigs: {
        routes: [
          {
            path: '/rules',
            element: <RulesTable />,
          },
        ],
      },
    });

    await user.click(screen.getByRole('checkbox', { name: `${mockRule.name} is enabled` }));

    expect(screen.getByLabelText(DisableAutomatedRules.ariaLabel));

    await user.click(screen.getByLabelText("Don't ask me again"));
    await user.click(within(screen.getByLabelText(DisableAutomatedRules.ariaLabel)).getByText('Disable'));

    expect(updateSpy).toHaveBeenCalledTimes(1);
    expect(updateSpy).toBeCalledWith({ ...mockRule, enabled: false }, true);
  });

  it('upload a rule file when Submit is clicked', async () => {
    const { user } = render({
      routerConfigs: {
        routes: [
          {
            path: '/rules',
            element: <RulesTable />,
          },
        ],
      },
    });

    await user.click(screen.getByRole('button', { name: 'Upload' }));

    const modal = await screen.findByRole('dialog');
    expect(modal).toBeInTheDocument();
    expect(modal).toBeVisible();

    const modalTitle = await within(modal).findByText('Upload Automated rules');
    expect(modalTitle).toBeInTheDocument();
    expect(modalTitle).toBeVisible();

    const dropZoneText = within(modal).getByText('Drag a file here');
    expect(dropZoneText).toBeInTheDocument();
    expect(dropZoneText).toBeVisible();

    const uploadButton = within(modal).getByText('Upload');
    expect(uploadButton).toBeInTheDocument();
    expect(uploadButton).toBeVisible();

    const uploadInput = modal.querySelector("input[accept='application/json'][type='file']") as HTMLInputElement;
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

    expect(uploadSpy).toHaveBeenCalled();
    expect(uploadSpy).toHaveBeenCalledWith(mockRule, expect.any(Function), expect.any(Subject));

    expect(within(modal).queryByText('Submit')).not.toBeInTheDocument();
    expect(within(modal).queryByText('Cancel')).not.toBeInTheDocument();

    const closeButton = within(modal).getByText('Close');
    expect(closeButton).toBeInTheDocument();
    expect(closeButton).toBeVisible();
  });
});
