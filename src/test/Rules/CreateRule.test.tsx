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

import { CreateRule } from '@app/Rules/CreateRule';
import { Target, EventTemplate, Rule } from '@app/Shared/Services/api.types';
import { defaultServices } from '@app/Shared/Services/Services';
import '@testing-library/jest-dom';
import { cleanup, screen, waitFor } from '@testing-library/react';
import { of, throwError } from 'rxjs';
import { escapeKeyboardInput, render } from '../utils';

jest.mock('@app/Shared/Components/MatchExpression/MatchExpressionVisualizer', () => ({
  MatchExpressionVisualizer: () => <>Match Expression visualizer</>,
}));

const mockConnectUrl = 'service:jmx:rmi://someUrl';
const mockTarget: Target = {
  agent: false,
  connectUrl: mockConnectUrl,
  alias: 'io.cryostat.Cryostat',
  labels: [],
  annotations: {
    cryostat: [{ key: 'PORT', value: '9091' }],
    platform: [],
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

const mockNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

jest.spyOn(defaultServices.api, 'doGet').mockReturnValue(of([mockEventTemplate]));

jest.spyOn(defaultServices.targets, 'targets').mockReturnValue(of([mockTarget]));
jest.spyOn(defaultServices.api, 'matchTargetsWithExpr').mockImplementation((matchExpression, _targets) => {
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
    jest.clearAllMocks();
  });

  afterEach(cleanup);

  it('should show error helper text when name input is invalid', async () => {
    const { user } = render({
      routerConfigs: {
        routes: [
          {
            path: '/rules',
            element: <>Rules</>,
          },
          {
            path: '/rules/create',
            element: <CreateRule />,
          },
        ],
      },
    });

    const nameInput = screen.getByLabelText('Name *');
    expect(nameInput).toBeInTheDocument();
    expect(nameInput).toBeVisible();

    await user.type(nameInput, 'some name with spaces');

    const nameHelperText = screen.getByText('A rule name can contain only letters, numbers, and underscores.');
    expect(nameHelperText).toBeInTheDocument();
    expect(nameHelperText).toBeVisible();
  });

  it('should show error helper text when Match Expression input is invalid', async () => {
    const { user } = render({
      routerConfigs: {
        routes: [
          {
            path: '/rules',
            element: <>Rules</>,
          },
          {
            path: '/rules/create',
            element: <CreateRule />,
          },
        ],
      },
    });
    const matchExpressionInput = screen.getByLabelText('Match Expression *');
    expect(matchExpressionInput).toBeInTheDocument();
    expect(matchExpressionInput).toBeVisible();

    await user.type(matchExpressionInput, 'somethingwrong');

    const exphelperText = await screen.findByText('The expression matching failed.');
    expect(exphelperText).toBeInTheDocument();
    expect(exphelperText).toBeVisible();
  });

  it('should show warning text when Match Expression matches no target', async () => {
    const { user } = render({
      routerConfigs: {
        routes: [
          {
            path: '/rules',
            element: <>Rules</>,
          },
          {
            path: '/rules/create',
            element: <CreateRule />,
          },
        ],
      },
    });
    const matchExpressionInput = screen.getByLabelText('Match Expression *');
    expect(matchExpressionInput).toBeInTheDocument();
    expect(matchExpressionInput).toBeVisible();

    await user.type(matchExpressionInput, 'false');

    const exphelperText = await screen.findByText('Warning: Match Expression matches no targets.');
    expect(exphelperText).toBeInTheDocument();
    expect(exphelperText).toBeVisible();
  });

  it('should update template selection when template list updates', async () => {
    const { user } = render({
      routerConfigs: {
        routes: [
          {
            path: '/rules',
            element: <>Rules</>,
          },
          {
            path: '/rules/create',
            element: <CreateRule />,
          },
        ],
      },
    });
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
    const { user } = render({
      routerConfigs: {
        routes: [
          {
            path: '/rules',
            element: <>Rules</>,
          },
          {
            path: '/rules/create',
            element: <CreateRule />,
          },
        ],
      },
    });
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

    expect(mockNavigate).toHaveBeenCalledWith('..', { relative: 'path' });
  });
});
