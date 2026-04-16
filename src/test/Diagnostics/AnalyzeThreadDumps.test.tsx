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

import ThreadDumpAnalysis from '@app/Diagnostics/Analysis/ThreadDumpAnalysis';
import { ThemeSetting } from '@app/Settings/types';
import { RootState } from '@app/Shared/Redux/ReduxStore';
import { Target, ThreadDump, ThreadDumpAnalysisResult } from '@app/Shared/Services/api.types';
import { defaultServices } from '@app/Shared/Services/Services';
import { cleanup, screen, within, act } from '@testing-library/react';
import { of } from 'rxjs';
import { basePreloadedState, DEFAULT_DIMENSIONS, mockMediaQueryList, render, resize } from '../utils';

const mockNewConnectUrl = 'service:jmx:rmi://someNewUrl';
const mockNewAlias = 'target';
const mockTarget: Target = {
  agent: false,
  jvmId: 'target',
  connectUrl: mockNewConnectUrl,
  alias: mockNewAlias,
  labels: [],
  annotations: {
    cryostat: [],
    platform: [],
  },
};

const mockThreadDump: ThreadDump = {
  downloadUrl: 'someDownloadUrl',
  threadDumpId: 'someUuid',
  jvmId: mockTarget.jvmId,
  size: 1,
  metadata: { labels: [{ key: 'someLabel', value: 'someUpdatedValue' }] },
};

const mockThreadDumpAnalysis: ThreadDumpAnalysisResult = {
  aggregateThreadStates: [
    {
      data: 'WAITING',
      count: 10,
    },
  ],
  aggregateLockInfo: [
    {
      data: 'SomeLockInstance',
      count: 12,
    },
    {
      data: 'someOtherLockInstance',
      count: 34,
    },
  ],
  aggregateStackTraces: [
    {
      data: [
        {
          className: 'someClass',
          methodName: 'someMethod',
          fileName: 'someFile',
          lineNumber: 123,
          nativeMethod: false,
        },
      ],
      count: 100,
    },
    {
      data: [
        {
          className: 'someOtherClass',
          methodName: 'someOtherMethod',
          fileName: 'someOtherFile',
          lineNumber: 456,
          nativeMethod: false,
        },
      ],
      count: 100,
    },
  ],
  runningMethods: [
    {
      data: 'someMethod',
      count: 100,
    },
    {
      data: 'someOtherMethod',
      count: 100,
    },
  ],
  deadlockInfos: [
    {
      threadName: 'someThread',
      waitingForMonitor: 'someMonitor',
      waitingForObject: 'someObject',
      waitingForObjectType: 'someObjectType',
      heldBy: 'someOtherThread',
      stackTrace: [
        {
          className: 'someClass',
          methodName: 'someMethod',
          fileName: 'someFile',
          lineNumber: 123,
          nativeMethod: false,
        },
      ],
      locks: [
        {
          lockId: 'someLockId',
          className: 'someClass',
          operation: 'someOperation',
          ownerThreadId: '2',
        },
      ],
    },
  ],
  threads: [
    {
      name: 'someThread',
      threadId: 1,
      nativeId: 1,
      priority: 1,
      daemon: true,
      state: 'WAITING',
      cpuTimeSec: 24,
      elapsedTimeSec: 24,
      stackTrace: [
        {
          className: 'someClass',
          methodName: 'someMethod',
          fileName: 'someFile',
          lineNumber: 123,
          nativeMethod: false,
        },
      ],
      locks: [
        {
          lockId: 'someLockId',
          className: 'someClass',
          operation: 'someOperation',
          ownerThreadId: '2',
        },
      ],
      additionalInfo: 'someAdditionalInfo',
      carryingVirtualThreadId: 1,
    },
  ],
  specificFindings: [
    {
      resultName: 'someResult',
      explanation: 'This is an explanation',
      score: 0,
    },
  ],
  jniInfo: {
    globalRefs: 1,
    weakRefs: 2,
    globalRefsMemory: 100,
    weakRefsMemory: 200,
  },
  jvmInfo: 'someJvmInfo',
};

jest.spyOn(defaultServices.api, 'getTargetThreadDumps').mockReturnValue(of([mockThreadDump]));

