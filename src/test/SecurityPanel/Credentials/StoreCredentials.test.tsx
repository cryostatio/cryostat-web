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
import { DeleteCredentials, DeleteOrDisableWarningType } from '@app/Modal/types';
import { CreateCredentialModalProps } from '@app/SecurityPanel/Credentials/CreateCredentialModal';
import { StoreCredentials } from '@app/SecurityPanel/Credentials/StoreCredentials';
import { StoredCredential, Target, MatchedCredential, NotificationMessage } from '@app/Shared/Services/api.types';
import { defaultServices } from '@app/Shared/Services/Services';
import { Modal, ModalVariant } from '@patternfly/react-core';
import { cleanup, screen, within } from '@testing-library/react';
import * as React from 'react';
import { of, throwError } from 'rxjs';

import { renderWithServiceContext } from '../../Common';

const mockCredential: StoredCredential = {
  id: 0,
  matchExpression: 'target.connectUrl == "service:jmx:rmi://someUrl"',
  numMatchingTargets: 1,
};
const mockAnotherCredential: StoredCredential = {
  id: 1,
  matchExpression:
    'target.connectUrl == "service:jmx:rmi://anotherUrl" || target.connectUrl == "service:jmx:rmi://anotherMatchUrl" || target.connectUrl == "service:jmx:rmi://yetAnotherMatchUrl"',
  numMatchingTargets: 2,
};

const mockTarget: Target = { connectUrl: 'service:jmx:rmi://someUrl', alias: 'someAlias' };
const mockAnotherTarget: Target = { connectUrl: 'service:jmx:rmi://anotherUrl', alias: 'anotherAlias' };
const mockAnotherMatchingTarget: Target = {
  connectUrl: 'service:jmx:rmi://anotherMatchUrl',
  alias: 'anotherMatchAlias',
};
const mockYetAnotherMatchingTarget: Target = {
  connectUrl: 'service:jmx:rmi://yetAnotherMatchUrl',
  alias: 'yetAnotherMatchAlias',
};

const mockMatchedCredentialResponse: MatchedCredential = {
  matchExpression: mockCredential.matchExpression,
  targets: [mockTarget],
};
const mockAnotherMatchedCredentialResponse: MatchedCredential = {
  matchExpression: mockAnotherCredential.matchExpression,
  targets: [mockAnotherTarget, mockAnotherMatchingTarget],
};

const mockCredentialNotification = { message: mockCredential } as NotificationMessage;

const mockLostTargetNotification = {
  message: { event: { kind: 'LOST', serviceRef: mockAnotherTarget } },
} as NotificationMessage;

const mockFoundTargetNotification = {
  message: { event: { kind: 'FOUND', serviceRef: mockYetAnotherMatchingTarget } },
} as NotificationMessage;

jest.mock('@app/SecurityPanel/Credentials/CreateCredentialModal', () => {
  return {
    CreateCredentialModal: jest.fn((props: CreateCredentialModalProps) => {
      return (
        <Modal
          isOpen={props.visible}
          variant={ModalVariant.large}
          showClose={true}
          onClose={props.onDismiss}
          title="CreateCredentialModal"
        >
          Auth Form + Match Expression Visualizer
        </Modal>
      );
    }),
  };
});

