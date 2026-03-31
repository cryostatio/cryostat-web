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
import { DiagnosticsCard } from '@app/Dashboard/Diagnostics/DiagnosticsCard';
import { TargetView } from '@app/TargetView/TargetView';
import {
  Card,
  CardTitle,
  EmptyState,
  EmptyStateHeader,
  EmptyStateIcon,
  Grid,
  GridItem,
  Text,
  TextListItem,
} from '@patternfly/react-core';
import * as React from 'react';
import { ThreadDumpSelector } from './ThreadDumpSelector';
import {
  AnalysisFinding,
  DeadlockInfo,
  NotificationCategory,
  Target,
  ThreadDump,
  ThreadDumpAnalysisResult,
  ThreadInfo,
} from '@app/Shared/Services/api.types';
import { ServiceContext } from '@app/Shared/Services/Services';
import { useSubscriptions } from '@app/utils/hooks/useSubscriptions';
import { concatMap, first, of } from 'rxjs';
import { AggregateDataCard } from './AggregateDataCard.tsx';
import { SearchIcon } from '@patternfly/react-icons';
import { Table, TableVariant, Tbody, Td, Th, Thead, Tr } from '@patternfly/react-table';
import { TableColumn } from '@app/utils/utils';

export interface ThreadDumpAnalysisProps {}

