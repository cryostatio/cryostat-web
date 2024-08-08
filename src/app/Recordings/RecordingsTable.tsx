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
import { ErrorView } from '@app/ErrorView/ErrorView';
import { isAuthFail } from '@app/ErrorView/types';
import { LoadingView } from '@app/Shared/Components/LoadingView';
import { ServiceContext } from '@app/Shared/Services/Services';
import {
  EmptyState,
  EmptyStateIcon,
  EmptyStateBody,
  Button,
  Bullseye,
  EmptyStateActions,
  EmptyStateHeader,
  EmptyStateFooter,
} from '@patternfly/react-core';
import { SearchIcon } from '@patternfly/react-icons';
import { Table, Thead, Tr, Th, OuterScrollContainer, InnerScrollContainer, ThProps } from '@patternfly/react-table';
import * as React from 'react';

export interface ColumnConfig {
  columns: {
    title: string;
    sortable?: boolean;
  }[];
  onSort: (columnIndex: number) => ThProps['sort'];
}

export interface RecordingsTableProps {
  toolbar: React.ReactElement;
  tableColumns: ColumnConfig;
  tableTitle: string;
  tableFooter?: string | React.ReactNode;
  isEmpty: boolean;
  isEmptyFilterResult?: boolean;
  isHeaderChecked: boolean;
  isLoading: boolean;
  isNestedTable: boolean;
  errorMessage: string;
  onHeaderCheck: (event, checked: boolean) => void;
  clearFilters?: (filterType) => void;
  children: React.ReactNode;
}

export const RecordingsTable: React.FC<RecordingsTableProps> = ({
  toolbar,
  tableColumns,
  tableTitle,
  tableFooter,
  isEmpty,
  isEmptyFilterResult,
  isHeaderChecked,
  isLoading,
  isNestedTable,
  errorMessage,
  onHeaderCheck,
  clearFilters,
  children,
  ...props
}) => {
  const context = React.useContext(ServiceContext);
  let view: JSX.Element;

  const authRetry = React.useCallback(() => {
    context.target.setAuthRetry();
  }, [context.target]);

  const isError = React.useMemo(() => errorMessage != '', [errorMessage]);

  if (isError) {
    view = (
      <>
        <ErrorView
          title={'Error retrieving Recordings'}
          message={errorMessage}
          retry={isAuthFail(errorMessage) ? authRetry : undefined}
        />
      </>
    );
  } else if (isLoading) {
    view = <LoadingView />;
  } else if (isEmpty) {
    view = (
      <Bullseye>
        <EmptyState>
          <EmptyStateHeader
            titleText={<>No {tableTitle}</>}
            icon={<EmptyStateIcon icon={SearchIcon} />}
            headingLevel="h4"
          />
        </EmptyState>
      </Bullseye>
    );
  } else if (isEmptyFilterResult) {
    view = (
      <Bullseye>
        <EmptyState>
          <EmptyStateHeader
            titleText={<>No {tableTitle} found</>}
            icon={<EmptyStateIcon icon={SearchIcon} />}
            headingLevel="h4"
          />
          <EmptyStateBody>
            No results match this filter criteria. Remove all filters or clear all filters to show results.
          </EmptyStateBody>
          <EmptyStateFooter>
            <EmptyStateActions>
              <Button variant="link" onClick={() => clearFilters && clearFilters(null)}>
                Clear all filters
              </Button>
            </EmptyStateActions>
          </EmptyStateFooter>
        </EmptyState>
      </Bullseye>
    );
  } else {
    view = (
      <>
        <Table
          {...props}
          isStickyHeader
          aria-label={tableTitle}
          variant={isNestedTable ? 'compact' : undefined}
          style={{ zIndex: 99 }} // z-index of filters Select dropdown is 100
        >
          <Thead>
            <Tr>
              <Th
                key="table-header-check-all"
                select={{
                  onSelect: onHeaderCheck,
                  isSelected: isHeaderChecked,
                }}
              />
              <Th key="table-header-expand" />
              {tableColumns.columns.map(({ title, sortable }, index) => (
                <Th key={`table-header-${title}`} sort={sortable ? tableColumns.onSort(index) : undefined}>
                  {title}
                </Th>
              ))}
              <Th key="table-header-actions" />
            </Tr>
          </Thead>
          {children}
        </Table>
      </>
    );
  }

  return (
    <>
      <OuterScrollContainer className="recording-table-outer-container">
        {isError ? null : toolbar}
        <InnerScrollContainer className="recording-table--inner-container">{view}</InnerScrollContainer>
        {tableFooter}
      </OuterScrollContainer>
    </>
  );
};
