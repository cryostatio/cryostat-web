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

import { JFRMetricsChartController } from '@app/Dashboard/Charts/jfr/JFRMetricsChartController';
import { MBeanMetricsChartController } from '@app/Dashboard/Charts/mbean/MBeanMetricsChartController';
import { EventType } from '@app/Events/EventTypes';
import { Notifications, NotificationsInstance } from '@app/Notifications/Notifications';
import { Rule } from '@app/Rules/Rules';
import {
  ActiveRecording,
  ActiveRecordingFilterInput,
  ApiService,
  ArchivedRecording,
  ChartControllerConfig,
  EventProbe,
  EventTemplate,
  MBeanMetrics,
  Recording,
  RecordingAttributes,
  RecordingState,
  SimpleResponse,
  StoredCredential,
} from '@app/Shared/Services/Api.service';
import { LoginService } from '@app/Shared/Services/Login.service';
import { CachedReportValue, ReportService, RuleEvaluation } from '@app/Shared/Services/Report.service';
import { defaultServices, Services } from '@app/Shared/Services/Services';
import { SettingsService } from '@app/Shared/Services/Settings.service';
import { Target, TargetService } from '@app/Shared/Services/Target.service';
import { Observable, of } from 'rxjs';

export const fakeTarget: Target = {
  jvmId: 'rpZeYNB9wM_TEnXoJvAFuR0jdcUBXZgvkXiKhjQGFvY=',
  connectUrl: 'service:jmx:rmi:///jndi/rmi://10-128-2-25.my-namespace.pod:9097/jmxrmi',
  alias: 'quarkus-test-77f556586c-25bkv',
  labels: {
    'pod-template-hash': '77f556586c',
    deployment: 'quarkus-test',
  },
  annotations: {
    cryostat: {
      HOST: '10.128.2.25',
      PORT: '9097',
      POD_NAME: 'quarkus-test-77f556586c-25bkv',
      REALM: 'KubernetesApi',
      NAMESPACE: 'my-namespace',
    },
    platform: {},
  },
};

export const fakeAARecording: ActiveRecording = {
  name: 'automated-analysis',
  downloadUrl:
    'https://clustercryostat-sample-default.apps.ci-ln-25fg5f2-76ef8.origin-ci-int-aws.dev.rhcloud.com:443/api/v1/targets/service:jmx:rmi:%2F%2F%2Fjndi%2Frmi:%2F%2F10-128-2-27.my-namespace.pod:9097%2Fjmxrmi/recordings/automated-analysis',
  reportUrl:
    'https://clustercryostat-sample-default.apps.ci-ln-25fg5f2-76ef8.origin-ci-int-aws.dev.rhcloud.com:443/api/v1/targets/service:jmx:rmi:%2F%2F%2Fjndi%2Frmi:%2F%2F10-128-2-27.my-namespace.pod:9097%2Fjmxrmi/reports/automated-analysis',
  metadata: {
    labels: {
      'template.name': 'Profiling',
      'template.type': 'TARGET',
      origin: 'automated-analysis',
    },
  },
  startTime: 1680732807,
  id: 0,
  state: RecordingState.RUNNING,
  duration: 0, // Continuous
  continuous: false,
  toDisk: false,
  maxSize: 1048576,
  maxAge: 0,
};

export const fakeEvaluations: RuleEvaluation[] = [
  {
    name: 'Passwords in Environment Variables',
    description: 'The environment variables in the recording may contain passwords.',
    score: 100,
    topic: 'environment_variables',
  },
  {
    name: 'Class Leak',
    description: 'No classes with identical names have been loaded more times than the limit.',
    score: 0,
    topic: 'classloading',
  },
  {
    name: 'Class Loading Pressure',
    description: 'No significant time was spent loading new classes during this recording.',
    score: 0,
    topic: 'classloading',
  },
  {
    name: 'Discouraged Management Agent Settings',
    description: 'Insecure management agent settings: SSL disabled.',
    score: 50,
    topic: 'jvm_information',
  },
  {
    name: 'Thrown Exceptions',
    description: 'The program generated 31.8 exceptions per second during 1.006 s starting at 1/23/45, 6:78:90 AM.',
    score: 0.2,
    topic: 'exceptions',
  },
];

export const fakeCachedReport: CachedReportValue = {
  report: fakeEvaluations,
  timestamp: 1663027200000,
};

class FakeTargetService extends TargetService {
  target(): Observable<Target> {
    return of(fakeTarget);
  }
}

class FakeReportService extends ReportService {
  constructor(notifications: Notifications, login: LoginService) {
    super(login, notifications);
  }

  reportJson(_recording: Recording, _connectUrl: string): Observable<RuleEvaluation[]> {
    return of(fakeEvaluations);
  }

  getCachedAnalysisReport(_connectUrl: string): CachedReportValue {
    return fakeCachedReport;
  }
}

class FakeSetting extends SettingsService {
  chartControllerConfig(
    _defaultConfig = {
      minRefresh: 0.1,
    }
  ): ChartControllerConfig {
    return {
      minRefresh: 0.1,
    };
  }
}

