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
import userEvent from '@testing-library/user-event';
import renderer, { act } from 'react-test-renderer';

import { render, screen, within } from '@testing-library/react';
import { of, throwError } from 'rxjs';
import { MatchedCredential, StoredCredential } from '@app/Shared/Services/Api.service';

import '@testing-library/jest-dom';
import { Modal, ModalVariant } from '@patternfly/react-core';
import { NotificationMessage } from '@app/Shared/Services/NotificationChannel.service';

const mockCredential: StoredCredential = { id: 0, matchExpression: 'target.connectUrl == "service:jmx:rmi://someUrl"', numMatchingTargets: 1 };
const mockAnotherCredential: StoredCredential = { id: 1, matchExpression: 'target.connectUrl == "service:jmx:rmi://anotherUrl" || target.connectUrl == "service:jmx:rmi://anotherMatchUrl" || target.connectUrl == "service:jmx:rmi://yetAnotherMatchUrl"', numMatchingTargets: 2 };

const mockTarget: Target = { connectUrl: "service:jmx:rmi://someUrl", alias: "someAlias", };
const mockAnotherTarget: Target = { connectUrl: "service:jmx:rmi://anotherUrl", alias: "anotherAlias", };
const mockAnotherMatchingTarget: Target = { connectUrl: "service:jmx:rmi://anotherMatchUrl", alias: "anotherMatchAlias", };
const mockYetAnotherMatchingTarget: Target = { connectUrl: "service:jmx:rmi://yetAnotherMatchUrl", alias: "yetAnotherMatchAlias" };

const mockMatchedCredentialResponse: MatchedCredential = { matchExpression: mockCredential.matchExpression, targets: [mockTarget] };
const mockAnotherMatchedCredentialResponse: MatchedCredential = { matchExpression: mockAnotherCredential.matchExpression, targets: [mockAnotherTarget, mockAnotherMatchingTarget] };

jest.mock('@app/SecurityPanel/Credentials/CreateJmxCredentialModal', () => {
  return {
    CreateJmxCredentialModal: jest.fn((props) => {
      return (
        <Modal
          isOpen={props.visible}
          variant={ModalVariant.large}
          showClose={true}
          onClose={props.onClose}
          title="CreateJmxCredentialModal"
        >
          Jmx Auth Form
        </Modal>
      );
    }),
  };
});

jest.mock('@app/Shared/Services/NotificationChannel.service', () => {
  const mockCredentialNotification = { message: mockCredential } as NotificationMessage;
  const evt = { kind: 'LOST', serviceRef:  mockTarget } as TargetDiscoveryEvent;
  const mockLostTargetNotification = { message: { event: { kind: 'LOST', serviceRef:  mockAnotherTarget } } } as NotificationMessage;
  const mockFoundTargetNotification = { message: { event: { kind: 'FOUND', serviceRef:  mockYetAnotherMatchingTarget } } } as NotificationMessage;
  return {
    ...jest.requireActual('@app/Shared/Services/NotificationChannel.service'),
    NotificationChannel: jest.fn(() => {
      return {
        messages: jest
          .fn()
          .mockReturnValueOnce(of()) // 'renders correctly'
          .mockReturnValueOnce(of())
          .mockReturnValueOnce(of())

          .mockReturnValueOnce(of(mockCredentialNotification)) // 'adds the correct table entry when a stored notification is received'
          .mockReturnValueOnce(of())
          .mockReturnValueOnce(of())

          .mockReturnValueOnce(of()) // 'removes the correct table entry when a deletion notification is received'
          .mockReturnValueOnce(of(mockCredentialNotification))
          .mockReturnValueOnce(of())

          .mockReturnValueOnce(of()) // 'renders an empty table after receiving deletion notifications for all credentials'
          .mockReturnValueOnce(of(mockCredentialNotification))
          .mockReturnValueOnce(of())

          .mockReturnValueOnce(of()) // 'expands to show the correct nested targets'
          .mockReturnValueOnce(of())
          .mockReturnValueOnce(of())
          .mockReturnValueOnce(of())
          .mockReturnValueOnce(of())

          .mockReturnValueOnce(of()) // 'decrements the correct count and updates the correct nested table when a lost target notification is received'
          .mockReturnValueOnce(of())
          .mockReturnValueOnce(of(mockLostTargetNotification))
          .mockReturnValueOnce(of(mockLostTargetNotification))
          .mockReturnValueOnce(of(mockLostTargetNotification))

          .mockReturnValueOnce(of()) // 'increments the correct count and updates the correct nested table when a found target notification is received'
          .mockReturnValueOnce(of())
          .mockReturnValueOnce(of(mockFoundTargetNotification))
          .mockReturnValueOnce(of(mockFoundTargetNotification))
          .mockReturnValueOnce(of(mockFoundTargetNotification))

          .mockReturnValue(of()) // remaining tests
      };
    }),
  };
});

