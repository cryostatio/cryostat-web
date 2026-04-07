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
import {
  AnalysisFinding,
  DeadlockInfo,
  NotificationCategory,
  NullableTarget,
  Target,
  ThreadDump,
  ThreadDumpAnalysisResult,
  ThreadInfo,
} from '@app/Shared/Services/api.types';
import { ServiceContext } from '@app/Shared/Services/Services';
import { TargetView } from '@app/TargetView/TargetView';
import { useSubscriptions } from '@app/utils/hooks/useSubscriptions';
import { TableColumn } from '@app/utils/utils';
import {
  Card,
  CardTitle,
  EmptyState,
  EmptyStateHeader,
  EmptyStateIcon,
  Grid,
  GridItem,
  Text,
  TextList,
  TextListItem,
} from '@patternfly/react-core';
import { SearchIcon } from '@patternfly/react-icons';
import { Table, TableVariant, Tbody, Td, Th, Thead, Tr } from '@patternfly/react-table';
import * as React from 'react';
import { concatMap, first, of } from 'rxjs';
import { AggregateDataCard } from './AggregateDataCard.tsx';
import { ThreadDumpSelector } from './ThreadDumpSelector';

export interface ThreadDumpAnalysisProps {}

export const ThreadDumpAnalysis: React.FC<ThreadDumpAnalysisProps> = ({ ...props }) => {
  const context = React.useContext(ServiceContext);
  const addSubscription = useSubscriptions();

  const [threadDumps, setThreadDumps] = React.useState<ThreadDump[]>([]);
  const [analysisResult, setAnalysisResult] = React.useState<ThreadDumpAnalysisResult>();
  const [selectedThreadDump, setSelectedThreadDump] = React.useState('');
  const [target, setTarget] = React.useState(undefined as NullableTarget);

  const targetAsObs = React.useMemo(() => of(target), [target]);
  
  React.useEffect(() => {
    addSubscription(context.target.target().subscribe((t) => {
      setTarget(t)
      setAnalysisResult(undefined);
      setSelectedThreadDump('');
    }));
  }, [addSubscription, context.target, setTarget]);

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

  const threadRows = React.useMemo(
    () =>
      analysisResult?.threads.map((t: ThreadInfo, index) => (
        <Tr key={`threads-${index}`}>
          <Td key={`thread-name-${index}`} dataLabel={threadColumns[0].title}>
            {t.name !== undefined ? t.name : ''}
          </Td>
          <Td key={`thread-id-${index}`} dataLabel={threadColumns[1].title}>
            {t.threadId !== undefined ? t.threadId : ''}
          </Td>
          <Td key={`thread-native-id-${index}`} dataLabel={threadColumns[2].title}>
            {t.nativeId !== undefined ? t.nativeId : ''}
          </Td>
          <Td key={`thread-virtual-id-${index}`} dataLabel={threadColumns[3].title}>
            {t.carryingVirtualThreadId != null ? t.carryingVirtualThreadId : ''}
          </Td>
          <Td key={`thread-priority-${index}`} dataLabel={threadColumns[4].title}>
            {t.priority !== undefined ? t.priority : ''}
          </Td>
          <Td key={`thread-daemon-${index}`} dataLabel={threadColumns[5].title}>
            {t.daemon !== undefined ? t.daemon : ''}
          </Td>
          <Td key={`thread-state-${index}`} dataLabel={threadColumns[6].title}>
            {t.state !== undefined ? t.state : ''}
          </Td>
          <Td key={`thread-cpu-time-${index}`} dataLabel={threadColumns[7].title}>
            {t.cpuTimeSec !== undefined ? t.cpuTimeSec : ''}
          </Td>
          <Td key={`thread-elapsed-${index}`} dataLabel={threadColumns[8].title}>
            {t.elapsedTimeSec !== undefined ? t.elapsedTimeSec : ''}
          </Td>
          <Td key={`thread-additional-info-${index}`} dataLabel={threadColumns[9].title}>
            {t.additionalInfo !== undefined ? t.additionalInfo : ''}
          </Td>
          <Td key={`thread-stack-trace-${index}`} dataLabel={threadColumns[10].title}>
            {t.stackTrace !== undefined ? t.stackTrace.toString : ''}
          </Td>
          <Td key={`thread-locks-${index}`} dataLabel={threadColumns[11].title}>
            {t.locks !== undefined ? t.locks.toString : ''}
          </Td>
        </Tr>
      )),
    [analysisResult, threadColumns],
  );

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

  const findingsRows = React.useMemo(
    () =>
      analysisResult?.specificFindings.map((f: AnalysisFinding) => (
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
        </Tr>
      )),
    [analysisResult, findingsColumns],
  );

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

  const deadlockRows = React.useMemo(
    () =>
      analysisResult?.deadlockInfos.map((d: DeadlockInfo) => (
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
        </Tr>
      )),
    [analysisResult, deadlockColumns],
  );

  const queryTargetThreadDumps = React.useCallback(
    (target: Target) => context.api.getTargetThreadDumps(target),
    [context.api],
  );

  const queryThreadDumpAnalysis = React.useCallback(
    (threadDump: string) => {
      addSubscription(
        targetAsObs
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
          }),
      );
    },
    [addSubscription, targetAsObs],
  );

  React.useEffect(() => {
    addSubscription(
      targetAsObs
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
        }),
    );
  }, [addSubscription, targetAsObs]);

  const handleThreadDumps = React.useCallback(
    (threadDumps: ThreadDump[]) => {
      setThreadDumps(threadDumps);
    },
    [setThreadDumps],
  );

  const handleThreadDumpAnalysis = React.useCallback(
    (result: ThreadDumpAnalysisResult) => {
      setAnalysisResult(result);
    },
    [setAnalysisResult],
  );

  React.useEffect(() => {
    addSubscription(
      context.notificationChannel.messages(NotificationCategory.ThreadDumpDeleted).subscribe((msg) => {
        setThreadDumps((old) => old.filter((t) => t.threadDumpId !== msg.message.threadDump.threadDumpId));
      }),
    );
  }, [addSubscription, context.notificationChannel]);

  React.useEffect(() => {
    addSubscription(context.api.getThreadDumps().subscribe((dumps) => {
      setThreadDumps(dumps);
    }));
  }, [addSubscription, context.api, setThreadDumps])

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
          <Card>
            <CardTitle>JVM Information</CardTitle>
            <Text>{analysisResult.jvmInfo}</Text>
          </Card>
        </GridItem>
        <GridItem span={3}>
          <Card>
            <CardTitle>JNI Information</CardTitle>
            <TextList isPlain>
              JNI Information
              <TextListItem> Global References: {analysisResult.jniInfo.globalRefs}</TextListItem>
              <TextListItem> Global References Memory: {analysisResult.jniInfo.globalRefsMemory}</TextListItem>
              <TextListItem> Weak References: {analysisResult.jniInfo.weakRefs}</TextListItem>
              <TextListItem> Weak References Memory: {analysisResult.jniInfo.weakRefsMemory}</TextListItem>
            </TextList>
          </Card>
        </GridItem>
        <GridItem span={5}>
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
    <TargetView {...props} pageTitle="Visualize Thread Dumps">
      <ThreadDumpSelector selected={selectedThreadDump} threadDumps={threadDumps} onSelect={handleThreadDumpChange} />
      {view}
    </TargetView>
  );
};

export default ThreadDumpAnalysis;
