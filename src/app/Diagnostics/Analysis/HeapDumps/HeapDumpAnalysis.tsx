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

import { LoadingView } from '@app/Shared/Components/LoadingView';
import { modalPrefillClearIntent, RootState } from '@app/Shared/Redux/ReduxStore';
import { HeapDump, NotificationCategory, NullableTarget, Target } from '@app/Shared/Services/api.types';
import { ServiceContext } from '@app/Shared/Services/Services';
import { TargetView } from '@app/TargetView/TargetView';
import { useSort } from '@app/utils/hooks/useSort';
import { useSubscriptions } from '@app/utils/hooks/useSubscriptions';
import { hashCode, sortResources, TableColumn } from '@app/utils/utils';
import {
  Card,
  CardBody,
  CardTitle,
  Content,
  ContentVariants,
  EmptyState,
  Grid,
  GridItem,
  Tab,
  Tabs,
  TabTitleText,
} from '@patternfly/react-core';
import { TopologyIcon } from '@patternfly/react-icons';
import {
  ExpandableRowContent,
  SortByDirection,
  Table,
  TableVariant,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
} from '@patternfly/react-table';
import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useLocation, useNavigate } from 'react-router-dom-v5-compat';
import { concatMap, EMPTY, finalize, first, map, of } from 'rxjs';
import { AggregateDataCard } from '../AggregateDataCard.tsx';
import { HeapDumpSelector } from './HeapDumpSelector';
import { ProblemFieldTable } from './ProblemFieldTable';
import {
  AggregateValue,
  DuplicateArray,
  DuplicateString,
  HeapDumpAnalysisResult,
  HighSizeObjects,
  HistogramEntry,
  ObjectEntry,
  WeakHashMapEntry,
} from './types';
import _ from 'lodash';
import { CollectionsTable } from './CollectionsTable.js';
import { HighSizeObjectsTable } from './HighSizeObjectsTable.js';
import { DupStringsTable } from './DupStringsTable.js';
import { DupArraysTable } from './DupArraysTable.js';
import { WeakHashMapsTable } from './WeakHashMapsTable.js';

export interface HeapDumpAnalysisProps {}

const isSameTarget = (a: NullableTarget, b: NullableTarget): boolean =>
  a?.connectUrl === b?.connectUrl && a?.jvmId === b?.jvmId;

interface HeapDumpPrefillLocation {
  state: unknown;
  search: string;
  pathname: string;
}

interface HeapDumpPrefillStore {
  route: string | null;
  data: unknown;
}

interface HeapDumpPrefill {
  jvmId?: string;
  heapDumpId?: string;
}

const firstString = (...values: unknown[]): string | undefined =>
  values.find((value): value is string => typeof value === 'string' && value.length > 0);

const readHeapDumpPrefill = (
  location: HeapDumpPrefillLocation,
  modalPrefill: HeapDumpPrefillStore,
): HeapDumpPrefill => {
  const stateData = location.state as Record<string, unknown> | null;
  const reduxData = modalPrefill.route === location.pathname ? (modalPrefill.data as Record<string, unknown>) : null;
  const params = new URLSearchParams(location.search);

  return {
    jvmId: firstString(stateData?.jvmId, reduxData?.jvmId, params.get('jvmId')),
    heapDumpId: firstString(
      stateData?.id,
      stateData?.heapDumpId,
      reduxData?.id,
      reduxData?.heapDumpId,
      params.get('heapDumpId'),
      params.get('id'),
    ),
  };
};

const objectHistogramTableColumns: TableColumn[] = [
  {
    title: 'Class',
    keyPaths: ['class'],
    sortable: true,
  },
  {
    title: 'Instances',
    keyPaths: ['instances'],
    sortable: true,
  },
  {
    title: 'Inclusive Size',
    keyPaths: ['inclusiveSize'],
    sortable: true,
  },
  {
    title: 'Shallow Size',
    keyPaths: ['shallowSize'],
    sortable: true,
  },
];

