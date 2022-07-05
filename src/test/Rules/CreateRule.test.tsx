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
import { render, cleanup, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Rule } from '@app/Rules/Rules';
import { ServiceContext, defaultServices } from '@app/Shared/Services/Services';
import { CreateRule } from '@app/Rules/CreateRule';
import { EventTemplate } from '@app/CreateRecording/CreateRecording';
import { Target } from '@app/Shared/Services/Target.service';

const escapeKeyboardInput = (value: string) => {
  return value.replace(/[{[]/g, '$&$&');
}

const mockConnectUrl = 'service:jmx:rmi://someUrl';
const mockTarget: Target = {
  connectUrl: mockConnectUrl,
  alias: 'io.cryostat.Cryostat',
  annotations: {
    cryostat: new Map<string, string>(
      [['PORT', '9091']]
    ),
    platform: new Map<string, string>()
  }
};
const mockEventTemplate: EventTemplate = {
  name: 'Profiling',
  type: 'TARGET',
  provider: 'some provider',
  description: 'some description'
};
const mockRule: Rule =  {
  name: 'mockRule',
  description: 'A mock rule',
  matchExpression: "target.alias == 'io.cryostat.Cryostat' || target.annotations.cryostat['PORT'] == 9091",
  eventSpecifier: "template=Profiling,type=TARGET",
  archivalPeriodSeconds: 0,
  initialDelaySeconds: 0,
  preservedArchives: 0,
  maxAgeSeconds: 0,
  maxSizeBytes: 0
};

const history = createMemoryHistory();

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useRouteMatch: () => ({ url: history.location.pathname }),
  useHistory: () => history,
}));

const createSpy = jest.spyOn(defaultServices.api, 'createRule').mockReturnValue(of(true));
jest.spyOn(defaultServices.api, 'doGet').mockReturnValue(of([mockEventTemplate]));
jest.spyOn(defaultServices.target, 'target').mockReturnValue(of(mockTarget));
jest.spyOn(defaultServices.targets, 'targets').mockReturnValue(of([mockTarget]));
jest.spyOn(defaultServices.targets, 'queryForTargets').mockReturnValue(of());

describe('<CreateRule/>', () => {
  beforeEach(() => {
    history.go(-history.length);
    history.push('/rules');
  });

  afterEach(cleanup);

  it('renders correctly', async () => {
    let tree;
    await act(async () => {
      tree = renderer.create(
        <ServiceContext.Provider value={defaultServices}>
          <Router location={history.location} history={history}>
            <CreateRule/>
          </Router>
        </ServiceContext.Provider>
      );
    });
    expect(tree.toJSON()).toMatchSnapshot();
  });

  it('should submit form if form input is valid', async () => {
    render(
      <ServiceContext.Provider value={defaultServices}>
          <Router location={history.location} history={history}>
            <CreateRule/>
          </Router>
        </ServiceContext.Provider>
    );

    const nameInput = screen.getByLabelText('Name *');
    expect(nameInput).toBeInTheDocument();
    expect(nameInput).toBeVisible();

    const descriptionInput = screen.getByLabelText('Description');
    expect(descriptionInput).toBeInTheDocument();
    expect(descriptionInput).toBeVisible();

    const matchExpressionInput = screen.getByLabelText('Match Expression *');
    expect(matchExpressionInput).toBeInTheDocument();
    expect(matchExpressionInput).toBeVisible();

    const templateSelect = screen.getByLabelText('Template *');
    expect(templateSelect).toBeInTheDocument();
    expect(templateSelect).toBeVisible();

    const maxSizeInput = screen.getByLabelText('Maximum Size');
    expect(maxSizeInput).toBeInTheDocument();
    expect(maxSizeInput).toBeVisible();

    const maxAgeInput = screen.getByLabelText('Maximum Age');
    expect(maxAgeInput).toBeInTheDocument();
    expect(maxAgeInput).toBeVisible();

    const archivalPeriodInput = screen.getByLabelText('Archival Period');
    expect(archivalPeriodInput).toBeInTheDocument();
    expect(archivalPeriodInput).toBeVisible();

    const preservedArchivesInput = screen.getByLabelText('Preserved Archives');
    expect(preservedArchivesInput).toBeInTheDocument();
    expect(preservedArchivesInput).toBeVisible();

    const initialDelayInput = screen.getByLabelText('Initial Delay');
    expect(initialDelayInput).toBeInTheDocument();
    expect(initialDelayInput).toBeVisible();

    const createButton = screen.getByRole('button', {name: /create/i});
    expect(createButton).toBeInTheDocument();
    expect(createButton).toBeVisible();

    userEvent.type(nameInput, mockRule.name);
    userEvent.type(descriptionInput, mockRule.description);
    userEvent.type(matchExpressionInput, escapeKeyboardInput(mockRule.matchExpression));
    userEvent.selectOptions(templateSelect, [screen.getByText('Profiling')])
    userEvent.type(maxSizeInput, `${mockRule.maxSizeBytes}`);
    userEvent.type(maxAgeInput, `${mockRule.maxAgeSeconds}`);
    userEvent.type(archivalPeriodInput, `${mockRule.archivalPeriodSeconds}`);
    userEvent.type(preservedArchivesInput, `${mockRule.preservedArchives}`);
    userEvent.type(initialDelayInput, `${mockRule.initialDelaySeconds}`);

    await waitFor(() => expect(createButton).not.toBeDisabled());

    userEvent.click(createButton);

    expect(createSpy).toHaveBeenCalledTimes(1);
    expect(createSpy).toHaveBeenCalledWith(mockRule);
  });
});
