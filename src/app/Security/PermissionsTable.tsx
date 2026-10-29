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

import { Mapping } from '@app/Shared/Services/api.types';
import { useSort } from '@app/utils/hooks/useSort';
import { sortResources, TableColumn } from '@app/utils/utils';
import {
  EmptyState,
  Pagination,
  SearchInput,
  Toolbar,
  ToolbarContent,
  ToolbarItem,
  ToolbarItemVariant,
} from '@patternfly/react-core';
import { TopologyIcon } from '@patternfly/react-icons';
import { SortByDirection, Table, TableVariant, Tbody, Td, Th, Thead, Tr } from '@patternfly/react-table';
import { t } from 'i18next';
import _ from 'lodash';
import React from 'react';

interface PermissionRowData {
  permission: Mapping;
  cellContents: React.ReactNode[];
}

const permissionsColumns: TableColumn[] = [
  {
    title: 'Resource',
    keyPaths: ['permission', 'resource'],
    sortable: true,
  },
  {
    title: 'Action',
    keyPaths: ['permission', 'action'],
    sortable: true,
  },
  {
    title: 'Authorized',
    keyPaths: ['response', 'authorized'],
    sortable: true,
  },
];

export interface PermissionsTableProps {
  permissions: Mapping[];
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
    const withFilters = (t: Mapping) =>
      filterText === '' ||
      reg.test(t.permission.action) ||
      reg.test(t.permission.resource) ||
      reg.test(String(t.response.authorized));
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
      sorted.forEach((d: Mapping) => {
        rows.push({
          permission: d,
          cellContents: [d.permission.resource, d.permission.action, d.response.authorized],
        });
      });
    }
    return rows;
  }, [props.permissions, currentPage, perPage, filterStringsByText, sortBy]);

  const permissionsTable = React.useMemo(() => {
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
        {displayedPermissionsRowData.length ? (
          <Table aria-label="User Permissions" variant={TableVariant.compact}>
            <Thead>
              <Tr>
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
                    {c.permission.permission.resource}
                  </Td>
                  <Td key={`permissions-resource-${index}`} colSpan={1} dataLabel={permissionsColumns[1].title}>
                    {c.permission.permission.action}
                  </Td>
                  <Td key={`permissions-resource-${index}`} colSpan={1} dataLabel={permissionsColumns[2].title}>
                    {c.permission.response.authorized ? 'true' : 'false'}
                  </Td>
                </Tr>
              </Tbody>
            ))}
          </Table>
        ) : (
          emptyTableState('No User Permissions Found')
        )}
      </>
    );
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
