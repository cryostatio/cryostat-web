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
import renderer from 'react-test-renderer'
import { render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom';

import { of } from 'rxjs';
import { createMemoryHistory } from 'history';

import { TargetSelect } from '@app/TargetSelect/TargetSelect';
import { defaultServices, ServiceContext } from '@app/Shared/Services/Services';
import userEvent from '@testing-library/user-event';
import { NotificationMessage } from '@app/Shared/Services/NotificationChannel.service';

const mockFooConnectUrl = 'service:jmx:rmi://someFooUrl';
const mockBarConnectUrl = 'service:jmx:rmi://someBarUrl';
const mockBazConnectUrl = 'service:jmx:rmi://someBazUrl';
const mockFooTarget = { connectUrl: mockFooConnectUrl, alias: 'fooTarget' };
const mockBarTarget = { connectUrl: mockBarConnectUrl, alias: 'barTarget' }
const mockBazTarget = { connectUrl: mockBazConnectUrl, alias: 'bazTarget' }

const mockHistoryPush = jest.fn();

jest.mock('react-router-dom', () => ({
    ...jest.requireActual('react-router-dom'),
    useRouteMatch: () => ({ url: '/baseUrl' }),
    useHistory: () => ({
      push: mockHistoryPush,
    }),
  }));

jest.spyOn(defaultServices.target, 'target')
    .mockReturnValue(of(mockFooTarget))
    .mockReturnValueOnce(of())
    .mockReturnValueOnce(of())
    .mockReturnValueOnce(of(mockFooTarget))

jest.spyOn(defaultServices.targets, 'targets')
    .mockReturnValue(of([mockFooTarget, mockBarTarget]))
    .mockReturnValueOnce(of([mockFooTarget]))
    .mockReturnValueOnce(of([mockFooTarget]))
    .mockReturnValueOnce(of([mockFooTarget, mockBarTarget])) // renders dropdown of multiple discovered targets
;

jest.spyOn(defaultServices.api, 'createTarget')
    .mockReturnValue(of(true));

jest.spyOn(defaultServices.api, 'deleteTarget')
    .mockReturnValue(of(true));

jest.spyOn(defaultServices.targets, 'queryForTargets')
    .mockReturnValue(of());

describe('<TargetSelect />', () => {
  it('renders correctly', () => {
    const tree = renderer.create(    
        <ServiceContext.Provider value={defaultServices}>
            <TargetSelect />
        </ServiceContext.Provider>);

    expect(tree.toJSON()).toMatchSnapshot();
  });

  it('contains the correct information', () => {
    render(
        <ServiceContext.Provider value={defaultServices}>
            <TargetSelect />
        </ServiceContext.Provider>
    );

    expect(screen.getByText('Target JVM')).toBeInTheDocument();
    expect(screen.getByText(`Select Target...`)).toBeInTheDocument();

    expect(screen.getByLabelText('Create target')).toBeInTheDocument();
    expect(screen.getByLabelText('Delete target')).toBeInTheDocument();
    expect(screen.getByLabelText('Refresh targets')).toBeInTheDocument();
    expect(screen.getByLabelText('Options menu')).toBeInTheDocument();
  });

  it('renders dropdown of multiple discovered targets', () => {
    render(
        <ServiceContext.Provider value={defaultServices}>
            <TargetSelect />
        </ServiceContext.Provider>
    );

    expect(screen.getByText(`fooTarget`)).toBeInTheDocument();
    
    userEvent.click(screen.getByLabelText("Options menu"));
    expect(screen.getByLabelText('Select Input')).toBeInTheDocument();
    expect(screen.getByText(`Select Target...`)).toBeInTheDocument();
    expect(screen.getByText(`fooTarget (service:jmx:rmi://someFooUrl)`)).toBeInTheDocument();
    expect(screen.getByText(`barTarget (service:jmx:rmi://someBarUrl)`)).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument(); // Number of discoverable targets
  });

  it('creates a target if user completes modal', () => {
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

    const createTargetRequestSpy = jest.spyOn(defaultServices.api, 'createTarget');
    userEvent.click(screen.getByText('Create'));

    expect(createTargetRequestSpy).toBeCalledTimes(1);
    expect(createTargetRequestSpy).toBeCalledWith(mockBazTarget);
  }); 

  it('deletes target when delete button clicked', () => {
    render(
        <ServiceContext.Provider value={defaultServices}>
            <TargetSelect />
        </ServiceContext.Provider>
    );
    const deleteButton = screen.getByLabelText('Delete target');
    userEvent.click(deleteButton);

    const deleteTargetRequestSpy = jest.spyOn(defaultServices.api, 'deleteTarget');
    expect(deleteTargetRequestSpy).toBeCalledTimes(1);
    expect(deleteTargetRequestSpy).toBeCalledWith(mockFooTarget);
  }); 

  it('refreshes targets when button clicked', () => {
    render(
        <ServiceContext.Provider value={defaultServices}>
            <TargetSelect />
        </ServiceContext.Provider>
    );
    const refreshButton = screen.getByLabelText('Refresh targets');
    userEvent.click(refreshButton);

    const refreshTargetsRequestSpy = jest.spyOn(defaultServices.targets, 'queryForTargets');
    expect(refreshTargetsRequestSpy).toBeCalledTimes(1);
  }); 
});
