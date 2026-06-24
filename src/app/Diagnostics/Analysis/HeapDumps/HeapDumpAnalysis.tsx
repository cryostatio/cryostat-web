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

import { modalPrefillClearIntent, RootState } from '@app/Shared/Redux/ReduxStore';
import { HeapDump, NotificationCategory, NullableTarget, Target } from '@app/Shared/Services/api.types';
import { ServiceContext } from '@app/Shared/Services/Services';
import { useSubscriptions } from '@app/utils/hooks/useSubscriptions';
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
import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useLocation, useNavigate } from 'react-router-dom-v5-compat';
import { concatMap, EMPTY, finalize, first, of } from 'rxjs';
import {
  AggregateValue,
  DuplicateArray,
  DuplicateString,
  Field,
  HeapDumpAnalysisResult,
  HighSizeObjects,
  HistogramEntry,
  ObjectEntry,
  ProblemClass,
  ProblemCollection,
  ProblemField,
  WeakHashMapEntry,
} from './types';
import { TopologyIcon } from '@patternfly/react-icons';
import { HeapDumpSelector } from './HeapDumpSelector';
import { TargetView } from '@app/TargetView/TargetView';
import { LoadingView } from '@app/Shared/Components/LoadingView';
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
import { hashCode, sortResources, TableColumn } from '@app/utils/utils';
import { useSort } from '@app/utils/hooks/useSort';
import { AggregateDataCard } from '../AggregateDataCard.tsx';

export interface HeapDumpAnalysisProps {}

const isSameTarget = (a: NullableTarget, b: NullableTarget): boolean =>
  a?.connectUrl === b?.connectUrl && a?.jvmId === b?.jvmId;

interface ProblemFieldRowData {
  problemFieldsInfo: ProblemField;
  isExpanded: boolean;
  cellContents: React.ReactNode[];
  children?: React.ReactNode;
}

interface HighSizeObjsRowData {
  highSizeObjsInfo: HighSizeObjects;
  isExpanded: boolean;
  cellContents: React.ReactNode[];
  children?: React.ReactNode;
}

interface CollectionRowData {
  collectionInfo: ProblemCollection;
  isExpanded: boolean;
  cellContents: React.ReactNode[];
  children?: React.ReactNode;
}

interface DupArrayRowData {
  dupArrayInfo: DuplicateArray;
  isExpanded: boolean;
  cellContents: React.ReactNode[];
  children?: React.ReactNode;
}

interface DupStringRowData {
  dupStringInfo: DuplicateString;
  isExpanded: boolean;
  cellContents: React.ReactNode[];
  children?: React.ReactNode;
}

interface WeakHashMapRowData {
  weakHashMapInfo: WeakHashMapEntry;
  isExpanded: boolean;
  cellContents: React.ReactNode[];
  children?: React.ReactNode;
}

const weakHashMapColumns: TableColumn[] = [
  {
    title: 'Class and Field',
    keyPaths: ['classAndField'],
    sortable: true,
  },
  {
    title: 'Defining Class',
    keyPaths: ['definingClass'],
    sortable: true,
  },
  {
    title: 'Overhead',
    keyPaths: ['overhead'],
    sortable: true,
  },
  {
    title: 'Bad Objects',
    keyPaths: ['badObjs'],
    sortable: true,
  },
];

const collectionsColumns: TableColumn[] = [
  {
    title: 'Class',
    keyPaths: ['classAndField'],
    sortable: true,
  },
  {
    title: 'Defining Class',
    keyPaths: ['definingClass'],
    sortable: true,
  },
  {
    title: 'Overhead',
    keyPaths: ['overhead'],
    sortable: true,
  },
  {
    title: 'Bad Objects',
    keyPaths: ['badObjs'],
    sortable: true,
  },
  {
    title: 'Good Collections',
    keyPaths: ['goodCollections'],
    sortable: true,
  },
];

const collectionsSubColumns: TableColumn[] = [
  {
    title: 'Class',
    keyPaths: ['clazz'],
    sortable: true,
  },
  {
    title: 'Problem Type',
    keyPaths: ['problemKind'],
    sortable: true,
  },
  {
    title: 'Instances',
    keyPaths: ['numInstances'],
    sortable: true,
  },
  {
    title: 'Overhead',
    keyPaths: ['overhead'],
    sortable: true,
  },
];

const dupArraysColumns: TableColumn[] = [
  {
    title: 'Class and Field',
    keyPaths: ['classAndField'],
    sortable: true,
  },
  {
    title: 'Defining Class',
    keyPaths: ['definingClass'],
    sortable: true,
  },
  {
    title: 'Overhead',
    keyPaths: ['overhead'],
    sortable: true,
  },
  {
    title: 'Bad Objects',
    keyPaths: ['badObjs'],
    sortable: true,
  },
  {
    title: 'Non Duplicate Arrays',
    keyPaths: ['nonDupArrays'],
    sortable: true,
  },
];

const dupStringsColumns: TableColumn[] = [
  {
    title: 'Class and Field',
    keyPaths: ['classAndField'],
    sortable: true,
  },
  {
    title: 'Defining Class',
    keyPaths: ['definingClass'],
    sortable: true,
  },
  {
    title: 'Overhead',
    keyPaths: ['overhead'],
    sortable: true,
  },
  {
    title: 'Bad Objects',
    keyPaths: ['badObjs'],
    sortable: true,
  },
  {
    title: 'Backing Char Array Memory',
    keyPaths: ['dupBackingCharArrays'],
    sortable: true,
  },
  {
    title: 'Non Duplicate Arrays',
    keyPaths: ['nonDupArrays'],
    sortable: true,
  },
];