export const HeapDumpAnalysis: React.FC<HeapDumpAnalysisProps> = ({ ...props }) => {
  const context = React.useContext(ServiceContext);
  const addSubscription = useSubscriptions();
  const location = useLocation();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const modalPrefill = useSelector((state: RootState) => state.modalPrefill);

  const [target, setTarget] = React.useState(undefined as NullableTarget);
  const [selectedHeapDump, setSelectedHeapDump] = React.useState('');
  const [analysisResult, setAnalysisResult] = React.useState<HeapDumpAnalysisResult>();
  const [isAnalysisLoading, setIsAnalysisLoading] = React.useState(false);
  const [heapDumps, setHeapDumps] = React.useState<HeapDump[]>([]);
  const [sortBy, getSortParams] = useSort();

  const selectedHeapDumpJvmIdRef = React.useRef<string>();

  const targetAsObs = React.useMemo(() => of(target), [target]);
  const [activeTab, setActiveTab] = React.useState(0);

  const prefill = React.useMemo(
    () =>
      readHeapDumpPrefill(
        {
          pathname: location.pathname,
          search: location.search,
          state: location.state,
        },
        modalPrefill,
      ),
    [location.pathname, location.search, location.state, modalPrefill],
  );
  const hasPendingPrefill = !!prefill.jvmId && !!prefill.heapDumpId;

  const onTabSelect = React.useCallback(
    (_evt: MouseEvent | React.MouseEvent, idx: string | number) => setActiveTab(Number(idx)),
    [setActiveTab],
  );

  const handleHeapDumpAnalysis = React.useCallback(
    (result: HeapDumpAnalysisResult) => {
      setAnalysisResult(result);
    },
    [setAnalysisResult],
  );

  const findTargetByJvmId = React.useCallback(
    (jvmId: string) =>
      context.targets.targets().pipe(
        first(),
        concatMap((targets) => {
          const matchedTarget = targets.find((target) => target.jvmId === jvmId);
          if (matchedTarget) {
            return of(matchedTarget);
          }
          return context.targets.queryForTargets().pipe(
            concatMap(() => context.targets.targets().pipe(first())),
            map((targets) => targets.find((target) => target.jvmId === jvmId)),
          );
        }),
      ),
    [context.targets],
  );

  const handleHeapDumps = React.useCallback(
    (heapDumps: HeapDump[]) => {
      setHeapDumps(heapDumps);
    },
    [setHeapDumps],
  );

  const queryHeapDumpAnalysis = React.useCallback(
    (heapDump: string, jvmId?: string) => {
      const selectedJvmId = jvmId || heapDumps.find((t) => t.heapDumpId === heapDump)?.jvmId;
      selectedHeapDumpJvmIdRef.current = selectedJvmId;
      setIsAnalysisLoading(true);
      if (selectedJvmId) {
        addSubscription(
          context.api
            .getHeapDumpReport(selectedJvmId, heapDump)
            .pipe(finalize(() => setIsAnalysisLoading(false)))
            .subscribe({
              next: handleHeapDumpAnalysis,
            }),
        );
        return;
      }

      addSubscription(
        targetAsObs
          .pipe(
            first(),
            concatMap((target: Target | undefined) => {
              if (target) {
                selectedHeapDumpJvmIdRef.current = target.jvmId;
                return context.api.getHeapDumpReport(target.jvmId ? target.jvmId : '', heapDump);
              }
              return EMPTY;
            }),
            finalize(() => setIsAnalysisLoading(false)),
          )
          .subscribe({
            next: handleHeapDumpAnalysis,
          }),
      );
    },
    [addSubscription, context.api, handleHeapDumpAnalysis, targetAsObs, heapDumps],
  );

  React.useEffect(() => {
    if (!prefill.jvmId || !prefill.heapDumpId) {
      return;
    }

    addSubscription(
      findTargetByJvmId(prefill.jvmId).subscribe((target) => {
        setAnalysisResult(undefined);
        selectedHeapDumpJvmIdRef.current = prefill.jvmId;
        setSelectedHeapDump(prefill.heapDumpId!);
        if (target) {
          context.target.setTarget(target);
        }
        queryHeapDumpAnalysis(prefill.heapDumpId!, prefill.jvmId);
        dispatch(modalPrefillClearIntent());
        if (location.state || location.search) {
          navigate(`${location.pathname}${location.hash}`, { replace: true, state: null });
        }
      }),
    );
  }, [
    addSubscription,
    context.target,
    location.state,
    location.search,
    location.hash,
    location.pathname,
    prefill.jvmId,
    prefill.heapDumpId,
    dispatch,
    findTargetByJvmId,
    navigate,
    queryHeapDumpAnalysis,
    setAnalysisResult,
    setSelectedHeapDump,
  ]);

  const handleHeapDumpChange = React.useCallback(
    (heapDump?: string) => {
      setSelectedHeapDump(heapDump || '');
      setAnalysisResult(undefined);
      selectedHeapDumpJvmIdRef.current = heapDump
        ? heapDumps.find((t) => t.heapDumpId === heapDump)?.jvmId || target?.jvmId
        : undefined;
      if (heapDump) {
        queryHeapDumpAnalysis(heapDump, selectedHeapDumpJvmIdRef.current);
      }
    },
    [setSelectedHeapDump, setAnalysisResult, heapDumps, target, queryHeapDumpAnalysis],
  );

  React.useEffect(() => {
    addSubscription(
      context.notificationChannel.messages(NotificationCategory.HeapDumpAnalysisSuccess).subscribe((msg) => {
        addSubscription(
          context.api
            .getHeapDumpReport(msg.message.jvmId, msg.message.heapDumpId)
            .pipe(finalize(() => setIsAnalysisLoading(false)))
            .subscribe({
              next: handleHeapDumpAnalysis,
            }),
        );
        return;
      }),
    );
  }, [addSubscription, handleHeapDumpAnalysis, setIsAnalysisLoading, context.api, context.notificationChannel]);

  React.useEffect(() => {
    addSubscription(
      context.target.target().subscribe((t) => {
        setTarget((currentTarget) => {
          if (currentTarget && !isSameTarget(currentTarget, t)) {
            const selectedHeapDumpJvmId = selectedHeapDumpJvmIdRef.current;
            if (!selectedHeapDumpJvmId || selectedHeapDumpJvmId !== t?.jvmId) {
              selectedHeapDumpJvmIdRef.current = undefined;
              setAnalysisResult(undefined);
              setSelectedHeapDump('');
            }
          }
          return t;
        });
      }),
    );
  }, [addSubscription, context.target, setTarget]);

  const queryTargetHeapDumps = React.useCallback(
    (target: Target) => context.api.getTargetHeapDumps(target),
    [context.api],
  );

  React.useEffect(() => {
    addSubscription(
      targetAsObs
        .pipe(
          first(),
          concatMap((target: Target | undefined) => {
            if (target) {
              return queryTargetHeapDumps(target);
            } else {
              return of([]);
            }
          }),
        )
        .subscribe({
          next: handleHeapDumps,
        }),
    );
  }, [addSubscription, handleHeapDumps, queryTargetHeapDumps, targetAsObs]);

  const selector = React.useMemo(() => {
    return <HeapDumpSelector selected={selectedHeapDump} heapDumps={heapDumps} onSelect={handleHeapDumpChange} />;
  }, [selectedHeapDump, heapDumps, handleHeapDumpChange]);

  const emptyTableState = React.useCallback((title: string) => {
    return <EmptyState titleText={title} icon={TopologyIcon} headingLevel="h4" />;
  }, []);

  const duplicateStringStatsCard = React.useMemo(() => {
    return (
      <Card isLarge>
        <CardTitle>Duplicate String Stats</CardTitle>
        <CardBody>
          <Content component={ContentVariants.dl}>
            {' '}
            Total Strings: {analysisResult?.duplicateStringStats.totalStrings}
          </Content>
          <Content component={ContentVariants.dl}>
            {' '}
            Unique Strings: {analysisResult?.duplicateStringStats.uniqueStrings}
          </Content>
          <Content component={ContentVariants.dl}>
            {' '}
            Duplicate Strings: {analysisResult?.duplicateStringStats.duplicateStrings}
          </Content>
          <Content component={ContentVariants.dl}>
            {' '}
            Memory Overhead: {analysisResult?.duplicateStringStats.overhead}
          </Content>
        </CardBody>
      </Card>
    );
  }, [analysisResult]);

  const histogramStatsCard = React.useMemo(() => {
    return (
      <Card isLarge>
        <CardTitle>Object Histogram Stats</CardTitle>
        <CardBody>
          <Content component={ContentVariants.dl}>
            {' '}
            Total Classes: {analysisResult?.histogramStats.totalClasses}
          </Content>
          <Content component={ContentVariants.dl}>
            {' '}
            Total Objects: {analysisResult?.histogramStats.totalObjects}
          </Content>
          <Content component={ContentVariants.dl}>
            {' '}
            Zero Instances: {analysisResult?.histogramStats.zeroInstances}
          </Content>
          <Content component={ContentVariants.dl}>
            {' '}
            Single Instances: {analysisResult?.histogramStats.singleInstances}
          </Content>
        </CardBody>
      </Card>
    );
  }, [analysisResult]);

  const compressibleStringStatsCard = React.useMemo(() => {
    return (
      <Card isLarge>
        <CardTitle>Compressible String Stats</CardTitle>
        <CardBody>
          <Content component={ContentVariants.dl}>
            {' '}
            String Objects: {analysisResult?.compressibleStringStats.stringObjects}
          </Content>
          <Content component={ContentVariants.dl}>
            {' '}
            Backing Array Bytes: {analysisResult?.compressibleStringStats.backingArrayBytes}
          </Content>
          <Content component={ContentVariants.dl}>
            {' '}
            Compressed Strings: {analysisResult?.compressibleStringStats.compressedStrings}
          </Content>
          <Content component={ContentVariants.dl}>
            {' '}
            Compressed String Bytes: {analysisResult?.compressibleStringStats.compressedStringBytes}
          </Content>
          <Content component={ContentVariants.dl}>
            {' '}
            ASCII Strings: {analysisResult?.compressibleStringStats.asciiStrings}
          </Content>
          <Content component={ContentVariants.dl}>
            {' '}
            ASCII String Bytes: {analysisResult?.compressibleStringStats.asciiStringBytes}
          </Content>
        </CardBody>
      </Card>
    );
  }, [analysisResult]);

  const fundamentalStatsCard = React.useMemo(() => {
    return (
      <Card isLarge>
        <CardTitle>Fundamental Stats</CardTitle>
        <CardBody>
          <Content component={ContentVariants.dl}>
            {' '}
            Pointer Size: {analysisResult?.fundamentalStats.pointerSize}
          </Content>
          <Content component={ContentVariants.dl}>
            {' '}
            Narrow Pointers: {analysisResult?.fundamentalStats.narrowPointers}
          </Content>
          <Content component={ContentVariants.dl}>
            {' '}
            Object Header Size: {analysisResult?.fundamentalStats.objectHeaderSize}
          </Content>
          <Content component={ContentVariants.dl}>
            {' '}
            Object Header Alignment: {analysisResult?.fundamentalStats.objectHeaderAlignment}
          </Content>
          <Content component={ContentVariants.dl}> Num Objects: {analysisResult?.fundamentalStats.numObjects}</Content>
          <Content component={ContentVariants.dl}>
            {' '}
            Object Instances: {analysisResult?.fundamentalStats.objectInstances}
          </Content>
          <Content component={ContentVariants.dl}>
            {' '}
            Object Arrays: {analysisResult?.fundamentalStats.objectArrays}
          </Content>
          <Content component={ContentVariants.dl}>
            {' '}
            Primitive Arrays: {analysisResult?.fundamentalStats.primitiveArrays}
          </Content>
          <Content component={ContentVariants.dl}> Object Size: {analysisResult?.fundamentalStats.objectSize}</Content>
          <Content component={ContentVariants.dl}>
            {' '}
            Instance Size: {analysisResult?.fundamentalStats.instanceSize}
          </Content>
          <Content component={ContentVariants.dl}>
            {' '}
            Object Array Size: {analysisResult?.fundamentalStats.objArraySize}
          </Content>
          <Content component={ContentVariants.dl}>
            {' '}
            Primitive Array Size: {analysisResult?.fundamentalStats.primitiveSize}
          </Content>
        </CardBody>
      </Card>
    );
  }, [analysisResult]);

  const histogramRows = React.useMemo(
    () =>
      analysisResult?.objectHistogram.map((h: HistogramEntry) => (
        <Tr key={`object-histogram`}>
          <Td key={`clazz`} dataLabel={objectHistogramTableColumns[0].title}>
            {h.clazz ? h.clazz : 'N/A'}
          </Td>
          <Td key={`numInstances`} dataLabel={objectHistogramTableColumns[1].title}>
            {h.numInstances ? h.numInstances : 'N/A'}
          </Td>
          <Td key={`inclusive`} dataLabel={objectHistogramTableColumns[2].title}>
            {h.inclusiveSize ? h.inclusiveSize : 'N/A'}
          </Td>
          <Td key={`shallow`} dataLabel={objectHistogramTableColumns[3].title}>
            {h.shallowSize ? h.shallowSize : 'N/A'}
          </Td>
        </Tr>
      )),
    [analysisResult],
  );

  const objectHistogramTable = React.useMemo(() => {
    return (
      <Card>
        <CardTitle>Object Histogram</CardTitle>
        {histogramRows?.length ? (
          <Table aria-label="Object Histogram" variant={TableVariant.compact}>
            <Thead>
              <Tr>
                {objectHistogramTableColumns.map(({ title }) => (
                  <Th key={`histogram-${title}`}>{title}</Th>
                ))}
              </Tr>
            </Thead>
            <Tbody>{histogramRows}</Tbody>
          </Table>
        ) : (
          emptyTableState('No Object Histogram')
        )}
      </Card>
    );
  }, [emptyTableState, histogramRows]);

  var view;
  if (isAnalysisLoading || (analysisResult == null && hasPendingPrefill)) {
    view = <LoadingView />;
  } else if (analysisResult == undefined) {
    view = emptyTableState('Select a Heap Dump to Analyze');
  } else {
    view = (
      <Tabs activeKey={activeTab} onSelect={onTabSelect}>
        <Tab eventKey={0} title={<TabTitleText>Basic Statistics</TabTitleText>}>
          <Grid hasGutter>
            <GridItem span={3}>{fundamentalStatsCard}</GridItem>
            <GridItem span={3}>{compressibleStringStatsCard}</GridItem>
            <GridItem span={3}>{duplicateStringStatsCard}</GridItem>
            <GridItem span={3}>{histogramStatsCard}</GridItem>
            <GridItem span={7}>
              <Card>
                <CardTitle>Class Loader Instances</CardTitle>
                <CardBody>
                  <AggregateDataCard
                    data={analysisResult?.classLoaderInstanceStats.map((t) => {
                      return { data: t.value, count: t.count };
                    })}
                    title="Class Loader Instance Statistics"
                    description="Class Loader Instance Memory Statistics"
                  />
                </CardBody>
              </Card>
            </GridItem>
            <GridItem span={7}>
              <Card>
                <CardTitle>Class Loader Classes</CardTitle>
                <CardBody>
                  <AggregateDataCard
                    data={analysisResult?.classLoaderClassStats.map((t) => {
                      return { data: t.value, count: t.count };
                    })}
                    title="Class Loader Class Statistics"
                    description="Class Loader Class Memory Statistics"
                  />
                </CardBody>
              </Card>
            </GridItem>
          </Grid>
        </Tab>
        <Tab eventKey={1} name="Problem Fields" title={<TabTitleText>Problem Fields</TabTitleText>}>
          <Grid hasGutter>
            <GridItem>
              <Card>
                <CardTitle>Problem Fields</CardTitle>
                <ProblemFieldTable analysisResult={analysisResult} />
              </Card>
            </GridItem>
          </Grid>
        </Tab>
        <Tab eventKey={2} title={<TabTitleText>Object Histogram</TabTitleText>}>
          <Grid hasGutter>
            <GridItem>{objectHistogramTable}</GridItem>
          </Grid>
        </Tab>
        <Tab eventKey={3} title={<TabTitleText>Collections</TabTitleText>}>
          <Grid hasGutter>
            <GridItem>
              <CollectionsTable analysisResult={analysisResult} />
            </GridItem>
          </Grid>
        </Tab>
        <Tab eventKey={4} title={<TabTitleText>Duplicate Arrays</TabTitleText>}>
          <Grid hasGutter>
            <GridItem>
              <Card>
                <CardTitle>Duplicate Arrays</CardTitle>
                <DupArraysTable analysisResult={analysisResult} />
              </Card>
            </GridItem>
          </Grid>
        </Tab>
        <Tab eventKey={5} title={<TabTitleText>High Size Objects</TabTitleText>}>
          <Grid hasGutter>
            <GridItem>
              <Card>
                <CardTitle>High Size Objects</CardTitle>
                <HighSizeObjectsTable analysisResult={analysisResult} />
              </Card>
            </GridItem>
          </Grid>
        </Tab>
        <Tab eventKey={6} title={<TabTitleText>Duplicate Strings</TabTitleText>}>
          <Grid hasGutter>
            <GridItem>
              <Card>
                <CardTitle>Duplicate Strings</CardTitle>
                <DupStringsTable analysisResult={analysisResult} />
              </Card>
            </GridItem>
          </Grid>
        </Tab>
        <Tab eventKey={7} title={<TabTitleText>Weak HashMaps</TabTitleText>}>
          <Grid hasGutter>
            <GridItem>
              <Card>
                <CardTitle>Weak HashMaps</CardTitle>
                <WeakHashMapsTable analysisResult={analysisResult} />
              </Card>
            </GridItem>
          </Grid>
        </Tab>
      </Tabs>
    );
  }

  return (
    <TargetView {...props} pageTitle="Visualize Heap Dumps">
      {selector}
      {view}
    </TargetView>
  );
};
