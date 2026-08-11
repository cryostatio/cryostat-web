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

import { useSort } from '@app/utils/hooks/useSort';
import { formatBytes, hashCode, sortResources, TableColumn } from '@app/utils/utils';
import {
  Card,
  CardTitle,
  EmptyState,
  Pagination,
  SearchInput,
  Toolbar,
  ToolbarContent,
  ToolbarItem,
  ToolbarItemVariant,
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
import { t } from 'i18next';
import _ from 'lodash';
import React from 'react';
import { HeapDumpAnalysisResult, HighSizeObjects, ObjectEntry } from './types';

interface HighSizeObjsRowData {
  highSizeObjsInfo: HighSizeObjects;
  isExpanded: boolean;
  cellContents: React.ReactNode[];
  children?: React.ReactNode;
}

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

export interface HighSizeObjectsTableProps {
  analysisResult: HeapDumpAnalysisResult;
}

export const HighSizeObjectsTable: React.FC<HighSizeObjectsTableProps> = (props: HighSizeObjectsTableProps) => {
  const [sortBy, getSortParams] = useSort();
  const [openHighSizeObjRows, setOpenHighSizeObjRows] = React.useState<number[]>([]);
  const [currentPage, setCurrentPage] = React.useState(1);
  const [perPage, setPerPage] = React.useState(10);
  const prevPerPage = React.useRef(10);
  const [filterText, setFilterText] = React.useState('');

  const emptyTableState = React.useCallback((title: string) => {
    return <EmptyState titleText={title} icon={TopologyIcon} headingLevel="h4" />;
  }, []);

  const onCurrentPage = React.useCallback(
    (_: MouseEvent | React.MouseEvent, currentPage: number) => {
      setCurrentPage(currentPage);
    },
    [setCurrentPage],
  );

  const onPerPage = React.useCallback(
    (_: MouseEvent | React.MouseEvent, perPage: number) => {
      const offset = (currentPage - 1) * prevPerPage.current;
      prevPerPage.current = perPage;
      setPerPage(perPage);
      setCurrentPage(1 + Math.floor(offset / perPage));
    },
    [currentPage, prevPerPage, setPerPage, setCurrentPage],
  );

  const onFilterTextChange = React.useCallback(
    (_, filterText: string) => {
      setFilterText(filterText);
      setCurrentPage(1);
    },
    [setFilterText, setCurrentPage],
  );

  const filterObjectsByText = React.useMemo(() => {
    const reg = new RegExp(_.escapeRegExp(filterText), 'i');
    const withFilters = (t: HighSizeObjects) =>
      filterText === '' ||
      reg.test(t.classAndField) ||
      reg.test('' + t.badObjs) ||
      reg.test('' + t.overhead) ||
      reg.test(t.definingClass);
    return sortResources(
      {
        index: sortBy.index ?? 0,
        direction: sortBy.direction ?? SortByDirection.asc,
      },
      props.analysisResult.highSizeObjects ? props.analysisResult.highSizeObjects.filter(withFilters) : [],
      highSizeObjectsColumns,
    );
  }, [props.analysisResult, filterText, sortBy]);

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
                    <Td key={`numInstances`} dataLabel={highSizeObjectsSubColumns[1].title}>
                      {c.numInstances ? c.numInstances : 'N/A'}
                    </Td>
                    <Td key={`overhead`} dataLabel={highSizeObjectsSubColumns[2].title}>
                      {c.overhead ? formatBytes(c.overhead) : 'N/A'}
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

  const displayedHighSizeObjsRowData = React.useMemo(() => {
    const offset = (currentPage - 1) * perPage;
    const visibleTypes = filterObjectsByText.slice(offset, offset + perPage);

    const rows: HighSizeObjsRowData[] = [];
    const sorted = sortResources(
      {
        index: sortBy.index ?? 1,
        direction: sortBy.direction ?? SortByDirection.asc,
      },
      visibleTypes,
      highSizeObjectsColumns,
    );
    if (props.analysisResult) {
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
  }, [
    currentPage,
    perPage,
    filterObjectsByText,
    openHighSizeObjRows,
    sortBy,
    highSizeObjectsSubTable,
    props.analysisResult,
  ]);

  const highSizeObjsTable = React.useMemo(() => {
    if (displayedHighSizeObjsRowData.length) {
      return (
        <>
          <Toolbar id="event-types-toolbar">
            <ToolbarContent>
              <ToolbarItem>
                <SearchInput
                  style={{ minWidth: '38ch' }}
                  name="eventFilter"
                  id="eventFilter"
                  type="search"
                  placeholder={t('CollectionsTable.SEARCH_PLACEHOLDER')}
                  aria-label={t('CollectionsTable.ARIA_LABELS.SEARCH_INPUT')}
                  onChange={onFilterTextChange}
                  value={filterText}
                />
              </ToolbarItem>
              <ToolbarItem variant={ToolbarItemVariant.pagination}>
                <Pagination
                  itemCount={filterObjectsByText.length}
                  page={currentPage}
                  perPage={perPage}
                  onSetPage={onCurrentPage}
                  widgetId="collections-pagination"
                  onPerPageSelect={onPerPage}
                />
              </ToolbarItem>
            </ToolbarContent>
          </Toolbar>
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
                  <Td key={`high-size-objs-class-and-field`} dataLabel={highSizeObjectsColumns[0].title}>
                    {d.highSizeObjsInfo.classAndField ? d.highSizeObjsInfo.classAndField : 'N/A'}
                  </Td>
                  <Td key={`high-size-objs-class`} dataLabel={highSizeObjectsColumns[1].title}>
                    {d.highSizeObjsInfo.definingClass ? d.highSizeObjsInfo.definingClass : 'N/A'}
                  </Td>
                  <Td key={`high-size-objs-overhead`} dataLabel={highSizeObjectsColumns[2].title}>
                    {d.highSizeObjsInfo.overhead ? formatBytes(d.highSizeObjsInfo.overhead) : 'N/A'}
                  </Td>
                  <Td key={`high-size-objs-bad-objs`} dataLabel={highSizeObjectsColumns[3].title}>
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
        </>
      );
    } else {
      return emptyTableState('No High Size Objects Detected');
    }
  }, [
    currentPage,
    filterObjectsByText.length,
    filterText,
    onCurrentPage,
    onFilterTextChange,
    onPerPage,
    perPage,
    displayedHighSizeObjsRowData,
    getSortParams,
    emptyTableState,
    onHighSizeObjsRowToggle,
  ]);

  return <>{highSizeObjsTable}</>;
};
