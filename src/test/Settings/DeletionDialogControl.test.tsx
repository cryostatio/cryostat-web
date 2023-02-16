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

import { DeleteOrDisableWarningType } from '@app/Modal/DeleteWarningUtils';
import { DeletionDialogControl } from '@app/Settings/DeletionDialogControl';
import { defaultServices, ServiceContext } from '@app/Shared/Services/Services';
import { cleanup, screen } from '@testing-library/react';
import * as React from 'react';
import renderer, { act } from 'react-test-renderer';
import { renderWithServiceContext, testT } from '../Common';

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
    let tree;
    await act(async () => {
      tree = renderer.create(
        <ServiceContext.Provider value={defaultServices}>
          {React.createElement(DeletionDialogControl.content, null)}
        </ServiceContext.Provider>
      );
    });
    expect(tree.toJSON()).toMatchSnapshot();
  });

  it('should default to enable all deletion dialog', async () => {
    renderWithServiceContext(React.createElement(DeletionDialogControl.content, null));

    const enableSwitch = screen.getByLabelText(testT('SETTINGS.DELETION_DIALOG_CONTROL.SWITCH_LABEL'));
    expect(enableSwitch).toBeInTheDocument();
    expect(enableSwitch).toBeVisible();
    expect(enableSwitch).toBeChecked();
  });

  it('should disable all deletion dialog if switch is off', async () => {
    const { user } = renderWithServiceContext(React.createElement(DeletionDialogControl.content, null));

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
    const { user } = renderWithServiceContext(React.createElement(DeletionDialogControl.content, null));

    const enableSwitch = screen.getByLabelText(testT('SETTINGS.DELETION_DIALOG_CONTROL.SWITCH_LABEL'));
    expect(enableSwitch).toBeInTheDocument();
    expect(enableSwitch).toBeVisible();
    expect(enableSwitch).toBeChecked();

    const expandButton = screen.getByText(testT('SHOW_MORE', 'common'));
    expect(expandButton).toBeInTheDocument();
    expect(expandButton).toBeVisible();

    await user.click(expandButton);

    const activeRecordingSwitch = screen.getByLabelText('Delete Active Recording');
    expect(activeRecordingSwitch).toBeInTheDocument();
    expect(activeRecordingSwitch).toBeVisible();
    expect(activeRecordingSwitch).toBeChecked();

    await user.click(activeRecordingSwitch);

    expect(activeRecordingSwitch).not.toBeChecked();
    expect(enableSwitch).not.toBeChecked();
  });
});
