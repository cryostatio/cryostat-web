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
import { CategorizedRuleEvaluations, RuleEvaluation } from '@app/Shared/Services/Report.service';
import { defaultServices, ServiceContext } from '@app/Shared/Services/Services';
import React from 'react';
import { Provider } from 'react-redux';
import renderer, { act } from 'react-test-renderer';
import '../../Common';

const mockRuleEvaluation1: RuleEvaluation = {
  name: 'rule1',
  description: 'rule1 description',
  score: 100,
  topic: 'myTopic',
};

const mockRuleEvaluation2: RuleEvaluation = {
  name: 'rule2',
  description: 'rule2 description',
  score: 0,
  topic: 'fakeTopic',
};

const mockRuleEvaluation3: RuleEvaluation = {
  name: 'rule3',
  description: 'rule3 description',
  score: 55,
  topic: 'fakeTopic',
};

const mockNaRuleEvaluation: RuleEvaluation = {
  name: 'N/A rule',
  description: 'N/A description',
  score: -1,
  topic: 'fakeTopic',
};

const mockEvaluations1: RuleEvaluation[] = [mockRuleEvaluation1];

const mockEvaluations2: RuleEvaluation[] = [mockRuleEvaluation2, mockRuleEvaluation3, mockNaRuleEvaluation];

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
