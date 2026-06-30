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
import { hashCode, sortResources, TableColumn } from '@app/utils/utils';
import {
  ProblemCollection,
  HeapDumpAnalysisResult,
  ProblemField,
  ProblemClass,
  HighSizeObjects,
  ObjectEntry,
  DuplicateArray,
  AggregateValue,
} from './types';
import React from 'react';
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
import { useSort } from '@app/utils/hooks/useSort';
import { t } from 'i18next';
import _ from 'lodash';
import { TopologyIcon } from '@patternfly/react-icons';

interface DupArrayRowData {
  dupArrayInfo: DuplicateArray;
  isExpanded: boolean;
  cellContents: React.ReactNode[];
  children?: React.ReactNode;
}

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

export interface DupArraysTableProps {
  analysisResult: HeapDumpAnalysisResult;
}

export const DupArraysTable: React.FC<DupArraysTableProps> = (props: DupArraysTableProps) => {
  const [sortBy, getSortParams] = useSort();
  const [openDupArraysRows, setOpenDupArraysRows] = React.useState<number[]>([]);
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

  const filterArraysByText = React.useMemo(() => {
    const reg = new RegExp(_.escapeRegExp(filterText), 'i');
    const withFilters = (t: DuplicateArray) =>
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
      props.analysisResult.duplicateArrays.filter(withFilters),
      dupArraysColumns,
    );
  }, [props.analysisResult, filterText, sortBy]);

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

  const displayedDupArrayRowData = React.useMemo(() => {
    const offset = (currentPage - 1) * perPage;
    const visibleTypes = filterArraysByText.slice(offset, offset + perPage);

    const rows: DupArrayRowData[] = [];
    const sorted = sortResources(
      {
        index: sortBy.index ?? 1,
        direction: sortBy.direction ?? SortByDirection.asc,
      },
      visibleTypes,
      dupArraysColumns,
    );
    if (props.analysisResult) {
      sorted.forEach((d: DuplicateArray) => {
        rows.push({
          dupArrayInfo: d,
          cellContents: [d.classAndField, d.definingClass, d.overhead, d.badObjs, d.nonDupArrays],
          isExpanded: openDupArraysRows.some((id) => id === hashCode(d.classAndField)),
          children: dupArraysSubTable(d.aggregates),
        });
      });
    }
    return rows;
  }, [openDupArraysRows, sortBy, dupArraysSubTable, props.analysisResult]);

  const onDupArrayRowToggle = React.useCallback(
    (d: DuplicateArray) => {
      setOpenDupArraysRows((old) => {
        const typeId = hashCode(d.classAndField);
        if (old.some((id) => id === typeId)) {
          return old.filter((id) => id !== typeId);
        }
        return [...old, typeId];
      });
    },
    [setOpenDupArraysRows],
  );

  const dupArraysTable = React.useMemo(() => {
    if (displayedDupArrayRowData.length) {
      return (
        <Table aria-label="Duplicate Arrays" variant={TableVariant.compact}>
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
                  itemCount={filterArraysByText.length}
                  page={currentPage}
                  perPage={perPage}
                  onSetPage={onCurrentPage}
                  widgetId="collections-pagination"
                  onPerPageSelect={onPerPage}
                />
              </ToolbarItem>
            </ToolbarContent>
          </Toolbar>
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

  return <>{dupArraysTable}</>;
};
