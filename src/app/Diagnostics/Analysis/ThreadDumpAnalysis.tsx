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
  StackFrame,
  Target,
  ThreadDump,
  ThreadDumpAnalysisResult,
  ThreadInfo,
} from '@app/Shared/Services/api.types';
import { ServiceContext } from '@app/Shared/Services/Services';
import { TargetView } from '@app/TargetView/TargetView';
import { useSubscriptions } from '@app/utils/hooks/useSubscriptions';
import { hashCode, sortResources, TableColumn } from '@app/utils/utils';
import {
  Card,
  CardBody,
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
import { SearchIcon, TopologyIcon } from '@patternfly/react-icons';
import { ExpandableRowContent, ISortBy, SortByDirection, Table, TableVariant, Tbody, Td, Th, Thead, ThProps, Tr } from '@patternfly/react-table';
import * as React from 'react';
import { concatMap, first, of } from 'rxjs';
import { AggregateDataCard } from './AggregateDataCard.tsx';
import { ThreadDumpSelector } from './ThreadDumpSelector';
import { useSort } from '@app/utils/hooks/useSort';

export interface ThreadDumpAnalysisProps {}

interface ThreadRowData {
  threadInfo: ThreadInfo;
  isExpanded: boolean;
  cellContents: React.ReactNode[];
  children?: React.ReactNode;
}

export const ThreadDumpAnalysis: React.FC<ThreadDumpAnalysisProps> = ({ ...props }) => {
  const context = React.useContext(ServiceContext);
  const addSubscription = useSubscriptions();

  const [threadDumps, setThreadDumps] = React.useState<ThreadDump[]>([]);
  const [analysisResult, setAnalysisResult] = React.useState<ThreadDumpAnalysisResult>();
  const [selectedThreadDump, setSelectedThreadDump] = React.useState('');
  const [target, setTarget] = React.useState(undefined as NullableTarget);
  const [openRows, setOpenRows] = React.useState<number[]>([]);
  const [sortBy, getSortParams] = useSort();

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
  ];

  const stackTraceColumns: TableColumn[] = [
    {
      title: 'File Name',
      keyPaths: ['fileName'],
      sortable: false,
    },
    {
      title: 'Class Name',
      keyPaths: ['className'],
      sortable: false,
    },
        {
      title: 'Method Name',
      keyPaths: ['methodName'],
      sortable: false,
    },
        {
      title: 'Line Number',
      keyPaths: ['lineNumber'],
      sortable: false,
    },
        {
      title: 'Native Method',
      keyPaths: ['nativeMethod'],
      sortable: false,
    },
  ]

  const displayedRowData = React.useMemo(() => {
    const rows: ThreadRowData[] = [];
    const sorted = sortResources(
      {
        index: sortBy.index ?? 1,
        direction: sortBy.direction ?? SortByDirection.asc,
      },
        analysisResult?.threads ? analysisResult.threads : [],
        threadColumns,
      );
    if (analysisResult) {
    sorted.forEach((t : ThreadInfo) => {
      rows.push({
        threadInfo: t,
        cellContents: [t.name, t.threadId, t.nativeId, t.carryingVirtualThreadId, t.priority, t.daemon, t.state, t.cpuTimeSec, t.elapsedTimeSec, t.additionalInfo],
        isExpanded: openRows.some((id) => id === hashCode(t.name)),
        children: 
          t.stackTrace?.length ? (
        <Card>
          <CardTitle>Stack Trace</CardTitle>
            <Table aria-label="Stack Trace" variant={TableVariant.compact}>
              <Thead>
                <Tr>
                  {stackTraceColumns.map(({ title, sortable }, index) => (
                    <Th key={`thread-header-${title}`}>{title}</Th>
                  ))}
                </Tr>
              </Thead>
              <Tbody>
                {t.stackTrace?.map((s: StackFrame) => (
                  <Tr key={`stack-trace`}>
                    <Td key={`file-name`} dataLabel={stackTraceColumns[0].title}>
                      {s.fileName ? s.fileName : 'N/A'}
                    </Td>
                    <Td key={`finding-name`} dataLabel={stackTraceColumns[1].title}>
                      {s.className ? s.className : 'N/A'}
                    </Td>
                    <Td key={`finding-explanation`} dataLabel={stackTraceColumns[2].title}>
                      {s.methodName ? s.methodName : 'N/A'}
                    </Td>
                    <Td key={`finding-score`} dataLabel={stackTraceColumns[3].title}>
                      {s.lineNumber ? s.lineNumber : 'N/A'}
                    </Td>
                    <Td key={`finding-score`} dataLabel={stackTraceColumns[4].title}>
                      {s.nativeMethod ? `${s.nativeMethod}` : 'false'}
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </Card>) : 
          (<EmptyState>
              <EmptyStateHeader
                titleText="No Stack Trace Available"
                icon={<EmptyStateIcon icon={TopologyIcon} />}
                headingLevel="h4"
                />
            </EmptyState>)
      });
    })
  }
    return rows;
  }, [openRows, sortBy, analysisResult]);

  const threadRows = React.useMemo(
    () => {
      if (displayedRowData) {
      return displayedRowData.map((t: ThreadRowData, index) => (
      <Tbody key={`thread-row-pair-${index}`} isExpanded={t.isExpanded}>
        <Tr key={`thread-row-${index}`}>
          <Td
            key={`thread-row-expandable`}
            expand={{
              rowIndex: index,
              isExpanded: t.isExpanded,
              expandId: `expandable-thread-row-${index}`,
              onToggle: () => onToggle(t.threadInfo),
            }}
            />
          <Td key={`thread-name-${index}`} colSpan={1} dataLabel={threadColumns[0].title}>
            {t.threadInfo.name !== undefined ? t.threadInfo.name : 'N/A'}
          </Td>
          <Td key={`thread-id-${index}`} colSpan={1} dataLabel={threadColumns[1].title}>
            {t.threadInfo.threadId !== undefined ? t.threadInfo.threadId : 'N/A'}
          </Td>
          <Td key={`thread-native-id-${index}`} colSpan={1} dataLabel={threadColumns[2].title}>
            {t.threadInfo.nativeId !== undefined ? t.threadInfo.nativeId : 'N/A'}
          </Td>
          <Td key={`thread-virtual-id-${index}`} colSpan={1} dataLabel={threadColumns[3].title}>
            {t.threadInfo.carryingVirtualThreadId != null ? t.threadInfo.carryingVirtualThreadId : 'N/A'}
          </Td>
          <Td key={`thread-priority-${index}`} colSpan={1} dataLabel={threadColumns[4].title}>
            {t.threadInfo.priority !== undefined ? t.threadInfo.priority : 'N/A'}
          </Td>
          <Td key={`thread-daemon-${index}`} colSpan={1} dataLabel={threadColumns[5].title}>
            {t.threadInfo.daemon !== undefined ? `${t.threadInfo.daemon}` : 'N/A'}
          </Td>
          <Td key={`thread-state-${index}`} colSpan={1} dataLabel={threadColumns[6].title}>
            {t.threadInfo.state !== undefined ? t.threadInfo.state : 'N/A'}
          </Td>
          <Td key={`thread-cpu-time-${index}`} colSpan={1} dataLabel={threadColumns[7].title}>
            {t.threadInfo.cpuTimeSec !== undefined ? t.threadInfo.cpuTimeSec : 'N/A'}
          </Td>
          <Td key={`thread-elapsed-${index}`} colSpan={1} dataLabel={threadColumns[8].title}>
            {t.threadInfo.elapsedTimeSec !== undefined ? t.threadInfo.elapsedTimeSec : 'N/A'}
          </Td>
          <Td key={`thread-additional-info-${index}`} colSpan={1} dataLabel={threadColumns[9].title}>
            {t.threadInfo.additionalInfo !== undefined ? t.threadInfo.additionalInfo : 'N/A'}
          </Td>
        </Tr>
          <Tr key={`thread-row-${index}-expandable-child`} isExpanded={t.isExpanded}>
            <Td dataLabel="thread-details" colSpan={threadColumns.length}>
              <ExpandableRowContent>{t.children}</ExpandableRowContent>
            </Td>
          </Tr>
      </Tbody>
      )) } else {
        return (
          <EmptyState>
              <EmptyStateHeader
                titleText="No Threads"
                icon={<EmptyStateIcon icon={TopologyIcon} />}
                headingLevel="h4"
                />
            </EmptyState>
        )
      }
    },
    [displayedRowData, threadColumns],
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

  const onToggle = React.useCallback(
    (t: ThreadInfo) => {
      setOpenRows((old) => {
        const typeId = hashCode(t.name);
        if (old.some((id) => id === typeId)) {
          return old.filter((id) => id !== typeId);
        }
        return [...old, typeId];
      });
    },
    [setOpenRows],
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
          <Card isLarge>
            <CardTitle>JVM Information</CardTitle>
            <CardBody>
            <Text>{analysisResult.jvmInfo}</Text>
            <TextList isPlain>
              JNI Information
              <TextListItem> Global References: {analysisResult.jniInfo.globalRefs ? analysisResult.jniInfo.globalRefs : "N/A"}</TextListItem>
              <TextListItem> Global References Memory: {analysisResult.jniInfo.globalRefsMemory ? analysisResult.jniInfo.globalRefsMemory : "N/A"}</TextListItem>
              <TextListItem> Weak References: {analysisResult.jniInfo.weakRefs ? analysisResult.jniInfo.weakRefs : "N/A"}</TextListItem>
              <TextListItem> Weak References Memory: {analysisResult.jniInfo.weakRefsMemory ? analysisResult.jniInfo.weakRefsMemory : "N/A"}</TextListItem>
            </TextList>
            </CardBody>
          </Card>
        </GridItem>
        <GridItem span={7}>
          <Card>
            <CardTitle>Lock Instances</CardTitle>
            <CardBody>
            <AggregateDataCard
              data={analysisResult?.aggregateLockInfo}
              title="Lock Instances"
              description="Aggregate Lock Info"
            />
            </CardBody>
          </Card>
        </GridItem>
        <GridItem span={6}>
          <Card>
            <CardTitle>Thread States</CardTitle>
            <CardBody>
            <AggregateDataCard
              data={analysisResult?.aggregateThreadStates}
              title="Thread States"
              description="Aggregate Thread States"
            />
            </CardBody>
          </Card>
        </GridItem>
        <GridItem span={6}>
          <Card>
            <CardTitle>Running Methods</CardTitle>
            <AggregateDataCard
              data={analysisResult?.runningMethods}
              title="Running Methods"
              description="Aggregate Running Methods"
            />
          </Card>
        </GridItem>
        <GridItem>
          <Card>
            <CardTitle>Specific Findings</CardTitle>
            {findingsRows?.length ? (
            <Table aria-label="Specific Findings" variant={TableVariant.compact}>
              <Thead>
                <Tr>
                  {findingsColumns.map(({ title, sortable }, index) => (
                <Th key={`findings-${title}`}>{title}</Th>
                ))}
                </Tr>
              </Thead>
              <Tbody>{findingsRows}</Tbody>
            </Table>) :
            (<EmptyState>
              <EmptyStateHeader
                titleText="No Specific Findings"
                icon={<EmptyStateIcon icon={TopologyIcon}/>}
                headingLevel="h4"
                />
            </EmptyState>)}
          </Card>
        </GridItem>
        <GridItem>
          <Card>
            <CardTitle>Deadlock Detection</CardTitle>
            {deadlockRows?.length ? (
            <Table aria-label="Deadlocks" variant={TableVariant.compact}>
              <Thead>
                <Tr>
                  {deadlockColumns.map(({ title, sortable }, index) => (
                    <Th key={`deadlock-header-${title}`}>{title}</Th>
                  ))}
                </Tr>
              </Thead>
              <Tbody>{deadlockRows}</Tbody>
            </Table>) : 
            (<EmptyState>
              <EmptyStateHeader
                titleText="No Deadlocks Detected"
                icon={<EmptyStateIcon icon={TopologyIcon} />}
                headingLevel="h4"
                />
            </EmptyState>)
            }
          </Card>
        </GridItem>
        <GridItem>
          <Card>
            <CardTitle>Thread Information</CardTitle>
            <Table aria-label="Threads Table" variant={TableVariant.compact}>
              <Thead>
                <Tr>
                  <Th/>
                  {threadColumns.map(({ title, sortable }, index) => (
                    <Th key={`thread-header-${title}`} sort={sortable ? getSortParams(index) : undefined}>{title}</Th>
                  ))}
                </Tr>
              </Thead>
              {threadRows}
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