jest.spyOn(defaultServices.api, 'getThreadDumps').mockReturnValue(of([mockThreadDump]));

jest.spyOn(defaultServices.target, 'target').mockReturnValue(of(mockTarget));

jest.spyOn(defaultServices.targets, 'targets').mockReturnValue(of([mockTarget]));

jest.spyOn(defaultServices.notificationChannel, 'messages').mockReturnValue(of());

jest.spyOn(defaultServices.target, 'authFailure').mockReturnValue(of());

jest.spyOn(defaultServices.settings, 'themeSetting').mockReturnValue(of(ThemeSetting.DARK));
jest.spyOn(defaultServices.settings, 'media').mockReturnValue(of(mockMediaQueryList));

describe('<ThreadDumpAnalysis />', () => {
  let preloadedState: RootState;

  beforeAll(async () => {
    await act(async () => {
      resize(2400, 1080);
    });
  });

  beforeEach(() => {
    preloadedState = {
      ...basePreloadedState,
    };
  });

  afterEach(cleanup);

  afterAll(() => {
    resize(DEFAULT_DIMENSIONS[0], DEFAULT_DIMENSIONS[1]);
  });

  it('renders empty state', async () => {
    jest.spyOn(defaultServices.api, 'analyzeThreadDump').mockReturnValue(of());

    render({
      routerConfigs: {
        routes: [
          {
            path: '/analyze-thread-dumps',
            element: <ThreadDumpAnalysis />,
          },
        ],
      },
      preloadedState: preloadedState,
    });

    expect(screen.getByRole('heading', { name: 'Select a Thread Dump to Analyze' })).toBeInTheDocument();
  });

  it('should render the page correctly', async () => {
    jest.spyOn(defaultServices.api, 'analyzeThreadDump').mockReturnValue(of(mockThreadDumpAnalysis));
    const { user } = render({
      routerConfigs: {
        routes: [
          {
            path: '/analyze-thread-dumps',
            element: <ThreadDumpAnalysis />,
          },
        ],
      },
      preloadedState: preloadedState,
    });

    const dropDownArrow = screen.getByRole('button', { name: 'thread dump selector toggle' });
    expect(dropDownArrow).toBeInTheDocument();
    expect(dropDownArrow).toBeVisible();

    await act(async () => {
      await user.click(dropDownArrow);
    });

    const selectMenu = await screen.findByRole('menu');
    expect(selectMenu).toBeInTheDocument();
    expect(selectMenu).toBeVisible();

    const option = within(selectMenu).getByText(mockThreadDump.threadDumpId);
    expect(option).toBeInTheDocument();
    expect(option).toBeVisible();

    await act(async () => {
      await user.click(screen.getByText(mockThreadDump.threadDumpId));
    });

    // Thread Table
    [
      'Name',
      'Thread ID',
      'Native ID',
      'Virtual Thread ID',
      'Priority',
      'Daemon',
      'State',
      'CPU Time',
      'Elapsed Time',
      'Additional Info',
    ].map((text) => {
      const header = screen.getByText(text);
      expect(header).toBeInTheDocument();
      expect(header).toBeVisible();
    });

    // Findings Table
    ['Result', 'Explanation', 'Score'].map((text) => {
      const header = screen.getByText(text);
      expect(header).toBeInTheDocument();
      expect(header).toBeVisible();
    });

    // Deadlocks Table
    ['Thread Name', 'Waiting for Monitor', 'Waiting for Object', 'Waiting for Type', 'Held By'].map((text) => {
      const header = screen.getByText(text);
      expect(header).toBeInTheDocument();
      expect(header).toBeVisible();
    });

    const threadStateChart = screen.getByTitle('Thread States');
    expect(threadStateChart).toBeInTheDocument();

    const locksChart = screen.getByTitle('Lock Instances');
    expect(locksChart).toBeInTheDocument();

    const methodsChart = screen.getByTitle('Running Methods');
    expect(methodsChart).toBeInTheDocument();
  });

  it('expands deadlocks to show their stack traces and locks', async () => {
    jest.spyOn(defaultServices.api, 'analyzeThreadDump').mockReturnValue(of(mockThreadDumpAnalysis));

    const { user } = render({
      routerConfigs: {
        routes: [
          {
            path: '/analyze-thread-dumps',
            element: <ThreadDumpAnalysis />,
          },
        ],
      },
      preloadedState: preloadedState,
    });

    const dropDownArrow = screen.getByRole('button', { name: 'thread dump selector toggle' });
    expect(dropDownArrow).toBeInTheDocument();
    expect(dropDownArrow).toBeVisible();

    await act(async () => {
      await user.click(dropDownArrow);
    });

    const selectMenu = await screen.findByRole('menu');
    expect(selectMenu).toBeInTheDocument();
    expect(selectMenu).toBeVisible();

    const option = within(selectMenu).getByText(mockThreadDump.threadDumpId);
    expect(option).toBeInTheDocument();
    expect(option).toBeVisible();

    await act(async () => {
      await user.click(screen.getByText(mockThreadDump.threadDumpId));
    });

    let tableBody = screen.getAllByRole('rowgroup')[3];
    let rows = within(tableBody).getAllByRole('row');
    expect(rows).toHaveLength(1);

    const target = rows[0];
    const expand = within(target).getByLabelText('Details');
    await user.click(expand);

    tableBody = screen.getAllByRole('rowgroup')[4];
    rows = within(tableBody).getAllByRole('row');
    expect(rows).toHaveLength(1);

    const stackTraceTable = rows[0];
    ['File Name', 'Class Name', 'Method Name', 'Line Number', 'Native Method'].map((text) => {
      const header = within(stackTraceTable).getByText(text);
      expect(header).toBeInTheDocument();
      expect(header).toBeVisible();
    });

    tableBody = screen.getAllByRole('rowgroup')[6];
    rows = within(tableBody).getAllByRole('row');
    expect(rows).toHaveLength(1);

    const locksTable = rows[0];
    ['Lock ID', 'Class Name', 'Operation', 'Owner Thread Id'].map((text) => {
      const header = within(locksTable).getByText(text);
      expect(header).toBeInTheDocument();
      expect(header).toBeVisible();
    });
  });

  it('expands threads to show their stack traces and locks', async () => {
    jest.spyOn(defaultServices.api, 'analyzeThreadDump').mockReturnValue(of(mockThreadDumpAnalysis));

    const { user } = render({
      routerConfigs: {
        routes: [
          {
            path: '/analyze-thread-dumps',
            element: <ThreadDumpAnalysis />,
          },
        ],
      },
      preloadedState: preloadedState,
    });

    const dropDownArrow = screen.getByRole('button', { name: 'thread dump selector toggle' });
    expect(dropDownArrow).toBeInTheDocument();
    expect(dropDownArrow).toBeVisible();

    await act(async () => {
      await user.click(dropDownArrow);
    });

    const selectMenu = await screen.findByRole('menu');
    expect(selectMenu).toBeInTheDocument();
    expect(selectMenu).toBeVisible();

    const option = within(selectMenu).getByText(mockThreadDump.threadDumpId);
    expect(option).toBeInTheDocument();
    expect(option).toBeVisible();

    await act(async () => {
      await user.click(screen.getByText(mockThreadDump.threadDumpId));
    });

    let tableBody = screen.getAllByRole('rowgroup')[5];
    let rows = within(tableBody).getAllByRole('row');
    expect(rows).toHaveLength(1);

    const target = rows[0];
    const expand = within(target).getByLabelText('Details');
    await user.click(expand);

    tableBody = screen.getAllByRole('rowgroup')[6];
    rows = within(tableBody).getAllByRole('row');
    expect(rows).toHaveLength(1);

    const stackTraceTable = rows[0];
    ['File Name', 'Class Name', 'Method Name', 'Line Number', 'Native Method'].map((text) => {
      const header = within(stackTraceTable).getByText(text);
      expect(header).toBeInTheDocument();
      expect(header).toBeVisible();
    });

    tableBody = screen.getAllByRole('rowgroup')[8];
    rows = within(tableBody).getAllByRole('row');
    expect(rows).toHaveLength(1);

    const locksTable = rows[0];
    ['Lock ID', 'Class Name', 'Operation', 'Owner Thread Id'].map((text) => {
      const header = within(locksTable).getByText(text);
      expect(header).toBeInTheDocument();
      expect(header).toBeVisible();
    });
  });
});
