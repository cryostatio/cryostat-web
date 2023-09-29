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

import { AutomatedAnalysisNameFilter } from '@app/Dashboard/AutomatedAnalysis/Filters/AutomatedAnalysisNameFilter';
import { AnalysisResult, CategorizedRuleEvaluations } from '@app/Shared/Services/api.types';
import { cleanup, screen, within } from '@testing-library/react';
import React from 'react';
import { renderDefault } from '../../../Common';

const mockRuleEvaluation1: AnalysisResult = {
  topic: 'myTopic',
  name: 'rule1',
  score: 100,
  evaluation: {
    summary: 'rule1 summary',
    explanation: 'rule1 explanation',
    solution: 'rule1 solution',
    suggestions: [
      {
        name: 'rule1 suggestion 1 name',
        setting: 'rule1 suggestion 1 setting',
        value: 'rule1 suggestion 1 value',
      },
    ],
  },
};

const mockRuleEvaluation2: AnalysisResult = {
  topic: 'fakeTopic',
  name: 'rule2',
  score: 0,
  evaluation: {
    summary: 'rule2 summary',
    explanation: 'rule2 explanation',
    solution: 'rule2 solution',
    suggestions: [
      {
        name: 'rule2 suggestion 1 name',
        setting: 'rule2 suggestion 1 setting',
        value: 'rule2 suggestion 1 value',
      },
    ],
  },
};

const mockRuleEvaluation3: AnalysisResult = {
  topic: 'fakeTopic',
  name: 'rule3',
  score: 55,
  evaluation: {
    summary: 'rule3 summary',
    explanation: 'rule3 explanation',
    solution: 'rule3 solution',
    suggestions: [
      {
        name: 'rule3 suggestion 1 name',
        setting: 'rule3 suggestion 1 setting',
        value: 'rule3 suggestion 1 value',
      },
    ],
  },
};

const mockNaRuleEvaluation: AnalysisResult = {
  topic: 'fakeTopic',
  name: 'N/A rule',
  score: -1,
  evaluation: {
    summary: 'NArule summary',
    explanation: 'NArule explanation',
    solution: 'NArule solution',
    suggestions: [
      {
        name: 'NArule suggestion 1 name',
        setting: 'NArule suggestion 1 setting',
        value: 'NArule suggestion 1 value',
      },
    ],
  },
};

const mockEvaluations1: AnalysisResult[] = [mockRuleEvaluation1];

const mockEvaluations2: AnalysisResult[] = [mockRuleEvaluation2, mockRuleEvaluation3, mockNaRuleEvaluation];

const mockCategorizedEvaluations: CategorizedRuleEvaluations[] = [
  [mockRuleEvaluation1.topic, mockEvaluations1],
  [mockRuleEvaluation2.topic, mockEvaluations2],
];

const allMockEvaluations = mockEvaluations1.concat(mockEvaluations2);

const onNameInput = jest.fn((_nameInput) => {
  /**Do nothing. Used for checking renders */
});

