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

import { ClickableAutomatedAnalysisLabel } from '@app/Dashboard/AutomatedAnalysis/ClickableAutomatedAnalysisLabel';
import { AnalysisResult } from '@app/Shared/Services/api.types';
import { act, cleanup, screen, within } from '@testing-library/react';
import { renderDefault } from '../../Common';

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
        name: 'rule1 suggestion1',
        setting: 'setting1',
        value: 'value1',
      },
    ],
  },
};

const mockRuleEvaluation2: AnalysisResult = {
  name: 'rule2',
  score: 55,
  topic: 'fakeTopic',
  evaluation: {
    summary: 'rule2 summary',
    explanation: 'rule2 explanation',
    solution: 'rule2 solution',
    suggestions: [
      {
        name: 'rule2 suggestion1',
        setting: 'setting2',
        value: 'value2',
      },
    ],
  },
};

const mockRuleEvaluation3: AnalysisResult = {
  name: 'rule3',
  score: 0,
  topic: 'fakeTopic',
  evaluation: {
    summary: 'rule3 summary',
    explanation: 'rule3 explanation',
    solution: 'rule3 solution',
    suggestions: [
      {
        name: 'rule3 suggestion1',
        setting: 'setting3',
        value: 'value3',
      },
    ],
  },
};

const mockNaRuleEvaluation: AnalysisResult = {
  name: 'N/A rule',
  score: -1,
  topic: 'fakeTopic',
  evaluation: {
    summary: 'rule4 summary',
    explanation: 'rule4 explanation',
    solution: 'rule4 solution',
    suggestions: [
      {
        name: 'rule4 suggestion1',
        setting: 'setting4',
        value: 'value4',
      },
    ],
  },
};

