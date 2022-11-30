/*
 * Copyright The Cryostat Authors
 *
 * The Universal Permissive License (UPL), Version 1.0
 *
 * Subject to the condition set forth below, permission is hereby granted to any
 * person obtaining a copy of this software, associated documentation and/or data
 * (collectively the "Software"), free of charge and under any and all copyright
 * rights in the Software, and any and all patent rights owned or freely
 * licensable by each licensor hereunder covering either (i) the unmodified
 * Software as contributed to or provided by such licensor, or (ii) the Larger
 * Works (as defined below), to deal in both
 *
 * (a) the Software, and
 * (b) any piece of software and/or hardware listed in the lrgrwrks.txt file if
 * one is included with the Software (each a "Larger Work" to which the Software
 * is contributed by such licensors),
 *
 * without restriction, including without limitation the rights to copy, create
 * derivative works of, display, perform, and distribute the Software and make,
 * use, sell, offer for sale, import, export, have made, and have sold the
 * Software and the Larger Work(s), and to sublicense the foregoing rights on
 * either these or other terms.
 *
 * This license is subject to the following condition:
 * The above copyright notice and either this complete permission notice or at
 * a minimum a reference to the UPL must be included in all copies or
 * substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */
import { AutomatedAnalysisCard } from '@app/Dashboard/AutomatedAnalysis/AutomatedAnalysisCard';
import { emptyActiveRecordingFilters, emptyArchivedRecordingFilters } from '@app/Recordings/RecordingFilters';
import { TargetRecordingFilters } from '@app/Shared/Redux/RecordingFilterReducer';
import { RootState } from '@app/Shared/Redux/ReduxStore';
import {
  ActiveRecording,
  ArchivedRecording,
  AutomatedAnalysisRecordingConfig,
  defaultAutomatedAnalysisRecordingConfig,
} from '@app/Shared/Services/Api.service';
import {
  CachedReportValue,
  FAILED_REPORT_MESSAGE,
  NO_RECORDINGS_MESSAGE,
  RuleEvaluation,
} from '@app/Shared/Services/Report.service';
import { defaultServices } from '@app/Shared/Services/Services';
import { automatedAnalysisConfigToRecordingAttributes } from '@app/Shared/Services/Settings.service';
import '@testing-library/jest-dom';
import { cleanup, screen } from '@testing-library/react';
import * as React from 'react';
import { of } from 'rxjs';
import { renderWithServiceContextAndReduxStore } from '../../Common';

const mockConnectUrl = 'service:jmx:rmi://someUrl';
const mockTarget = { connectUrl: mockConnectUrl, alias: 'fooTarget' };

const mockEmptyCachedReport: CachedReportValue = {
  report: [],
  timestamp: 0,
};

const mockEvaluations: RuleEvaluation[] = [
  {
    name: 'rule1',
    description: 'rule1 description',
    score: 100,
    topic: 'rule1 topic',
  },
];

const mockRecording = {
  name: 'someRecording',
};

const mockArchivedRecording: ArchivedRecording = {
  name: 'someArchivedRecording',
  downloadUrl: '',
  reportUrl: '',
  metadata: { labels: {} },
  size: 0,
  archivedTime: 1663027200000, // 2022-09-13T00:00:00.000Z in milliseconds
};

const mockRecordingConfig: AutomatedAnalysisRecordingConfig = {
  templates: '',
  maxSize: 0,
  maxAge: 0,
};

const mockTargetNode = {
  recordings: {
    active: {
      data: [mockRecording],
    },
  },
};

const mockActiveRecordingsResponse = {
  data: {
    targetNodes: [mockTargetNode],
  },
};

const mockEmptyActiveRecordingsResponse = {
  data: {
    targetNodes: [
      {
        recordings: {
          active: {
            data: [],
          },
        },
      },
    ],
  },
};

const mockArchivedRecordingsResponse = {
  data: {
    archivedRecordings: {
      data: [mockArchivedRecording],
    },
  },
};

const mockEmptyArchivedRecordingsResponse = {
  data: {
    archivedRecordings: {
      data: [],
    },
  },
};

jest.mock('@app/Dashboard/AutomatedAnalysis/AutomatedAnalysisFilters', () => {
  return {
    ...jest.requireActual('@app/Dashboard/AutomatedAnalysis/AutomatedAnalysisFilters'),
    RecordingFilters: jest.fn(() => {
      return <div>AutomatedAnalysisFilters</div>;
    }),
  };
});

jest.mock('@app/Dashboard/AutomatedAnalysis/Filters/AutomatedAnalysisScoreFilter', () => {
  return {
    ...jest.requireActual('@app/Dashboard/AutomatedAnalysis/Filters/AutomatedAnalysisScoreFilter'),
    RecordingFilters: jest.fn(() => {
      return <div>Score Filter</div>;
    }),
  };
});