jest
  .spyOn(defaultServices.notificationChannel, 'messages')
  .mockReturnValueOnce(of(mockCredentialNotification)) // adds the correct table entry when a stored notification is received
  .mockReturnValueOnce(of())
  .mockReturnValueOnce(of())

  .mockReturnValueOnce(of()) // removes the correct table entry when a deletion notification is received
  .mockReturnValueOnce(of(mockCredentialNotification))
  .mockReturnValueOnce(of())

  .mockReturnValueOnce(of()) // renders an empty table after receiving deletion notifications for all credentials'
  .mockReturnValueOnce(of(mockCredentialNotification))
  .mockReturnValueOnce(of())

  .mockReturnValueOnce(of()) // expands to show the correct nested targets
  .mockReturnValueOnce(of())
  .mockReturnValueOnce(of())
  .mockReturnValueOnce(of())
  .mockReturnValueOnce(of())

  .mockReturnValueOnce(of()) // decrements the correct count and updates the correct nested table when a lost target notification is received
  .mockReturnValueOnce(of())
  .mockReturnValueOnce(of(mockLostTargetNotification))
  .mockReturnValueOnce(of())
  .mockReturnValueOnce(of())

  .mockReturnValueOnce(of()) // increments the correct count and updates the correct nested table when a found target notification is received
  .mockReturnValueOnce(of())
  .mockReturnValueOnce(of(mockFoundTargetNotification))
  .mockReturnValueOnce(of())
  .mockReturnValueOnce(of())

  .mockReturnValue(of()); // remaining tests

jest.spyOn(defaultServices.api, 'deleteCredentials').mockReturnValue(of(true));
const apiRequestSpy = jest
  .spyOn(defaultServices.api, 'getCredentials')
  .mockReturnValueOnce(of([])) // adds the correct table entry when a stored notification is received

  .mockReturnValueOnce(of([mockCredential, mockAnotherCredential])) // removes the correct table entry when a deletion notification is received

  .mockReturnValueOnce(of([mockCredential])) // renders an empty table after receiving deletion notifications for all credentials

  .mockReturnValueOnce(of([mockCredential, mockAnotherCredential])) // expands to show the correct nested targets

  .mockReturnValueOnce(of([mockCredential, mockAnotherCredential])) // decrements the correct count and updates the correct nested table when a lost target notification is received
  .mockReturnValueOnce(
    of([
      mockCredential,
      { ...mockAnotherCredential, numMatchingTargets: mockAnotherCredential.numMatchingTargets - 1 },
    ]),
  )

  .mockReturnValueOnce(of([mockCredential, mockAnotherCredential])) // increments the correct count and updates the correct nested table when a found target notification is received
  .mockReturnValueOnce(
    of([
      mockCredential,
      { ...mockAnotherCredential, numMatchingTargets: mockAnotherCredential.numMatchingTargets + 1 },
    ]),
  )

  .mockReturnValueOnce(of([])) // opens the auth modal when Add is clicked

  .mockReturnValueOnce(of([mockCredential, mockAnotherCredential])) // shows a popup when Delete is clicked and makes a delete request when deleting one credential after confirming Delete

  .mockReturnValueOnce(of([mockCredential, mockAnotherCredential])) // makes multiple delete requests when all credentials are deleted at once

  .mockReturnValue(throwError(() => new Error('Too many calls')));

jest
  .spyOn(defaultServices.api, 'getCredential')
  .mockReturnValueOnce(of(mockMatchedCredentialResponse)) // expands to show the correct nested targets
  .mockReturnValueOnce(of(mockAnotherMatchedCredentialResponse))

  .mockReturnValueOnce(of(mockMatchedCredentialResponse)) // decrements the correct count and updates the correct nested table when a lost target notification is received
  .mockReturnValueOnce(of({ ...mockAnotherMatchedCredentialResponse, targets: [mockAnotherMatchingTarget] }))

  .mockReturnValueOnce(of(mockMatchedCredentialResponse)) // increments the correct count and updates the correct nested table when a found target notification is received
  .mockReturnValueOnce(
    of({
      ...mockAnotherMatchedCredentialResponse,
      targets: mockAnotherMatchedCredentialResponse.targets.concat(mockYetAnotherMatchingTarget),
    }),
  )

  .mockReturnValue(throwError(() => new Error('Too many calls')));

jest.spyOn(defaultServices.settings, 'deletionDialogsEnabledFor').mockReturnValueOnce(true);

