/*
 * Copyright The Cryostat Authors
 *
 * The Universal Permissive License (UPL), Version 1.0
 *
 * Subject to the condition set forth below, permission is hereby granted to any
 * person obtaining a copy of this software, associated documentation and/or data
 * (collectively the "Software"), free of charge and under any and all copyright
 * rights in the Software, and any and all patent rights owned or freely
 * licensable by each licensor hereunder covering either (i) the unmodified
 * Software as contributed to or provided by such licensor, or (ii) the Larger
 * Works (as defined below), to deal in both
 *
 * (a) the Software, and
 * (b) any piece of software and/or hardware listed in the lrgrwrks.txt file if
 * one is included with the Software (each a "Larger Work" to which the Software
 * is contributed by such licensors),
 *
 * without restriction, including without limitation the rights to copy, create
 * derivative works of, display, perform, and distribute the Software and make,
 * use, sell, offer for sale, import, export, have made, and have sold the
 * Software and the Larger Work(s), and to sublicense the foregoing rights on
 * either these or other terms.
 *
 * This license is subject to the following condition:
 * The above copyright notice and either this complete permission notice or at
 * a minimum a reference to the UPL must be included in all copies or
 * substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */
import { ErrorView, isAuthFail } from '@app/ErrorView/ErrorView';
import { LoadingView } from '@app/LoadingView/LoadingView';
import { ServiceContext } from '@app/Shared/Services/Services';
import {
  Title,
  EmptyState,
  EmptyStateIcon,
  EmptyStateBody,
  Button,
  EmptyStateSecondaryActions,
  Bullseye,
} from '@patternfly/react-core';
import { SearchIcon } from '@patternfly/react-icons';
import {
  TableComposable,
  Thead,
  Tr,
  Th,
  OuterScrollContainer,
  InnerScrollContainer,
  ThProps,
} from '@patternfly/react-table';
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
          title={'Error retrieving recordings'}
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
          <EmptyStateIcon icon={SearchIcon} />
          <Title headingLevel="h4" size="lg">
            No {tableTitle}
          </Title>
        </EmptyState>
      </Bullseye>
    );
  } else if (isEmptyFilterResult) {
    view = (
      <Bullseye>
        <EmptyState>
          <EmptyStateIcon icon={SearchIcon} />
          <Title headingLevel="h4" size="lg">
            No {tableTitle} found
          </Title>
          <EmptyStateBody>
            No results match this filter criteria. Remove all filters or clear all filters to show results.
          </EmptyStateBody>
          <EmptyStateSecondaryActions>
            <Button variant="link" onClick={() => clearFilters && clearFilters(null)}>
              Clear all filters
            </Button>
          </EmptyStateSecondaryActions>
        </EmptyState>
      </Bullseye>
    );
  } else {
    view = (
      <>
        <TableComposable
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
        </TableComposable>
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