describe('<ClickableAutomatedAnalysisLabel />', () => {
  afterEach(cleanup);

  it('displays label', async () => {
    renderDefault(<ClickableAutomatedAnalysisLabel result={mockRuleEvaluation1} />);

    expect(screen.getByText(mockRuleEvaluation1.name)).toBeInTheDocument();
  });

  it('displays popover when critical label is clicked', async () => {
    const { user } = renderDefault(<ClickableAutomatedAnalysisLabel result={mockRuleEvaluation1} />);

    expect(screen.getByText(mockRuleEvaluation1.name)).toBeInTheDocument();

    await act(async () => {
      await user.click(screen.getByText(mockRuleEvaluation1.name));
    });

    const closeButton = screen.getByRole('button', {
      name: /close/i,
    });

    expect(closeButton).toBeInTheDocument();

    expect(document.getElementsByClassName('pf-m-danger').item(0)).toBeInTheDocument();

    const summary = screen.getByText(mockRuleEvaluation1.evaluation.summary);
    const explanation = screen.getByText(mockRuleEvaluation1.evaluation.explanation);
    const solution = screen.getByText(mockRuleEvaluation1.evaluation.solution);
    const setting = screen.getByText(mockRuleEvaluation1.evaluation.suggestions[0].setting);
    const keyval = screen.getByText(
      `${mockRuleEvaluation1.evaluation.suggestions[0].name}=${mockRuleEvaluation1.evaluation.suggestions[0].value}`,
    );
    const score = screen.getByText(String(mockRuleEvaluation1.score) + '.0');

    expect(summary).toBeInTheDocument();
    expect(explanation).toBeInTheDocument();
    expect(solution).toBeInTheDocument();
    expect(setting).toBeInTheDocument();
    expect(keyval).toBeInTheDocument();
    expect(score).toBeInTheDocument();

    const heading = screen.getByRole('heading', {
      name: /danger rule1/i,
    });

    expect(within(heading).getByText(mockRuleEvaluation1.name)).toBeInTheDocument();

    await user.click(screen.getAllByText(mockRuleEvaluation1.name)[0]);

    expect(summary).not.toBeInTheDocument();
    expect(explanation).not.toBeInTheDocument();
    expect(solution).not.toBeInTheDocument();
    expect(setting).not.toBeInTheDocument();
    expect(keyval).not.toBeInTheDocument();
    expect(score).not.toBeInTheDocument();
    expect(closeButton).not.toBeInTheDocument();
  });

  it('displays popover when warning label is clicked', async () => {
    const { user } = renderDefault(<ClickableAutomatedAnalysisLabel result={mockRuleEvaluation2} />);

    expect(screen.getByText(mockRuleEvaluation2.name)).toBeInTheDocument();

    await act(async () => {
      await user.click(screen.getByText(mockRuleEvaluation2.name));
    });

    const closeButton = screen.getByRole('button', {
      name: /close/i,
    });

    expect(closeButton).toBeInTheDocument();

    expect(document.getElementsByClassName('pf-m-warning').item(0)).toBeInTheDocument();

    const summary = screen.getByText(mockRuleEvaluation2.evaluation.summary);
    const explanation = screen.getByText(mockRuleEvaluation2.evaluation.explanation);
    const solution = screen.getByText(mockRuleEvaluation2.evaluation.solution);
    const setting = screen.getByText(mockRuleEvaluation2.evaluation.suggestions[0].setting);
    const keyval = screen.getByText(
      `${mockRuleEvaluation2.evaluation.suggestions[0].name}=${mockRuleEvaluation2.evaluation.suggestions[0].value}`,
    );
    const score = screen.getByText(String(mockRuleEvaluation2.score) + '.0');

    expect(summary).toBeInTheDocument();
    expect(explanation).toBeInTheDocument();
    expect(solution).toBeInTheDocument();
    expect(setting).toBeInTheDocument();
    expect(keyval).toBeInTheDocument();
    expect(score).toBeInTheDocument();

    const heading = screen.getByRole('heading', {
      name: /warning rule2/i,
    });

    expect(within(heading).getByText(mockRuleEvaluation2.name)).toBeInTheDocument();

    await user.click(screen.getAllByText(mockRuleEvaluation2.name)[0]);

    expect(summary).not.toBeInTheDocument();
    expect(explanation).not.toBeInTheDocument();
    expect(solution).not.toBeInTheDocument();
    expect(setting).not.toBeInTheDocument();
    expect(keyval).not.toBeInTheDocument();
    expect(score).not.toBeInTheDocument();
    expect(closeButton).not.toBeInTheDocument();
  });

  it('displays popover when ok label is clicked', async () => {
    const { user } = renderDefault(<ClickableAutomatedAnalysisLabel result={mockRuleEvaluation3} />);

    expect(screen.getByText(mockRuleEvaluation3.name)).toBeInTheDocument();

    await act(async () => {
      await user.click(screen.getByText(mockRuleEvaluation3.name));
    });
    const closeButton = screen.getByRole('button', {
      name: /close/i,
    });

    expect(closeButton).toBeInTheDocument();

    expect(document.getElementsByClassName('pf-m-success').item(0)).toBeInTheDocument();

    const summary = screen.getByText(mockRuleEvaluation3.evaluation.summary);
    const explanation = screen.getByText(mockRuleEvaluation3.evaluation.explanation);
    const solution = screen.getByText(mockRuleEvaluation3.evaluation.solution);
    const setting = screen.getByText(mockRuleEvaluation3.evaluation.suggestions[0].setting);
    const keyval = screen.getByText(
      `${mockRuleEvaluation3.evaluation.suggestions[0].name}=${mockRuleEvaluation3.evaluation.suggestions[0].value}`,
    );
    const score = screen.getByText(String(mockRuleEvaluation3.score) + '.0');

    expect(summary).toBeInTheDocument();
    expect(explanation).toBeInTheDocument();
    expect(solution).toBeInTheDocument();
    expect(setting).toBeInTheDocument();
    expect(keyval).toBeInTheDocument();
    expect(score).toBeInTheDocument();

    const heading = screen.getByRole('heading', {
      name: /success rule3/i,
    });

    expect(within(heading).getByText(mockRuleEvaluation3.name)).toBeInTheDocument();

    await user.click(screen.getAllByText(mockRuleEvaluation3.name)[0]);

    expect(summary).not.toBeInTheDocument();
    expect(explanation).not.toBeInTheDocument();
    expect(solution).not.toBeInTheDocument();
    expect(setting).not.toBeInTheDocument();
    expect(keyval).not.toBeInTheDocument();
    expect(score).not.toBeInTheDocument();
    expect(closeButton).not.toBeInTheDocument();
  });

  it('displays popover when N/A label is clicked', async () => {
    const { user } = renderDefault(<ClickableAutomatedAnalysisLabel result={mockNaRuleEvaluation} />);

    expect(screen.getByText(mockNaRuleEvaluation.name)).toBeInTheDocument();

    await act(async () => {
      await user.click(screen.getByText(mockNaRuleEvaluation.name));
    });
    const closeButton = screen.getByRole('button', {
      name: /close/i,
    });

    expect(closeButton).toBeInTheDocument();

    expect(document.getElementsByClassName('pf-m-default').item(0)).toBeInTheDocument();
    const summary = screen.getByText(mockNaRuleEvaluation.evaluation.summary);
    const explanation = screen.getByText(mockNaRuleEvaluation.evaluation.explanation);
    const solution = screen.getByText(mockNaRuleEvaluation.evaluation.solution);
    const setting = screen.getByText(mockNaRuleEvaluation.evaluation.suggestions[0].setting);
    const keyval = screen.getByText(
      `${mockNaRuleEvaluation.evaluation.suggestions[0].name}=${mockNaRuleEvaluation.evaluation.suggestions[0].value}`,
    );
    const score = screen.getByText('N/A');

    expect(summary).toBeInTheDocument();
    expect(explanation).toBeInTheDocument();
    expect(solution).toBeInTheDocument();
    expect(setting).toBeInTheDocument();
    expect(keyval).toBeInTheDocument();
    expect(score).toBeInTheDocument();

    const heading = screen.getByRole('heading', {
      name: /default /i,
    });

    expect(within(heading).getByText(mockNaRuleEvaluation.name)).toBeInTheDocument();

    await user.click(screen.getAllByText(mockNaRuleEvaluation.name)[0]);

    expect(summary).not.toBeInTheDocument();
    expect(explanation).not.toBeInTheDocument();
    expect(solution).not.toBeInTheDocument();
    expect(setting).not.toBeInTheDocument();
    expect(keyval).not.toBeInTheDocument();
    expect(score).not.toBeInTheDocument();
    expect(closeButton).not.toBeInTheDocument();
  });
});
