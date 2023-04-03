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
import { authFailMessage, ErrorView, isAuthFail } from '@app/ErrorView/ErrorView';
import { LoadingView } from '@app/LoadingView/LoadingView';
import { ServiceContext } from '@app/Shared/Services/Services';
import { NO_TARGET } from '@app/Shared/Services/Target.service';
import { useSort } from '@app/utils/useSort';
import { useSubscriptions } from '@app/utils/useSubscriptions';
import { hashCode, sortResources } from '@app/utils/utils';
import {
  Toolbar,
  ToolbarContent,
  ToolbarItem,
  ToolbarItemVariant,
  Pagination,
  TextInput,
  EmptyState,
  EmptyStateIcon,
  Title,
  Text,
} from '@patternfly/react-core';
import { SearchIcon } from '@patternfly/react-icons';
import { ExpandableRowContent, TableComposable, TableVariant, Tbody, Td, Th, Thead, Tr } from '@patternfly/react-table';
import * as React from 'react';
import { concatMap, filter, first } from 'rxjs/operators';

export interface EventType {
  name: string;
  typeId: string;
  description: string;
  category: string[];
  options: { [key: string]: OptionDescriptor }[];
}

export interface OptionDescriptor {
  name: string;
  description: string;
  defaultValue: string;
}

interface RowData {
  eventType: EventType;
  isExpanded: boolean;
  cellContents: React.ReactNode[];
  children?: React.ReactNode;
}

const getCategoryString = (eventType: EventType): string => {
  return eventType.category.join(', ').trim();
};

const includesSubstr = (a: string, b: string) => !!a && !!b && a.toLowerCase().includes(b.trim().toLowerCase());

const tableColumns = [
  {
    title: 'Name',
    keyPaths: ['name'],
    sortable: true,
  },
  {
    title: 'Type ID',
    keyPaths: ['typeId'],
    sortable: true,
  },
  {
    title: 'Description',
    keyPaths: ['description'],
    sortable: true,
  },
  {
    title: 'Categories',
    keyPaths: ['category'],
    sortable: true,
  },
];

const mapper = (index?: number) => {
  if (index !== undefined) {
    return tableColumns[index].keyPaths;
  }
  return undefined;
};

const getTransform = (_index?: number) => undefined;

export interface EventTypesProps {}