describe('<AutomatedAnalysisNameFilter />', () => {
  let emptyFilteredNames: string[];
  let filteredNames: string[];

  beforeEach(() => {
    emptyFilteredNames = [];
    filteredNames = [mockRuleEvaluation1.name];
  });

  afterEach(cleanup);

  it('display name selections when text input is clicked', async () => {
    const { user } = renderDefault(
      <AutomatedAnalysisNameFilter
        evaluations={mockCategorizedEvaluations}
        onSubmit={onNameInput}
        filteredNames={emptyFilteredNames}
      />,
    );
    const nameInput = screen.getByLabelText('Filter by name...');
    expect(nameInput).toBeInTheDocument();
    expect(nameInput).toBeVisible();

    await user.click(nameInput);

    const selectMenu = await screen.findByRole('listbox', { name: 'Filter by name' });
    expect(selectMenu).toBeInTheDocument();
    expect(selectMenu).toBeVisible();

    allMockEvaluations.forEach((r) => {
      const option = within(selectMenu).getByText(r.name);
      expect(option).toBeInTheDocument();
      expect(option).toBeVisible();
    });
  });

  it('display name selections when dropdown arrow is clicked', async () => {
    const { user } = renderDefault(
      <AutomatedAnalysisNameFilter
        evaluations={mockCategorizedEvaluations}
        onSubmit={onNameInput}
        filteredNames={emptyFilteredNames}
      />,
    );
    const dropDownArrow = screen.getByRole('button', { name: 'Options menu' });
    expect(dropDownArrow).toBeInTheDocument();
    expect(dropDownArrow).toBeVisible();

    await user.click(dropDownArrow);

    const selectMenu = await screen.findByRole('listbox', { name: 'Filter by name' });
    expect(selectMenu).toBeInTheDocument();
    expect(selectMenu).toBeVisible();

    allMockEvaluations.forEach((r) => {
      const option = within(selectMenu).getByText(r.name);
      expect(option).toBeInTheDocument();
      expect(option).toBeVisible();
    });
  });

  it('should close selection menu when toggled with dropdown arrow', async () => {
    const { user } = renderDefault(
      <AutomatedAnalysisNameFilter
        evaluations={mockCategorizedEvaluations}
        onSubmit={onNameInput}
        filteredNames={emptyFilteredNames}
      />,
    );

    const dropDownArrow = screen.getByRole('button', { name: 'Options menu' });
    expect(dropDownArrow).toBeInTheDocument();
    expect(dropDownArrow).toBeVisible();

    await user.click(dropDownArrow);

    const selectMenu = await screen.findByRole('listbox', { name: 'Filter by name' });
    expect(selectMenu).toBeInTheDocument();
    expect(selectMenu).toBeVisible();

    allMockEvaluations.forEach((r) => {
      const option = within(selectMenu).getByText(r.name);
      expect(option).toBeInTheDocument();
      expect(option).toBeVisible();
    });

    await user.click(dropDownArrow);
    expect(selectMenu).not.toBeInTheDocument();
    expect(selectMenu).not.toBeVisible();
  });

  it('should close selection menu when toggled with text input', async () => {
    const { user } = renderDefault(
      <AutomatedAnalysisNameFilter
        evaluations={mockCategorizedEvaluations}
        onSubmit={onNameInput}
        filteredNames={emptyFilteredNames}
      />,
    );

    const nameInput = screen.getByLabelText('Filter by name...');
    expect(nameInput).toBeInTheDocument();
    expect(nameInput).toBeVisible();

    await user.click(nameInput);

    const selectMenu = await screen.findByRole('listbox', { name: 'Filter by name' });
    expect(selectMenu).toBeInTheDocument();
    expect(selectMenu).toBeVisible();

    allMockEvaluations.forEach((r) => {
      const option = within(selectMenu).getByText(r.name);
      expect(option).toBeInTheDocument();
      expect(option).toBeVisible();
    });

    await user.click(nameInput);
    expect(selectMenu).not.toBeInTheDocument();
    expect(selectMenu).not.toBeVisible();
  });

  it('should not display selected names', async () => {
    const { user } = renderDefault(
      <AutomatedAnalysisNameFilter
        evaluations={mockCategorizedEvaluations}
        onSubmit={onNameInput}
        filteredNames={filteredNames}
      />,
    );

    const nameInput = screen.getByLabelText('Filter by name...');
    expect(nameInput).toBeInTheDocument();
    expect(nameInput).toBeVisible();

    await user.click(nameInput);

    const selectMenu = await screen.findByRole('listbox', { name: 'Filter by name' });
    expect(selectMenu).toBeInTheDocument();
    expect(selectMenu).toBeVisible();

    const notToShowName = within(selectMenu).queryByText(mockRuleEvaluation1.name);
    expect(notToShowName).not.toBeInTheDocument();
  });

  it('should select a name when a name option is clicked', async () => {
    const submitNameInput = jest.fn((nameInput) => emptyFilteredNames.push(nameInput));

    const { user } = renderDefault(
      <AutomatedAnalysisNameFilter
        evaluations={mockCategorizedEvaluations}
        onSubmit={submitNameInput}
        filteredNames={emptyFilteredNames}
      />,
    );

    const nameInput = screen.getByLabelText('Filter by name...');
    expect(nameInput).toBeInTheDocument();
    expect(nameInput).toBeVisible();

    await user.click(nameInput);

    const selectMenu = await screen.findByRole('listbox', { name: 'Filter by name' });
    expect(selectMenu).toBeInTheDocument();
    expect(selectMenu).toBeVisible();

    allMockEvaluations.forEach((r) => {
      const option = within(selectMenu).getByText(r.name);
      expect(option).toBeInTheDocument();
      expect(option).toBeVisible();
    });

    await user.selectOptions(selectMenu, mockRuleEvaluation1.name);

    expect(submitNameInput).toBeCalledTimes(1);
    expect(submitNameInput).toBeCalledWith(mockRuleEvaluation1.name);
    expect(emptyFilteredNames).toStrictEqual([mockRuleEvaluation1.name]);
  });
});
