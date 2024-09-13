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
import { AutomatedAnalysisCardList } from '@app/Dashboard/AutomatedAnalysis/AutomatedAnalysisCardList';
import { AnalysisResult, CategorizedRuleEvaluations } from '@app/Shared/Services/api.types';
import { createMockForPFTableRef, renderSnapshot } from '@test/utils';

const mockRuleEvaluation1: AnalysisResult = {
  name: 'rule1',
  score: 100,
  topic: 'myTopic',
  evaluation: {
    summary: 'first thing happened',
    explanation: 'first reason',
    solution: 'first solution',
    suggestions: [
      {
        setting: 'setting1',
        name: 'name1',
        value: 'value1',
      },
    ],
  },
};

const mockRuleEvaluation2: AnalysisResult = {
  name: 'rule2',
  score: 0,
  topic: 'fakeTopic',
  evaluation: {
    summary: 'second thing happened',
    explanation: 'second reason',
    solution: 'second solution',
    suggestions: [],
  },
};

const mockRuleEvaluation3: AnalysisResult = {
  name: 'rule3',
  score: 55,
  topic: 'fakeTopic',
  evaluation: {
    summary: 'third thing happened',
    explanation: 'third reason',
    solution: 'third solution',
    suggestions: [],
  },
};

const mockNaRuleEvaluation: AnalysisResult = {
  name: 'N/A rule',
  score: -1,
  topic: 'fakeTopic',
  evaluation: {
    summary: 'fourth thing happened',
    explanation: 'fourth reason',
    solution: 'fourth solution',
    suggestions: [],
  },
};

const mockEvaluations1: AnalysisResult[] = [mockRuleEvaluation1];

const mockEvaluations2: AnalysisResult[] = [mockRuleEvaluation2, mockRuleEvaluation3, mockNaRuleEvaluation];

const mockCategorizedEvaluations: CategorizedRuleEvaluations[] = [
  [mockRuleEvaluation1.topic, mockEvaluations1],
  [mockRuleEvaluation2.topic, mockEvaluations2],
];

describe('<AutomatedAnalysisCardList />', () => {
  it('renders correctly', async () => {
    const tree = await renderSnapshot({
      routerConfigs: {
        routes: [
          {
            path: '/',
            element: <AutomatedAnalysisCardList evaluations={mockCategorizedEvaluations} />,
          },
        ],
      },
      createNodeMock: createMockForPFTableRef,
    });
    expect(tree?.toJSON()).toMatchSnapshot();
  });
});