jest.mock('@app/Dashboard/AutomatedAnalysis/AutomatedAnalysisConfigDrawer', () => {
  return {
    ...jest.requireActual('@app/Dashboard/AutomatedAnalysis/AutomatedAnalysisConfigDrawer'),
    RecordingFilters: jest.fn(() => {
      return <div>AutomatedAnalysisConfigDrawer</div>;
    }),
  };
});

jest.spyOn(defaultServices.target, 'target').mockReturnValue(of(mockTarget));
jest.spyOn(defaultServices.target, 'authFailure').mockReturnValue(of());

describe('<AutomatedAnalysisCard />', () => {
  let preloadedState: RootState;

  beforeEach(() => {
    preloadedState = {
      recordingFilters: {
        list: [
          {
            target: mockTarget.connectUrl,
            active: {
              selectedCategory: 'Labels',
              filters: emptyActiveRecordingFilters,
            },
            archived: {
              selectedCategory: 'Name',
              filters: emptyArchivedRecordingFilters,
            },
          } as TargetRecordingFilters,
        ],
      },
      automatedAnalysisFilters: {
        state: {
          targetFilters: [],
          globalFilters: {
            filters: {
              Score: 100,
            },
          },
        },
      },
    };
  });

  afterEach(() => {
    cleanup();
    jest.useRealTimers();
  });

  // it('renders correctly', async () => {
  //   const myObservable = timer(0, 200);

  //   jest.spyOn(defaultServices.api, 'graphql').mockReturnValueOnce(of());
  //   jest.spyOn(defaultServices.api, 'graphql').mockReturnValueOnce(of());

  //   jest.spyOn(defaultServices.reports, 'reportJson').mockReturnValueOnce(of());
  //   jest.spyOn(defaultServices.reports, 'getCachedAnalysisReport').mockReturnValueOnce(mockEmptyCachedReport);

  //   renderWithServiceContextAndReduxStore(<AutomatedAnalysisCard pageTitle={'Automated Analysis'} />, {
  //     preloadState: preloadedState,
  //   });

  //   expect(screen.getByText('Automated Analysis')).toBeInTheDocument(); // Card title
  //   expect(screen.getByLabelText('Details')).toBeInTheDocument(); // Expandable content button
  //   expect(screen.getByText('Name')).toBeInTheDocument(); // Default state filter
  //   expect(screen.getByLabelText('Refresh automated analysis')).toBeInTheDocument(); // Refresh button
  //   expect(screen.getByLabelText('Delete automated analysis')).toBeInTheDocument(); // Delete button
  //   expect(screen.getByText('Show N/A scores')).toBeInTheDocument();
  //   expect(screen.getByLabelText('automated-analysis-toolbar')).toBeInTheDocument(); // Toolbar

  //   expect(screen.getByText("Loading")).toBeInTheDocument(); // Loading view

  //   // jest.advanceTimersByTime(0);

  //   myObservable.subscribe(() => {
  //     console.log("SFD")

  //     expect(screen.getByText("Loading")).toBeInTheDocument(); // Loading view

  //   });

  // });

  it('renders report generation error view correctly', async () => {
    jest.spyOn(defaultServices.api, 'graphql').mockReturnValueOnce(of(mockActiveRecordingsResponse));
    jest.spyOn(defaultServices.reports, 'reportJson').mockReturnValueOnce(of());
    renderWithServiceContextAndReduxStore(<AutomatedAnalysisCard pageTitle={'Automated Analysis'} />, {
      preloadState: preloadedState,
    });

    expect(screen.getByText('Automated Analysis Error')).toBeInTheDocument(); // Error view
    expect(screen.getByText(FAILED_REPORT_MESSAGE)).toBeInTheDocument(); // Error message
    expect(screen.getByText('Cryostat was unable to generate an automated analysis report.')).toBeInTheDocument(); // Error details
    expect(screen.getByRole('button', { name: /retry loading report/i })).toBeInTheDocument(); // Retry button
    expect(screen.queryByLabelText('automated-analysis-toolbar')).not.toBeInTheDocument(); // Toolbar
  });

  it('renders empty recordings error view and creates recording when clicked', async () => {
    jest.spyOn(defaultServices.api, 'graphql').mockReturnValueOnce(of(mockEmptyActiveRecordingsResponse));
    jest.spyOn(defaultServices.reports, 'getCachedAnalysisReport').mockReturnValueOnce(mockEmptyCachedReport);
    jest.spyOn(defaultServices.api, 'graphql').mockReturnValueOnce(of(mockEmptyArchivedRecordingsResponse));

    jest.spyOn(defaultServices.api, 'createRecording').mockReturnValueOnce(of());
    const { user } = renderWithServiceContextAndReduxStore(<AutomatedAnalysisCard pageTitle={'Automated Analysis'} />, {
      preloadState: preloadedState,
    });

    const requestSpy = jest.spyOn(defaultServices.api, 'createRecording');

    expect(screen.getByText('Automated Analysis Error')).toBeInTheDocument(); // Error view
    expect(screen.getByText(NO_RECORDINGS_MESSAGE)).toBeInTheDocument(); // Error message
    expect(screen.getByText('Cryostat was unable to generate an automated analysis report.')).toBeInTheDocument(); // Error details
    expect(screen.queryByLabelText('automated-analysis-toolbar')).not.toBeInTheDocument(); // Toolbar

    await user.click(screen.getByRole('button', { name: /recording config dropdown/i }));

    const defaultMenuItem = screen.getByRole('menuitem', {
      name: /default/i,
    });
    const customMenuItem = screen.getByRole('menuitem', {
      name: /custom/i,
    });

    expect(defaultMenuItem).toBeInTheDocument(); // Default recording config
    expect(customMenuItem).toBeInTheDocument(); // Custom recording config

    await user.click(defaultMenuItem);

    expect(requestSpy).toHaveBeenCalledTimes(1);
    expect(requestSpy).toBeCalledWith(
      automatedAnalysisConfigToRecordingAttributes(defaultAutomatedAnalysisRecordingConfig)
    );
  });

  it('renders archived recordings', async () => {
    const mockCurrentDate = new Date('14 Sep 2022 00:00:00 UTC');
    jest.useFakeTimers('modern').setSystemTime(mockCurrentDate);
    jest.spyOn(defaultServices.api, 'graphql').mockReturnValueOnce(of(mockEmptyActiveRecordingsResponse));
    jest.spyOn(defaultServices.reports, 'getCachedAnalysisReport').mockReturnValueOnce(mockEmptyCachedReport);
    jest.spyOn(defaultServices.api, 'graphql').mockReturnValueOnce(of(mockArchivedRecordingsResponse));

    jest.spyOn(defaultServices.reports, 'reportJson').mockReturnValueOnce(of(mockEvaluations));
    jest.spyOn(defaultServices.api, 'createRecording').mockReturnValueOnce(of());
    const { user } = renderWithServiceContextAndReduxStore(<AutomatedAnalysisCard pageTitle={'Automated Analysis'} />, {
      preloadState: preloadedState,
    });
    const requestSpy = jest.spyOn(defaultServices.api, 'createRecording');
    screen.logTestingPlaygroundURL();

    expect(screen.getByText('Automated Analysis')).toBeInTheDocument(); // Card title
    expect(screen.getByLabelText('Details')).toBeInTheDocument(); // Expandable content button
    expect(screen.getByText('Name')).toBeInTheDocument(); // Default state filter
    expect(screen.getByLabelText('Refresh automated analysis')).toBeInTheDocument(); // Refresh button
    expect(screen.getByLabelText('Delete automated analysis')).toBeInTheDocument(); // Delete button
    expect(screen.getByText('Show N/A scores')).toBeInTheDocument();
    expect(screen.getByLabelText('automated-analysis-toolbar')).toBeInTheDocument(); // Toolbar

    const createButton = screen.getByRole('button', {
      name: /create default recording/i,
    });
    expect(createButton).toBeInTheDocument(); // Loading view
    expect(screen.getByText('Showing archived report from from 1 day ago.')).toBeInTheDocument(); // Loading view

    jest.useRealTimers();

    await user.click(createButton);

    expect(requestSpy).toHaveBeenCalledTimes(1);
    expect(requestSpy).toBeCalledWith(
      automatedAnalysisConfigToRecordingAttributes(defaultAutomatedAnalysisRecordingConfig)
    );
  });

  //   it('should show error view if failing to retrieve recordings', async () => {
  //     const subj = new Subject<void>();
  //     const mockTargetSvc = {
  //       target: () => of(mockTarget),
  //       authFailure: () => subj.asObservable(),
  //     } as TargetService;
  //     const services: Services = {
  //       ...defaultServices,
  //       target: mockTargetSvc,
  //     };

  //     renderWithServiceContextAndReduxStore(<ActiveRecordingsTable archiveEnabled={true} />, {
  //       preloadState: preloadedState,
  //       services,
  //     });

  //     await act(async () => subj.next());

  //     const failTitle = screen.getByText('Error retrieving recordings');
  //     expect(failTitle).toBeInTheDocument();
  //     expect(failTitle).toBeVisible();

  //     const authFailText = screen.getByText('Auth failure');
  //     expect(authFailText).toBeInTheDocument();
  //     expect(authFailText).toBeVisible();

  //     const retryButton = screen.getByText('Retry');
  //     expect(retryButton).toBeInTheDocument();
  //     expect(retryButton).toBeVisible();

  //     const toolbar = screen.queryByLabelText('active-recording-toolbar');
  //     expect(toolbar).not.toBeInTheDocument();
  //   });
});
