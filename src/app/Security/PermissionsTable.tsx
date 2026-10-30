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
  Icon,
  Pagination,
  SearchInput,
  Toolbar,
  ToolbarContent,
  ToolbarItem,
  ToolbarItemVariant,
} from '@patternfly/react-core';
import { CheckCircleIcon, TimesCircleIcon, TopologyIcon } from '@patternfly/react-icons';
import { SortByDirection, Table, TableVariant, Tbody, Td, Th, Thead, Tr } from '@patternfly/react-table';
import { t } from 'i18next';
import _ from 'lodash';
import React from 'react';

interface PermissionRowData {
  permission: Mapping;
  cellContents: React.ReactNode[];
}

/**
 * Returns the localized label for the expected read/write/delete actions.
 * Any other action is returned unchanged.
 */
const localizeAction = (action: string): string => {
  switch (action.toLowerCase()) {
    case 'read':
      return t('PermissionsTable.ACTIONS.READ');
    case 'write':
      return t('PermissionsTable.ACTIONS.WRITE');
    case 'delete':
      return t('PermissionsTable.ACTIONS.DELETE');
    default:
      return action;
  }
};

/** Returns the localized label for an authorization result. */
const localizeAuthorized = (authorized: boolean): string =>
  authorized ? t('PermissionsTable.AUTHORIZED') : t('PermissionsTable.UNAUTHORIZED');

const permissionsColumns: TableColumn[] = [
  {
    title: 'Resource',
    keyPaths: ['permission', 'resource'],
    sortable: true,
  },
  {
    title: 'Action',
    keyPaths: ['permission', 'action'],
    transform: (action) => localizeAction(action as string),
    sortable: true,
  },
  {
    title: 'Authorized',
    keyPaths: ['response', 'authorized'],
    transform: (authorized) => localizeAuthorized(authorized as boolean),
    sortable: true,
  },
];

const ACTION_ORDER = ['read', 'write', 'delete'];

const actionRank = (action: string): number => {
  const rank = ACTION_ORDER.indexOf(action.toLowerCase());
  return rank === -1 ? ACTION_ORDER.length : rank;
};

/**
 * Default ordering: resource A-Z, then action in read/write/delete order.
 * Actions outside of that set follow, sorted alphabetically.
 */
const compareByResourceThenAction = (a: Mapping, b: Mapping): number =>
  a.permission.resource.localeCompare(b.permission.resource) ||
  actionRank(a.permission.action) - actionRank(b.permission.action) ||
  a.permission.action.localeCompare(b.permission.action);

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
      reg.test(localizeAction(t.permission.action)) ||
      reg.test(t.permission.resource) ||
      reg.test(localizeAuthorized(t.response.authorized));
    const filtered = props.permissions ? props.permissions.filter(withFilters) : [];
    if (sortBy.index === undefined) {
      return [...filtered].sort(compareByResourceThenAction);
    }
    return sortResources(
      {
        index: sortBy.index,
        direction: sortBy.direction ?? SortByDirection.asc,
      },
      filtered,
      permissionsColumns,
    );
  }, [props.permissions, filterText, sortBy]);

  const displayedPermissionsRowData = React.useMemo(() => {
    const offset = (currentPage - 1) * perPage;
    const visibleTypes = filterStringsByText.slice(offset, offset + perPage);

    const rows: PermissionRowData[] = [];
    if (props.permissions) {
      visibleTypes.forEach((d: Mapping) => {
        rows.push({
          permission: d,
          cellContents: [d.permission.resource, d.permission.action, d.response.authorized],
        });
      });
    }
    return rows;
  }, [props.permissions, currentPage, perPage, filterStringsByText]);

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
          <Table aria-label={t('PermissionsTable.TABLE_TITLE')} variant={TableVariant.compact}>
            <Thead>
              <Tr>
                {permissionsColumns.map(({ title, sortable }, index) => {
                  const sortParams = sortable ? getSortParams(index) : undefined;
                  return (
                    <Th
                      key={`permissions-header-${title}`}
                      sort={
                        sortParams && sortBy.index === undefined && index === 0
                          ? { ...sortParams, sortBy: { index: 0, direction: SortByDirection.asc } }
                          : sortParams
                      }
                    >
                      {title}
                    </Th>
                  );
                })}
              </Tr>
            </Thead>
            {displayedPermissionsRowData.map((c: PermissionRowData, index) => (
              <Tbody key={`permissions-row-pair-${index}`}>
                <Tr key={`permissions-row-${index}`}>
                  <Td key={`permissions-resource-${index}`} colSpan={1} dataLabel={permissionsColumns[0].title}>
                    {c.permission.permission.resource}
                  </Td>
                  <Td key={`permissions-action-${index}`} colSpan={1} dataLabel={permissionsColumns[1].title}>
                    {localizeAction(c.permission.permission.action)}
                  </Td>
                  <Td key={`permissions-authorized-${index}`} colSpan={1} dataLabel={permissionsColumns[2].title}>
                    {c.permission.response.authorized ? (
                      <Icon status="success">
                        <CheckCircleIcon title={localizeAuthorized(true)} />
                      </Icon>
                    ) : (
                      <Icon status="danger">
                        <TimesCircleIcon title={localizeAuthorized(false)} />
                      </Icon>
                    )}
                  </Td>
                </Tr>
              </Tbody>
            ))}
          </Table>
        ) : (
          emptyTableState(t('PermissionsTable.EMPTY_STATE'))
        )}
      </>
    );
  }, [
    currentPage,
    filterStringsByText.length,
    filterText,
    getSortParams,
    sortBy,
    onCurrentPage,
    onFilterTextChange,
    onPerPage,
    perPage,
    displayedPermissionsRowData,
    emptyTableState,
  ]);

  return <>{permissionsTable}</>;
};
