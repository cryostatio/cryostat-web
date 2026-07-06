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
  Tooltip,
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
import { ProblemCollection, HeapDumpAnalysisResult, ProblemClass } from './types';

interface CollectionRowData {
  collectionInfo: ProblemCollection;
  isExpanded: boolean;
  cellContents: React.ReactNode[];
  children?: React.ReactNode;
}

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

export interface CollectionsTableProps {
  analysisResult: HeapDumpAnalysisResult;
}

//
// const offset = (currentPage - 1) * perPage;
//const visibleTypes = filterTypesByText.slice(offset, offset + perPage);

export const CollectionsTable: React.FC<CollectionsTableProps> = (props: CollectionsTableProps) => {
  const [sortBy, getSortParams] = useSort();
  const [openCollectionsRows, setOpenCollectionsRows] = React.useState<number[]>([]);
  const [currentPage, setCurrentPage] = React.useState(1);
  const [perPage, setPerPage] = React.useState(10);
  const prevPerPage = React.useRef(10);
  const [filterText, setFilterText] = React.useState('');

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

  const filterCollectionsByText = React.useMemo(() => {
    const reg = new RegExp(_.escapeRegExp(filterText), 'i');
    const withFilters = (t: ProblemCollection) =>
      filterText === '' ||
      reg.test(t.classAndField) ||
      reg.test('' + t.badObjs) ||
      reg.test('' + t.goodCollections) ||
      reg.test('' + t.overhead) ||
      reg.test(t.definingClass);
    return sortResources(
      {
        index: sortBy.index ?? 0,
        direction: sortBy.direction ?? SortByDirection.asc,
      },
      props.analysisResult.problemCollections ? props.analysisResult.problemCollections.filter(withFilters) : [],
      collectionsColumns,
    );
  }, [props.analysisResult, filterText, sortBy]);

  const emptyTableState = React.useCallback((title: string) => {
    return <EmptyState titleText={title} icon={TopologyIcon} headingLevel="h4" />;
  }, []);


  const parseProblemType = React.useCallback((p: string) => {
    if (p == null) {
        return "";
    } else if (p == "EMPTY") {
        return "Collection or standalone array that contains no elements, for which we cannot determine whether it has been used"
    } else if (p == "EMPTY_UNUSED") {
        return "Empty collection that has never contained any elements (because its modCount == 0)"
    } else if (p == "EMPTY_USED") {
        return "Empty collection that previously contained some elements (because its modCount != 0)"
    } else if (p == "SPARSE_SMALL") {
        return "Array-based collection of default or smaller capacity, has less than half slots occupied"
    } else if (p == "SPARSE_LARGE") {
        return "Array-based collection of larger than default capacity, has less than half slots occupied"
    } else if (p == "SPARSE_ARRAY") {
        return "Standalone array has less than half slots occupied"
    } else if (p == "BOXED") {
        return "Collection or standalone array contains boxed numbers"
    } else if (p == "LENGTH_ZERO") {
        return "Standalone array of length 0"
    } else if (p == "LENGTH_ONE") {
        return "Standalone array of length 1"
    } else if (p == "UNUSED_HI_BYTES") {
        return "Standalone primitive array of types short[], char[], int[] or long[] where some of the high bytes are unused in each element"
    } else if (p == "WEAK_MAP_WITH_BACK_REFS") {
        return "A WeakHashMap or subclass, where elements point back to keys"
    } else if (p == "BAR") {
        return "An array of subarrays, where the outer dimension is bigger than inner"
    } else if (p == "LZT") {
        return "Long zero-tail - a primitive array that ends with a series of zeros that is half the array's length or longer"
    } else if (p == "SMALL") {
        return "Small collections, with impl overhead too big compared to workload. They can, in principle, be replaced with arrays (or pairs of arrays for maps)"
    }  else {
        return "N/A"
    }
  }, [])

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
                <Td key={`problemKind`} dataLabel={collectionsSubColumns[1].title} 
                tooltip={
                    <Tooltip content={parseProblemType(c.problemKind)}/>
                }>
                  {c.problemKind ? c.problemKind : 'N/A'}
                </Td>
                <Td key={`numInstances`} dataLabel={collectionsSubColumns[2].title}>
                  {c.numInstances ? c.numInstances : 'N/A'}
                </Td>
                <Td key={`overhead`} dataLabel={collectionsSubColumns[3].title}>
                  {c.overhead ? formatBytes(c.overhead) : 'N/A'}
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </Card>
    );
  }, [parseProblemType]);

  const displayedCollectionRowData = React.useMemo(() => {
    const offset = (currentPage - 1) * perPage;
    const visibleTypes = filterCollectionsByText.slice(offset, offset + perPage);

    const rows: CollectionRowData[] = [];
    const sorted = sortResources(
      {
        index: sortBy.index ?? 1,
        direction: sortBy.direction ?? SortByDirection.asc,
      },
      visibleTypes,
      collectionsColumns,
    );
    if (props.analysisResult) {
      sorted.forEach((p: ProblemCollection) => {
        rows.push({
          collectionInfo: p,
          cellContents: [p.classAndField, p.definingClass, p.overhead, p.badObjs, p.goodCollections],
          isExpanded: openCollectionsRows.some((id) => id === hashCode(p.classAndField)),
          children: collectionsSubTable(p.classAndOvhds),
        });
      });
    }
    return rows;
  }, [
    currentPage,
    perPage,
    filterCollectionsByText,
    openCollectionsRows,
    sortBy,
    collectionsSubTable,
    props.analysisResult,
  ]);

  const onCollectionRowToggle = React.useCallback(
    (d: ProblemCollection) => {
      setOpenCollectionsRows((old) => {
        const typeId = hashCode(d.classAndField);
        if (old.some((id) => id === typeId)) {
          return old.filter((id) => id !== typeId);
        }
        return [...old, typeId];
      });
    },
    [setOpenCollectionsRows],
  );

  const collectionsTable = React.useMemo(() => {
    if (displayedCollectionRowData) {
      return (
        <Table aria-label="Problem Collections" variant={TableVariant.compact}>
          <Toolbar id="collections-toolbar">
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
                  itemCount={filterCollectionsByText.length}
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
              {collectionsColumns.map(({ title, sortable }, index) => (
                <Th key={`collections-header-${title}`} sort={sortable ? getSortParams(index) : undefined}>
                  {title}
                </Th>
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
                  {c.collectionInfo.overhead !== undefined ? formatBytes(c.collectionInfo.overhead) : 'N/A'}
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
  }, [currentPage, filterCollectionsByText.length, filterText, getSortParams, onCurrentPage, onFilterTextChange, onPerPage, perPage, displayedCollectionRowData, emptyTableState, onCollectionRowToggle]);

  return <>{collectionsTable}</>;
};