class FakeApiService extends ApiService {
  constructor(target: TargetService, notifications: Notifications, login: LoginService) {
    super(target, notifications, login);
  }

  // MBean Metrics card
  getTargetMBeanMetrics(_target: Target, _queries: string[]): Observable<MBeanMetrics> {
    return of({
      thread: {
        threadCount: Math.ceil(Math.random() * 5),
        daemonThreadCount: Math.ceil(Math.random() * 5),
      },
      os: {
        arch: 'x86_64',
        availableProcessors: Math.ceil(Math.random() * 8),
        version: '10.0.1',
        systemCpuLoad: Math.random(),
        systemLoadAverage: Math.random(),
        processCpuLoad: Math.random(),
        totalPhysicalMemorySize: Math.ceil(Math.random() * 64),
        freePhysicalMemorySize: Math.ceil(Math.random() * 64),
      },
      memory: {
        heapMemoryUsage: {
          init: Math.ceil(Math.random() * 64),
          used: Math.ceil(Math.random() * 64),
          committed: Math.ceil(Math.random() * 64),
          max: Math.ceil(Math.random() * 64),
        },
        nonHeapMemoryUsage: {
          init: Math.ceil(Math.random() * 64),
          used: Math.ceil(Math.random() * 64),
          committed: Math.ceil(Math.random() * 64),
          max: Math.ceil(Math.random() * 64),
        },
        heapMemoryUsagePercent: Math.random(),
      },
      runtime: {
        bootClassPath: '/path/to/boot/classpath',
        classPath: '/path/to/classpath',
        inputArguments: ['-Xmx1g', '-Djava.security.policy=...'],
        libraryPath: '/path/to/library/path',
        managementSpecVersion: '1.0',
        name: 'Java Virtual Machine',
        specName: 'Java Virtual Machine Specification',
        specVendor: 'Oracle Corporation',
        startTime: Date.now(),
        // systemProperties: {...}
        uptime: Date.now(),
        vmName: 'Java HotSpot(TM) 64-Bit Server VM',
        vmVendor: 'Oracle Corporation',
        vmVersion: '25.131-b11',
        bootClassPathSupported: true,
      },
    } as MBeanMetrics);
  }

  // JFR Metrics card
  targetHasRecording(_target: Target, _filter?: ActiveRecordingFilterInput): Observable<boolean> {
    return of(true);
  }

  uploadActiveRecordingToGrafana(_recordingName: string): Observable<boolean> {
    return of(true);
  }

  grafanaDashboardUrl(): Observable<string> {
    return of('https://grafana-url');
  }

  // JVM Detail Cards
  // Note T is expected to array due to its usage in EntityDetail component.
  getTargetActiveRecordings(_target: Target): Observable<ActiveRecording[]> {
    return of([fakeAARecording]);
  }

  getTargetArchivedRecordings(_target: Target): Observable<ArchivedRecording[]> {
    return of([]);
  }

  getTargetEventTemplates(_target: Target): Observable<EventTemplate[]> {
    return of([]);
  }

  getTargetEventTypes(_target: Target): Observable<EventType[]> {
    return of([]);
  }

  getActiveProbesForTarget(
    _target: Target,
    _suppressNotifications?: boolean,
    _skipStatusCheck?: boolean
  ): Observable<EventProbe[]> {
    return of([]);
  }

  getRules(_suppressNotifications?: boolean, _skipStatusCheck?: boolean): Observable<Rule[]> {
    return of([]);
  }

  getCredentials(_suppressNotifications?: boolean, _skipStatusCheck?: boolean): Observable<StoredCredential[]> {
    return of([]);
  }

  // Automatic Analysis Card
  // This fakes the fetch for Automatic Analysis recording to return available.
  // Then subsequent graphql call for archived recording is ignored
  graphql<T>(
    _query: string,
    _variables?: unknown,
    _suppressNotifications?: boolean | undefined,
    _skipStatusCheck?: boolean | undefined
  ): Observable<T> {
    return of({
      data: {
        targetNodes: [
          {
            recordings: {
              active: {
                data: [fakeAARecording],
              },
            },
          },
        ],
      },
    } as T);
  }

  createRecording(_recordingAttributes: RecordingAttributes): Observable<SimpleResponse | undefined> {
    return of({
      ok: true,
      status: 200,
    });
  }

  deleteRecording(_recordingName: string): Observable<boolean> {
    return of(true);
  }
}

const target = new FakeTargetService();
const api = new FakeApiService(target, NotificationsInstance, defaultServices.login);
const reports = new FakeReportService(NotificationsInstance, defaultServices.login);
const settings = new FakeSetting();

export const fakeServices: Services = {
  ...defaultServices,
  target,
  api,
  reports,
  settings,
};

export const fakeChartContext = {
  jfrController: new JFRMetricsChartController(
    fakeServices.api,
    fakeServices.target,
    fakeServices.notificationChannel,
    fakeServices.settings
  ),
  mbeanController: new MBeanMetricsChartController(fakeServices.api, fakeServices.target, fakeServices.settings),
};
