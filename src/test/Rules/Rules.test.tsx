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
import renderer, { act } from 'react-test-renderer';
import '@testing-library/jest-dom';
import { of } from 'rxjs';
import { Rules, Rule } from '@app/Rules/Rules';
import { ServiceContext, defaultServices } from '@app/Shared/Services/Services';
import { createMemoryHistory } from 'history';
import { Router } from 'react-router-dom';
import { render, cleanup, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const mockRule: Rule =  {
  name: 'mockRule',
  description: 'A mock rule',
  matchExpression: "target.alias == 'io.cryostat.Cryostat' || target.annotations.cryostat['PORT'] == 9091",
  eventSpecifier: "template=Profiling,type=TARGET",
  archivalPeriodSeconds: 0,
  preservedArchives: 0,
  maxAgeSeconds: 0,
  maxSizeBytes: 0
};
const mockRuleListResponse = { data: { result: [mockRule] as Rule[] } };
const mockRuleListEmptyResponse = { data: { result: [] as Rule[] } };
const history = createMemoryHistory();

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useRouteMatch: () => ({ url: history.location.pathname }),
  useHistory: () => history,
}));

jest.spyOn(defaultServices.api, 'deleteRule').mockReturnValue(of(true));
jest.spyOn(defaultServices.api, 'downloadRule').mockReturnValue();
jest.spyOn(defaultServices.api, 'doGet')
  .mockReturnValueOnce(of(mockRuleListEmptyResponse)) // renders correctly
  .mockReturnValue(of(mockRuleListResponse));

jest.spyOn(defaultServices.notificationChannel, 'messages')
  .mockReturnValueOnce(of()) // renders correctly
  .mockReturnValueOnce(of())

  .mockReturnValueOnce(of()) // open view to create rules
  .mockReturnValueOnce(of())
  
  .mockReturnValue(of()); // other tests

describe('<Rules/>', () => {
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
            <Rules/>
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
            <Rules/>
          </Router>
      </ServiceContext.Provider>
    );

    userEvent.click(screen.getByRole('button', { name: /Create/ }));

    expect(history.entries.map((entry) => entry.pathname)).toStrictEqual(['/', '/rules', '/rules/create']);
  });

  it('opens upload modal when upload icon is clicked', () => {});

  it('deletes a rule when Delete is clicked', () => {});

  it('downloads a rule when Download is clicked', () => {})
});