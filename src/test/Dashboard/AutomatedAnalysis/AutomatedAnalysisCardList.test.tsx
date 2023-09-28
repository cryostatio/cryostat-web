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
import { NotificationsContext, NotificationsInstance } from '@app/Notifications/Notifications';
import { store } from '@app/Shared/Redux/ReduxStore';
import { CategorizedRuleEvaluations, AnalysisResult } from '@app/Shared/Services/Report.service';
import { defaultServices, ServiceContext } from '@app/Shared/Services/Services';
import React from 'react';
import { Provider } from 'react-redux';
import renderer, { act } from 'react-test-renderer';
import '../../Common';

const mockRuleEvaluation1: AnalysisResult = {
  topic: 'myTopic',
  name: 'rule1',
  score: 100,
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
  topic: 'fakeTopic',
  name: 'rule2',
  score: 0,
  evaluation: {
    summary: 'second thing happened',
    explanation: 'second reason',
    solution: 'second solution',
    suggestions: [],
  },
};

const mockRuleEvaluation3: AnalysisResult = {
  topic: 'fakeTopic',
  name: 'rule3',
  score: 55,
  evaluation: {
    summary: 'third thing happened',
    explanation: 'third reason',
    solution: 'third solution',
    suggestions: [],
  },
};

const mockNaRuleEvaluation: AnalysisResult = {
  topic: 'fakeTopic',
  name: 'N/A rule',
  score: -1,
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
    let tree;
    await act(async () => {
      tree = renderer.create(
        <ServiceContext.Provider value={defaultServices}>
          <NotificationsContext.Provider value={NotificationsInstance}>
            <Provider store={store}>
              <AutomatedAnalysisCardList evaluations={mockCategorizedEvaluations} />
            </Provider>
          </NotificationsContext.Provider>
        </ServiceContext.Provider>,
      );
    });
    expect(tree.toJSON()).toMatchSnapshot();
  });
});
