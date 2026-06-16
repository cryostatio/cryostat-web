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
import { HeapDump, NullableTarget, Target } from '@app/Shared/Services/api.types';
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
  Stack,
  StackItem,
} from '@patternfly/react-core';
import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useLocation, useNavigate } from 'react-router-dom-v5-compat';
import { concatMap, EMPTY, finalize, first, of } from 'rxjs';
import { ClassAndSizeCombo, HeapDumpAnalysisResult, HighSizeObjects, ProblemFieldsEntry } from './types';
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
  problemFieldsInfo: ProblemFieldsEntry;
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

const collectionsColumns: TableColumn[] = [
  {
    title: 'Class',
    keyPaths: ['clazz'],
    sortable: true,
  },
  {
    title: 'Problem Kind',
    keyPaths: ['problemKind'],
    sortable: true,
  },
  {
    title: 'Instances',
    keyPaths: ['instances'],
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
    title: 'Element Type',
    keyPaths: ['elementType'],
    sortable: true,
  },
  {
    title: 'Size',
    keyPaths: ['size'],
    sortable: true,
  },
];

const highSizeObjectsColumns: TableColumn[] = [
  {
    title: 'Class',
    keyPaths: ['clazz'],
    sortable: true,
  },
  {
    title: 'Instances',
    keyPaths: ['instances'],
    sortable: true,
  },
  {
    title: 'Size/Overhead',
    keyPaths: ['sizeOrOvhd'],
    sortable: true,
  },
];