export const ThreadDumpAnalysis: React.FC<ThreadDumpAnalysisProps> = ({ ...props }) => {
  const context = React.useContext(ServiceContext);
  const addSubscription = useSubscriptions();

  const [threadDumps, setThreadDumps] = React.useState<ThreadDump[]>([]);
  const [analysisResult, setAnalysisResult] = React.useState<ThreadDumpAnalysisResult>();
  const [isLoading, setIsLoading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState('');
  const [selectedThreadDump, setSelectedThreadDump] = React.useState('');

  const threadColumns: TableColumn[] = [
    {
      title: 'Thread Name',
      keyPaths: ['name'],
      sortable: true,
    },
    {
      title: 'Thread ID',
      keyPaths: ['threadId'],
      sortable: true,
    },
    {
      title: 'Native ID',
      keyPaths: ['nativeId'],
      sortable: true,
    },
    {
      title: 'Virtual Thread ID',
      keyPaths: ['carryingVirtualThreadId'],
      sortable: true,
    },
    {
      title: 'Priority',
      keyPaths: ['priority'],
      sortable: true,
    },
    {
      title: 'Daemon',
      keyPaths: ['daemon'],
      sortable: true,
    },
    {
      title: 'State',
      keyPaths: ['state'],
      sortable: true,
    },
    {
      title: 'CPU Time',
      keyPaths: ['cpuTimeSec'],
      sortable: true,
    },
    {
      title: 'Elapsed Time',
      keyPaths: ['elapsedTimeSec'],
      sortable: true,
    },
    {
      title: 'Additional Info',
      keyPaths: ['additionalInfo'],
      sortable: true,
    },
    {
      title: 'Stack Trace',
      keyPaths: ['stackTrace'],
      sortable: true,
    },
    {
      title: 'Locks Held',
      keyPaths: ['locks'],
      sortable: true,
    },
  ];

  const threadRows = React.useMemo(() => {
    return analysisResult?.threads.map((t: ThreadInfo) => {
      <Tr key={`threads`}>
        <Td key={`thread-name`} dataLabel={threadColumns[0].title}>
          {t.name}
        </Td>
        <Td key={`thread-id`} dataLabel={threadColumns[1].title}>
          {t.threadId}
        </Td>
        <Td key={`thread-native-id`} dataLabel={threadColumns[2].title}>
          {t.nativeId}
        </Td>
        <Td key={`thread--virtual-id`} dataLabel={threadColumns[3].title}>
          {t.carryingVirtualThreadId}
        </Td>
        <Td key={`thread-priority`} dataLabel={threadColumns[4].title}>
          {t.priority}
        </Td>
        <Td key={`thread-daemon`} dataLabel={threadColumns[5].title}>
          {t.daemon}
        </Td>
        <Td key={`thread-state`} dataLabel={threadColumns[6].title}>
          {t.state}
        </Td>
        <Td key={`thread-cpu-time`} dataLabel={threadColumns[7].title}>
          {t.cpuTimeSec}
        </Td>
        <Td key={`thread-elapsed`} dataLabel={threadColumns[8].title}>
          {t.elapsedTimeSec}
        </Td>
        <Td key={`thread-additional-info`} dataLabel={threadColumns[9].title}>
          {t.additionalInfo}
        </Td>
        <Td key={`thread-stack-trace`} dataLabel={threadColumns[10].title}>
          {t.stackTrace}
        </Td>
        <Td key={`thread-locks`} dataLabel={threadColumns[11].title}>
          {t.locks}
        </Td>
      </Tr>;
    });
  }, [analysisResult]);

  const findingsColumns: TableColumn[] = [
    {
      title: 'Result',
      keyPaths: ['resultName'],
      sortable: true,
    },
    {
      title: 'Explanation',
      keyPaths: ['explanation'],
      sortable: true,
    },
    {
      title: 'Score',
      keyPaths: ['score'],
      sortable: true,
    },
  ];

  const findingsRows = React.useMemo(() => {
    return analysisResult?.specificFindings.map((f: AnalysisFinding) => {
      <Tr key={`findings`}>
        <Td key={`finding-name`} dataLabel={findingsColumns[0].title}>
          {f.resultName}
        </Td>
        <Td key={`finding-explanation`} dataLabel={findingsColumns[1].title}>
          {f.explanation}
        </Td>
        <Td key={`finding-score`} dataLabel={findingsColumns[2].title}>
          {f.score}
        </Td>
      </Tr>;
    });
  }, [analysisResult]);

  const deadlockColumns: TableColumn[] = [
    {
      title: 'Thread Name',
      keyPaths: ['threadName'],
      sortable: true,
    },
    {
      title: 'Waiting for Monitor',
      keyPaths: ['waitingForMonitor'],
      sortable: true,
    },
    {
      title: 'Waiting for Object',
      keyPaths: ['waitingForObject'],
      sortable: true,
    },
    {
      title: 'Waiting for Type',
      keyPaths: ['waitingForObjectType'],
      sortable: true,
    },
    {
      title: 'Held By',
      keyPaths: ['heldBy'],
      sortable: true,
    },
    {
      title: 'Stack Trace',
      keyPaths: ['stackTrace'],
      sortable: true,
    },
    {
      title: 'Locks Held',
      keyPaths: ['locks'],
      sortable: true,
    },
  ];

  const deadlockRows = React.useMemo(() => {
    return analysisResult?.deadlockInfos.map((d: DeadlockInfo) => {
      <Tr key={`deadlocks`}>
        <Td key={`deadlock-thread`} dataLabel={deadlockColumns[0].title}>
          {d.threadName}
        </Td>
        <Td key={`deadlock-monitor`} dataLabel={deadlockColumns[1].title}>
          {d.waitingForMonitor}
        </Td>
        <Td key={`deadlock-object`} dataLabel={deadlockColumns[2].title}>
          {d.waitingForObject}
        </Td>
        <Td key={`deadlock-type`} dataLabel={deadlockColumns[3].title}>
          {d.waitingForObjectType}
        </Td>
        <Td key={`deadlock-held`} dataLabel={deadlockColumns[4].title}>
          {d.heldBy}
        </Td>
        <Td key={`deadlock-stack-trace`} dataLabel={deadlockColumns[5].title}>
          {d.stackTrace}
        </Td>
        <Td key={`deadlock-locks`} dataLabel={deadlockColumns[6].title}>
          {d.locks}
        </Td>
      </Tr>;
    });
  }, [analysisResult]);

  const queryTargetThreadDumps = React.useCallback(
    (target: Target) => context.api.getTargetThreadDumps(target),
    [context.api],
  );

  const queryThreadDumpAnalysis = React.useCallback(
    (threadDump: string) => {
      addSubscription(
        context.target
          .target()
          .pipe(
            first(),
            concatMap((target: Target | undefined) => {
              if (target) {
                return context.api.analyzeThreadDump(target, threadDump);
              } else {
                return of([]);
              }
            }),
          )
          .subscribe({
            next: handleThreadDumpAnalysis,
            error: handleError,
          }),
      );
    },
    [addSubscription, context.target],
  );

  React.useEffect(() => {
    addSubscription(
      context.target
        .target()
        .pipe(
          first(),
          concatMap((target: Target | undefined) => {
            if (target) {
              return queryTargetThreadDumps(target);
            } else {
              return of([]);
            }
          }),
        )
        .subscribe({
          next: handleThreadDumps,
          error: handleError,
        }),
    );
  }, [addSubscription, context.api]);

  const handleThreadDumps = React.useCallback(
    (threadDumps: ThreadDump[]) => {
      setThreadDumps(threadDumps);
      setErrorMessage('');
    },
    [setThreadDumps, setIsLoading, setErrorMessage],
  );

  const handleThreadDumpAnalysis = React.useCallback(
    (result: ThreadDumpAnalysisResult) => {
      setAnalysisResult(result);
      setErrorMessage('');
    },
    [setAnalysisResult, setIsLoading, setErrorMessage],
  );

  const handleError = React.useCallback(
    (error) => {
      setIsLoading(false);
      setErrorMessage(error.message);
    },
    [setIsLoading, setErrorMessage],
  );

  React.useEffect(() => {
    addSubscription(
      context.notificationChannel.messages(NotificationCategory.ThreadDumpDeleted).subscribe((msg) => {
        setThreadDumps((old) => old.filter((t) => t.threadDumpId !== msg.message.threadDump.threadDumpId));
      }),
    );
  }, [addSubscription, context.notificationChannel]);

  React.useEffect(() => {
    addSubscription(
      context.notificationChannel.messages(NotificationCategory.ThreadDumpSuccess).subscribe((msg) => {
        setThreadDumps((old) => old.filter((t) => t.threadDumpId !== msg.message.threadDump.threadDumpId));
      }),
    );
  }, [addSubscription, context.notificationChannel]);

  const handleThreadDumpChange = React.useCallback(
    (threadDump: string) => {
      setSelectedThreadDump(threadDump);
      queryThreadDumpAnalysis(threadDump);
    },
    [setSelectedThreadDump, queryThreadDumpAnalysis],
  );

  var view;
  if (analysisResult == null) {
    view = (
      <EmptyState>
        <EmptyStateHeader titleText={''} icon={<EmptyStateIcon icon={SearchIcon} />} headingLevel="h4" />
      </EmptyState>
    );
  } else {
    view = (
      <Grid hasGutter>
        <GridItem span={3}>
          <DiagnosticsCard span={3} dashboardId={0} headerDisabled={true} isResizable={false} isDraggable={false} />
        </GridItem>
        <GridItem span={3}>
          <Card>
            <CardTitle>JVM Information</CardTitle>
            <Text>{analysisResult.jvmInfo}</Text>
          </Card>
        </GridItem>
        <GridItem span={3}>
          <Card>
            <CardTitle>JNI Information</CardTitle>
            <Text>
              JNI Information
              <TextListItem> Global References: {analysisResult.jniInfo.globalRefs}</TextListItem>
              <TextListItem> Global References Memory: {analysisResult.jniInfo.globalRefsMemory}</TextListItem>
              <TextListItem> Weak References: {analysisResult.jniInfo.weakRefs}</TextListItem>
              <TextListItem> Weak References Memory: {analysisResult.jniInfo.weakRefsMemory}</TextListItem>
            </Text>
          </Card>
        </GridItem>
        <GridItem span={3}>
          <Card>
            <CardTitle>Lock Instances</CardTitle>
            <AggregateDataCard
              data={analysisResult?.aggregateLockInfo}
              title="Lock Instances"
              description="Aggregate Lock Info"
            />
          </Card>
        </GridItem>
        <GridItem span={3}>
          <Card>
            <CardTitle>Thread States</CardTitle>
            <AggregateDataCard
              data={analysisResult?.aggregateThreadStates}
              title="Thread States"
              description="Aggregate Thread States"
            />
          </Card>
        </GridItem>
        <GridItem span={3}>
          <Card>
            <CardTitle>Running Methods</CardTitle>
            <AggregateDataCard
              data={analysisResult?.runningMethods}
              title="Running Methods"
              description="Aggregate Running Methods"
            />
          </Card>
        </GridItem>
        <GridItem span={9}>
          <Card>
            <CardTitle>Specific Findings</CardTitle>
            <Table aria-label="Specific Findings" variant={TableVariant.compact}>
              <Thead>
                <Tr>
                  {findingsColumns.map(({ title, sortable }, index) => (
                    <Th key={`findings-${title}`}>{title}</Th>
                  ))}
                </Tr>
              </Thead>
              <Tbody>{findingsRows}</Tbody>
            </Table>
          </Card>
        </GridItem>
        <GridItem span={12}>
          <Card>
            <CardTitle>Deadlock Detection</CardTitle>
            <Table aria-label="Deadlocks" variant={TableVariant.compact}>
              <Thead>
                <Tr>
                  {deadlockColumns.map(({ title, sortable }, index) => (
                    <Th key={`deadlock-header-${title}`}>{title}</Th>
                  ))}
                </Tr>
              </Thead>
              <Tbody>{deadlockRows}</Tbody>
            </Table>
          </Card>
        </GridItem>
        <GridItem span={12}>
          <Card>
            <CardTitle>Thread Information</CardTitle>
            <Table aria-label="Threads" variant={TableVariant.compact}>
              <Thead>
                <Tr>
                  {threadColumns.map(({ title, sortable }, index) => (
                    <Th key={`thread-header-${title}`}>{title}</Th>
                  ))}
                </Tr>
              </Thead>
              <Tbody>{threadRows}</Tbody>
            </Table>
          </Card>
        </GridItem>
      </Grid>
    );
  }

  return (
    <TargetView {...props} pageTitle="Diagnostics">
      <ThreadDumpSelector selected={selectedThreadDump} threadDumps={threadDumps} onSelect={handleThreadDumpChange} />
      {view}
    </TargetView>
  );
};

export default ThreadDumpAnalysis;
