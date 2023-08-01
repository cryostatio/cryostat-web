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
import { EventTemplate } from '@app/CreateRecording/CreateRecording';
import { CreateRule } from '@app/Rules/CreateRule';
import { Rule } from '@app/Rules/Rules';
import { defaultServices } from '@app/Shared/Services/Services';
import { Target } from '@app/Shared/Services/Target.service';
import '@testing-library/jest-dom';
import { cleanup, screen, waitFor } from '@testing-library/react';
import { createMemoryHistory } from 'history';
import * as React from 'react';
import { of, throwError } from 'rxjs';
import { renderWithServiceContextAndRouter } from '../Common';

jest.mock('@app/Shared/MatchExpression/MatchExpressionVisualizer', () => ({
  MatchExpressionVisualizer: () => <>Match Expression Visualizer</>,
}));

const escapeKeyboardInput = (value: string) => {
  return value.replace(/[{[]/g, '$&$&');
};

const mockConnectUrl = 'service:jmx:rmi://someUrl';
const mockTarget: Target = {
  connectUrl: mockConnectUrl,
  alias: 'io.cryostat.Cryostat',
  annotations: {
    cryostat: { PORT: 9091 },
    platform: {},
  },
};
const mockEventTemplate: EventTemplate = {
  name: 'Profiling',
  type: 'TARGET',
  provider: 'some provider',
  description: 'some description',
};

const mockRule: Rule = {
  name: 'mockRule',
  description: 'A mock rule',
  matchExpression: "target.alias == 'io.cryostat.Cryostat' || target.annotations.cryostat['PORT'] == 9091",
  enabled: true,
  eventSpecifier: 'template=Profiling,type=TARGET',
  archivalPeriodSeconds: 0,
  initialDelaySeconds: 0,
  preservedArchives: 0,
  maxAgeSeconds: 0,
  maxSizeBytes: 0,
};

const history = createMemoryHistory({ initialEntries: ['/rules/create'] });

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useRouteMatch: jest.fn(() => ({ url: history.location.pathname })),
  useHistory: jest.fn(() => history),
}));

jest.spyOn(defaultServices.api, 'doGet').mockReturnValue(of([mockEventTemplate]));

jest.spyOn(defaultServices.targets, 'targets').mockReturnValue(of([mockTarget]));
jest.spyOn(defaultServices.api, 'matchTargetsWithExpr').mockImplementation((matchExpression, targets) => {
  switch (matchExpression) {
    case mockRule.matchExpression:
      return of([mockTarget]);
    case 'false':
      return of([]);
    default: // Assume incomplete input or others are invalid
      return throwError(() => new Error('400 Response'));
  }
});
const createSpy = jest.spyOn(defaultServices.api, 'createRule').mockReturnValue(of(true));

describe('<CreateRule />', () => {
  beforeEach(() => {
    history.go(-history.length);
    jest.clearAllMocks();
  });

  afterEach(cleanup);

  it('should show error helper text when name input is invalid', async () => {
    const { user } = renderWithServiceContextAndRouter(<CreateRule />, { history });

    const nameInput = screen.getByLabelText('Name *');
    expect(nameInput).toBeInTheDocument();
    expect(nameInput).toBeVisible();

    await user.type(nameInput, 'some name with spaces');

    const nameHelperText = screen.getByText('A rule name can contain only letters, numbers, and underscores.');
    expect(nameHelperText).toBeInTheDocument();
    expect(nameHelperText).toBeVisible();
  });

  it('should show error helper text when match expression input is invalid', async () => {
    const { user } = renderWithServiceContextAndRouter(<CreateRule />, { history });

    const matchExpressionInput = screen.getByLabelText('Match Expression *');
    expect(matchExpressionInput).toBeInTheDocument();
    expect(matchExpressionInput).toBeVisible();

    await user.type(matchExpressionInput, 'somethingwrong');

    const exphelperText = await screen.findByText('The expression matching failed.');
    expect(exphelperText).toBeInTheDocument();
    expect(exphelperText).toBeVisible();
  });

  it('should show warning text when match expression matches no target', async () => {
    const { user } = renderWithServiceContextAndRouter(<CreateRule />, { history });

    const matchExpressionInput = screen.getByLabelText('Match Expression *');
    expect(matchExpressionInput).toBeInTheDocument();
    expect(matchExpressionInput).toBeVisible();

    await user.type(matchExpressionInput, 'false');

    const exphelperText = await screen.findByText('Warning: Match expression matches no targets.');
    expect(exphelperText).toBeInTheDocument();
    expect(exphelperText).toBeVisible();
  });

  it('should update template selection when template list updates', async () => {
    const { user } = renderWithServiceContextAndRouter(<CreateRule />, { history });

    const matchExpressionInput = screen.getByLabelText('Match Expression *');
    expect(matchExpressionInput).toBeInTheDocument();
    expect(matchExpressionInput).toBeVisible();

    await user.type(matchExpressionInput, escapeKeyboardInput(mockRule.matchExpression));

    // Select a template
    await user.click(screen.getByText('Select a Template'));

    const option = await screen.findByText(mockEventTemplate.name);
    expect(option).toBeInTheDocument();
    expect(option).toBeVisible();

    await user.click(option);

    const oldSelection = screen.getByText(mockEventTemplate.name);
    expect(oldSelection).toBeInTheDocument();
    expect(oldSelection).toBeVisible();

    await user.type(matchExpressionInput, 'false');

    await waitFor(() => expect(oldSelection).not.toBeInTheDocument());

    const placeHolder = screen.getByText('Select a Template');
    expect(placeHolder).toBeInTheDocument();
    expect(placeHolder).toBeVisible();
  });

  it('should submit form when form input is valid and create button is clicked', async () => {
    const { user } = renderWithServiceContextAndRouter(<CreateRule />, { history });

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

    await user.type(nameInput, mockRule.name);
    await user.type(descriptionInput, mockRule.description);
    await user.type(matchExpressionInput, escapeKeyboardInput(mockRule.matchExpression));
    await waitFor(() => expect(defaultServices.api.doGet).toHaveBeenCalledTimes(1));
    await user.selectOptions(templateSelect, ['Profiling']);

    await user.type(maxSizeInput, `${mockRule.maxSizeBytes}`);
    await user.type(maxAgeInput, `${mockRule.maxAgeSeconds}`);
    await user.type(archivalPeriodInput, `${mockRule.archivalPeriodSeconds}`);
    await user.type(preservedArchivesInput, `${mockRule.preservedArchives}`);
    await user.type(initialDelayInput, `${mockRule.initialDelaySeconds}`);

    const createButton = screen.getByRole('button', { name: /^create$/i });
    expect(createButton).toBeInTheDocument();
    expect(createButton).toBeVisible();

    expect(createButton).not.toBeDisabled();
    await user.click(createButton);

    expect(createSpy).toHaveBeenCalledTimes(1);
    expect(createSpy).toHaveBeenCalledWith(mockRule);
  });
});
