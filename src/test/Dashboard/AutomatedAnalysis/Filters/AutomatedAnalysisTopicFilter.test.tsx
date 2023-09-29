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

import { AutomatedAnalysisTopicFilter } from '@app/Dashboard/AutomatedAnalysis/Filters/AutomatedAnalysisTopicFilter';
import { AnalysisResult, CategorizedRuleEvaluations } from '@app/Shared/Services/api.types';
import { cleanup, screen, within } from '@testing-library/react';
import React from 'react';
import { renderDefault } from '../../../Common';

const mockRuleEvaluation1: AnalysisResult = {
  name: 'rule1',
  score: 100,
  topic: 'myTopic',
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
  name: 'rule2',
  score: 0,
  topic: 'fakeTopic',
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
  name: 'rule3',
  score: 55,
  topic: 'fakeTopic',
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
  name: 'N/A rule',
  score: -1,
  topic: 'fakeTopic',
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

const onTopicInput = jest.fn((_nameInput) => {
  /**Do nothing. Used for checking renders */
});

describe('<AutomatedAnalysisTopicFilter />', () => {
  let emptyFilteredTopics: string[];
  let filteredTopics: string[];

  beforeEach(() => {
    emptyFilteredTopics = [];
    filteredTopics = [mockRuleEvaluation1.topic];
  });

  afterEach(cleanup);

  it('display topic selections when text input is clicked', async () => {
    const { user } = renderDefault(
      <AutomatedAnalysisTopicFilter
        evaluations={mockCategorizedEvaluations}
        onSubmit={onTopicInput}
        filteredTopics={emptyFilteredTopics}
      />,
    );
    const nameInput = screen.getByLabelText('Filter by topic...');
    expect(nameInput).toBeInTheDocument();
    expect(nameInput).toBeVisible();

    await user.click(nameInput);

    const selectMenu = await screen.findByRole('listbox', { name: 'Filter by topic' });
    expect(selectMenu).toBeInTheDocument();
    expect(selectMenu).toBeVisible();

    allMockEvaluations.forEach((r) => {
      const option = within(selectMenu).getByText(r.topic);
      expect(option).toBeInTheDocument();
      expect(option).toBeVisible();
    });
  });

  it('display topic selections when dropdown arrow is clicked', async () => {
    const { user } = renderDefault(
      <AutomatedAnalysisTopicFilter
        evaluations={mockCategorizedEvaluations}
        onSubmit={onTopicInput}
        filteredTopics={emptyFilteredTopics}
      />,
    );
    const dropDownArrow = screen.getByRole('button', { name: 'Options menu' });
    expect(dropDownArrow).toBeInTheDocument();
    expect(dropDownArrow).toBeVisible();

    await user.click(dropDownArrow);

    const selectMenu = await screen.findByRole('listbox', { name: 'Filter by topic' });
    expect(selectMenu).toBeInTheDocument();
    expect(selectMenu).toBeVisible();

    allMockEvaluations.forEach((r) => {
      const option = within(selectMenu).getByText(r.topic);
      expect(option).toBeInTheDocument();
      expect(option).toBeVisible();
    });
  });

  it('should close selection menu when toggled with dropdown arrow', async () => {
    const { user } = renderDefault(
      <AutomatedAnalysisTopicFilter
        evaluations={mockCategorizedEvaluations}
        onSubmit={onTopicInput}
        filteredTopics={emptyFilteredTopics}
      />,
    );

    const dropDownArrow = screen.getByRole('button', { name: 'Options menu' });
    expect(dropDownArrow).toBeInTheDocument();
    expect(dropDownArrow).toBeVisible();

    await user.click(dropDownArrow);

    const selectMenu = await screen.findByRole('listbox', { name: 'Filter by topic' });
    expect(selectMenu).toBeInTheDocument();
    expect(selectMenu).toBeVisible();

    allMockEvaluations.forEach((r) => {
      const option = within(selectMenu).getByText(r.topic);
      expect(option).toBeInTheDocument();
      expect(option).toBeVisible();
    });

    await user.click(dropDownArrow);
    expect(selectMenu).not.toBeInTheDocument();
    expect(selectMenu).not.toBeVisible();
  });

  it('should close selection menu when toggled with text input', async () => {
    const { user } = renderDefault(
      <AutomatedAnalysisTopicFilter
        evaluations={mockCategorizedEvaluations}
        onSubmit={onTopicInput}
        filteredTopics={emptyFilteredTopics}
      />,
    );

    const nameInput = screen.getByLabelText('Filter by topic...');
    expect(nameInput).toBeInTheDocument();
    expect(nameInput).toBeVisible();

    await user.click(nameInput);

    const selectMenu = await screen.findByRole('listbox', { name: 'Filter by topic' });
    expect(selectMenu).toBeInTheDocument();
    expect(selectMenu).toBeVisible();

    allMockEvaluations.forEach((r) => {
      const option = within(selectMenu).getByText(r.topic);
      expect(option).toBeInTheDocument();
      expect(option).toBeVisible();
    });

    await user.click(nameInput);
    expect(selectMenu).not.toBeInTheDocument();
    expect(selectMenu).not.toBeVisible();
  });

  it('should not display selected topics', async () => {
    const { user } = renderDefault(
      <AutomatedAnalysisTopicFilter
        evaluations={mockCategorizedEvaluations}
        onSubmit={onTopicInput}
        filteredTopics={filteredTopics}
      />,
    );

    const nameInput = screen.getByLabelText('Filter by topic...');
    expect(nameInput).toBeInTheDocument();
    expect(nameInput).toBeVisible();

    await user.click(nameInput);

    const selectMenu = await screen.findByRole('listbox', { name: 'Filter by topic' });
    expect(selectMenu).toBeInTheDocument();
    expect(selectMenu).toBeVisible();

    const notToShowName = within(selectMenu).queryByText(mockRuleEvaluation1.topic);
    expect(notToShowName).not.toBeInTheDocument();
  });

  it('should select a topic when a topic option is clicked', async () => {
    const submitNameInput = jest.fn((nameInput) => emptyFilteredTopics.push(nameInput));

    const { user } = renderDefault(
      <AutomatedAnalysisTopicFilter
        evaluations={mockCategorizedEvaluations}
        onSubmit={submitNameInput}
        filteredTopics={emptyFilteredTopics}
      />,
    );

    const nameInput = screen.getByLabelText('Filter by topic...');
    expect(nameInput).toBeInTheDocument();
    expect(nameInput).toBeVisible();

    await user.click(nameInput);

    const selectMenu = await screen.findByRole('listbox', { name: 'Filter by topic' });
    expect(selectMenu).toBeInTheDocument();
    expect(selectMenu).toBeVisible();

    allMockEvaluations.forEach((r) => {
      const option = within(selectMenu).getByText(r.topic);
      expect(option).toBeInTheDocument();
      expect(option).toBeVisible();
    });

    await user.selectOptions(selectMenu, mockRuleEvaluation1.topic);

    expect(submitNameInput).toBeCalledTimes(1);
    expect(submitNameInput).toBeCalledWith(mockRuleEvaluation1.topic);
    expect(emptyFilteredTopics).toStrictEqual([mockRuleEvaluation1.topic]);
  });
});