const problemFieldColumns: TableColumn[] = [
  {
    title: 'Class',
    keyPaths: ['class'],
    sortable: true,
  },
  {
    title: 'Instances',
    keyPaths: ['numInstances'],
    sortable: true,
  },
  {
    title: 'Overhead',
    keyPaths: ['allProblemFieldsOvhd'],
    sortable: true,
  },
  {
    title: 'Status',
    keyPaths: ['status'],
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
  const [openHighSizeObjRows, setOpenHighSizeObjRows] = React.useState<number[]>([]);

  const selectedHeapDumpJvmIdRef = React.useRef<string>();

  const targetAsObs = React.useMemo(() => of(target), [target]);

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
      context.api.analyzeHeapDump(jvmId, heapDumpId).subscribe({ next: handleHeapDumpAnalysis });
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
            .analyzeHeapDump(selectedJvmId, heapDump)
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
                return context.api.analyzeHeapDump(target.jvmId ? target.jvmId : '', heapDump);
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

  const problemFieldsSubTable = React.useCallback((fields: string[], classes: string[], overhead: number[]) => {
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
            <Tr key={`problem-fields`}>
              {fields.map((s: string) => (
                <Td key={`field`} dataLabel={problemFieldSubColumns[0].title}>
                  {s ? s : 'N/A'}
                </Td>
              ))}
              {classes.map((s: string) => (
                <Td key={`declaring-class`} dataLabel={problemFieldSubColumns[1].title}>
                  {s ? s : 'N/A'}
                </Td>
              ))}
              {overhead.map((n: number) => (
                <Td key={`field`} dataLabel={problemFieldSubColumns[2].title}>
                  {n ? n : 'N/A'}
                </Td>
              ))}
            </Tr>
          </Tbody>
        </Table>
      </Card>
    );
  }, []);

  const highSizeObjsSubTable = React.useCallback((objs: ClassAndSizeCombo[]) => {
    return (
      <Card>
        <CardTitle>Classes and Sizes</CardTitle>
        <Table aria-label="Classes and Sizes" variant={TableVariant.compact}>
          <Thead>
            <Tr>
              {highSizeObjectsColumns.map(({ title }) => (
                <Th key={`field-header-${title}`}>{title}</Th>
              ))}
            </Tr>
          </Thead>
          <Tbody>
            {objs.map((o) => {
              <Tr key={`classes-and-sizes`}>
                <Td key={`clazz`} dataLabel={highSizeObjectsColumns[0].title}>
                  {o.clazz ? o.clazz : 'N/A'}
                </Td>
                <Td key={`numInstances`} dataLabel={highSizeObjectsColumns[1].title}>
                  {o.numInstances ? o.numInstances : 'N/A'}
                </Td>
                <Td key={`sizeOrOvhd`} dataLabel={highSizeObjectsColumns[2].title}>
                  {o.sizeOrOvhd ? o.sizeOrOvhd : 'N/A'}
                </Td>
              </Tr>;
            })}
          </Tbody>
        </Table>
      </Card>
    );
  }, []);

  const objectHistogramTable = React.useMemo(() => {
    return analysisResult?.objectHistogram.map((o) => {
      <Card>
        <CardTitle>Object Histogram</CardTitle>
        <Table aria-label="Object Histogram" variant={TableVariant.compact}>
          <Thead>
            <Tr>
              {objectHistogramTableColumns.map(({ title }) => (
                <Th key={`histogram-header-${title}`}>{title}</Th>
              ))}
            </Tr>
          </Thead>
          <Tbody>
            <Tr key={`object-histogram`}>
              <Td key={`class`} dataLabel={objectHistogramTableColumns[0].title}>
                {o.class ? o.class : 'N/A'}
              </Td>
              <Td key={`instances`} dataLabel={objectHistogramTableColumns[1].title}>
                {o.instances ? o.instances : 'N/A'}
              </Td>
              <Td key={`inclusive`} dataLabel={objectHistogramTableColumns[2].title}>
                {o.inclusiveSize ? o.inclusiveSize : 'N/A'}
              </Td>
              <Td key={`shallow`} dataLabel={objectHistogramTableColumns[3].title}>
                {o.shallowSize ? o.shallowSize : 'N/A'}
              </Td>
            </Tr>
          </Tbody>
        </Table>
      </Card>;
    });
  }, [analysisResult]);

  const collectionsTable = React.useMemo(() => {
    return (
      // 0 is full reference chains, 1 is nearest field
      analysisResult?.collectionClusters[0].map((coll) => {
        <Card>
          <CardTitle>Problem Collections</CardTitle>
          <Content component={ContentVariants.dl}> Good Collections: {coll.numGoodCollections}</Content>
          <Table aria-label="Problem Collections" variant={TableVariant.compact}>
            <Thead>
              <Tr>
                {collectionsColumns.map(({ title }) => (
                  <Th key={`collections-header-${title}`}>{title}</Th>
                ))}
              </Tr>
            </Thead>
            <Tbody>
              {coll.classAndOvhdList.map((o) => {
                <Tr key={`collections`}>
                  <Td key={`class`} dataLabel={collectionsColumns[0].title}>
                    {o.clazz ? o.clazz : 'N/A'}
                  </Td>
                  <Td key={`problemKind`} dataLabel={collectionsColumns[1].title}>
                    {o.problemKind ? o.problemKind : 'N/A'}
                  </Td>
                  <Td key={`instances`} dataLabel={collectionsColumns[2].title}>
                    {o.instances ? o.instances : 'N/A'}
                  </Td>
                  <Td key={`overhead`} dataLabel={collectionsColumns[3].title}>
                    {o.overhead ? o.overhead : 'N/A'}
                  </Td>
                </Tr>;
              })}
            </Tbody>
          </Table>
        </Card>;
      })
    );
  }, [analysisResult]);

  const dupArraysTable = React.useMemo(() => {
    return (
      // 0 is full reference chains, 1 is nearest field
      analysisResult?.duplicateArrayClusters[0].map((cluster) => {
        <Card>
          <CardTitle>Duplicate Arrays</CardTitle>
          <Table aria-label="Duplicate Arrays" variant={TableVariant.compact}>
            <Thead>
              <Tr>
                {dupArraysColumns.map(({ title }) => (
                  <Th key={`dup-arrays-header-${title}`}>{title}</Th>
                ))}
              </Tr>
            </Thead>
            <Tbody>
              {cluster.entries.map((e) => {
                <Tr key={`collections`}>
                  <Td key={`Element Type`} dataLabel={dupArraysColumns[0].title}>
                    {e.elementType ? e.elementType : 'N/A'}
                  </Td>
                  <Td key={`Size`} dataLabel={dupArraysColumns[1].title}>
                    {e.size ? e.size : 'N/A'}
                  </Td>
                </Tr>;
              })}
            </Tbody>
          </Table>
        </Card>;
      })
    );
  }, [analysisResult]);

  const onProblemFieldRowToggle = React.useCallback(
    (d: ProblemFieldsEntry) => {
      setOpenProblemFieldRows((old) => {
        const typeId = hashCode(d.class);
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
        const typeId = hashCode(d.clazz);
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
      sorted.forEach((d: ProblemFieldsEntry) => {
        rows.push({
          problemFieldsInfo: d,
          cellContents: [d.class, d.numInstances, d.allProblemFieldsOvhd, d.status],
          isExpanded: openProblemFieldRows.some((id) => id === hashCode(d.class)),
          children: problemFieldsSubTable(d.problemFieldNames, d.problemFieldDeclaringClasses, d.perFieldOvhd),
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
      analysisResult?.highSizeObjectClusters[0] ? analysisResult.highSizeObjectClusters[0] : [],
      problemFieldColumns,
    );
    if (analysisResult) {
      sorted.forEach((d: HighSizeObjects) => {
        rows.push({
          highSizeObjsInfo: d,
          cellContents: [d.clazz, d.numInstances, d.sizeOrOvhd],
          isExpanded: openHighSizeObjRows.some((id) => id === hashCode(d.clazz)),
          children: highSizeObjsSubTable(d.classAndSizeList),
        });
      });
    }
    return rows;
  }, [openHighSizeObjRows, sortBy, problemFieldsSubTable, analysisResult]);

  const problemFieldTable = React.useMemo(() => {
    if (displayedProblemFieldRowData.length) {
      return displayedProblemFieldRowData.map((d: ProblemFieldRowData, index) => (
        <Table aria-label="Problem Field Table" variant={TableVariant.compact}>
          <Thead>
            <Tr>
              <Th />
              {problemFieldColumns.map(({ title, sortable }, index) => (
                <Th key={`problem-field-header-${title}`} sort={sortable ? getSortParams(index) : undefined}>
                  {title}
                </Th>
              ))}
            </Tr>
          </Thead>
          <Tbody key={`problem-field-row-pair-${index}`} isExpanded={d.isExpanded}>
            <Tr key={`problem-fields`}>
              <Td
                key={`problem-field-row-expandable`}
                expand={{
                  rowIndex: index,
                  isExpanded: d.isExpanded,
                  expandId: `expandable-problem-field-row-${index}`,
                  onToggle: () => onProblemFieldRowToggle(d.problemFieldsInfo),
                }}
              />
              <Td key={`problem-field-class`} dataLabel={problemFieldColumns[0].title}>
                {d.problemFieldsInfo.class ? d.problemFieldsInfo.class : 'N/A'}
              </Td>
              <Td key={`problem-field-instances`} dataLabel={problemFieldColumns[1].title}>
                {d.problemFieldsInfo.numInstances ? d.problemFieldsInfo.numInstances : 'N/A'}
              </Td>
              <Td key={`problem-field-overhead`} dataLabel={problemFieldColumns[2].title}>
                {d.problemFieldsInfo.allProblemFieldsOvhd ? d.problemFieldsInfo.allProblemFieldsOvhd : 'N/A'}
              </Td>
              <Td key={`problem-field-status`} dataLabel={problemFieldColumns[3].title}>
                {d.problemFieldsInfo.status ? d.problemFieldsInfo.status : 'N/A'}
              </Td>
            </Tr>
            <Tr key={`problem-field-row-${index}-expandable-child`} isExpanded={d.isExpanded}>
              <Td dataLabel="problem-field-subtable" colSpan={problemFieldColumns.length}>
                <ExpandableRowContent>{d.children}</ExpandableRowContent>
              </Td>
            </Tr>
          </Tbody>
        </Table>
      ));
    } else {
      return emptyTableState('No Problem Fields Detected');
    }
  }, [displayedProblemFieldRowData, getSortParams, emptyTableState, onProblemFieldRowToggle]);

  const highSizeObjsTable = React.useMemo(() => {
    if (displayedHighSizeObjsRowData.length) {
      return displayedHighSizeObjsRowData.map((d: HighSizeObjsRowData, index) => (
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
                {d.highSizeObjsInfo.clazz ? d.highSizeObjsInfo.clazz : 'N/A'}
              </Td>
              <Td key={`high-size-objs-instances`} dataLabel={highSizeObjectsColumns[1].title}>
                {d.highSizeObjsInfo.numInstances ? d.highSizeObjsInfo.numInstances : 'N/A'}
              </Td>
              <Td key={`high-size-objs-overhead`} dataLabel={highSizeObjectsColumns[2].title}>
                {d.highSizeObjsInfo.sizeOrOvhd ? d.highSizeObjsInfo.sizeOrOvhd : 'N/A'}
              </Td>
            </Tr>
            <Tr key={`high-size-objs-row-${index}-expandable-child`} isExpanded={d.isExpanded}>
              <Td dataLabel="high-size-objs-subtable" colSpan={highSizeObjectsColumns.length}>
                <ExpandableRowContent>{d.children}</ExpandableRowContent>
              </Td>
            </Tr>
          </Tbody>
        </Table>
      ));
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
        <GridItem>
          <Card>
            <CardTitle>Problem Fields</CardTitle>
            {problemFieldTable}
          </Card>
        </GridItem>
        <GridItem>
          <Card>
            <CardTitle>Object Histogram</CardTitle>
            {objectHistogramTable}
          </Card>
        </GridItem>
        <GridItem>
          <Card>
            <CardTitle>Collection Custers</CardTitle>
            {collectionsTable}
          </Card>
        </GridItem>
        <GridItem>
          <Card>
            <CardTitle>Duplicate Array Custers</CardTitle>
            {dupArraysTable}
          </Card>
        </GridItem>
        <GridItem>
          <Card>
            <CardTitle>High Size Object Custers</CardTitle>
            {dupArraysTable}
          </Card>
        </GridItem>
      </Grid>
    );
  }

  return (
    <TargetView {...props} pageTitle="Visualize Heap Dumps">
      {selector}
      {view}
    </TargetView>
  );
};
