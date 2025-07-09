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
import { AggregateReport, NotificationCategory, NotificationMessage, Target } from '@app/Shared/Services/api.types';
import { NotificationChannel } from '@app/Shared/Services/NotificationChannel.service';
import { defaultServices, ServiceContext, Services } from '@app/Shared/Services/Services';
import '@testing-library/jest-dom';
import { act as doAct, cleanup, screen } from '@testing-library/react';
import { of, Subject } from 'rxjs';
import { render, renderSnapshot } from '../utils';

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

const mockUpdateNotification: NotificationMessage = {
  meta: {
    type: {
      type: 'application',
      subtype: 'json',
    },
    category: 'ReportSuccess',
  },
  message: {
    jvmId: mockFooTarget.jvmId,
  },
};

const currentReport = {
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
};

jest.spyOn(defaultServices.api, 'getCurrentReportsForAllTargets').mockReturnValue(of([currentReport]));

jest.mock('@app/Recordings/TargetAnalysis', () => {
  return {
    AutomatedAnalysisResults: jest.fn(({ timestamp, analyses }) => {
      return (
        <div>
          <p>Automated Analysis Results</p>
          <div>{timestamp}</div>
          {analyses.map((a) => (
            <div>{JSON.stringify(a[1][0])}</div>
          ))}
        </div>
      );
    }),
  };
});

jest.mock('@app/Topology/Entity/EntityDetails', () => {
  return {
    EntityDetails: jest.fn(({ entity }) => {
      return (
        <div>
          <p>Entity Details</p>
          <div>{entity.getData().name}</div>
        </div>
      );
    }),
  };
});

describe('<Reports />', () => {
  afterEach(cleanup);

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

  it('renders empty state', async () => {
    jest.spyOn(defaultServices.api, 'getCurrentReportsForAllTargets').mockReturnValue(of([]));

    render({
      routerConfigs: {
        routes: [
          {
            path: '/reports',
            element: <Reports />,
          },
        ],
      },
    });

    expect(screen.queryByText(mockFooTarget.alias)).not.toBeInTheDocument();
    expect(screen.queryByText('No Reports Available')).toBeInTheDocument();
  });

  it('updates existing report when receiving a notification', async () => {
    const subj = new Subject<NotificationMessage>();
    const mockNotifications = {
      messages: (category: string) => (category === NotificationCategory.ReportSuccess ? subj.asObservable() : of()),
    } as NotificationChannel;
    const services: Services = {
      ...defaultServices,
      notificationChannel: mockNotifications,
    };
    render({
      routerConfigs: {
        routes: [
          {
            path: '/reports',
            element: <Reports />,
          },
        ],
      },
      providers: [{ kind: ServiceContext.Provider, instance: services }],
    });

    expect(await screen.findByText(mockFooTarget.alias)).toBeInTheDocument();
    expect(await screen.findByText(`${currentReport.report.lastUpdated}`)).toBeInTheDocument();
    expect(await screen.findByText(JSON.stringify(currentReport.report.data[0].value))).toBeInTheDocument();

    const lastUpdated = currentReport.report.lastUpdated + 1;
    const updatedReport: AggregateReport = {
      ...currentReport.report,
      lastUpdated,
    };
    jest.spyOn(defaultServices.api, 'getCurrentReportForTarget').mockReturnValue(of(updatedReport));

    doAct(() => subj.next(mockUpdateNotification));

    expect(await screen.findByText(mockFooTarget.alias)).toBeInTheDocument();
    expect(await screen.findByText(`${lastUpdated}`)).toBeInTheDocument();
    expect(screen.queryByText(`${currentReport.report.lastUpdated}`)).not.toBeInTheDocument();
  });
});