export const EventTypes: React.FC<EventTypesProps> = (_) => {
  const context = React.useContext(ServiceContext);
  const addSubscription = useSubscriptions();
  const prevPerPage = React.useRef(10);

  const [types, setTypes] = React.useState([] as EventType[]);
  const [currentPage, setCurrentPage] = React.useState(1);
  const [perPage, setPerPage] = React.useState(10);
  const [openRows, setOpenRows] = React.useState<number[]>([]);
  const [filterText, setFilterText] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState('');
  const [sortBy, getSortParams] = useSort();

  const handleTypes = React.useCallback(
    (types) => {
      setTypes(types);
      setIsLoading(false);
      setErrorMessage('');
    },
    [setTypes, setIsLoading, setErrorMessage]
  );

  const handleError = React.useCallback(
    (error) => {
      setIsLoading(false);
      setErrorMessage(error.message);
    },
    [setIsLoading, setErrorMessage]
  );

  const refreshEvents = React.useCallback(() => {
    setIsLoading(true);
    addSubscription(
      context.target
        .target()
        .pipe(
          filter((target) => target !== NO_TARGET),
          first(),
          concatMap((target) =>
            context.api.doGet<EventType[]>(`targets/${encodeURIComponent(target.connectUrl)}/events`)
          )
        )
        .subscribe({
          next: handleTypes,
          error: handleError,
        })
    );
  }, [addSubscription, context.target, context.api, handleTypes, handleError]);

  React.useEffect(() => {
    addSubscription(
      context.target.target().subscribe(() => {
        setFilterText('');
        refreshEvents();
      })
    );
  }, [addSubscription, context, context.target, refreshEvents]);

  React.useEffect(() => {
    addSubscription(context.target.authFailure().subscribe(() => setErrorMessage(authFailMessage)));
  }, [addSubscription, context.target]);

  const filterTypesByText = React.useMemo(() => {
    const withFilters = (t: EventType) =>
      filterText === '' ||
      includesSubstr(t.name, filterText) ||
      includesSubstr(t.typeId, filterText) ||
      includesSubstr(t.description, filterText) ||
      includesSubstr(getCategoryString(t), filterText);
    return sortResources(sortBy, types.filter(withFilters), mapper, getTransform);
  }, [types, filterText, sortBy]);

  const displayedTypeRowData = React.useMemo(() => {
    const offset = (currentPage - 1) * perPage;
    const visibleTypes = filterTypesByText.slice(offset, offset + perPage);

    const rows: RowData[] = [];
    visibleTypes.forEach((t: EventType) => {
      let child = '';
      for (const opt in t.options) {
        child += `${opt}=[${t.options[opt].defaultValue}]\t`;
      }
      rows.push({
        eventType: t,
        cellContents: [t.name, t.typeId, t.description, getCategoryString(t)],
        isExpanded: openRows.some((id) => id === hashCode(t.typeId)),
        children: <Text>{child}</Text>,
      });
    });

    return rows;
  }, [currentPage, perPage, filterTypesByText, openRows]);

  const onCurrentPage = React.useCallback(
    (_, currentPage: number) => {
      setCurrentPage(currentPage);
    },
    [setCurrentPage]
  );

  const onPerPage = React.useCallback(
    (_, perPage: number) => {
      const offset = (currentPage - 1) * prevPerPage.current;
      prevPerPage.current = perPage;
      setPerPage(perPage);
      setCurrentPage(1 + Math.floor(offset / perPage));
    },
    [currentPage, prevPerPage, setPerPage, setCurrentPage]
  );

  const onToggle = React.useCallback(
    (t: EventType) => {
      setOpenRows((old) => {
        const typeId = hashCode(t.typeId);
        if (old.some((id) => id === typeId)) {
          return old.filter((id) => id !== typeId);
        }
        return [...old, typeId];
      });
    },
    [setOpenRows]
  );

  const onFilterTextChange = React.useCallback(
    (filterText: string) => {
      setFilterText(filterText);
      setCurrentPage(1);
    },
    [setFilterText, setCurrentPage]
  );

  const authRetry = React.useCallback(() => {
    context.target.setAuthRetry();
  }, [context.target]);

  const typeRowPairs = React.useMemo(() => {
    return displayedTypeRowData.map((rowData: RowData, index) => (
      <Tbody key={`event-type-row-pair-${index}`} isExpanded={rowData.isExpanded}>
        <Tr key={`event-type-${index}`}>
          <Td
            key={`event-type-expandable-${index}`}
            expand={{
              rowIndex: index,
              isExpanded: rowData.isExpanded,
              expandId: `expandable-event-type-row-${index}`,
              onToggle: () => onToggle(rowData.eventType),
            }}
          />
          {rowData.cellContents.map((content, idx) => (
            <Td key={`event-type-${tableColumns[idx].title}-${idx}`} dataLabel={tableColumns[idx].title}>
              {content}
            </Td>
          ))}
        </Tr>
        <Tr key={`event-type-${index}-expandable-child`} isExpanded={rowData.isExpanded}>
          <Td dataLabel="event-details" colSpan={tableColumns.length}>
            <ExpandableRowContent>{rowData.children}</ExpandableRowContent>
          </Td>
        </Tr>
      </Tbody>
    ));
  }, [displayedTypeRowData, onToggle]);

  if (errorMessage != '') {
    return (
      <ErrorView
        title={'Error retrieving event types'}
        message={errorMessage}
        retry={isAuthFail(errorMessage) ? authRetry : undefined}
      />
    );
  } else if (isLoading) {
    return <LoadingView />;
  } else {
    return (
      <>
        <Toolbar id="event-types-toolbar">
          <ToolbarContent>
            <ToolbarItem>
              <TextInput
                name="eventFilter"
                id="eventFilter"
                type="search"
                placeholder="Filter..."
                aria-label="Event filter"
                onChange={onFilterTextChange}
                isDisabled={errorMessage != ''}
              />
            </ToolbarItem>
            <ToolbarItem variant={ToolbarItemVariant.pagination}>
              <Pagination
                itemCount={filterTypesByText.length}
                page={currentPage}
                perPage={perPage}
                onSetPage={onCurrentPage}
                widgetId="event-types-pagination"
                onPerPageSelect={onPerPage}
              />
            </ToolbarItem>
          </ToolbarContent>
        </Toolbar>
        {typeRowPairs.length ? (
          // TODO replace table with data list so collapsed event options can be custom formatted
          <TableComposable aria-label="Event Types Table" variant={TableVariant.compact}>
            <Thead>
              <Tr>
                <Th />
                {tableColumns.map(({ title }, index) => (
                  <Th key={`event-type-header-${title}`} sort={getSortParams(index)}>
                    {title}
                  </Th>
                ))}
              </Tr>
            </Thead>
            {typeRowPairs}
          </TableComposable>
        ) : (
          <EmptyState>
            <EmptyStateIcon icon={SearchIcon} />
            <Title headingLevel="h4" size="lg">
              No Event Types
            </Title>
          </EmptyState>
        )}
      </>
    );
  }
};
