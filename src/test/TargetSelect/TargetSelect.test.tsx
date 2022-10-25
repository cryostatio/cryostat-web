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
import renderer from 'react-test-renderer';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { createMemoryHistory } from 'history';
import { of } from 'rxjs';

import { CUSTOM_TARGETS_REALM, TargetSelect } from '@app/TargetSelect/TargetSelect';
import { defaultServices, ServiceContext } from '@app/Shared/Services/Services';
import userEvent from '@testing-library/user-event';
import { Target } from '@app/Shared/Services/Target.service';

const mockFooConnectUrl = 'service:jmx:rmi://someFooUrl';
const mockBarConnectUrl = 'service:jmx:rmi://someBarUrl';
const mockBazConnectUrl = 'service:jmx:rmi://someBazUrl';

// Test fails if new Map([['REALM', 'Custom Targets']]) is used, most likely since 'cryostat' Map is not being utilized
const cryostatAnnotation = new Map([['REALM', CUSTOM_TARGETS_REALM]]);
// cryostatAnnotation['REALM'] = CUSTOM_TARGETS_REALM;
const mockFooTarget: Target = {
  connectUrl: mockFooConnectUrl,
  alias: 'fooTarget',
  annotations: {
    cryostat: cryostatAnnotation,
    platform: new Map(),
  },
};
const mockBarTarget: Target = { ...mockFooTarget, connectUrl: mockBarConnectUrl, alias: 'barTarget' };
const mockBazTarget: Target = { connectUrl: mockBazConnectUrl, alias: 'bazTarget' };

const history = createMemoryHistory();

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useRouteMatch: () => ({ url: history.location.pathname }),
  useHistory: () => history,
}));

jest
  .spyOn(defaultServices.target, 'target')
  .mockReturnValueOnce(of()) // renders correctly
  .mockReturnValueOnce(of()) // contains the correct information
  .mockReturnValueOnce(of(mockFooTarget)) // renders dropdown of multiple discovered targets
  .mockReturnValueOnce(of(mockFooTarget)) // creates a target if user completes modal
  .mockReturnValueOnce(of(mockFooTarget)) // deletes target when delete button clicked
  .mockReturnValueOnce(of(mockBazTarget)) // does nothing when trying to delete non-custom targets
  .mockReturnValue(of(mockFooTarget)); // other tests

jest
  .spyOn(defaultServices.targets, 'targets')
  .mockReturnValueOnce(of([mockFooTarget])) // renders correctly
  .mockReturnValueOnce(of([mockFooTarget])) // contains the correct information
  .mockReturnValueOnce(of([mockFooTarget, mockBarTarget])) // renders dropdown of multiple discovered targets
  .mockReturnValue(of([mockFooTarget, mockBarTarget])); // other tests

jest.spyOn(defaultServices.api, 'createTarget').mockReturnValue(of(true));

jest.spyOn(defaultServices.api, 'deleteTarget').mockReturnValue(of(true));

jest.spyOn(defaultServices.targets, 'queryForTargets').mockReturnValue(of());

jest.spyOn(defaultServices.notificationChannel, 'messages').mockReturnValue(of());

jest
  .spyOn(defaultServices.settings, 'deletionDialogsEnabledFor')
  .mockReturnValueOnce(true) // renders correctly
  .mockReturnValueOnce(true) // contains the correct information
  .mockReturnValueOnce(true) // renders dropdown of multiple discovered targets
  .mockReturnValueOnce(true) // creates a target if user completes modal
  .mockReturnValueOnce(false) // deletes target when delete button clicked
  .mockReturnValue(true); // other tests