describe('<StoreCredentials />', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(cleanup);

  it('adds the correct table entry when a stored notification is received', async () => {
    renderWithServiceContext(<StoreCredentials />);

    expect(screen.getByText(mockCredential.matchExpression)).toBeInTheDocument();
    expect(screen.getByText(mockCredential.numMatchingTargets)).toBeInTheDocument();
    expect(apiRequestSpy).toHaveBeenCalledTimes(1);
  });

  it('removes the correct table entry when a deletion notification is received', async () => {
    renderWithServiceContext(<StoreCredentials />);

    expect(screen.queryByText(mockCredential.matchExpression)).not.toBeInTheDocument();
    expect(screen.queryByText(mockCredential.numMatchingTargets)).not.toBeInTheDocument();
    expect(screen.getByText(mockAnotherCredential.matchExpression)).toBeInTheDocument();
    expect(screen.getByText(mockAnotherCredential.numMatchingTargets)).toBeInTheDocument();
    expect(apiRequestSpy).toHaveBeenCalledTimes(1);
  });

  it('renders an empty table after receiving deletion notifications for all credentials', async () => {
    const apiRequestSpy = jest.spyOn(defaultServices.api, 'getCredentials');
    renderWithServiceContext(<StoreCredentials />);

    expect(screen.queryByText(mockCredential.matchExpression)).not.toBeInTheDocument();
    expect(screen.queryByText(mockCredential.numMatchingTargets)).not.toBeInTheDocument();
    expect(screen.queryByText(mockAnotherCredential.matchExpression)).not.toBeInTheDocument();
    expect(screen.queryByText(mockAnotherCredential.numMatchingTargets)).not.toBeInTheDocument();
    expect(screen.getByText('No Stored Credentials')).toBeInTheDocument();
    expect(apiRequestSpy).toHaveBeenCalledTimes(1);
  });

  it('expands to show the correct nested targets', async () => {
    const { user } = renderWithServiceContext(<StoreCredentials />);

    const targets = [mockTarget, mockAnotherTarget, mockAnotherMatchingTarget];
    targets.forEach(({ alias, connectUrl }) => {
      expect(screen.queryByText(`${alias} (${connectUrl})`)).not.toBeInTheDocument();
    });
    expect(screen.queryByText('Target')).not.toBeInTheDocument();

    const expandButtons = screen.getAllByLabelText('Details');
    expect(expandButtons.length).toBe(2);

    await user.click(expandButtons[0]);

    expect(screen.getByText(`${mockTarget.alias} (${mockTarget.connectUrl})`)).toBeInTheDocument();
    expect(screen.getByText(`${mockTarget.alias} (${mockTarget.connectUrl})`)).toBeVisible();

    const otherTargets = targets.filter((t) => t.connectUrl !== mockTarget.connectUrl);
    otherTargets.forEach(({ alias, connectUrl }) =>
      expect(screen.queryByText(`${alias} (${connectUrl})`)).not.toBeInTheDocument(),
    );

    await user.click(expandButtons[1]);

    otherTargets.forEach(({ alias, connectUrl }) => {
      const element = screen.getByText(`${alias} (${connectUrl})`);
      expect(element).toBeInTheDocument();
      expect(element).toBeVisible();
    });
  });

  it('decrements the correct count and updates the correct nested table when a lost target notification is received', async () => {
    const { user } = renderWithServiceContext(<StoreCredentials />);

    // both counts should now be equal to 1
    const counts = screen.getAllByText('1');
    expect(counts.length).toBe(2);

    const expandButtons = screen.getAllByLabelText('Details');

    await user.click(expandButtons[0]);

    expect(screen.getByText(`${mockTarget.alias} (${mockTarget.connectUrl})`)).toBeInTheDocument();

    await user.click(expandButtons[1]);

    expect(screen.queryByText(`${mockAnotherTarget.alias} (${mockAnotherTarget.connectUrl})`)).not.toBeInTheDocument();

    const element = screen.getByText(`${mockAnotherMatchingTarget.alias} (${mockAnotherMatchingTarget.connectUrl})`);
    expect(element).toBeInTheDocument();
    expect(element).toBeVisible();
  });

  it('increments the correct count and updates the correct nested table when a found target notification is received', async () => {
    const { user } = renderWithServiceContext(<StoreCredentials />);

    expect(screen.getByText(mockCredential.numMatchingTargets)).toBeInTheDocument();
    expect(screen.getByText(mockAnotherCredential.numMatchingTargets + 1)).toBeInTheDocument();

    const expandButtons = screen.getAllByLabelText('Details');

    await user.click(expandButtons[0]);

    expect(screen.getByText(`${mockTarget.alias} (${mockTarget.connectUrl})`)).toBeInTheDocument();
    expect(
      screen.queryByText(`${mockYetAnotherMatchingTarget.alias} (${mockYetAnotherMatchingTarget.connectUrl})`),
    ).not.toBeInTheDocument();

    await user.click(expandButtons[1]);

    [mockAnotherTarget, mockAnotherMatchingTarget, mockYetAnotherMatchingTarget].forEach(({ alias, connectUrl }) => {
      const element = screen.getByText(`${alias} (${connectUrl})`);
      expect(element).toBeInTheDocument();
      expect(element).toBeVisible();
    });
  });

  it('opens the auth modal when Add is clicked', async () => {
    const { user } = renderWithServiceContext(<StoreCredentials />);

    await user.click(screen.getByText('Add'));
    expect(screen.getByText('CreateCredentialModal')).toBeInTheDocument();

    await user.click(screen.getByLabelText('Close'));
    expect(screen.queryByText('CreateCredentialModal')).not.toBeInTheDocument();
  });

  it('shows a popup when Delete is clicked and makes a delete request when deleting one credential after confirming Delete', async () => {
    const deleteRequestSpy = jest.spyOn(defaultServices.api, 'deleteCredentials');
    const { user } = renderWithServiceContext(<StoreCredentials />);

    expect(screen.getByText(mockCredential.matchExpression)).toBeInTheDocument();
    expect(screen.getByText(mockAnotherCredential.matchExpression)).toBeInTheDocument();

    await user.click(screen.getByLabelText('credentials-table-row-0-check'));
    await user.click(screen.getByText('Delete'));

    expect(screen.getByLabelText(DeleteCredentials.ariaLabel)).toBeInTheDocument();

    const dialogWarningSpy = jest.spyOn(defaultServices.settings, 'setDeletionDialogsEnabledFor');
    await user.click(screen.getByLabelText("Don't ask me again"));
    await user.click(within(screen.getByLabelText(DeleteCredentials.ariaLabel)).getByText('Delete'));

    expect(dialogWarningSpy).toBeCalledTimes(1);
    expect(dialogWarningSpy).toBeCalledWith(DeleteOrDisableWarningType.DeleteCredentials, false);

    expect(deleteRequestSpy).toHaveBeenCalledTimes(1);
  });

  it('makes multiple delete requests when all credentials are deleted at once w/o popup warning', async () => {
    const deleteRequestSpy = jest.spyOn(defaultServices.api, 'deleteCredentials');
    const { user } = renderWithServiceContext(<StoreCredentials />);

    expect(screen.getByText(mockCredential.matchExpression)).toBeInTheDocument();
    expect(screen.getByText(mockCredential.numMatchingTargets)).toBeInTheDocument();
    expect(screen.getByText(mockAnotherCredential.matchExpression)).toBeInTheDocument();
    expect(screen.getByText(mockAnotherCredential.numMatchingTargets)).toBeInTheDocument();

    const checkboxes = screen.getAllByRole('checkbox');
    const selectAllCheck = checkboxes[0];
    await user.click(selectAllCheck);
    await user.click(screen.getByText('Delete'));

    expect(deleteRequestSpy).toHaveBeenCalledTimes(2);
  });
});
