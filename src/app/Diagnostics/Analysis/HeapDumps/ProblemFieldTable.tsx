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
import { Field, HeapDumpAnalysisResult, ProblemField } from './types';

interface ProblemFieldRowData {
  problemFieldsInfo: ProblemField;
  isExpanded: boolean;
  cellContents: React.ReactNode[];
  children?: React.ReactNode;
}

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

export interface ProblemFieldTableProps {
  analysisResult: HeapDumpAnalysisResult;
}

export const ProblemFieldTable: React.FC<ProblemFieldTableProps> = (props: ProblemFieldTableProps) => {
  const [sortBy, getSortParams] = useSort();
  const [openProblemFieldRows, setOpenProblemFieldRows] = React.useState<number[]>([]);
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

  const filterFieldsByText = React.useMemo(() => {
    const reg = new RegExp(_.escapeRegExp(filterText), 'i');
    const withFilters = (t: ProblemField) =>
      filterText === '' ||
      reg.test(t.clazz) ||
      reg.test('' + t.numInstances) ||
      reg.test('' + t.overhead) ||
      reg.test(t.problemKind);
    return sortResources(
      {
        index: sortBy.index ?? 0,
        direction: sortBy.direction ?? SortByDirection.asc,
      },
      props.analysisResult.nullProblemFields.filter(withFilters),
      problemFieldColumns,
    );
  }, [props.analysisResult, filterText, sortBy]);

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

  const emptyTableState = React.useCallback((title: string) => {
    return <EmptyState titleText={title} icon={TopologyIcon} headingLevel="h4" />;
  }, []);

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
                      {f.overhead ? formatBytes(f.overhead) : 'N/A'}
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
    [emptyTableState],
  );

  const displayedProblemFieldRowData = React.useMemo(() => {
    const offset = (currentPage - 1) * perPage;
    const visibleTypes = filterFieldsByText.slice(offset, offset + perPage);
    const rows: ProblemFieldRowData[] = [];
    const sorted = sortResources(
      {
        index: sortBy.index ?? 1,
        direction: sortBy.direction ?? SortByDirection.asc,
      },
      visibleTypes,
      problemFieldColumns,
    );
    if (props.analysisResult) {
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
  }, [
    currentPage,
    perPage,
    filterFieldsByText,
    openProblemFieldRows,
    sortBy,
    problemFieldsSubTable,
    props.analysisResult,
  ]);

  const parseProblemType = React.useCallback((p: string) => {
    if (p == null) {
      return '';
    } else if (p == 'SOME_FIELDS_UNUSED_HI_BYTES') {
      return 'High overhead due to primitive fields with unused high bytes';
    } else if (p == 'NO_FIELDS') {
      return 'High overhead due to fields that are non-existent';
    } else if (p == 'ALL_FIELDS_EMPTY') {
      return 'High overhead due to all fields being null/zero/non-existent';
    } else if (p == 'SOME_FIELDS_EMPTY') {
      return 'High overhead due to some fields that are null/zero';
    } else {
      return 'N/A';
    }
  }, []);

  const problemFieldTable = React.useMemo(() => {
    if (displayedProblemFieldRowData.length) {
      return (
        <Table aria-label="Problem Field Table" variant={TableVariant.compact}>
          <Toolbar id="event-types-toolbar">
            <ToolbarContent>
              <ToolbarItem>
                <SearchInput
                  style={{ minWidth: '38ch' }}
                  name="eventFilter"
                  id="eventFilter"
                  type="search"
                  placeholder={t('ProblemFieldsTable.SEARCH_PLACEHOLDER')}
                  aria-label={t('ProblemFieldsTable.ARIA_LABELS.SEARCH_INPUT')}
                  onChange={onFilterTextChange}
                  value={filterText}
                />
              </ToolbarItem>
              <ToolbarItem variant={ToolbarItemVariant.pagination}>
                <Pagination
                  itemCount={filterFieldsByText.length}
                  page={currentPage}
                  perPage={perPage}
                  onSetPage={onCurrentPage}
                  widgetId="problem-fields-pagination"
                  onPerPageSelect={onPerPage}
                />
              </ToolbarItem>
            </ToolbarContent>
          </Toolbar>
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
                  {d.problemFieldsInfo.overhead !== undefined ? formatBytes(d.problemFieldsInfo.overhead) : 'N/A'}
                </Td>
                <Td
                  key={`field-problem-kind-${index}`}
                  colSpan={1}
                  dataLabel={problemFieldColumns[3].title}
                  tooltip={<Tooltip content={parseProblemType(d.problemFieldsInfo.problemKind)} />}
                >
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
  }, [
    currentPage,
    filterFieldsByText.length,
    filterText,
    onCurrentPage,
    onFilterTextChange,
    onPerPage,
    parseProblemType,
    perPage,
    displayedProblemFieldRowData,
    getSortParams,
    emptyTableState,
    onProblemFieldRowToggle,
  ]);

  return <>{problemFieldTable}</>;
};
