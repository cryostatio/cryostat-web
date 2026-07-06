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
import { HeapDumpAnalysisResult, WeakHashMapEntry } from './types';

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

export interface WeakHashMapsTableProps {
  analysisResult: HeapDumpAnalysisResult;
}

export const WeakHashMapsTable: React.FC<WeakHashMapsTableProps> = (props: WeakHashMapsTableProps) => {
  const [sortBy, getSortParams] = useSort();
  const [openWeakHashMapRows, setOpenWeakHashMapRows] = React.useState<number[]>([]);
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

  const filterHashMapsByText = React.useMemo(() => {
    const reg = new RegExp(_.escapeRegExp(filterText), 'i');
    const withFilters = (t: WeakHashMapEntry) =>
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
      props.analysisResult.weakHashMapClusters ? props.analysisResult.weakHashMapClusters.filter(withFilters) : [],
      weakHashMapColumns,
    );
  }, [props.analysisResult, filterText, sortBy]);

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

  const displayedWeakHashMapRowData = React.useMemo(() => {
    const offset = (currentPage - 1) * perPage;
    const visibleTypes = filterHashMapsByText.slice(offset, offset + perPage);

    const rows: WeakHashMapRowData[] = [];
    const sorted = sortResources(
      {
        index: sortBy.index ?? 1,
        direction: sortBy.direction ?? SortByDirection.asc,
      },
      visibleTypes,
      weakHashMapColumns,
    );
    if (props.analysisResult) {
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
  }, [
    currentPage,
    perPage,
    filterHashMapsByText,
    openWeakHashMapRows,
    sortBy,
    weakHashMapSubTable,
    props.analysisResult,
  ]);

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

  const weakHashMapTable = React.useMemo(() => {
    if (displayedWeakHashMapRowData.length) {
      return (
        <Table aria-label="Weak HashMaps" variant={TableVariant.compact}>
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
                  itemCount={filterHashMapsByText.length}
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
              {weakHashMapColumns.map(({ title, sortable }, index) => (
                <Th key={`weak-hashmaps-header-${title}`} sort={sortable ? getSortParams(index) : undefined}>
                  {title}
                </Th>
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
                  {c.weakHashMapInfo.overhead !== undefined ? formatBytes(c.weakHashMapInfo.overhead) : 'N/A'}
                </Td>
                <Td key={`weak-hashmap-bad-objs-${index}`} colSpan={1} dataLabel={weakHashMapColumns[3].title}>
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
  }, [currentPage, filterHashMapsByText.length, filterText, getSortParams, onCurrentPage, onFilterTextChange, onPerPage, perPage, displayedWeakHashMapRowData, emptyTableState, onWeakHashMapRowToggle]);

  return <>{weakHashMapTable}</>;
};
