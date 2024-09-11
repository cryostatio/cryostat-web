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
import {
  CachedReportValue,
  AnalysisResult,
  ArchivedRecording,
  FAILED_REPORT_MESSAGE,
  NO_RECORDINGS_MESSAGE,
  automatedAnalysisRecordingName,
} from '@app/Shared/Services/api.types';
import { defaultAutomatedAnalysisRecordingConfig } from '@app/Shared/Services/service.types';
import { automatedAnalysisConfigToRecordingAttributes } from '@app/Shared/Services/service.utils';
import { defaultServices } from '@app/Shared/Services/Services';
import '@testing-library/jest-dom';
import { act, cleanup, screen, waitFor, within } from '@testing-library/react';
import { of } from 'rxjs';
import { basePreloadedState, render, testT } from '../../utils';

jest.mock('@app/Dashboard/AutomatedAnalysis/AutomatedAnalysisCardList', () => {
  return {
    ...jest.requireActual('@app/Dashboard/AutomatedAnalysis/AutomatedAnalysisCardList'),
    AutomatedAnalysisCardList: jest.fn(() => {
      return <div>AutomatedAnalysisCardList</div>;
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

const mockEmptyCachedReport: CachedReportValue = {
  report: [],
  timestamp: 0,
};

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
        name: 'rule1 suggestion1 name',
        setting: 'rule1 suggestion1 setting',
        value: 'rule1 suggestion1 value',
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
        name: 'rule2 suggestion1 name',
        setting: 'rule2 suggestion1 setting',
        value: 'rule2 suggestion1 value',
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
        name: 'rule3 suggestion1 name',
        setting: 'rule3 suggestion1 setting',
        value: 'rule3 suggestion1 value',
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
        name: 'NArule suggestion1 name',
        setting: 'NArule suggestion1 setting',
        value: 'NArule suggestion1 value',
      },
    ],
  },
};

const mockEvaluations: AnalysisResult[] = [mockRuleEvaluation1];

const mockFilteredEvaluations: AnalysisResult[] = [
  mockRuleEvaluation1,
  mockRuleEvaluation2,
  mockRuleEvaluation3,
  mockNaRuleEvaluation,
];

const mockRecording = {
  name: 'someRecording',
};

const mockArchivedRecording: ArchivedRecording = {
  name: 'someArchivedRecording',
  downloadUrl: '',
  reportUrl: '',
  metadata: { labels: [] },
  size: 0,
  archivedTime: 1663027200000, // 2022-09-13T00:00:00.000Z in milliseconds
};

const mockCachedReport: CachedReportValue = {
  report: [mockRuleEvaluation1, mockRuleEvaluation2],
  timestamp: 1663027200000, // 2022-09-13T00:00:00.000Z in milliseconds
};

const mockTargetNode = {
  activeRecordings: {
    data: [mockRecording],
  },
};

const mockActiveRecordingsResponse = {
  data: {
    targetNodes: [{ target: mockTargetNode }],
  },
};

const mockEmptyActiveRecordingsResponse = {
  data: {
    targetNodes: [
      {
        target: {
          activeRecordings: {
            data: [],
          },
        },
      },
    ],
  },
};

const mockArchivedRecordingsResponse = {
  data: {
    targetNodes: [
      {
        target: {
          archivedRecordings: {
            data: [mockArchivedRecording],
          },
        },
      },
    ],
  },
};

const mockEmptyArchivedRecordingsResponse = {
  data: {
    targetNodes: [
      {
        target: {
          archivedRecordings: {
            data: [],
          },
        },
      },
    ],
  },
};

jest.spyOn(defaultServices.target, 'target').mockReturnValue(of(mockTarget));
jest.spyOn(defaultServices.target, 'authFailure').mockReturnValue(of());
jest.spyOn(defaultServices.target, 'authRetry').mockReturnValue(of());
jest
  .spyOn(defaultServices.settings, 'automatedAnalysisRecordingConfig')
  .mockReturnValue(defaultAutomatedAnalysisRecordingConfig);

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

  it('renders report generation error view correctly', async () => {
    jest.spyOn(defaultServices.api, 'graphql').mockReturnValueOnce(of(mockActiveRecordingsResponse));
    jest.spyOn(defaultServices.reports, 'reportJson').mockReturnValueOnce(of());
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
    expect(screen.getByText(FAILED_REPORT_MESSAGE)).toBeInTheDocument(); // Error message
    expect(screen.getByText(testT('AutomatedAnalysisCard.ERROR_TEXT'))).toBeInTheDocument(); // Error details
    expect(screen.getByRole('button', { name: testT('AutomatedAnalysisCard.RETRY_LOADING') })).toBeInTheDocument(); // Retry button
    expect(screen.queryByLabelText(testT('AutomatedAnalysisCard.TOOLBAR.LABEL'))).not.toBeInTheDocument(); // Toolbar
  });

  it('renders empty Recordings error view and creates Recording when clicked', async () => {
    jest.spyOn(defaultServices.api, 'graphql').mockReturnValueOnce(of(mockEmptyActiveRecordingsResponse));
    jest.spyOn(defaultServices.reports, 'getCachedAnalysisReport').mockReturnValueOnce(mockEmptyCachedReport);
    jest.spyOn(defaultServices.api, 'graphql').mockReturnValueOnce(of(mockEmptyArchivedRecordingsResponse));

    const requestSpy = jest.spyOn(defaultServices.api, 'createRecording').mockReturnValueOnce(of());
    const { user } = render({
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
    expect(screen.getByText(NO_RECORDINGS_MESSAGE)).toBeInTheDocument(); // Error message
    expect(screen.getByText(testT('AutomatedAnalysisCard.ERROR_TEXT'))).toBeInTheDocument(); // Error details
    expect(screen.queryByLabelText(testT('AutomatedAnalysisCard.TOOLBAR.LABEL'))).not.toBeInTheDocument(); // Toolbar

    await user.click(
      screen.getByRole('button', { name: testT('AutomatedAnalysisConfigDrawer.INPUT_GROUP.CREATE_RECORDING.LABEL') }),
    );

    expect(requestSpy).toHaveBeenCalledTimes(1);
    expect(requestSpy).toBeCalledWith(
      automatedAnalysisConfigToRecordingAttributes(defaultAutomatedAnalysisRecordingConfig),
    );
  });

  it('renders Active Recording analysis', async () => {
    jest.spyOn(defaultServices.api, 'graphql').mockReturnValueOnce(of(mockActiveRecordingsResponse));

    jest.spyOn(defaultServices.reports, 'reportJson').mockReturnValueOnce(of(mockEvaluations));
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
    expect(screen.getByLabelText('Details')).toBeInTheDocument(); // Expandable content button
    expect(screen.getByText(testT('NAME', { ns: 'common' }))).toBeInTheDocument(); // Default state filter
    const refreshButton = screen.getByRole('button', {
      // Refresh button
      name: testT('AutomatedAnalysisCard.TOOLBAR.REFRESH.LABEL'),
    });
    expect(refreshButton).toBeInTheDocument();
    expect(refreshButton).not.toBeDisabled();
    const deleteButton = screen.getByRole('button', {
      // Delete button
      name: testT('AutomatedAnalysisCard.TOOLBAR.DELETE.LABEL'),
    });
    expect(deleteButton).toBeInTheDocument();
    expect(deleteButton).not.toBeDisabled();
    expect(screen.getByText(testT('AutomatedAnalysisCard.TOOLBAR.CHECKBOX.SHOW_NA.LABEL'))).toBeInTheDocument();
    expect(screen.getByLabelText(testT('AutomatedAnalysisCard.TOOLBAR.LABEL'))).toBeInTheDocument(); // Toolbar

    expect(screen.getByText(`Active report name=${mockRecording.name}`)).toBeInTheDocument(); // Active report name
    expect(screen.queryByText('Most recent data')).not.toBeInTheDocument(); // Last updated text

    expect(
      screen.queryByRole('button', {
        name: testT('AutomatedAnalysisConfigDrawer.INPUT_GROUP.CREATE_RECORDING.LABEL'),
      }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', {
        name: testT('AutomatedAnalysisConfigDrawer.INPUT_GROUP.OPEN_SETTINGS.LABEL'),
      }),
    ).not.toBeInTheDocument();

    mockEvaluations.forEach((evaluation) => {
      expect(screen.getByText(evaluation.name)).toBeInTheDocument();
      expect(screen.getByText(evaluation.topic)).toBeInTheDocument();
    });
  });

  it('renders Archived Recording analysis', async () => {
    const mockCurrentDate = new Date('14 Sep 2022 00:00:00 UTC');
    jest.useFakeTimers('modern').setSystemTime(mockCurrentDate);
    jest.spyOn(defaultServices.api, 'graphql').mockReturnValueOnce(of(mockEmptyActiveRecordingsResponse));
    jest.spyOn(defaultServices.reports, 'getCachedAnalysisReport').mockReturnValueOnce(mockEmptyCachedReport);
    jest.spyOn(defaultServices.api, 'graphql').mockReturnValueOnce(of(mockArchivedRecordingsResponse));

    jest.spyOn(defaultServices.reports, 'reportJson').mockReturnValueOnce(of(mockEvaluations));
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
    expect(screen.getByLabelText('Details')).toBeInTheDocument(); // Expandable content button
    expect(screen.getByText(testT('NAME', { ns: 'common' }))).toBeInTheDocument(); // Default state filter
    const refreshButton = screen.getByRole('button', {
      // Refresh button
      name: testT('AutomatedAnalysisCard.TOOLBAR.REFRESH.LABEL'),
    });
    expect(refreshButton).toBeInTheDocument();
    expect(refreshButton).toBeDisabled();
    const deleteButton = screen.getByRole('button', {
      // Delete button
      name: testT('AutomatedAnalysisCard.TOOLBAR.DELETE.LABEL'),
    });
    expect(deleteButton).toBeInTheDocument();
    expect(deleteButton).not.toBeDisabled();
    expect(screen.getByText(testT('AutomatedAnalysisCard.TOOLBAR.CHECKBOX.SHOW_NA.LABEL'))).toBeInTheDocument();
    expect(screen.getByLabelText(testT('AutomatedAnalysisCard.TOOLBAR.LABEL'))).toBeInTheDocument(); // Toolbar

    expect(screen.getByText(`Archived report name=${mockArchivedRecording.name}`)).toBeInTheDocument(); // Archived report name
    expect(
      screen.getByText(testT('AutomatedAnalysisCard.STALE_REPORT.TEXT', { count: 1, units: 'day' })),
    ).toBeInTheDocument(); // Last updated text

    expect(
      screen.getByRole('button', {
        name: testT('AutomatedAnalysisConfigDrawer.INPUT_GROUP.CREATE_RECORDING.LABEL'),
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', {
        name: testT('AutomatedAnalysisConfigDrawer.INPUT_GROUP.OPEN_SETTINGS.LABEL'),
      }),
    ).toBeInTheDocument();

    mockEvaluations.forEach((evaluation) => {
      expect(screen.getByText(evaluation.name)).toBeInTheDocument();
      expect(screen.getByText(evaluation.topic)).toBeInTheDocument();
    });
  });

  it('renders cached Recording analysis', async () => {
    const mockCurrentDate = new Date('15 Sep 2022 00:00:00 UTC'); // 2 days after the cached recording
    jest.useFakeTimers('modern').setSystemTime(mockCurrentDate);
    jest.spyOn(defaultServices.api, 'graphql').mockReturnValueOnce(of(mockEmptyActiveRecordingsResponse));
    jest.spyOn(defaultServices.reports, 'getCachedAnalysisReport').mockReturnValueOnce(mockCachedReport);

    // set global filter Score = 0 to render all rules
    const newPreloadedState = {
      ...preloadedState,
      automatedAnalysisFilters: {
        _version: '0',
        targetFilters: [],
        globalFilters: {
          filters: {
            Score: 0,
          },
        },
      },
    };

    render({
      routerConfigs: {
        routes: [
          {
            path: '/',
            element: <AutomatedAnalysisCard dashboardId={0} span={0} />,
          },
        ],
      },
      preloadedState: newPreloadedState,
    });

    expect(screen.getByText(testT('AutomatedAnalysisCard.CARD_TITLE'))).toBeInTheDocument(); // Card title
    expect(screen.getByLabelText('Details')).toBeInTheDocument(); // Expandable content button
    expect(screen.getByText(testT('NAME', { ns: 'common' }))).toBeInTheDocument(); // Default state filter
    const refreshButton = screen.getByRole('button', {
      // Refresh button
      name: testT('AutomatedAnalysisCard.TOOLBAR.REFRESH.LABEL'),
    });
    expect(refreshButton).toBeInTheDocument();
    expect(refreshButton).toBeDisabled();
    const deleteButton = screen.getByRole('button', {
      // Delete button
      name: testT('AutomatedAnalysisCard.TOOLBAR.DELETE.LABEL'),
    });
    expect(deleteButton).toBeInTheDocument();
    expect(deleteButton).not.toBeDisabled();
    expect(screen.getByText(testT('AutomatedAnalysisCard.TOOLBAR.CHECKBOX.SHOW_NA.LABEL'))).toBeInTheDocument();
    expect(screen.getByLabelText(testT('AutomatedAnalysisCard.TOOLBAR.LABEL'))).toBeInTheDocument(); // Toolbar

    expect(screen.getByText(`Cached report name=${automatedAnalysisRecordingName}`)).toBeInTheDocument(); // Cached report name
    expect(screen.getByText('Most recent data from 2 days ago.')).toBeInTheDocument(); // Last updated text

    expect(
      screen.getByRole('button', {
        name: testT('AutomatedAnalysisConfigDrawer.INPUT_GROUP.CREATE_RECORDING.LABEL'),
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', {
        name: testT('AutomatedAnalysisConfigDrawer.INPUT_GROUP.OPEN_SETTINGS.LABEL'),
      }),
    ).toBeInTheDocument();

    mockCachedReport.report.forEach((evaluation) => {
      expect(screen.getByText(evaluation.name)).toBeInTheDocument();
      expect(screen.getByText(evaluation.topic)).toBeInTheDocument();
    });
  });

  it('filters correctly', async () => {
    jest.spyOn(defaultServices.api, 'graphql').mockReturnValueOnce(of(mockActiveRecordingsResponse));

    jest.spyOn(defaultServices.reports, 'reportJson').mockReturnValueOnce(of(mockFilteredEvaluations));
    const { user, container } = render({
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

    expect(screen.getByText(mockRuleEvaluation1.name)).toBeInTheDocument(); // Score: 100
    expect(screen.queryByText(mockRuleEvaluation2.name)).not.toBeInTheDocument(); // Score: 0
    expect(screen.queryByText(mockRuleEvaluation3.name)).not.toBeInTheDocument(); // Score: 55
    expect(screen.queryByText(mockNaRuleEvaluation.name)).not.toBeInTheDocument(); // Score: -1

    const showNAScores = screen.getByRole('checkbox', {
      name: testT('AutomatedAnalysisCard.TOOLBAR.CHECKBOX.SHOW_NA.LABEL'),
    });

    await user.click(showNAScores);

    expect(screen.getByText(mockRuleEvaluation1.name)).toBeInTheDocument(); // Score: 100
    expect(screen.queryByText(mockRuleEvaluation2.name)).not.toBeInTheDocument(); // Score: 0
    expect(screen.queryByText(mockRuleEvaluation3.name)).not.toBeInTheDocument(); // Score: 55
    expect(screen.queryByText(mockNaRuleEvaluation.name)).toBeInTheDocument(); // Score: -1

    const spinner = screen.getByRole('spinbutton', {
      name: /slider value input/i,
    });

    await user.clear(spinner);
    await waitFor(() => expect(spinner).toHaveValue(0));
    await user.click(spinner);
    await user.keyboard('{Enter}');

    mockFilteredEvaluations.forEach((evaluation) => {
      // all rules
      expect(screen.getByText(evaluation.name)).toBeInTheDocument();
      expect(screen.getByText(evaluation.topic)).toBeInTheDocument();
    });

    const filterToggle = screen.getByText(testT('NAME', { ns: 'common' }));

    await act(async () => {
      await user.click(filterToggle);
    });

    const selectMenu = await screen.findByRole('menu');
    expect(selectMenu).toBeInTheDocument();
    expect(selectMenu).toBeVisible();

    const topic = within(selectMenu).getByText('Topic');

    await act(async () => {
      await user.click(topic);
    });

    await waitFor(() => expect(selectMenu).not.toBeInTheDocument());

    const filterByTopic = container.querySelector("input[placeholder='Filter by topic...']") as HTMLInputElement;

    await act(async () => {
      await user.type(filterByTopic, 'fakeTopic');
    });

    const optionMenu = await screen.findByRole('listbox');
    expect(optionMenu).toBeInTheDocument();
    expect(optionMenu).toBeVisible();

    await act(async () => {
      await user.click(within(optionMenu).getByText(/faketopic/i));
    });

    await waitFor(() => expect(optionMenu).not.toBeInTheDocument());

    mockFilteredEvaluations
      .filter((evaluation) => evaluation.topic == 'fakeTopic')
      .forEach((evaluation) => {
        // all rules
        expect(screen.getByText(evaluation.name)).toBeInTheDocument();
      });

    expect(screen.queryByText(mockRuleEvaluation1.name)).not.toBeInTheDocument(); // Score: 100
  });

  it('renders list view correctly', async () => {
    jest.spyOn(defaultServices.api, 'graphql').mockReturnValueOnce(of(mockActiveRecordingsResponse));
    jest.spyOn(defaultServices.reports, 'reportJson').mockReturnValueOnce(of(mockFilteredEvaluations));

    const { user } = render({
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

    const listViewToggle = screen.getByText('List view');
    expect(listViewToggle).toBeInTheDocument();
    expect(listViewToggle).toBeVisible();

    expect(screen.queryByText('AutomatedAnalysisCardList')).not.toBeInTheDocument(); // Mocked list view

    await user.click(listViewToggle);

    expect(screen.getByText('AutomatedAnalysisCardList')).toBeInTheDocument();
  });
});
