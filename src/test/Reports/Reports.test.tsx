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
import { Reports } from '@app/Reports/Reports';
import { Target } from '@app/Shared/Services/api.types';
import { defaultServices } from '@app/Shared/Services/Services';
import '@testing-library/jest-dom';
import { of } from 'rxjs';
import { renderSnapshot } from '../utils';

const mockFooTarget: Target = {
  id: 1,
  jvmId: 'abcd1234',
  agent: false,
  connectUrl: 'service:jmx:rmi://someFooUrl',
  alias: 'fooTarget',
  labels: [],
  annotations: {
    cryostat: [],
    platform: [],
  },
};

jest.spyOn(defaultServices.targets, 'targets').mockReturnValue(of([mockFooTarget]));

jest.spyOn(defaultServices.notificationChannel, 'messages').mockReturnValue(of());

jest.spyOn(defaultServices.api, 'getCurrentReportsForAllTargets').mockReturnValue(
  of([
    {
      target: mockFooTarget,
      hasSources: true,
      report: {
        lastUpdated: 1752088003576,
        aggregate: {
          count: 1,
          max: 75,
        },
        data: [
          {
            key: 'a',
            value: {
              name: 'a',
              topic: 'topic1',
              score: 75,
              evaluation: {
                summary: 'a summary',
                explanation: 'a explanation',
                solution: 'a solution',
                suggestions: [],
              },
            },
          },
        ],
      },
    },
  ]),
);

jest.mock('@app/Recordings/TargetAnalysis', () => {
  return {
    AutomatedAnalysisResults: jest.fn((_) => {
      return <div>Automated Analysis Results</div>;
    }),
  };
});

jest.mock('@app/Topology/Entity/EntityDetails', () => {
  return {
    EntityDetails: jest.fn((_) => {
      return <div>Entity Details</div>;
    }),
  };
});

describe('<Reports />', () => {
  it('renders correctly', async () => {
    const tree = await renderSnapshot({
      routerConfigs: {
        routes: [
          {
            path: '/recordings',
            element: <Reports />,
          },
        ],
      },
    });
    expect(tree?.toJSON()).toMatchSnapshot();
  });
});