jest.mock('@app/Shared/Services/Api.service', () => {
  return {
    ApiService: jest.fn(() => {
      return {
        deleteCredentials: jest
          .fn()
          .mockReturnValue(of(true)),
        getCredentials: jest
          .fn()
          .mockReturnValueOnce(of([mockCredential, mockAnotherCredential])) // 'renders correctly'

          .mockReturnValueOnce(of([])) // 'adds the correct table entry when a stored notification is received'

          .mockReturnValueOnce(of([mockCredential, mockAnotherCredential])) // 'removes the correct table entry when a deletion notification is received'

          .mockReturnValueOnce(of([mockCredential])) // 'renders an empty table after receiving deletion notifications for all credentials'

          .mockReturnValueOnce(of([mockCredential, mockAnotherCredential])) // 'expands to show the correct nested targets'

          .mockReturnValueOnce(of([mockCredential, mockAnotherCredential])) // 'decrements the correct count and updates the correct nested table when a lost target notification is received'

          .mockReturnValueOnce(of([mockCredential, mockAnotherCredential])) // 'increments the correct count and updates the correct nested table when a found target notification is received'
          
          .mockReturnValueOnce(of([])) // 'opens the JMX auth modal when Add is clicked'

          .mockReturnValueOnce(of([mockCredential, mockAnotherCredential])) // 'shows a popup when Delete is clicked and makes a delete request when deleting one credential after confirming Delete'

          .mockReturnValueOnce(of([mockCredential, mockAnotherCredential])) // 'makes multiple delete requests when all credentials are deleted at once'

          .mockReturnValue(throwError(() => new Error('Too many calls'))),
        getCredential: jest
          .fn()
          .mockReturnValueOnce(of(mockMatchedCredentialResponse)) // 'expands to show the correct nested targets'
          .mockReturnValueOnce(of(mockAnotherMatchedCredentialResponse))

          .mockReturnValueOnce(of(mockMatchedCredentialResponse)) // 'decrements the correct count and updates the correct nested table when a lost target notification is received'
          .mockReturnValueOnce(of(mockAnotherMatchedCredentialResponse))

          .mockReturnValueOnce(of(mockMatchedCredentialResponse)) // 'increments the correct count and updates the correct nested table when a found target notification is received'
          .mockReturnValueOnce(of(mockAnotherMatchedCredentialResponse))

          .mockReturnValue(throwError(() => new Error('Too many calls'))),
      };
    }),
  };
});

import { StoreJmxCredentials } from '@app/SecurityPanel/Credentials/StoreJmxCredentials';
import { ServiceContext, defaultServices } from '@app/Shared/Services/Services';
import { DeleteJMXCredentials, DeleteWarningType } from '@app/Modal/DeleteWarningUtils';
import { Target } from '@app/Shared/Services/Target.service';
import { TargetDiscoveryEvent } from '@app/Shared/Services/Targets.service';

jest.spyOn(defaultServices.settings, 'deletionDialogsEnabledFor')
  .mockReturnValueOnce(true);

