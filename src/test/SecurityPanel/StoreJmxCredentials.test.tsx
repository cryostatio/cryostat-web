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
import { render, screen } from '@testing-library/react';
import { of, throwError } from 'rxjs';
import { StoredCredential } from '@app/Shared/Services/Api.service';

import '@testing-library/jest-dom';
import { Modal, ModalVariant } from '@patternfly/react-core';
import { NotificationMessage } from '@app/Shared/Services/NotificationChannel.service';

const mockCredential: StoredCredential = { matchExpression: 'target.connectUrl == "service:jmx:rmi://someUrl"', targets: [{ connectUrl: 'service:jmx:rmi://someUrl', alias: 'fooTarget' }] };
const mockAnotherCredential: StoredCredential = { matchExpression: 'target.connectUrl == "service:jmx:rmi://anotherUrl"', targets: [{ connectUrl: 'service:jmx:rmi://anotherUrl', alias: 'anotherTarget' }] };

jest.mock('@app/SecurityPanel/CreateJmxCredentialModal', () => {
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
  const mockNotification = { message: { target: 'target.connectUrl == "service:jmx:rmi://someUrl"' } } as NotificationMessage;
  return {
    ...jest.requireActual('@app/Shared/Services/NotificationChannel.service'),
    NotificationChannel: jest.fn(() => {
      return {
        messages: jest
          .fn()
          .mockReturnValueOnce(of()) // 'renders correctly'
          .mockReturnValueOnce(of())
          .mockReturnValueOnce(of())

          .mockReturnValueOnce(of()) // 'adds the correct table entry when a stored notification is received'
          .mockReturnValueOnce(of(mockNotification))
          .mockReturnValueOnce(of())

          .mockReturnValueOnce(of()) // 'removes the correct table entry when a deletion notification is received'
          .mockReturnValueOnce(of())
          .mockReturnValueOnce(of(mockNotification))

          .mockReturnValueOnce(of()) // 'renders an empty table after receiving deletion notifications for all credentials'
          .mockReturnValueOnce(of())
          .mockReturnValueOnce(of(mockNotification))

          .mockReturnValue(of()), // all other tests
      };
    }),
  };
});

jest.mock('@app/Shared/Services/Target.service', () => {
  return {
    ...jest.requireActual('@app/Shared/Services/Target.service'),
    TargetService: jest.fn(() => {
      return {
        deleteCredentials: jest.fn(),
      };
    }),
  };
});

jest.mock('@app/Shared/Services/Api.service', () => {
  return {
    ApiService: jest.fn(() => {
      return {
        getStoredJmxCredentials: jest
          .fn()
          .mockReturnValueOnce(of([mockCredential])) // 'renders correectly'

          .mockReturnValueOnce(of([mockCredential])) // 'adds the correct table entry when a stored notification is received'
          .mockReturnValueOnce(of([mockCredential]))

          .mockReturnValueOnce(of([mockCredential, mockAnotherCredential])) // 'removes the correct table entry when a deletion notification is received'

          .mockReturnValueOnce(of([mockCredential])) // 'renders an empty table after receiving deletion notifications for all credentials'

          .mockReturnValueOnce(of([])) // 'opens the JMX auth modal when Add is clicked'

          .mockReturnValueOnce(of([mockCredential, mockAnotherCredential])) // 'makes a delete request when deleting one credential'

          .mockReturnValueOnce(of([mockCredential, mockAnotherCredential])) // 'makes multiple delete requests when all credentials are deleted at once'

          .mockReturnValue(throwError(() => new Error('Too many calls'))),
        deleteTargetCredentials: jest.fn(() => {
          return of(true);
        }),
      };
    }),
  };
});

import { StoreJmxCredentials } from '@app/SecurityPanel/StoreJmxCredentials';
import { ServiceContext, defaultServices } from '@app/Shared/Services/Services';

describe('<StoreJmxCredentials />', () => {
  it('renders correctly', async () => {
    let tree;
    await act(async () => {
      tree = renderer.create(
        <ServiceContext.Provider value={defaultServices}>
          <StoreJmxCredentials />
        </ServiceContext.Provider>
      );
    });
    expect(tree.toJSON()).toMatchSnapshot();
  });

  it('adds the correct table entry when a stored notification is received', () => {
    render(
      <ServiceContext.Provider value={defaultServices}>
        <StoreJmxCredentials />
      </ServiceContext.Provider>
    );

    expect(screen.getByText('fooTarget')).toBeInTheDocument();
  });

  it('removes the correct table entry when a deletion notification is received', () => {
    render(
      <ServiceContext.Provider value={defaultServices}>
        <StoreJmxCredentials />
      </ServiceContext.Provider>
    );

    expect(screen.queryByText('fooTarget')).not.toBeInTheDocument();
    expect(screen.getByText('anotherTarget')).toBeInTheDocument();
  });

  it('renders an empty table after receiving deletion notifications for all credentials', () => {
    render(
      <ServiceContext.Provider value={defaultServices}>
        <StoreJmxCredentials />
      </ServiceContext.Provider>
    );

    expect(screen.queryByText('fooTarget')).not.toBeInTheDocument();
    expect(screen.getByText('No Stored Credentials')).toBeInTheDocument();
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

  it('makes a delete request when deleting one credential', () => {
    render(
      <ServiceContext.Provider value={defaultServices}>
        <StoreJmxCredentials />
      </ServiceContext.Provider>
    );

    expect(screen.getByText('fooTarget')).toBeInTheDocument();
    expect(screen.getByText('anotherTarget')).toBeInTheDocument();

    userEvent.click(screen.getByLabelText('credentials-table-row-0-check'));
    userEvent.click(screen.getByText('Delete'));

    const deleteRequestSpy = jest.spyOn(defaultServices.api, 'deleteTargetCredentials');

    expect(deleteRequestSpy).toHaveBeenCalledTimes(1);
    expect(deleteRequestSpy).toHaveBeenCalledWith(mockCredential.targets[0].connectUrl);
  });

  it('makes multiple delete requests when all credentials are deleted at once', () => {
    render(
      <ServiceContext.Provider value={defaultServices}>
        <StoreJmxCredentials />
      </ServiceContext.Provider>
    );

    expect(screen.getByText('anotherTarget')).toBeInTheDocument();
    expect(screen.getByText('fooTarget')).toBeInTheDocument();

    const checkboxes = screen.getAllByRole('checkbox');
    const selectAllCheck = checkboxes[0];
    userEvent.click(selectAllCheck);
    userEvent.click(screen.getByText('Delete'));

    const deleteRequestSpy = jest.spyOn(defaultServices.api, 'deleteTargetCredentials');

    expect(deleteRequestSpy).toHaveBeenCalledTimes(2);
    expect(deleteRequestSpy).nthCalledWith(1, mockCredential.targets[0].connectUrl);
    expect(deleteRequestSpy).nthCalledWith(2, mockAnotherCredential.targets[0].connectUrl);
  });
});
