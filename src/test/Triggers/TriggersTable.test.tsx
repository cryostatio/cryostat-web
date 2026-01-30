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

import { DeleteSmartTrigger, DeleteOrDisableWarningType } from '@app/Modal/types';
import { SmartTrigger } from '@app/Shared/Services/api.types';
import { defaultServices } from '@app/Shared/Services/Services';
import { TriggersTable } from '@app/Triggers/Triggers';
import '@testing-library/jest-dom';
import { cleanup, screen, within, act } from '@testing-library/react';
import { of } from 'rxjs';
import { DEFAULT_DIMENSIONS, escapeKeyboardInput, render, resize } from '../utils';

const mockConnectUrl = 'http://someUrl';

const mockTarget = {
  agent: true,
  connectUrl: mockConnectUrl,
  alias: 'someTarget',
  jvmId: 'someJvmId',
  labels: [],
  annotations: { cryostat: [], platform: [] },
};

const mockSmartTrigger: SmartTrigger = {
  rawExpression: '[foo > 123 ; TargetDuration > duration("30s")]~bar',
  recordingTemplate: 'bar',
  durationConstraint: 'TargetDuration > duration("30s")',
  targetDuration: '30s',
  triggerCondition: 'foo > 123',
};

jest.spyOn(defaultServices.api, 'getTargetTriggers').mockReturnValue(of([mockSmartTrigger])); // All other tests

jest.spyOn(defaultServices.api, 'deleteTrigger').mockReturnValue(of(true));

jest.spyOn(defaultServices.api, 'addTriggers').mockReturnValue(of(true));

jest.spyOn(defaultServices.target, 'target').mockReturnValue(of(mockTarget));

jest.spyOn(defaultServices.target, 'authFailure').mockReturnValue(of());

jest
  .spyOn(defaultServices.settings, 'deletionDialogsEnabledFor')
  .mockReturnValueOnce(true) // shows a popup when Delete is clicked and then deletes the recording after clicking confirmation Delete
  .mockReturnValueOnce(false) // deletes the recording when Delete is clicked w/o popup warning
  .mockReturnValue(true);

jest.spyOn(defaultServices.notificationChannel, 'messages').mockReturnValue(of());

describe('<TriggerTable />', () => {
  beforeAll(async () => {
    await act(async () => {
      resize(2400, 1080);
    });
  });

  afterEach(cleanup);

  afterAll(() => {
    resize(DEFAULT_DIMENSIONS[0], DEFAULT_DIMENSIONS[1]);
  });

  it('should render the Triggers table correctly', async () => {
    render({
      routerConfigs: {
        routes: [
          {
            path: '/triggers',
            element: <TriggersTable toolbarBreakReference={document.body} />,
          },
        ],
      },
    });

    ['Delete', 'Create'].map((text) => {
      const button = screen.getByText(text);
      expect(button).toBeInTheDocument();
      expect(button).toBeVisible();
    });

    ['Raw Expression', 'Template', 'Duration Constraint', 'Target Duration', 'Trigger Condition'].map((text) => {
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

    const name = screen.getByText(mockSmartTrigger.rawExpression);
    expect(name).toBeInTheDocument();
    expect(name).toBeVisible();
  });

  it('should display the toolbar buttons', async () => {
    render({
      routerConfigs: {
        routes: [
          {
            path: '/triggers',
            element: <TriggersTable toolbarBreakReference={document.body} />,
          },
        ],
      },
    });

    expect(screen.getByText('Delete')).toBeInTheDocument();
    expect(screen.getByText('Create')).toBeInTheDocument();
  });

  it('should show a popup when Delete is clicked and then deletes the Smart Trigger after clicking confirmation Delete', async () => {
    const { user } = render({
      routerConfigs: {
        routes: [
          {
            path: '/triggers',
            element: <TriggersTable toolbarBreakReference={document.body} />,
          },
        ],
      },
    });

    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes.length).toBe(2);
    const selectAllCheck = checkboxes[0];
    await user.click(selectAllCheck);
    await user.click(screen.getByText('Delete'));

    const deleteModal = await screen.getByLabelText(DeleteSmartTrigger.ariaLabel);
    expect(deleteModal).toBeInTheDocument();
    expect(deleteModal).toBeVisible();

    const deleteRequestSpy = jest.spyOn(defaultServices.api, 'deleteTrigger');
    const dialogWarningSpy = jest.spyOn(defaultServices.settings, 'setDeletionDialogsEnabledFor');
    await user.click(screen.getByLabelText("Don't ask me again"));
    await user.click(within(screen.getByLabelText(DeleteSmartTrigger.ariaLabel)).getByText('Delete'));

    expect(deleteRequestSpy).toHaveBeenCalledTimes(1);
    expect(deleteRequestSpy).toHaveBeenCalledWith('[foo > 123 ; TargetDuration > duration("30s")]~bar', mockTarget);
    expect(dialogWarningSpy).toHaveBeenCalledTimes(1);
    expect(dialogWarningSpy).toHaveBeenCalledWith(DeleteOrDisableWarningType.DeleteSmartTrigger, false);
  });

  it('should delete the Smart Trigger when Delete is clicked w/o popup warning', async () => {
    const { user } = render({
      routerConfigs: {
        routes: [
          {
            path: '/triggers',
            element: <TriggersTable toolbarBreakReference={document.body} />,
          },
        ],
      },
    });

    const checkboxes = screen.getAllByRole('checkbox');
    const selectAllCheck = checkboxes[0];
    await user.click(selectAllCheck);
    await user.click(screen.getByText('Delete'));

    const deleteRequestSpy = jest.spyOn(defaultServices.api, 'deleteTrigger');

    expect(screen.queryByLabelText(DeleteSmartTrigger.ariaLabel)).not.toBeInTheDocument();
    expect(deleteRequestSpy).toHaveBeenCalledTimes(1);
    expect(deleteRequestSpy).toHaveBeenCalledWith('[foo > 123 ; TargetDuration > duration("30s")]~bar', mockTarget);
  });

  it('should upload Smart Triggers when submit button is clicked', async () => {
    const { user } = render({
      routerConfigs: {
        routes: [
          {
            path: '/triggers',
            element: <TriggersTable toolbarBreakReference={document.body} />,
          },
        ],
      },
    });

    await act(async () => {
      const uploadButton = screen.getByRole('button', { name: 'Create' });
      expect(uploadButton).toBeInTheDocument();
      expect(uploadButton).toBeVisible();

      await user.click(uploadButton);

      const modal = await screen.findByRole('dialog');
      expect(modal).toBeInTheDocument();
      expect(modal).toBeVisible();

      const modalTitle = await within(modal).findByText('Create custom Smart Trigger');
      expect(modalTitle).toBeInTheDocument();
      expect(modalTitle).toBeVisible();

      const submitButton = within(modal).getByLabelText('submit-button');
      expect(submitButton).toBeInTheDocument();
      expect(submitButton).toBeVisible();

      const expressionInput = within(modal).getByText('Smart Trigger definition');
      expect(expressionInput).toBeInTheDocument();
      expect(expressionInput).toBeVisible();

      await user.type(expressionInput, escapeKeyboardInput('[foo]~bar'));
      await user.click(submitButton);
    });
  });
});
