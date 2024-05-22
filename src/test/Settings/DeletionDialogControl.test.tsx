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

import { DeleteOrDisableWarningType } from '@app/Modal/types';
import { DeletionDialogControl } from '@app/Settings/Config/DeletionDialogControl';
import { defaultServices } from '@app/Shared/Services/Services';
import { cleanup, screen } from '@testing-library/react';
import * as React from 'react';
import { render, renderSnapshot, testT } from '../utils';

const defaults = new Map<DeleteOrDisableWarningType, boolean>();
for (const cat in DeleteOrDisableWarningType) {
  defaults.set(DeleteOrDisableWarningType[cat], true);
}

jest.spyOn(defaultServices.settings, 'deletionDialogsEnabled').mockReturnValue(defaults);

describe('<DeletionDialogControl/>', () => {
  beforeEach(() => {
    jest.mocked(defaultServices.settings.setDeletionDialogsEnabled).mockClear();
  });

  afterEach(cleanup);

  it('renders correctly', async () => {
    const tree = await renderSnapshot({
      routerConfigs: {
        routes: [
          {
            path: '/settings',
            element: React.createElement(DeletionDialogControl.content, null),
          },
        ],
      },
    });
    expect(tree?.toJSON()).toMatchSnapshot();
  });

  it('should default to enable all deletion dialog', async () => {
    render({
      routerConfigs: {
        routes: [
          {
            path: '/settings',
            element: React.createElement(DeletionDialogControl.content, null),
          },
        ],
      },
    });

    const enableSwitch = screen.getByLabelText(testT('SETTINGS.DELETION_DIALOG_CONTROL.SWITCH_LABEL'));
    expect(enableSwitch).toBeInTheDocument();
    expect(enableSwitch).toBeVisible();
    expect(enableSwitch).toBeChecked();
  });

  it('should disable all deletion dialog if switch is off', async () => {
    const { user } = render({
      routerConfigs: {
        routes: [
          {
            path: '/settings',
            element: React.createElement(DeletionDialogControl.content, null),
          },
        ],
      },
    });

    const enableSwitch = screen.getByLabelText(testT('SETTINGS.DELETION_DIALOG_CONTROL.SWITCH_LABEL'));
    expect(enableSwitch).toBeInTheDocument();
    expect(enableSwitch).toBeVisible();
    expect(enableSwitch).toBeChecked();

    await user.click(enableSwitch);

    expect(enableSwitch).not.toBeChecked();

    expect(defaultServices.settings.setDeletionDialogsEnabled).toHaveBeenCalledTimes(1);

    const expectedParams = new Map();
    defaults.forEach((_, k) => expectedParams.set(k, false));
    expect(defaultServices.settings.setDeletionDialogsEnabled).toHaveBeenCalledWith(expectedParams);
  });

  it('should turn off switch if any child switch is turned off', async () => {
    const { user } = render({
      routerConfigs: {
        routes: [
          {
            path: '/settings',
            element: React.createElement(DeletionDialogControl.content, null),
          },
        ],
      },
    });

    const enableSwitch = screen.getByLabelText(testT('SETTINGS.DELETION_DIALOG_CONTROL.SWITCH_LABEL'));
    expect(enableSwitch).toBeInTheDocument();
    expect(enableSwitch).toBeVisible();
    expect(enableSwitch).toBeChecked();

    const expandButton = screen.getByText(testT('SHOW_MORE'));
    expect(expandButton).toBeInTheDocument();
    expect(expandButton).toBeVisible();

    await user.click(expandButton);

    const activeRecordingSwitch = screen.getByLabelText('Delete Active recording');
    expect(activeRecordingSwitch).toBeInTheDocument();
    expect(activeRecordingSwitch).toBeVisible();
    expect(activeRecordingSwitch).toBeChecked();

    await user.click(activeRecordingSwitch);

    expect(activeRecordingSwitch).not.toBeChecked();
    expect(enableSwitch).not.toBeChecked();
  });
});