const highSizeObjectsColumns: TableColumn[] = [
  {
    title: 'Class and Field',
    keyPaths: ['classAndField'],
    sortable: true,
  },
  {
    title: 'Defining Class',
    keyPaths: ['definingClass'],
    sortable: true,
  },
  {
    title: 'Overhead',
    keyPaths: ['overhead'],
    sortable: true,
  },
  {
    title: 'Bad Objects',
    keyPaths: ['badObjs'],
    sortable: true,
  },
];

const problemFieldColumns: TableColumn[] = [
  {
    title: 'Class',
    keyPaths: ['clazz'],
    sortable: true,
  },
  {
    title: 'Instances',
    keyPaths: ['numInstances'],
    sortable: true,
  },
  {
    title: 'Overhead',
    keyPaths: ['overhead'],
    sortable: true,
  },
  {
    title: 'Problem Type',
    keyPaths: ['problemKind'],
    sortable: true,
  },
];

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

const problemFieldSubColumns: TableColumn[] = [
  {
    title: 'Field Name',
    keyPaths: ['problemFieldNames'],
    sortable: true,
  },
  {
    title: 'Declaring Class',
    keyPaths: ['problemFieldDeclaringClasses'],
    sortable: true,
  },
  {
    title: 'Overhead',
    keyPaths: ['perFieldOvhd'],
    sortable: true,
  },
];

const dupArraysSubColumns: TableColumn[] = [
  {
    title: 'Array Value',
    keyPaths: ['value'],
    sortable: true,
  },
  {
    title: 'Duplicate Array Count',
    keyPaths: ['count'],
    sortable: true,
  },
];

