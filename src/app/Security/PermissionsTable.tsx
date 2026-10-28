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

import { Permission } from '@app/Shared/Services/api.types';
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

interface PermissionRowData {
  permission: Permission;
  cellContents: React.ReactNode[];
}

const permissionsColumns: TableColumn[] = [
  {
    title: 'Resource',
    keyPaths: ['resource'],
    sortable: true,
  },
  {
    title: 'Action',
    keyPaths: ['action'],
    sortable: true,
  },
];

export interface PermissionsTableProps {
  permissions: Permission[];
}

export const PermissionsTable: React.FC<PermissionsTableProps> = (props: PermissionsTableProps) => {
  const [sortBy, getSortParams] = useSort();
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
    const withFilters = (t: Permission) => filterText === '' || reg.test(t.action) || reg.test(t.resource);
    return sortResources(
      {
        index: sortBy.index ?? 0,
        direction: sortBy.direction ?? SortByDirection.asc,
      },
      props.permissions ? props.permissions.filter(withFilters) : [],
      permissionsColumns,
    );
  }, [props.permissions, filterText, sortBy]);

  const displayedPermissionsRowData = React.useMemo(() => {
    const offset = (currentPage - 1) * perPage;
    const visibleTypes = filterStringsByText.slice(offset, offset + perPage);

    const rows: PermissionRowData[] = [];
    const sorted = sortResources(
      {
        index: sortBy.index ?? 1,
        direction: sortBy.direction ?? SortByDirection.asc,
      },
      visibleTypes,
      permissionsColumns,
    );
    if (props.permissions) {
      sorted.forEach((d: Permission) => {
        rows.push({
          permission: d,
          cellContents: [d.resource, d.action],
        });
      });
    }
    return rows;
  }, [currentPage, perPage, filterStringsByText, sortBy]);

  const permissionsTable = React.useMemo(() => {
    if (displayedPermissionsRowData.length) {
      return (
        <>
          <Toolbar id="permissions-toolbar">
            <ToolbarContent>
              <ToolbarItem>
                <SearchInput
                  style={{ minWidth: '38ch' }}
                  name="permissionFilter"
                  id="permissionFilter"
                  type="search"
                  placeholder={t('PermissionsTable.SEARCH_PLACEHOLDER')}
                  aria-label={t('PermissionsTable.ARIA_LABELS.SEARCH_INPUT')}
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
                  widgetId="permissions-pagination"
                  onPerPageSelect={onPerPage}
                />
              </ToolbarItem>
            </ToolbarContent>
          </Toolbar>
          <Table aria-label="User Permissions" variant={TableVariant.compact}>
            <Thead>
              <Tr>
                <Th key="table-header-expand" />
                {permissionsColumns.map(({ title, sortable }, index) => (
                  <Th key={`permissions-header-${title}`} sort={sortable ? getSortParams(index) : undefined}>
                    {title}
                  </Th>
                ))}
              </Tr>
            </Thead>
            {displayedPermissionsRowData.map((c: PermissionRowData, index) => (
              <Tbody key={`permissions-row-pair-${index}`}>
                <Tr key={`permissions-row-${index}`}>
                  <Td key={`permissions-resource-${index}`} colSpan={1} dataLabel={permissionsColumns[0].title}>
                    {c.permission.resource}
                  </Td>
                  <Td key={`permissions-resource-${index}`} colSpan={1} dataLabel={permissionsColumns[1].title}>
                    {c.permission.action}
                  </Td>
                </Tr>
              </Tbody>
            ))}
          </Table>
        </>
      );
    } else {
      return emptyTableState('No User Permissions Found');
    }
  }, [
    currentPage,
    filterStringsByText.length,
    filterText,
    getSortParams,
    onCurrentPage,
    onFilterTextChange,
    onPerPage,
    perPage,
    displayedPermissionsRowData,
    emptyTableState,
  ]);

  return <>{permissionsTable}</>;
};
