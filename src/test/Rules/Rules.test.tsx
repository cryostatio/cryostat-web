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
import { Router } from 'react-router-dom';
import { createMemoryHistory } from 'history';
import { of } from 'rxjs';
import '@testing-library/jest-dom';
import renderer, { act } from 'react-test-renderer';
import { render, cleanup, screen, within, waitFor } from '@testing-library/react';
import * as tlr from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Rules, Rule } from '@app/Rules/Rules';
import { ServiceContext, defaultServices } from '@app/Shared/Services/Services';
import { NotificationMessage } from '@app/Shared/Services/NotificationChannel.service';
import { DeleteAutomatedRules, DeleteWarningType } from '@app/Modal/DeleteWarningUtils';

const mockRule: Rule = {
  name: 'mockRule',
  description: 'A mock rule',
  matchExpression: "target.alias == 'io.cryostat.Cryostat' || target.annotations.cryostat['PORT'] == 9091",
  eventSpecifier: 'template=Profiling,type=TARGET',
  archivalPeriodSeconds: 0,
  initialDelaySeconds: 0,
  preservedArchives: 0,
  maxAgeSeconds: 0,
  maxSizeBytes: 0,
};
const mockRuleListResponse = { data: { result: [mockRule] as Rule[] } };
const mockRuleListEmptyResponse = { data: { result: [] as Rule[] } };

const mockFileUpload = new File([JSON.stringify(mockRule)], `${mockRule.name}.json`, { type: 'json' });
mockFileUpload.text = jest.fn(() => new Promise((resolve, _) => resolve(JSON.stringify(mockRule))));

const mockDeleteNotification = { message: { ...mockRule } } as NotificationMessage;

const history = createMemoryHistory({ initialEntries: ['/rules'] });

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useRouteMatch: () => ({ url: history.location.pathname }),
  useHistory: () => history,
}));

const downloadSpy = jest.spyOn(defaultServices.api, 'downloadRule').mockReturnValue();
const createSpy = jest.spyOn(defaultServices.api, 'createRule').mockReturnValue(of(true));
jest
  .spyOn(defaultServices.api, 'doGet')
  .mockReturnValueOnce(of(mockRuleListEmptyResponse)) // renders correctly
  .mockReturnValue(of(mockRuleListResponse));

jest.spyOn(defaultServices.settings, 'deletionDialogsEnabledFor').mockReturnValueOnce(true);

jest
  .spyOn(defaultServices.notificationChannel, 'messages')
  .mockReturnValueOnce(of()) // renders correctly
  .mockReturnValueOnce(of())

  .mockReturnValueOnce(of()) // open view to create rules
  .mockReturnValueOnce(of())

  .mockReturnValueOnce(of()) // opens upload modal
  .mockReturnValueOnce(of())

  .mockReturnValueOnce(of()) // delete a rule when clicked with popup
  .mockReturnValueOnce(of())

  .mockReturnValueOnce(of()) // delete a rule when clicked w/o popup
  .mockReturnValueOnce(of())

  .mockReturnValueOnce(of()) // remove a rule when receiving notification
  .mockReturnValueOnce(of(mockDeleteNotification))

  .mockReturnValue(of()); // other tests

