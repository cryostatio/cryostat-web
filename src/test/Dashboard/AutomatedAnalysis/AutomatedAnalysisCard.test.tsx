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
import { AutomatedAnalysisCard } from '@app/Dashboard/AutomatedAnalysis/AutomatedAnalysisCard';
import { RootState } from '@app/Shared/Redux/ReduxStore';
import { AggregateReport } from '@app/Shared/Services/api.types';
import { defaultServices } from '@app/Shared/Services/Services';
import '@testing-library/jest-dom';
import { cleanup, screen } from '@testing-library/react';
import { of, throwError } from 'rxjs';
import { basePreloadedState, render, renderSnapshot, testT } from '../../utils';

jest.mock('@app/Recordings/TargetAnalysis', () => {
  return {
    ...jest.requireActual('@app/Recordings/TargetAnalysis'),
    TargetAnalysis: jest.fn(() => {
      return <div>TargetAnalysis</div>;
    }),
  };
});

const mockTarget = {
  agent: false,
  connectUrl: 'service:jmx:rmi://someUrl',
  alias: 'fooTarget',
  jvmId: 'foo',
  labels: [],
  annotations: { cryostat: [], platform: [] },
};

const mockReport: AggregateReport = {
  lastUpdated: 1744213233,
  aggregate: {
    count: 1,
    max: 50.0,
  },
  data: [
    {
      key: 'rule',
      value: {
        evaluation: {
          explanation: 'because of test',
          solution: 'nothing',
          suggestions: [
            {
              name: 'try this',
              setting: 'A',
              value: '1234',
            },
          ],
          summary: 'we found something',
        },
        name: 'tests',
        topic: 'testsuite',
        score: 50.0,
      },
    },
  ],
};

jest.spyOn(defaultServices.target, 'target').mockReturnValue(of(mockTarget));

describe('<AutomatedAnalysisCard />', () => {
  let preloadedState: RootState;

  beforeEach(() => {
    preloadedState = {
      ...basePreloadedState,
      automatedAnalysisFilters: {
        targetFilters: [],
        globalFilters: {
          filters: {
            Score: 100,
          },
        },
        _version: '0',
      },
    };
  });

  afterEach(() => {
    cleanup();
    jest.useRealTimers();
  });

  it('renders correctly', async () => {
    jest.spyOn(defaultServices.api, 'doGet').mockReturnValueOnce(of(mockReport));
    const tree = await renderSnapshot({
      routerConfigs: {
        routes: [
          {
            path: '/',
            element: <AutomatedAnalysisCard dashboardId={0} span={0} />,
          },
        ],
      },
    });
    expect(tree?.toJSON()).toMatchSnapshot();
  });

  it('renders report generation error view correctly', async () => {
    jest.spyOn(defaultServices.api, 'doGet').mockReturnValue(throwError(() => 'test error'));
    render({
      routerConfigs: {
        routes: [
          {
            path: '/',
            element: <AutomatedAnalysisCard dashboardId={0} span={0} />,
          },
        ],
      },
      preloadedState: preloadedState,
    });

    expect(screen.getByText(testT('AutomatedAnalysisCard.ERROR_TITLE'))).toBeInTheDocument(); // Error view
    expect(screen.getByText(testT('AutomatedAnalysisCard.ERROR_TEXT'))).toBeInTheDocument(); // Error details
    expect(screen.queryByLabelText(testT('AutomatedAnalysisCard.TOOLBAR.LABEL'))).not.toBeInTheDocument(); // Toolbar
  });

  it('renders Active Recording analysis', async () => {
    jest.spyOn(defaultServices.api, 'doGet').mockReturnValueOnce(of(mockReport));

    render({
      routerConfigs: {
        routes: [
          {
            path: '/',
            element: <AutomatedAnalysisCard dashboardId={0} span={0} />,
          },
        ],
      },
      preloadedState: preloadedState,
    });

    expect(screen.getByText(testT('AutomatedAnalysisCard.CARD_TITLE'))).toBeInTheDocument(); // Card title
    expect(screen.getByText(testT('AutomatedAnalysisCard.WARNING_RESULTS_one', { count: 1 }))).toBeInTheDocument(); // Card header
    expect(screen.getByText('TargetAnalysis')).toBeInTheDocument(); // Card body
  });
});