const highSizeObjectsSubColumns: TableColumn[] = [
  {
    title: 'Class',
    keyPaths: ['clazz'],
    sortable: true,
  },
  {
    title: 'Instances',
    keyPaths: ['numInstances'],
    sortable: true,
  },
  {
    title: 'Overhead',
    keyPaths: ['overhead'],
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
  const [openProblemFieldRows, setOpenProblemFieldRows] = React.useState<number[]>([]);
  const [openCollectionRows, setOpenCollectionRows] = React.useState<number[]>([]);
  const [openDupArrayRows, setOpenDupArrayRows] = React.useState<number[]>([]);
  const [openDupStringRows, setOpenDupStringRows] = React.useState<number[]>([]);
  const [openWeakHashMapRows, setOpenWeakHashMapRows] = React.useState<number[]>([]);
  const [openHighSizeObjRows, setOpenHighSizeObjRows] = React.useState<number[]>([]);

  const selectedHeapDumpJvmIdRef = React.useRef<string>();

  const targetAsObs = React.useMemo(() => of(target), [target]);
  const [activeTab, setActiveTab] = React.useState(0);

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

  React.useEffect(() => {
    const stateData = location.state as Record<string, unknown> | null;
    const reduxData = modalPrefill.route === location.pathname ? (modalPrefill.data as Record<string, unknown>) : null;

    const prefillJvmId = (stateData?.jvmId || reduxData?.jvmId) as string | undefined;
    const prefillHeapDump = (stateData?.id || reduxData?.id) as string | undefined;

    var jvmId = prefillJvmId ? prefillJvmId : '';
    var heapDumpId = prefillHeapDump ? prefillHeapDump : '';

    setSelectedHeapDump(heapDumpId);
    if (jvmId != '' && heapDumpId != '') {
      context.api.getHeapDumpReport(jvmId, heapDumpId).subscribe({ next: handleHeapDumpAnalysis });
    }
    dispatch(modalPrefillClearIntent());
  }, [
    context.api,
    location.state,
    location.search,
    location.hash,
    location.pathname,
    modalPrefill,
    dispatch,
    navigate,
    handleHeapDumpAnalysis,
    setSelectedHeapDump,
  ]);

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
  }, [addSubscription, context.notificationChannel]);

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

  React.useEffect(() => {
    addSubscription(
      context.target.target().subscribe((t) => {
        setTarget(t);
        setAnalysisResult(undefined);
        setSelectedHeapDump('');
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

  const problemFieldsSubTable = React.useCallback(
    (fields: Field[]) => {
      if (fields.length) {
        return (
          <Card>
            <CardTitle>Problem Fields</CardTitle>
            <Table aria-label="Problem Fields" variant={TableVariant.compact}>
              <Thead>
                <Tr>
                  {problemFieldSubColumns.map(({ title }) => (
                    <Th key={`field-header-${title}`}>{title}</Th>
                  ))}
                </Tr>
              </Thead>
              <Tbody>
                {fields.map((f: Field) => (
                  <Tr key={`problem-fields`}>
                    <Td key={`field`} dataLabel={problemFieldSubColumns[0].title}>
                      {f.field ? f.field : 'N/A'}
                    </Td>
                    <Td key={`clazz`} dataLabel={problemFieldSubColumns[1].title}>
                      {f.clazz ? f.clazz : 'N/A'}
                    </Td>
                    <Td key={`overhead`} dataLabel={problemFieldSubColumns[2].title}>
                      {f.overhead ? f.overhead : 'N/A'}
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </Card>
        );
      } else {
        return emptyTableState('No Problem Field Details Found');
      }
    },
    [problemFieldSubColumns],
  );

  const collectionsSubTable = React.useCallback((classAndOvhds: ProblemClass[]) => {
    return (
      <Card>
        <CardTitle>Collection Overhead Details</CardTitle>
        <Table aria-label="Collection Details" variant={TableVariant.compact}>
          <Thead>
            <Tr>
              {collectionsSubColumns.map(({ title }) => (
                <Th key={`field-header-${title}`}>{title}</Th>
              ))}
            </Tr>
          </Thead>
          <Tbody>
            {classAndOvhds.map((c: ProblemClass) => (
              <Tr key={`problem-classes`}>
                <Td key={`clazz`} dataLabel={collectionsSubColumns[0].title}>
                  {c.clazz ? c.clazz : 'N/A'}
                </Td>
                <Td key={`problemKind`} dataLabel={collectionsSubColumns[1].title}>
                  {c.problemKind ? c.problemKind : 'N/A'}
                </Td>
                <Td key={`numInstances`} dataLabel={collectionsSubColumns[2].title}>
                  {c.numInstances ? c.numInstances : 'N/A'}
                </Td>
                <Td key={`overhead`} dataLabel={collectionsSubColumns[3].title}>
                  {c.overhead ? c.overhead : 'N/A'}
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </Card>
    );
  }, []);

  const highSizeObjectsSubTable = React.useCallback(
    (classAndSizeCombos: ObjectEntry[]) => {
      if (classAndSizeCombos.length) {
        return (
          <Card>
            <CardTitle>High Size Object Details</CardTitle>
            <Table aria-label="High Size Object" variant={TableVariant.compact}>
              <Thead>
                <Tr>
                  {highSizeObjectsSubColumns.map(({ title }) => (
                    <Th key={`high-size-objects-sub-header-${title}`}>{title}</Th>
                  ))}
                </Tr>
              </Thead>
              <Tbody>
                {classAndSizeCombos.map((c: ObjectEntry) => (
                  <Tr key={`high-size-object-entries`}>
                    <Td key={`clazz`} dataLabel={highSizeObjectsSubColumns[0].title}>
                      {c.clazz ? c.clazz : 'N/A'}
                    </Td>
                    <Td key={`numInstances`} dataLabel={collectionsSubColumns[1].title}>
                      {c.numInstances ? c.numInstances : 'N/A'}
                    </Td>
                    <Td key={`overhead`} dataLabel={collectionsSubColumns[2].title}>
                      {c.overhead ? c.overhead : 'N/A'}
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </Card>
        );
      } else {
        return emptyTableState('No Detailed Information Found');
      }
    },
    [emptyTableState],
  );

  const weakHashMapSubTable = React.useCallback(
    (classes: String[]) => {
      if (classes.length) {
        return (
          <Card>
            <CardTitle>Weak HashMap Classes</CardTitle>
            <Table aria-label="Weak HashMap Classes" variant={TableVariant.compact}>
              <Thead>
                <Tr>
                  <Th key={`weak-hashmap-classes`}>{'Classes'}</Th>
                </Tr>
              </Thead>
              <Tbody>
                {classes.map((c: String) => (
                  <Tr key={`weak-hashmap-subtable`}>
                    <Td key={`class`} dataLabel={'class'}>
                      {c ? c : 'N/A'}
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </Card>
        );
      } else {
        return emptyTableState('No Weak HashMap Classes Found');
      }
    },
    [emptyTableState],
  );

  const dupArraysSubTable = React.useCallback(
    (aggregates: AggregateValue[]) => {
      if (aggregates.length) {
        return (
          <Card>
            <CardTitle>Duplicate Array Overhead Details</CardTitle>
            <Table aria-label="Duplicate Array Details" variant={TableVariant.compact}>
              <Thead>
                <Tr>
                  {dupArraysSubColumns.map(({ title }) => (
                    <Th key={`array-header-${title}`}>{title}</Th>
                  ))}
                </Tr>
              </Thead>
              <Tbody>
                {aggregates.map((c: AggregateValue) => (
                  <Tr key={`dup-array-subtable`}>
                    <Td key={`value`} dataLabel={dupArraysSubColumns[0].title}>
                      {c.value ? c.value : 'N/A'}
                    </Td>
                    <Td key={`count`} dataLabel={dupArraysSubColumns[1].title}>
                      {c.count ? c.count : 'N/A'}
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </Card>
        );
      } else {
        return emptyTableState('No Duplicate Array Overhead Details Found');
      }
    },
    [emptyTableState],
  );

  const dupStringsSubTable = React.useCallback(
    (aggregates: AggregateValue[]) => {
      if (aggregates.length) {
        return (
          <Card>
            <CardTitle>Duplicate String Overhead Details</CardTitle>
            <Table aria-label="Duplicate String Details" variant={TableVariant.compact}>
              <Thead>
                <Tr>
                  {dupArraysSubColumns.map(({ title }) => (
                    <Th key={`string-header-${title}`}>{title}</Th>
                  ))}
                </Tr>
              </Thead>
              <Tbody>
                {aggregates.map((c: AggregateValue) => (
                  <Tr key={`dup-string-subtable`}>
                    <Td key={`value`} dataLabel={dupArraysSubColumns[0].title}>
                      {c.value ? c.value : 'N/A'}
                    </Td>
                    <Td key={`count`} dataLabel={dupArraysSubColumns[1].title}>
                      {c.count ? c.count : 'N/A'}
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </Card>
        );
      } else {
        return emptyTableState('No Duplicate String Details Found');
      }
    },
    [emptyTableState],
  );

  const displayedCollectionRowData = React.useMemo(() => {
    const rows: CollectionRowData[] = [];
    const sorted = sortResources(
      {
        index: sortBy.index ?? 1,
        direction: sortBy.direction ?? SortByDirection.asc,
      },
      analysisResult?.problemCollections ? analysisResult?.problemCollections : [],
      collectionsColumns,
    );
    if (analysisResult) {
      sorted.forEach((p: ProblemCollection) => {
        rows.push({
          collectionInfo: p,
          cellContents: [p.classAndField, p.definingClass, p.overhead, p.badObjs, p.goodCollections],
          isExpanded: openCollectionRows.some((id) => id === hashCode(p.classAndField)),
          children: collectionsSubTable(p.classAndOvhds),
        });
      });
    }
    return rows;
  }, [openCollectionRows, sortBy, collectionsSubTable, analysisResult]);

  const displayedWeakHashMapRowData = React.useMemo(() => {
    const rows: WeakHashMapRowData[] = [];
    const sorted = sortResources(
      {
        index: sortBy.index ?? 1,
        direction: sortBy.direction ?? SortByDirection.asc,
      },
      analysisResult?.weakHashMapClusters ? analysisResult?.weakHashMapClusters : [],
      dupArraysColumns,
    );
    if (analysisResult) {
      sorted.forEach((d: WeakHashMapEntry) => {
        rows.push({
          weakHashMapInfo: d,
          cellContents: [d.classAndField, d.definingClass, d.overhead, d.badObjs],
          isExpanded: openWeakHashMapRows.some((id) => id === hashCode(d.classAndField)),
          children: weakHashMapSubTable(d.classes),
        });
      });
    }
    return rows;
  }, [openWeakHashMapRows, sortBy, weakHashMapSubTable, analysisResult]);

  const displayedDupArrayRowData = React.useMemo(() => {
    const rows: DupArrayRowData[] = [];
    const sorted = sortResources(
      {
        index: sortBy.index ?? 1,
        direction: sortBy.direction ?? SortByDirection.asc,
      },
      analysisResult?.duplicateArrays ? analysisResult?.duplicateArrays : [],
      dupArraysColumns,
    );
    if (analysisResult) {
      sorted.forEach((d: DuplicateArray) => {
        rows.push({
          dupArrayInfo: d,
          cellContents: [d.classAndField, d.definingClass, d.overhead, d.badObjs, d.nonDupArrays],
          isExpanded: openDupArrayRows.some((id) => id === hashCode(d.classAndField)),
          children: dupArraysSubTable(d.aggregates),
        });
      });
    }
    return rows;
  }, [openDupArrayRows, sortBy, dupArraysSubTable, analysisResult]);

  const displayedDupStringRowData = React.useMemo(() => {
    const rows: DupStringRowData[] = [];
    const sorted = sortResources(
      {
        index: sortBy.index ?? 1,
        direction: sortBy.direction ?? SortByDirection.asc,
      },
      analysisResult?.duplicateStrings ? analysisResult?.duplicateStrings : [],
      dupStringsColumns,
    );
    if (analysisResult) {
      sorted.forEach((d: DuplicateString) => {
        rows.push({
          dupStringInfo: d,
          cellContents: [
            d.classAndField,
            d.definingClass,
            d.overhead,
            d.badObjs,
            d.dupBackingCharArrays,
            d.nonDupStrings,
          ],
          isExpanded: openDupStringRows.some((id) => id === hashCode(d.classAndField)),
          children: dupStringsSubTable(d.aggregates),
        });
      });
    }
    return rows;
  }, [openDupStringRows, sortBy, dupStringsSubTable, analysisResult]);

  const onDupArrayRowToggle = React.useCallback(
    (d: DuplicateArray) => {
      setOpenDupArrayRows((old) => {
        const typeId = hashCode(d.classAndField);
        if (old.some((id) => id === typeId)) {
          return old.filter((id) => id !== typeId);
        }
        return [...old, typeId];
      });
    },
    [setOpenDupArrayRows],
  );

  const onDupStringRowToggle = React.useCallback(
    (d: DuplicateString) => {
      setOpenDupStringRows((old) => {
        const typeId = hashCode(d.classAndField);
        if (old.some((id) => id === typeId)) {
          return old.filter((id) => id !== typeId);
        }
        return [...old, typeId];
      });
    },
    [setOpenDupStringRows],
  );

  const onWeakHashMapRowToggle = React.useCallback(
    (d: WeakHashMapEntry) => {
      setOpenWeakHashMapRows((old) => {
        const typeId = hashCode(d.classAndField);
        if (old.some((id) => id === typeId)) {
          return old.filter((id) => id !== typeId);
        }
        return [...old, typeId];
      });
    },
    [setOpenWeakHashMapRows],
  );

  const dupArraysTable = React.useMemo(() => {
    if (displayedDupArrayRowData.length) {
      return (
        <Table aria-label="Duplicate Arrays" variant={TableVariant.compact}>
          <Thead>
            <Tr>
              <Th key="table-header-expand" />
              {dupArraysColumns.map(({ title }) => (
                <Th key={`dup-arrays-header-${title}`}>{title}</Th>
              ))}
            </Tr>
          </Thead>
          {displayedDupArrayRowData.map((c: DupArrayRowData, index) => (
            <Tbody key={`dup-arrays-row-pair-${index}`} isExpanded={c.isExpanded}>
              <Tr key={`dup-arrays-row-${index}`}>
                <Td
                  key={`dup-arrays-row-expandable`}
                  expand={{
                    rowIndex: index,
                    isExpanded: c.isExpanded,
                    expandId: `expandable-dup-arrays-row-${index}`,
                    onToggle: () => onDupArrayRowToggle(c.dupArrayInfo),
                  }}
                />
                <Td key={`collection-class-and-field-${index}`} colSpan={1} dataLabel={dupArraysColumns[0].title}>
                  {c.dupArrayInfo.classAndField !== undefined ? c.dupArrayInfo.classAndField : 'N/A'}
                </Td>
                <Td key={`dup-array-defining-class-${index}`} colSpan={1} dataLabel={dupArraysColumns[1].title}>
                  {c.dupArrayInfo.definingClass !== undefined ? c.dupArrayInfo.definingClass : 'N/A'}
                </Td>
                <Td key={`dup-array-overhead-${index}`} colSpan={1} dataLabel={dupArraysColumns[2].title}>
                  {c.dupArrayInfo.overhead !== undefined ? c.dupArrayInfo.overhead : 'N/A'}
                </Td>
                <Td key={`dup-array-bad-objs-${index}`} colSpan={1} dataLabel={dupArraysColumns[3].title}>
                  {c.dupArrayInfo.badObjs != null ? c.dupArrayInfo.badObjs : 'N/A'}
                </Td>
                <Td key={`dup-array-non-dup-arrays-${index}`} colSpan={1} dataLabel={dupArraysColumns[4].title}>
                  {c.dupArrayInfo.nonDupArrays !== undefined ? c.dupArrayInfo.nonDupArrays : 'N/A'}
                </Td>
              </Tr>
              <Tr key={`dup-array-row-${index}-expandable-child`} isExpanded={c.isExpanded}>
                <Td dataLabel="dup-array-details" colSpan={dupArraysColumns.length}>
                  <ExpandableRowContent>{c.children}</ExpandableRowContent>
                </Td>
              </Tr>
            </Tbody>
          ))}
        </Table>
      );
    } else {
      return emptyTableState('No Duplicate Arrays Found');
    }
  }, [displayedDupArrayRowData, emptyTableState, onDupArrayRowToggle]);

  const weakHashMapTable = React.useMemo(() => {
    if (displayedWeakHashMapRowData.length) {
      return (
        <Table aria-label="Weak HashMaps" variant={TableVariant.compact}>
          <Thead>
            <Tr>
              <Th key="table-header-expand" />
              {weakHashMapColumns.map(({ title }) => (
                <Th key={`weak-hashmaps-header-${title}`}>{title}</Th>
              ))}
            </Tr>
          </Thead>
          {displayedWeakHashMapRowData.map((c: WeakHashMapRowData, index) => (
            <Tbody key={`weak-hashmap-row-pair-${index}`} isExpanded={c.isExpanded}>
              <Tr key={`weak-hashmap-row-${index}`}>
                <Td
                  key={`weak-hashmap-row-expandable`}
                  expand={{
                    rowIndex: index,
                    isExpanded: c.isExpanded,
                    expandId: `expandable-weak-hashmap-row-${index}`,
                    onToggle: () => onWeakHashMapRowToggle(c.weakHashMapInfo),
                  }}
                />
                <Td key={`weak-hashmap-class-and-field-${index}`} colSpan={1} dataLabel={weakHashMapColumns[0].title}>
                  {c.weakHashMapInfo.classAndField !== undefined ? c.weakHashMapInfo.classAndField : 'N/A'}
                </Td>
                <Td key={`weak-hashmap-defining-class-${index}`} colSpan={1} dataLabel={weakHashMapColumns[1].title}>
                  {c.weakHashMapInfo.definingClass !== undefined ? c.weakHashMapInfo.definingClass : 'N/A'}
                </Td>
                <Td key={`weak-hashmap-overhead-${index}`} colSpan={1} dataLabel={weakHashMapColumns[2].title}>
                  {c.weakHashMapInfo.overhead !== undefined ? c.weakHashMapInfo.overhead : 'N/A'}
                </Td>
                <Td key={`weak-hashmap-bad-objs-${index}`} colSpan={1} dataLabel={dupStringsColumns[3].title}>
                  {c.weakHashMapInfo.badObjs != null ? c.weakHashMapInfo.badObjs : 'N/A'}
                </Td>
              </Tr>
              <Tr key={`weak-hashmap-row-${index}-expandable-child`} isExpanded={c.isExpanded}>
                <Td dataLabel="weak-hashmap-details" colSpan={weakHashMapColumns.length}>
                  <ExpandableRowContent>{c.children}</ExpandableRowContent>
                </Td>
              </Tr>
            </Tbody>
          ))}
        </Table>
      );
    } else {
      return emptyTableState('No Weak HashMaps Found');
    }
  }, [displayedWeakHashMapRowData, emptyTableState, onWeakHashMapRowToggle]);

  const dupStringsTable = React.useMemo(() => {
    if (displayedDupStringRowData.length) {
      return (
        <Table aria-label="Duplicate Strings" variant={TableVariant.compact}>
          <Thead>
            <Tr>
              <Th key="table-header-expand" />
              {dupStringsColumns.map(({ title }) => (
                <Th key={`dup-strings-header-${title}`}>{title}</Th>
              ))}
            </Tr>
          </Thead>
          {displayedDupStringRowData.map((c: DupStringRowData, index) => (
            <Tbody key={`dup-strings-row-pair-${index}`} isExpanded={c.isExpanded}>
              <Tr key={`dup-strings-row-${index}`}>
                <Td
                  key={`dup-strings-row-expandable`}
                  expand={{
                    rowIndex: index,
                    isExpanded: c.isExpanded,
                    expandId: `expandable-dup-strings-row-${index}`,
                    onToggle: () => onDupStringRowToggle(c.dupStringInfo),
                  }}
                />
                <Td key={`dup-string-class-and-field-${index}`} colSpan={1} dataLabel={dupStringsColumns[0].title}>
                  {c.dupStringInfo.classAndField !== undefined ? c.dupStringInfo.classAndField : 'N/A'}
                </Td>
                <Td key={`dup-array-defining-class-${index}`} colSpan={1} dataLabel={dupStringsColumns[1].title}>
                  {c.dupStringInfo.definingClass !== undefined ? c.dupStringInfo.definingClass : 'N/A'}
                </Td>
                <Td key={`dup-array-overhead-${index}`} colSpan={1} dataLabel={dupStringsColumns[2].title}>
                  {c.dupStringInfo.overhead !== undefined ? c.dupStringInfo.overhead : 'N/A'}
                </Td>
                <Td key={`dup-array-bad-objs-${index}`} colSpan={1} dataLabel={dupStringsColumns[3].title}>
                  {c.dupStringInfo.badObjs != null ? c.dupStringInfo.badObjs : 'N/A'}
                </Td>
                <Td key={`dup-string-backing-char-arrays-${index}`} colSpan={1} dataLabel={dupStringsColumns[4].title}>
                  {c.dupStringInfo.dupBackingCharArrays !== undefined ? c.dupStringInfo.dupBackingCharArrays : 'N/A'}
                </Td>
                <Td key={`dup-array-non-dup-strings-${index}`} colSpan={1} dataLabel={dupStringsColumns[5].title}>
                  {c.dupStringInfo.nonDupStrings !== undefined ? c.dupStringInfo.nonDupStrings : 'N/A'}
                </Td>
              </Tr>
              <Tr key={`dup-string-row-${index}-expandable-child`} isExpanded={c.isExpanded}>
                <Td dataLabel="dup-string-details" colSpan={dupStringsColumns.length}>
                  <ExpandableRowContent>{c.children}</ExpandableRowContent>
                </Td>
              </Tr>
            </Tbody>
          ))}
        </Table>
      );
    } else {
      return emptyTableState('No Duplicate Strings Found');
    }
  }, [displayedDupStringRowData, emptyTableState, onDupStringRowToggle]);

  const onCollectionRowToggle = React.useCallback(
    (d: ProblemCollection) => {
      setOpenCollectionRows((old) => {
        const typeId = hashCode(d.classAndField);
        if (old.some((id) => id === typeId)) {
          return old.filter((id) => id !== typeId);
        }
        return [...old, typeId];
      });
    },
    [setOpenCollectionRows],
  );

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
  }, [analysisResult]);

  const collectionsTable = React.useMemo(() => {
    if (displayedCollectionRowData) {
      return (
        <Table aria-label="Problem Collections" variant={TableVariant.compact}>
          <Thead>
            <Tr>
              <Th key="table-header-expand" />
              {collectionsColumns.map(({ title }) => (
                <Th key={`collections-header-${title}`}>{title}</Th>
              ))}
            </Tr>
          </Thead>
          {displayedCollectionRowData.map((c: CollectionRowData, index) => (
            <Tbody key={`collection-row-pair-${index}`} isExpanded={c.isExpanded}>
              <Tr key={`collection-row-${index}`}>
                <Td
                  key={`collection-row-expandable`}
                  expand={{
                    rowIndex: index,
                    isExpanded: c.isExpanded,
                    expandId: `expandable-collection-row-${index}`,
                    onToggle: () => onCollectionRowToggle(c.collectionInfo),
                  }}
                />
                <Td key={`collection-class-and-field-${index}`} colSpan={1} dataLabel={collectionsColumns[0].title}>
                  {c.collectionInfo.classAndField !== undefined ? c.collectionInfo.classAndField : 'N/A'}
                </Td>
                <Td key={`collection-defining-class-${index}`} colSpan={1} dataLabel={collectionsColumns[1].title}>
                  {c.collectionInfo.definingClass !== undefined ? c.collectionInfo.definingClass : 'N/A'}
                </Td>
                <Td key={`collection-overhead-${index}`} colSpan={1} dataLabel={collectionsColumns[2].title}>
                  {c.collectionInfo.overhead !== undefined ? c.collectionInfo.overhead : 'N/A'}
                </Td>
                <Td key={`collection-bad-objs-${index}`} colSpan={1} dataLabel={collectionsColumns[3].title}>
                  {c.collectionInfo.badObjs != null ? c.collectionInfo.badObjs : 'N/A'}
                </Td>
                <Td key={`collection-goodCollections-${index}`} colSpan={1} dataLabel={collectionsColumns[4].title}>
                  {c.collectionInfo.goodCollections !== undefined ? c.collectionInfo.goodCollections : 'N/A'}
                </Td>
              </Tr>
              <Tr key={`collection-row-${index}-expandable-child`} isExpanded={c.isExpanded}>
                <Td dataLabel="collection-details" colSpan={collectionsColumns.length}>
                  <ExpandableRowContent>{c.children}</ExpandableRowContent>
                </Td>
              </Tr>
            </Tbody>
          ))}
        </Table>
      );
    } else {
      return emptyTableState('No Problem Collections Found');
    }
  }, [displayedCollectionRowData, emptyTableState, onCollectionRowToggle]);

  const onProblemFieldRowToggle = React.useCallback(
    (d: ProblemField) => {
      setOpenProblemFieldRows((old) => {
        const typeId = hashCode(d.clazz);
        if (old.some((id) => id === typeId)) {
          return old.filter((id) => id !== typeId);
        }
        return [...old, typeId];
      });
    },
    [setOpenProblemFieldRows],
  );

  const onHighSizeObjsRowToggle = React.useCallback(
    (d: HighSizeObjects) => {
      setOpenHighSizeObjRows((old) => {
        const typeId = hashCode(d.classAndField);
        if (old.some((id) => id === typeId)) {
          return old.filter((id) => id !== typeId);
        }
        return [...old, typeId];
      });
    },
    [setOpenHighSizeObjRows],
  );

  const displayedProblemFieldRowData = React.useMemo(() => {
    const rows: ProblemFieldRowData[] = [];
    const sorted = sortResources(
      {
        index: sortBy.index ?? 1,
        direction: sortBy.direction ?? SortByDirection.asc,
      },
      analysisResult?.nullProblemFields ? analysisResult.nullProblemFields : [],
      problemFieldColumns,
    );
    if (analysisResult) {
      sorted.forEach((d: ProblemField) => {
        rows.push({
          problemFieldsInfo: d,
          cellContents: [d.clazz, d.numInstances, d.overhead, d.problemKind],
          isExpanded: openProblemFieldRows.some((id) => id === hashCode(d.clazz)),
          children: problemFieldsSubTable(d.fields),
        });
      });
    }
    return rows;
  }, [openProblemFieldRows, sortBy, problemFieldsSubTable, analysisResult]);

  const displayedHighSizeObjsRowData = React.useMemo(() => {
    const rows: HighSizeObjsRowData[] = [];
    const sorted = sortResources(
      {
        index: sortBy.index ?? 1,
        direction: sortBy.direction ?? SortByDirection.asc,
      },
      analysisResult?.highSizeObjects ? analysisResult.highSizeObjects : [],
      highSizeObjectsColumns,
    );
    if (analysisResult) {
      sorted.forEach((d: HighSizeObjects) => {
        rows.push({
          highSizeObjsInfo: d,
          cellContents: [d.classAndField, d.badObjs, d.overhead],
          isExpanded: openHighSizeObjRows.some((id) => id === hashCode(d.classAndField)),
          children: highSizeObjectsSubTable(d.classAndSizeCombos),
        });
      });
    }
    return rows;
  }, [openHighSizeObjRows, sortBy, highSizeObjectsSubTable, analysisResult]);

  const problemFieldTable = React.useMemo(() => {
    if (displayedProblemFieldRowData.length) {
      return (
        <Table aria-label="Problem Field Table" variant={TableVariant.compact}>
          <Thead>
            <Tr>
              <Th key="table-header-expand" />
              {problemFieldColumns.map(({ title, sortable }, index) => (
                <Th key={`problem-field-header-${title}`} sort={sortable ? getSortParams(index) : undefined}>
                  {title}
                </Th>
              ))}
            </Tr>
          </Thead>
          {displayedProblemFieldRowData.map((d: ProblemFieldRowData, index) => (
            <Tbody key={`field-row-pair-${index}`} isExpanded={d.isExpanded}>
              <Tr key={`field-row-${index}`}>
                <Td
                  key={`field-row-expandable`}
                  expand={{
                    rowIndex: index,
                    isExpanded: d.isExpanded,
                    expandId: `expandable-field-row-${index}`,
                    onToggle: () => onProblemFieldRowToggle(d.problemFieldsInfo),
                  }}
                />
                <Td key={`field-clazz-${index}`} colSpan={1} dataLabel={problemFieldColumns[0].title}>
                  {d.problemFieldsInfo.clazz ? d.problemFieldsInfo.clazz : 'N/A'}
                </Td>
                <Td key={`field-instances-${index}`} colSpan={1} dataLabel={problemFieldColumns[1].title}>
                  {d.problemFieldsInfo.numInstances ? d.problemFieldsInfo.numInstances : 'N/A'}
                </Td>
                <Td key={`field-overhead-${index}`} colSpan={1} dataLabel={problemFieldColumns[2].title}>
                  {d.problemFieldsInfo.overhead !== undefined ? d.problemFieldsInfo.overhead : 'N/A'}
                </Td>
                <Td key={`field-problem-kind-${index}`} colSpan={1} dataLabel={problemFieldColumns[3].title}>
                  {d.problemFieldsInfo.problemKind != null ? d.problemFieldsInfo.problemKind : 'N/A'}
                </Td>
              </Tr>
              <Tr key={`field-row-${index}-expandable-child`} isExpanded={d.isExpanded}>
                <Td dataLabel="field-details" colSpan={problemFieldColumns.length}>
                  <ExpandableRowContent>{d.children}</ExpandableRowContent>
                </Td>
              </Tr>
            </Tbody>
          ))}
        </Table>
      );
    } else {
      return emptyTableState('No Problem Fields Detected');
    }
  }, [displayedProblemFieldRowData, getSortParams, emptyTableState, onProblemFieldRowToggle]);

  const highSizeObjsTable = React.useMemo(() => {
    if (displayedHighSizeObjsRowData.length) {
      return (
        <Table aria-label="High Size Objects Table" variant={TableVariant.compact}>
          <Thead>
            <Tr>
              <Th />
              {highSizeObjectsColumns.map(({ title, sortable }, index) => (
                <Th key={`high-size-objs-header-${title}`} sort={sortable ? getSortParams(index) : undefined}>
                  {title}
                </Th>
              ))}
            </Tr>
          </Thead>
          {displayedHighSizeObjsRowData.map((d: HighSizeObjsRowData, index) => (
            <Tbody key={`high-size-objs-row-pair-${index}`} isExpanded={d.isExpanded}>
              <Tr key={`high-size-objs`}>
                <Td
                  key={`high-size-objs-row-expandable`}
                  expand={{
                    rowIndex: index,
                    isExpanded: d.isExpanded,
                    expandId: `expandable-high-size-objs-row-${index}`,
                    onToggle: () => onHighSizeObjsRowToggle(d.highSizeObjsInfo),
                  }}
                />
                <Td key={`high-size-objs-class`} dataLabel={highSizeObjectsColumns[0].title}>
                  {d.highSizeObjsInfo.classAndField ? d.highSizeObjsInfo.classAndField : 'N/A'}
                </Td>
                <Td key={`high-size-objs-class`} dataLabel={highSizeObjectsColumns[1].title}>
                  {d.highSizeObjsInfo.definingClass ? d.highSizeObjsInfo.definingClass : 'N/A'}
                </Td>
                <Td key={`high-size-objs-overhead`} dataLabel={highSizeObjectsColumns[2].title}>
                  {d.highSizeObjsInfo.overhead ? d.highSizeObjsInfo.overhead : 'N/A'}
                </Td>
                <Td key={`high-size-objs-overhead`} dataLabel={highSizeObjectsColumns[3].title}>
                  {d.highSizeObjsInfo.badObjs ? d.highSizeObjsInfo.badObjs : 'N/A'}
                </Td>
              </Tr>
              <Tr key={`high-size-objs-row-${index}-expandable-child`} isExpanded={d.isExpanded}>
                <Td dataLabel="high-size-objs-subtable" colSpan={highSizeObjectsColumns.length}>
                  <ExpandableRowContent>{d.children}</ExpandableRowContent>
                </Td>
              </Tr>
            </Tbody>
          ))}
        </Table>
      );
    } else {
      return emptyTableState('No High Size Objects Detected');
    }
  }, [displayedHighSizeObjsRowData, getSortParams, emptyTableState, onHighSizeObjsRowToggle]);

  var view;
  if (isAnalysisLoading) {
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
                    title="Class Loader Instances"
                    description="Class Loader Instance Statistics"
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
                    title="Class Loader Classes"
                    description="Class Loader Class Statistics"
                  />
                </CardBody>
              </Card>
            </GridItem>
          </Grid>
        </Tab>
        <Tab eventKey={1} title={<TabTitleText>Problem Fields</TabTitleText>}>
          <Grid hasGutter>
            <GridItem>
              <Card>
                <CardTitle>Problem Fields</CardTitle>
                {problemFieldTable}
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
            <GridItem>{collectionsTable}</GridItem>
          </Grid>
        </Tab>
        <Tab eventKey={4} title={<TabTitleText>Duplicate Arrays</TabTitleText>}>
          <Grid hasGutter>
            <GridItem>
              <Card>
                <CardTitle>Duplicate Arrays</CardTitle>
                {dupArraysTable}
              </Card>
            </GridItem>
          </Grid>
        </Tab>
        <Tab eventKey={5} title={<TabTitleText>High Size Objects</TabTitleText>}>
          <Grid hasGutter>
            <GridItem>
              <Card>
                <CardTitle>High Size Objects</CardTitle>
                {highSizeObjsTable}
              </Card>
            </GridItem>
          </Grid>
        </Tab>
        <Tab eventKey={6} title={<TabTitleText>Duplicate Strings</TabTitleText>}>
          <Grid hasGutter>
            <GridItem>
              <Card>
                <CardTitle>Duplicate Strings</CardTitle>
                {dupStringsTable}
              </Card>
            </GridItem>
          </Grid>
        </Tab>
        <Tab eventKey={7} title={<TabTitleText>Weak HashMaps</TabTitleText>}>
          <Grid hasGutter>
            <GridItem>
              <Card>
                <CardTitle>Weak HashMaps</CardTitle>
                {weakHashMapTable}
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