describe('<Rules/>', () => {
  beforeEach(() => {
    history.go(-history.length);
  });

  afterEach(cleanup);

  it('renders correctly', async () => {
    let tree;
    await act(async () => {
      tree = renderer.create(
        <ServiceContext.Provider value={defaultServices}>
          <Router location={history.location} history={history}>
            <Rules />
          </Router>
        </ServiceContext.Provider>
      );
    });
    expect(tree.toJSON()).toMatchSnapshot();
  });

  it('opens create rule view when Create is clicked', async () => {
    render(
      <ServiceContext.Provider value={defaultServices}>
        <Router location={history.location} history={history}>
          <Rules />
        </Router>
      </ServiceContext.Provider>
    );

    await userEvent.click(screen.getByRole('button', { name: /Create/ }));

    expect(history.entries.map((entry) => entry.pathname)).toStrictEqual(['/rules', '/rules/create']);
  });

  it('opens upload modal when upload icon is clicked', async () => {
    render(
      <ServiceContext.Provider value={defaultServices}>
        <Router location={history.location} history={history}>
          <Rules />
        </Router>
      </ServiceContext.Provider>
    );

    await userEvent.click(screen.getByRole('button', { name: 'Upload' }));

    const modal = await screen.findByRole('dialog');
    expect(modal).toBeInTheDocument();
    expect(modal).toBeVisible();

    const modalTitle = await within(modal).findByText('Upload Automatic Rules');
    expect(modalTitle).toBeInTheDocument();
    expect(modalTitle).toBeVisible();

    const fileUploadDropZone = await within(modal).findByLabelText('Drag a file here or browse to upload');
    expect(fileUploadDropZone).toBeInTheDocument();
    expect(fileUploadDropZone).toBeVisible();
  });

  it('shows a popup when Delete is clicked and then deletes the Rule after clicking confirmation Delete', async () => {
    render(
      <ServiceContext.Provider value={defaultServices}>
        <Router location={history.location} history={history}>
          <Rules />
        </Router>
      </ServiceContext.Provider>
    );

    const deleteRequestSpy = jest.spyOn(defaultServices.api, 'deleteRule').mockReturnValue(of(true));
    const dialogWarningSpy = jest.spyOn(defaultServices.settings, 'setDeletionDialogsEnabledFor');

    await userEvent.click(screen.getByLabelText('Actions'));
    await userEvent.click(await screen.findByText('Delete'));

    expect(screen.getByLabelText(DeleteAutomatedRules.ariaLabel));

    await userEvent.click(screen.getByLabelText("Don't ask me again"));
    await userEvent.click(within(screen.getByLabelText(DeleteAutomatedRules.ariaLabel)).getByText('Delete'));

    expect(deleteRequestSpy).toHaveBeenCalledTimes(1);
    expect(deleteRequestSpy).toBeCalledWith(mockRule.name, true);
    expect(dialogWarningSpy).toBeCalledTimes(1);
    expect(dialogWarningSpy).toBeCalledWith(DeleteWarningType.DeleteAutomatedRules, false);
  });

  it('deletes a rule when Delete is clicked w/o popup warning', async () => {
    render(
      <ServiceContext.Provider value={defaultServices}>
        <Router location={history.location} history={history}>
          <Rules />
        </Router>
      </ServiceContext.Provider>
    );

    const deleteRequestSpy = jest.spyOn(defaultServices.api, 'deleteRule').mockReturnValue(of(true));

    await userEvent.click(screen.getByLabelText('Actions'));
    await userEvent.click(await screen.findByText('Delete'));

    expect(screen.queryByLabelText(DeleteAutomatedRules.ariaLabel)).not.toBeInTheDocument();
    expect(deleteRequestSpy).toHaveBeenCalledTimes(1);
    expect(deleteRequestSpy).toBeCalledWith(mockRule.name, true);
  });

  it('remove a rule when receiving a notification', async () => {
    render(
      <ServiceContext.Provider value={defaultServices}>
        <Router location={history.location} history={history}>
          <Rules />
        </Router>
      </ServiceContext.Provider>
    );

    expect(screen.queryByText(mockRule.name)).not.toBeInTheDocument();
  });

  it('downloads a rule when Download is clicked', async () => {
    render(
      <ServiceContext.Provider value={defaultServices}>
        <Router location={history.location} history={history}>
          <Rules />
        </Router>
      </ServiceContext.Provider>
    );

    await userEvent.click(screen.getByLabelText('Actions'));
    await userEvent.click(await screen.findByText('Download'));

    expect(downloadSpy).toHaveBeenCalledTimes(1);
    expect(downloadSpy).toBeCalledWith(mockRule.name);
  });

  it('upload a rule file when Submit is clicked', async () => {
    render(
      <ServiceContext.Provider value={defaultServices}>
        <Router location={history.location} history={history}>
          <Rules />
        </Router>
      </ServiceContext.Provider>
    );

    await userEvent.click(screen.getByRole('button', { name: 'Upload' }));

    const modal = await screen.findByRole('dialog');
    expect(modal).toBeInTheDocument();
    expect(modal).toBeVisible();

    const modalTitle = await within(modal).findByText('Upload Automatic Rules');
    expect(modalTitle).toBeInTheDocument();
    expect(modalTitle).toBeVisible();

    const fileUploadDropZone = (await within(modal).findByLabelText(
      'Drag a file here or browse to upload'
    )) as HTMLInputElement;
    expect(fileUploadDropZone).toBeInTheDocument();
    expect(fileUploadDropZone).toBeVisible();

    const browseButton = await within(modal).findByRole('button', { name: 'Browse...' });
    expect(browseButton).toBeInTheDocument();
    expect(browseButton).toBeVisible();

    const submitButton = screen.getByRole('button', { name: 'Submit' }) as HTMLButtonElement;
    await userEvent.click(submitButton);

    const uploadInput = modal.querySelector("input[accept='.json'][type='file']") as HTMLInputElement;
    expect(uploadInput).toBeInTheDocument();
    expect(uploadInput).not.toBeVisible();

    await userEvent.click(browseButton);
    await userEvent.upload(uploadInput, mockFileUpload);

    expect(uploadInput.files).not.toBe(null);
    expect(uploadInput.files![0]).toStrictEqual(mockFileUpload);

    await waitFor(() => expect(submitButton).not.toBeDisabled());
    await tlr.act(async () => {
      await userEvent.click(submitButton);
    });

    expect(createSpy).toHaveBeenCalled();
    expect(createSpy).toHaveBeenCalledWith(mockRule);
  });
});
