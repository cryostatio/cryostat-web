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
import '@testing-library/jest-dom';
import { authFailMessage } from '@app/ErrorView/types';
import { DeleteActiveRecordings, DeleteOrDisableWarningType } from '@app/Modal/types';
import { ActiveRecordingsTable } from '@app/Recordings/ActiveRecordingsTable';
import {
  emptyActiveRecordingFilters,
  emptyArchivedRecordingFilters,
  TargetRecordingFilters,
} from '@app/Shared/Redux/Filters/RecordingFilterSlice';
import { RootState } from '@app/Shared/Redux/ReduxStore';
import {
  ActiveRecording,
  RecordingState,
  NotificationMessage,
  Target,
  keyValueToString,
  AggregateReport,
} from '@app/Shared/Services/api.types';
import { defaultServices, ServiceContext, Services } from '@app/Shared/Services/Services';
import { TargetService } from '@app/Shared/Services/Target.service';
import dayjs, { defaultDatetimeFormat } from '@i18n/datetime';
import { act, cleanup, screen, within } from '@testing-library/react';
import { NEVER, of, Subject } from 'rxjs';
import { basePreloadedState, DEFAULT_DIMENSIONS, render, renderSnapshot, resize, testT } from '../utils';
import { TargetAnalysis } from '@app/Recordings/TargetAnalysis';

const mockConnectUrl = 'service:jmx:rmi://someUrl';
const mockJvmId = 'id';
const mockTarget = {
  agent: false,
  connectUrl: mockConnectUrl,
  alias: 'fooTarget',
  jvmId: mockJvmId,
  labels: [],
  annotations: { cryostat: [], platform: [] },
};
const mockRecordingLabels = [
  {
    key: 'someLabel',
    value: 'someValue',
  },
];
const mockRecording: ActiveRecording = {
  id: 1,
  name: 'someRecording',
  downloadUrl: 'http://downloadUrl',
  reportUrl: 'http://reportUrl',
  metadata: { labels: mockRecordingLabels },
  startTime: 1234567890,
  state: RecordingState.RUNNING,
  duration: 1000, // 1000ms
  continuous: false,
  toDisk: false,
  maxSize: 0,
  maxAge: 0,
  remoteId: 998877,
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

const mockEmptyReport: AggregateReport = {
  lastUpdated: 1744213233,
  aggregate: {
    count: 0,
    max: 0.0,
  },
  data: [],
};

jest.mock('@app/Dashboard/AutomatedAnalysis/AutomatedAnalysisCardList', () => {
  return {
    ...jest.requireActual('@app/Dashboard/AutomatedAnalysis/AutomatedAnalysisCardList'),
    AutomatedAnalysisCardList: jest.fn(() => {
      return <div>AutomatedAnalysisCardList</div>;
    }),
  };
});

jest.mock('@app/Dashboard/AutomatedAnalysis/ClickableAutomatedAnalysisLabel', () => {
  return {
    ...jest.requireActual('@app/Dashboard/AutomatedAnalysis/ClickableAutomatedAnalysisLabel'),
    ClickableAutomatedAnalysisLabel: jest.fn(() => {
      return <div>ClickableAutomatedAnalysisLabel</div>;
    }),
    ClickableAutomatedAnalysisKey: jest.fn(() => {
      return <div>ClickableAutomatedAnalysisKey</div>;
    }),
  };
});

jest.mock('@app/Dashboard/AutomatedAnalysis/AutomatedAnalysisFilters', () => {
  return {
    ...jest.requireActual('@app/Dashboard/AutomatedAnalysis/AutomatedAnalysisFilters'),
    AutomatedAnalysisFilters: jest.fn(() => {
      return <div>AutomatedAnalysisFilters</div>;
    }),
  };
});

jest.spyOn(defaultServices.settings, 'datetimeFormat').mockReturnValue(of(defaultDatetimeFormat));
jest.spyOn(defaultServices.target, 'target').mockReturnValue(of(mockTarget));
jest.spyOn(defaultServices.api, 'getTargetActiveRecordings').mockReturnValue(of([mockRecording]));
jest.spyOn(defaultServices.api, 'getCurrentReportForTarget').mockReturnValue(of(mockReport));
jest.spyOn(defaultServices.api, 'sendRequest').mockReturnValue(of());
jest.spyOn(defaultServices.notificationChannel, 'messages').mockImplementation((category: string) => {
  switch (category) {
    case 'ReportSuccess':
      return of({
        meta: { category: 'ReportSuccess', type: { type: 'application', subtype: 'json' } },
        message: { jvmId: mockTarget.jvmId },
      });
    default:
      return of();
  }
});

describe('<TargetAnalysis />', () => {
  afterEach(cleanup);

  it('renders correctly', async () => {
    const tree = await renderSnapshot({
      routerConfigs: {
        routes: [
          {
            path: '/',
            element: <TargetAnalysis target={mockTarget} />,
          },
        ],
      },
    });
    expect(tree?.toJSON()).toMatchSnapshot();
  });

  it('renders loading state', async () => {
    jest.spyOn(defaultServices.api, 'getCurrentReportForTarget').mockRestore();
    jest.spyOn(defaultServices.api, 'getCurrentReportForTarget').mockReturnValue(NEVER);
    render({
      routerConfigs: {
        routes: [
          {
            path: '/',
            element: <TargetAnalysis target={mockTarget} />,
          },
        ],
      },
    });

    expect(screen.getByRole('progressbar', { name: 'Contents' })).toBeInTheDocument();
  });

  it('renders empty state', async () => {
    jest.spyOn(defaultServices.api, 'getCurrentReportForTarget').mockRestore();
    jest.spyOn(defaultServices.api, 'getCurrentReportForTarget').mockReturnValue(of(mockEmptyReport));
    render({
      routerConfigs: {
        routes: [
          {
            path: '/',
            element: <TargetAnalysis target={mockTarget} />,
          },
        ],
      },
    });

    expect(screen.getByText(testT('TargetAnalysis.REPORT_UNAVAILABLE'))).toBeInTheDocument();
    expect(screen.queryByText('ClickableAutomatedAnalysisLabel')).not.toBeInTheDocument();
  });
});