describe('<StoreJmxCredentials />', () => {
  it('renders correctly', async () => {
    const apiRequestSpy = jest.spyOn(defaultServices.api, 'getCredentials');
    let tree;
    await act(async () => {
      tree = renderer.create(
        <ServiceContext.Provider value={defaultServices}>
          <StoreJmxCredentials />
        </ServiceContext.Provider>
      );
    });
    expect(tree.toJSON()).toMatchSnapshot();

    expect(apiRequestSpy).toHaveBeenCalledTimes(1);
  });

  it('adds the correct table entry when a stored notification is received', () => {
    const apiRequestSpy = jest.spyOn(defaultServices.api, 'getCredentials');
    render(
      <ServiceContext.Provider value={defaultServices}>
        <StoreJmxCredentials />
      </ServiceContext.Provider>
    );

    expect(screen.getByText(mockCredential.matchExpression)).toBeInTheDocument();
    expect(screen.getByText(mockCredential.numMatchingTargets)).toBeInTheDocument();
    expect(apiRequestSpy).toHaveBeenCalledTimes(1);
  });

  it('removes the correct table entry when a deletion notification is received', () => {
    const apiRequestSpy = jest.spyOn(defaultServices.api, 'getCredentials');
    render(
      <ServiceContext.Provider value={defaultServices}>
        <StoreJmxCredentials />
      </ServiceContext.Provider>
    );

    expect(screen.queryByText(mockCredential.matchExpression)).not.toBeInTheDocument();
    expect(screen.queryByText(mockCredential.numMatchingTargets)).not.toBeInTheDocument();
    expect(screen.getByText(mockAnotherCredential.matchExpression)).toBeInTheDocument();
    expect(screen.getByText(mockAnotherCredential.numMatchingTargets)).toBeInTheDocument();
    expect(apiRequestSpy).toHaveBeenCalledTimes(1);
  });

  it('renders an empty table after receiving deletion notifications for all credentials', () => {
    const apiRequestSpy = jest.spyOn(defaultServices.api, 'getCredentials');
    render(
      <ServiceContext.Provider value={defaultServices}>
        <StoreJmxCredentials />
      </ServiceContext.Provider>
    );

    expect(screen.queryByText(mockCredential.matchExpression)).not.toBeInTheDocument();
    expect(screen.queryByText(mockCredential.numMatchingTargets)).not.toBeInTheDocument();
    expect(screen.queryByText(mockAnotherCredential.matchExpression)).not.toBeInTheDocument();
    expect(screen.queryByText(mockAnotherCredential.numMatchingTargets)).not.toBeInTheDocument();
    expect(screen.getByText('No Stored Credentials')).toBeInTheDocument();
    expect(apiRequestSpy).toHaveBeenCalledTimes(1);
  });

  it('expands to show the correct nested targets', () => {
    render(
      <ServiceContext.Provider value={defaultServices}>
        <StoreJmxCredentials />
      </ServiceContext.Provider>
    );

    expect(screen.queryByText('Target')).not.toBeInTheDocument();
    expect(screen.queryByText(`${mockTarget.alias} (${mockTarget.connectUrl})`)).not.toBeInTheDocument();
    expect(screen.queryByText(`${mockAnotherTarget.alias} (${mockAnotherTarget.connectUrl})`)).not.toBeInTheDocument();
    expect(screen.queryByText(`${mockAnotherMatchingTarget.alias} (${mockAnotherMatchingTarget.connectUrl})`)).not.toBeInTheDocument();
    
    const expandButtons = screen.getAllByLabelText('Details');
    
    userEvent.click(expandButtons[0]);

    expect(screen.getByText('Target')).toBeInTheDocument();
    expect(screen.getByText(`${mockTarget.alias} (${mockTarget.connectUrl})`)).toBeInTheDocument();
    expect(screen.queryByText(`${mockAnotherTarget.alias} (${mockAnotherTarget.connectUrl})`)).not.toBeInTheDocument();
    expect(screen.queryByText(`${mockAnotherMatchingTarget.alias} (${mockAnotherMatchingTarget.connectUrl})`)).not.toBeInTheDocument();
    
    userEvent.click(expandButtons[1]);

    expect(screen.getByText(`${mockAnotherTarget.alias} (${mockAnotherTarget.connectUrl})`)).toBeInTheDocument();
    expect(screen.getByText(`${mockAnotherMatchingTarget.alias} (${mockAnotherMatchingTarget.connectUrl})`)).toBeInTheDocument();
  });

  it('decrements the correct count and updates the correct nested table when a lost target notification is received', async () => {
    render(
      <ServiceContext.Provider value={defaultServices}>
        <StoreJmxCredentials />
      </ServiceContext.Provider>
    );

    // both counts should now be equal to 1
    const counts = screen.getAllByText(mockAnotherCredential.numMatchingTargets - 1);
    expect(within(counts[0]).getByText(mockCredential.numMatchingTargets)).toBeTruthy();
    expect(within(counts[1]).getByText(mockAnotherCredential.numMatchingTargets - 1)).toBeTruthy();
    
    const expandButtons = screen.getAllByLabelText('Details');
   
    userEvent.click(expandButtons[0]);

    expect(screen.getByText(`${mockTarget.alias} (${mockTarget.connectUrl})`)).toBeInTheDocument();

    userEvent.click(expandButtons[1]);

    expect(screen.queryByText(`${mockAnotherTarget.alias} (${mockAnotherTarget.connectUrl})`)).not.toBeInTheDocument();
    expect(screen.getByText(`${mockAnotherMatchingTarget.alias} (${mockAnotherMatchingTarget.connectUrl})`)).toBeInTheDocument();
  });

  it('increments the correct count and updates the correct nested table when a found target notification is received', () => {
    render(
      <ServiceContext.Provider value={defaultServices}>
        <StoreJmxCredentials />
      </ServiceContext.Provider>
    );

    expect(screen.getByText(mockCredential.numMatchingTargets)).toBeInTheDocument();
    expect(screen.getByText(mockAnotherCredential.numMatchingTargets + 1)).toBeInTheDocument();

    const expandButtons = screen.getAllByLabelText('Details');
   
    userEvent.click(expandButtons[0]);

    expect(screen.getByText(`${mockTarget.alias} (${mockTarget.connectUrl})`)).toBeInTheDocument();
    expect(screen.queryByText(`${mockYetAnotherMatchingTarget.alias} (${mockYetAnotherMatchingTarget.connectUrl})`)).not.toBeInTheDocument();

    userEvent.click(expandButtons[1]);

    expect(screen.getByText(`${mockAnotherTarget.alias} (${mockAnotherTarget.connectUrl})`)).toBeInTheDocument();
    expect(screen.getByText(`${mockAnotherMatchingTarget.alias} (${mockAnotherMatchingTarget.connectUrl})`)).toBeInTheDocument();
    expect(screen.getByText(`${mockYetAnotherMatchingTarget.alias} (${mockYetAnotherMatchingTarget.connectUrl})`)).toBeInTheDocument();
  });

  it('opens the JMX auth modal when Add is clicked', () => {
    render(
      <ServiceContext.Provider value={defaultServices}>
        <StoreJmxCredentials />
      </ServiceContext.Provider>
    );
    userEvent.click(screen.getByText('Add'));
    expect(screen.getByText('CreateJmxCredentialModal')).toBeInTheDocument();

    userEvent.click(screen.getByLabelText('Close'));
    expect(screen.queryByText('CreateJmxCredentialModal')).not.toBeInTheDocument();
  });

  it('shows a popup when Delete is clicked and makes a delete request when deleting one credential after confirming Delete', () => {
    const queryRequestSpy = jest.spyOn(defaultServices.api, 'getCredentials');
    const deleteRequestSpy = jest.spyOn(defaultServices.api, 'deleteCredentials');
    render(
      <ServiceContext.Provider value={defaultServices}>
        <StoreJmxCredentials />
      </ServiceContext.Provider>
    );

    expect(screen.getByText(mockCredential.matchExpression)).toBeInTheDocument();
    expect(screen.getByText(mockAnotherCredential.matchExpression)).toBeInTheDocument();

    userEvent.click(screen.getByLabelText('credentials-table-row-0-check'));
    userEvent.click(screen.getByText('Delete'));

    expect(screen.getByLabelText(DeleteJMXCredentials.ariaLabel)).toBeInTheDocument();

    const dialogWarningSpy = jest.spyOn(defaultServices.settings, 'setDeletionDialogsEnabledFor');
    userEvent.click(screen.getByLabelText("Don't ask me again"));
    userEvent.click(within(screen.getByLabelText(DeleteJMXCredentials.ariaLabel)).getByText('Delete'));

    expect(dialogWarningSpy).toBeCalledTimes(1);
    expect(dialogWarningSpy).toBeCalledWith(DeleteWarningType.DeleteJMXCredentials, false);
    expect(queryRequestSpy).toHaveBeenCalledTimes(1);
    expect(deleteRequestSpy).toHaveBeenCalledTimes(1);
  });

  it('makes multiple delete requests when all credentials are deleted at once w/o popup warning', () => {
    const queryRequestSpy = jest.spyOn(defaultServices.api, 'getCredentials');
    const deleteRequestSpy = jest.spyOn(defaultServices.api, 'deleteCredentials');
    render(
      <ServiceContext.Provider value={defaultServices}>
        <StoreJmxCredentials />
      </ServiceContext.Provider>
    );

    expect(screen.getByText(mockCredential.matchExpression)).toBeInTheDocument();
    expect(screen.getByText(mockCredential.numMatchingTargets)).toBeInTheDocument();
    expect(screen.getByText(mockAnotherCredential.matchExpression)).toBeInTheDocument();
    expect(screen.getByText(mockAnotherCredential.numMatchingTargets)).toBeInTheDocument();

    const checkboxes = screen.getAllByRole('checkbox');
    const selectAllCheck = checkboxes[0];
    userEvent.click(selectAllCheck);
    userEvent.click(screen.getByText('Delete'));
    expect(queryRequestSpy).toHaveBeenCalledTimes(1);
    expect(deleteRequestSpy).toHaveBeenCalledTimes(2);
  });
});
