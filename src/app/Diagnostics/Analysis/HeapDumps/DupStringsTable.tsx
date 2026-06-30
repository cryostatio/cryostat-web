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
  DuplicateString,
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

interface DupStringRowData {
  dupStringInfo: DuplicateString;
  isExpanded: boolean;
  cellContents: React.ReactNode[];
  children?: React.ReactNode;
}

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
    title: 'Non Duplicate Strings',
    keyPaths: ['nonDupStrings'],
    sortable: true,
  },
];

const dupStringsSubColumns: TableColumn[] = [
  {
    title: 'String Value',
    keyPaths: ['value'],
    sortable: true,
  },
  {
    title: 'Duplicate String Count',
    keyPaths: ['count'],
    sortable: true,
  },
];

export interface DupStringsTableProps {
  analysisResult: HeapDumpAnalysisResult;
}

export const DupStringsTable: React.FC<DupStringsTableProps> = (props: DupStringsTableProps) => {
  const [sortBy, getSortParams] = useSort();
  const [openDupStringRows, setOpenDupStringRows] = React.useState<number[]>([]);
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

  const filterStringsByText = React.useMemo(() => {
    const reg = new RegExp(_.escapeRegExp(filterText), 'i');
    const withFilters = (t: DuplicateString) =>
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
      props.analysisResult.duplicateStrings.filter(withFilters),
      dupStringsColumns,
    );
  }, [props.analysisResult, filterText, sortBy]);

  const dupStringsSubTable = React.useCallback(
    (aggregates: AggregateValue[]) => {
      if (aggregates.length) {
        return (
          <Card>
            <CardTitle>Duplicate String Overhead Details</CardTitle>
            <Table aria-label="Duplicate String Details" variant={TableVariant.compact}>
              <Thead>
                <Tr>
                  {dupStringsSubColumns.map(({ title }) => (
                    <Th key={`string-header-${title}`}>{title}</Th>
                  ))}
                </Tr>
              </Thead>
              <Tbody>
                {aggregates.map((c: AggregateValue) => (
                  <Tr key={`dup-string-subtable`}>
                    <Td key={`value`} dataLabel={dupStringsSubColumns[0].title}>
                      {c.value ? c.value : 'N/A'}
                    </Td>
                    <Td key={`count`} dataLabel={dupStringsSubColumns[1].title}>
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

  const displayedDupStringRowData = React.useMemo(() => {
    const offset = (currentPage - 1) * perPage;
    const visibleTypes = filterStringsByText.slice(offset, offset + perPage);

    const rows: DupStringRowData[] = [];
    const sorted = sortResources(
      {
        index: sortBy.index ?? 1,
        direction: sortBy.direction ?? SortByDirection.asc,
      },
      visibleTypes,
      dupStringsColumns,
    );
    if (props.analysisResult) {
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
  }, [openDupStringRows, sortBy, dupStringsSubTable, props.analysisResult]);

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

  const dupStringsTable = React.useMemo(() => {
    if (displayedDupStringRowData.length) {
      return (
        <Table aria-label="Duplicate Strings" variant={TableVariant.compact}>
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
                  itemCount={filterStringsByText.length}
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

  return <>{dupStringsTable}</>;
};
