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
import { of } from 'rxjs';

import '@testing-library/jest-dom';
import { StoreJmxCredentials } from '@app/SecurityPanel/StoreJmxCredentials';
import { ServiceContext, defaultServices } from '@app/Shared/Services/Services';
import { Modal, ModalVariant } from '@patternfly/react-core';
import { NotificationMessage } from '@app/Shared/Services/NotificationChannel.service';

jest.mock('@app/SecurityPanel/CreateJmxCredentialModal', () => {
  return {
    CreateJmxCredentialModal: jest.fn((props) => {
      return (
        <Modal isOpen={props.visible} variant={ModalVariant.large} showClose={true} onClose={props.onClose} title="CreateJmxCredentialModal">
          Jmx Auth Form
        </Modal>
      );
    }),
  };
});

jest.mock('@app/Shared/Services/Api.service', () => {
  const mockTarget = { connectUrl: 'service:jmx:rmi://someUrl', alias: 'fooTarget' } as Target;
const anotherMockTarget = { connectUrl: 'service:jmx:rmi://anotherUrl', alias: 'anotherTarget' } as Target;
  return {
    ApiService: jest.fn(() => {
      return {
        getTargetsWithStoredJmxCredentials: jest.fn()
        .mockReturnValueOnce(of([mockTarget]))
        .mockReturnValueOnce(of([mockTarget, anotherMockTarget]))
        .mockReturnValueOnce(of([mockTarget, anotherMockTarget]))
        .mockReturnValueOnce(of([]))
        .mockReturnValueOnce(of([mockTarget]))
        .mockReturnValueOnce(of([mockTarget])),
        deleteTargetCredentials: jest.fn().mockReturnValue(of(true)),
      };
    }),
  };
});

jest.mock('@app/Shared/Services/NotificationChannel.service', () => {
  const mockNotification  = {message: {target: 'service:jmx:rmi://someUrl'}} as NotificationMessage;
  const anotherMockNotification  = {message: {target: 'service:jmx:rmi://someUrl'}} as NotificationMessage;

  return {
    NotificationChannel: jest.fn(() => {
      return {
        messages: jest.fn()
        .mockReturnValueOnce(of()) // snapshot
        .mockReturnValueOnce(of())
        .mockReturnValueOnce(of())
        .mockReturnValueOnce(of())

        .mockReturnValueOnce(of(mockNotification)) // 'removes a single table entry when the selected credentials are deleted'
        .mockReturnValueOnce(of())
        .mockReturnValueOnce(of())
        .mockReturnValueOnce(of())

        .mockReturnValueOnce(of()) // 'removes all table entries when all credentials are deleted'
        .mockReturnValueOnce(of(anotherMockNotification))
        .mockReturnValueOnce(of(mockNotification)) //works for one target but not two
        .mockReturnValue(of()),
      };
    }),
  };
});

jest.mock('@app/Shared/Services/Target.service', () => {
  return {
    TargetService: jest.fn(() => {
      return {
        deleteCredentials: jest.fn(),
      };
    }),
  };
});

jest.mock('@app/Shared/Services/Targets.service', () => {
  const mockTarget = { connectUrl: 'service:jmx:rmi://someUrl', alias: 'fooTarget' } as Target;

  return {
    TargetsService: jest.fn(() => {
      return {
        targets: jest.fn().mockReturnValue(of([mockTarget])),
      };
    }),
  };
});

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

  it('removes the correct table entry when deleting one credential', () => {
    render(
      <ServiceContext.Provider value={defaultServices}>
        <StoreJmxCredentials />
      </ServiceContext.Provider>
    );

    expect(screen.getByText('fooTarget')).toBeInTheDocument();
    expect(screen.getByText('anotherTarget')).toBeInTheDocument();

    userEvent.click(screen.getByLabelText('credentials-table-row-0-check'));
    userEvent.click(screen.getByText('Delete'));

    expect(screen.queryByText('fooTarget')).not.toBeInTheDocument();
    expect(screen.getByText('anotherTarget')).toBeInTheDocument();

  });

  it('removes all table entries when all credentials are deleted', () => {
    render(
      <ServiceContext.Provider value={defaultServices}>
        <StoreJmxCredentials />
      </ServiceContext.Provider>
    );

    expect(screen.getByText('anotherTarget')).toBeInTheDocument();
    expect(screen.queryByText('fooTarget')).toBeInTheDocument();

    userEvent.click(screen.getByLabelText('table-header-check-all'));
    userEvent.click(screen.getByText('Delete'));

    expect(screen.getByText('No Stored Credentials')).toBeInTheDocument();

  });

  it('displays empty state text when the table is empty', () => {
    render(
      <ServiceContext.Provider value={defaultServices}>
        <StoreJmxCredentials />
      </ServiceContext.Provider>
    );

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

  });

  it('renders a table entry when credentials are stored', () => {
    render(
      <ServiceContext.Provider value={defaultServices}>
        <StoreJmxCredentials />
      </ServiceContext.Provider>
    );

    expect(screen.getByText('service:jmx:rmi://someUrl')).toBeInTheDocument();
    expect(screen.getByText('fooTarget')).toBeInTheDocument();

  });
});