describe('<TargetSelect />', () => {
  afterEach(cleanup);

  it('renders correctly', () => {
    const tree = renderer.create(
      <ServiceContext.Provider value={defaultServices}>
        <TargetSelect />
      </ServiceContext.Provider>
    );

    expect(tree.toJSON()).toMatchSnapshot();
  });

  it('contains the correct information', () => {
    render(
      <ServiceContext.Provider value={defaultServices}>
        <TargetSelect />
      </ServiceContext.Provider>
    );

    expect(screen.getByText('Target JVM')).toBeInTheDocument();
    expect(screen.getByText(`Select target...`)).toBeInTheDocument();

    expect(screen.getByLabelText('Create target')).toBeInTheDocument();
    expect(screen.getByLabelText('Delete target')).toBeInTheDocument();
    expect(screen.getByLabelText('Options menu')).toBeInTheDocument();
  });

  it('renders dropdown of multiple discovered targets', () => {
    render(
      <ServiceContext.Provider value={defaultServices}>
        <TargetSelect />
      </ServiceContext.Provider>
    );

    expect(screen.getByText(`fooTarget`)).toBeInTheDocument();

    userEvent.click(screen.getByLabelText('Options menu'));
    expect(screen.getByLabelText('Select Input')).toBeInTheDocument();
    expect(screen.getByText(`Select target...`)).toBeInTheDocument();
    expect(screen.getByText(`fooTarget (service:jmx:rmi://someFooUrl)`)).toBeInTheDocument();
    expect(screen.getByText(`barTarget (service:jmx:rmi://someBarUrl)`)).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument(); // Number of discoverable targets
  });

  it('creates a target if user completes modal', () => {
    const createTargetRequestSpy = jest.spyOn(defaultServices.api, 'createTarget');
    render(
      <ServiceContext.Provider value={defaultServices}>
        <TargetSelect />
      </ServiceContext.Provider>
    );
    const createButton = screen.getByLabelText('Create target');
    userEvent.click(createButton);

    const textBoxes = screen.getAllByRole('textbox');

    userEvent.type(textBoxes[0], 'service:jmx:rmi://someBazUrl');
    userEvent.type(textBoxes[1], 'bazTarget');

    userEvent.click(screen.getByText('Create'));

    expect(createTargetRequestSpy).toBeCalledTimes(1);
    expect(createTargetRequestSpy).toBeCalledWith(mockBazTarget);
  });

  it('deletes target when delete button clicked', async () => {
    render(
      <ServiceContext.Provider value={defaultServices}>
        <TargetSelect />
      </ServiceContext.Provider>
    );

    const deleteButton = screen.getByLabelText('Delete target');
    await waitFor(() => expect(deleteButton).not.toBeDisabled());

    userEvent.click(deleteButton);

    const deleteTargetRequestSpy = jest.spyOn(defaultServices.api, 'deleteTarget');
    expect(deleteTargetRequestSpy).toBeCalledTimes(1);
    expect(deleteTargetRequestSpy).toBeCalledWith(mockFooTarget);
  });

  it('does nothing when trying to delete non-custom targets', () => {
    const deleteTargetRequestSpy = jest.spyOn(defaultServices.api, 'deleteTarget');
    render(
      <ServiceContext.Provider value={defaultServices}>
        <TargetSelect />
      </ServiceContext.Provider>
    );
    const deleteButton = screen.getByLabelText('Delete target');
    userEvent.click(deleteButton);

    expect(deleteTargetRequestSpy).toBeCalledTimes(0);
    expect(deleteButton).toBeDisabled();
  });

  it('deletes target when warning modal is accepted', async () => {
    const deleteTargetRequestSpy = jest.spyOn(defaultServices.api, 'deleteTarget');
    render(
      <ServiceContext.Provider value={defaultServices}>
        <TargetSelect />
      </ServiceContext.Provider>
    );

    const deleteButton = screen.getByLabelText('Delete target');
    expect(deleteButton).toBeInTheDocument();
    expect(deleteButton).toBeVisible();

    await waitFor(() => expect(deleteButton).not.toBeDisabled());

    userEvent.click(deleteButton);

    const warningDialog = await screen.findByRole('dialog');
    expect(warningDialog).toBeInTheDocument();
    expect(warningDialog).toBeVisible();

    const acceptDeleteButton = within(warningDialog).getByText('Delete');
    expect(acceptDeleteButton).toBeInTheDocument();
    expect(acceptDeleteButton).toBeVisible();

    userEvent.click(acceptDeleteButton);

    expect(deleteTargetRequestSpy).toBeCalledTimes(1);
    expect(deleteTargetRequestSpy).toBeCalledWith(mockFooTarget);
  });
});
