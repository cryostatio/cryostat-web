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
import { AnalysisResult } from '@app/Shared/Services/Report.service';
import { act, cleanup, screen, within } from '@testing-library/react';
import React from 'react';
import { renderDefault } from '../../Common';

const mockRuleEvaluation1: AnalysisResult = {
  name: 'rule1',
  description: 'rule1 description',
  score: 100,
  topic: 'myTopic',
};

const mockRuleEvaluation2: AnalysisResult = {
  name: 'rule2',
  description: 'rule2 description',
  score: 55,
  topic: 'fakeTopic',
};

const mockRuleEvaluation3: AnalysisResult = {
  name: 'rule3',
  description: 'rule3 description',
  score: 0,
  topic: 'fakeTopic',
};

const mockNaRuleEvaluation: AnalysisResult = {
  name: 'N/A rule',
  description: 'N/A description',
  score: -1,
  topic: 'fakeTopic',
};

describe('<ClickableAutomatedAnalysisLabel />', () => {
  afterEach(cleanup);

  it('displays label', async () => {
    renderDefault(<ClickableAutomatedAnalysisLabel label={mockRuleEvaluation1} />);

    expect(screen.getByText(mockRuleEvaluation1.name)).toBeInTheDocument();
  });

  it('displays popover when critical label is clicked', async () => {
    const { user } = renderDefault(<ClickableAutomatedAnalysisLabel label={mockRuleEvaluation1} />);

    expect(screen.getByText(mockRuleEvaluation1.name)).toBeInTheDocument();

    await act(async () => {
      await user.click(screen.getByText(mockRuleEvaluation1.name));
    });

    const closeButton = screen.getByRole('button', {
      name: /close/i,
    });

    expect(closeButton).toBeInTheDocument();

    expect(document.getElementsByClassName('pf-m-danger').item(0)).toBeInTheDocument();
    expect(screen.getByText(mockRuleEvaluation1.description)).toBeInTheDocument();
    expect(screen.getByText(String(mockRuleEvaluation1.score) + '.0')).toBeInTheDocument();
    const heading = screen.getByRole('heading', {
      name: /danger rule1/i,
    });
    expect(within(heading).getByText(mockRuleEvaluation1.name)).toBeInTheDocument();

    await user.click(screen.getAllByText(mockRuleEvaluation1.name)[0]);

    expect(screen.queryByText(mockRuleEvaluation1.description)).not.toBeInTheDocument();
    expect(screen.queryByText(String(mockRuleEvaluation1.score) + '.0')).not.toBeInTheDocument();
    expect(closeButton).not.toBeInTheDocument();
  });

  it('displays popover when warning label is clicked', async () => {
    const { user } = renderDefault(<ClickableAutomatedAnalysisLabel label={mockRuleEvaluation2} />);

    expect(screen.getByText(mockRuleEvaluation2.name)).toBeInTheDocument();

    await act(async () => {
      await user.click(screen.getByText(mockRuleEvaluation2.name));
    });

    const closeButton = screen.getByRole('button', {
      name: /close/i,
    });

    expect(closeButton).toBeInTheDocument();

    expect(document.getElementsByClassName('pf-m-warning').item(0)).toBeInTheDocument();
    expect(screen.getByText(mockRuleEvaluation2.description)).toBeInTheDocument();
    expect(screen.getByText(String(mockRuleEvaluation2.score) + '.0')).toBeInTheDocument();
    const heading = screen.getByRole('heading', {
      name: /warning rule2/i,
    });
    expect(within(heading).getByText(mockRuleEvaluation2.name)).toBeInTheDocument();

    await user.click(screen.getAllByText(mockRuleEvaluation2.name)[0]);

    expect(screen.queryByText(mockRuleEvaluation2.description)).not.toBeInTheDocument();
    expect(screen.queryByText(String(mockRuleEvaluation2.score) + '.0')).not.toBeInTheDocument();
    expect(closeButton).not.toBeInTheDocument();
  });

  it('displays popover when ok label is clicked', async () => {
    const { user } = renderDefault(<ClickableAutomatedAnalysisLabel label={mockRuleEvaluation3} />);

    expect(screen.getByText(mockRuleEvaluation3.name)).toBeInTheDocument();

    await act(async () => {
      await user.click(screen.getByText(mockRuleEvaluation3.name));
    });
    const closeButton = screen.getByRole('button', {
      name: /close/i,
    });

    expect(closeButton).toBeInTheDocument();

    expect(document.getElementsByClassName('pf-m-success').item(0)).toBeInTheDocument();
    expect(screen.getByText(mockRuleEvaluation3.description)).toBeInTheDocument();
    expect(screen.getByText(String(mockRuleEvaluation3.score) + '.0')).toBeInTheDocument();
    const heading = screen.getByRole('heading', {
      name: /success rule3/i,
    });
    expect(within(heading).getByText(mockRuleEvaluation3.name)).toBeInTheDocument();

    await user.click(screen.getAllByText(mockRuleEvaluation3.name)[0]);

    expect(screen.queryByText(mockRuleEvaluation3.description)).not.toBeInTheDocument();
    expect(screen.queryByText(String(mockRuleEvaluation3.score) + '.0')).not.toBeInTheDocument();
    expect(closeButton).not.toBeInTheDocument();
  });

  it('displays popover when N/A label is clicked', async () => {
    const { user } = renderDefault(<ClickableAutomatedAnalysisLabel label={mockNaRuleEvaluation} />);

    expect(screen.getByText(mockNaRuleEvaluation.name)).toBeInTheDocument();

    await act(async () => {
      await user.click(screen.getByText(mockNaRuleEvaluation.name));
    });
    const closeButton = screen.getByRole('button', {
      name: /close/i,
    });

    expect(closeButton).toBeInTheDocument();

    expect(document.getElementsByClassName('pf-m-default').item(0)).toBeInTheDocument();
    expect(screen.getByText(mockNaRuleEvaluation.description)).toBeInTheDocument();
    expect(screen.getByText('N/A')).toBeInTheDocument();
    const heading = screen.getByRole('heading', {
      name: /default /i,
    });
    expect(within(heading).getByText(mockNaRuleEvaluation.name)).toBeInTheDocument();

    await user.click(screen.getAllByText(mockNaRuleEvaluation.name)[0]);

    expect(screen.queryByText(mockNaRuleEvaluation.description)).not.toBeInTheDocument();
    expect(screen.queryByText('N/A')).not.toBeInTheDocument();
    expect(closeButton).not.toBeInTheDocument();
  });
});
