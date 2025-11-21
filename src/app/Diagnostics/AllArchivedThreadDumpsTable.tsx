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

import { getTargetFromDirectory, includesDirectory, indexOfDirectory } from '@app/Archives/utils';
import { ErrorView } from '@app/ErrorView/ErrorView';
import { authFailMessage, isAuthFail } from '@app/ErrorView/types';
import { LoadingView } from '@app/Shared/Components/LoadingView';
import { Target, NotificationCategory, ThreadDumpDirectory } from '@app/Shared/Services/api.types';
import { ServiceContext } from '@app/Shared/Services/Services';
import { useSort } from '@app/utils/hooks/useSort';
import { useSubscriptions } from '@app/utils/hooks/useSubscriptions';
import { portalRoot, sortResources, TableColumn } from '@app/utils/utils';
import { useCryostatTranslation } from '@i18n/i18nextUtil';
import {
  Toolbar,
  ToolbarContent,
  ToolbarGroup,
  ToolbarItem,
  SearchInput,
  EmptyState,
  EmptyStateIcon,
  EmptyStateHeader,
  Button,
  Icon,
  Bullseye,
  Split,
  SplitItem,
  Text,
  Tooltip,
} from '@patternfly/react-core';
import { FileIcon, HelpIcon, SearchIcon } from '@patternfly/react-icons';
import {
  Table,
  Th,
  Thead,
  Tbody,
  Tr,
  Td,
  ExpandableRowContent,
  SortByDirection,
  OuterScrollContainer,
  InnerScrollContainer,
} from '@patternfly/react-table';
import _ from 'lodash';
import * as React from 'react';
import { Observable, of } from 'rxjs';
import { ThreadDumpsTable } from './ThreadDumpsTable';

const tableColumns: TableColumn[] = [
  {
    title: 'Directory',
    keyPaths: ['jvmId'],
    sortable: true,
    width: 80,
  },
  {
    title: 'Archives',
    keyPaths: ['archiveCount'],
    sortable: true,
    width: 15,
  },
];

type _ThreadDumpDirectory = ThreadDumpDirectory & { targetAsObs: Observable<Target> };

export interface AllArchivedThreadDumpsTableProps {}

export const AllArchivedThreadDumpsTable: React.FC<AllArchivedThreadDumpsTableProps> = () => {
  const context = React.useContext(ServiceContext);
  const { t } = useCryostatTranslation();

  const [directories, setDirectories] = React.useState<_ThreadDumpDirectory[]>([]);
  const [searchText, setSearchText] = React.useState('');
  const [expandedDirectories, setExpandedDirectories] = React.useState<_ThreadDumpDirectory[]>([]);
  const [errorMessage, setErrorMessage] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const addSubscription = useSubscriptions();
  const [sortBy, getSortParams] = useSort();

  const handleDirectoriesAndCounts = React.useCallback(
    (directories: ThreadDumpDirectory[]) => {
      setDirectories(directories.map((dir) => ({ ...dir, targetAsObs: of(getTargetFromDirectory(dir)) })));
      setIsLoading(false);
    },
    [setDirectories, setIsLoading],
  );

  const handleError = React.useCallback(
    (error) => {
      setIsLoading(false);
      setErrorMessage(error.message);
    },
    [setIsLoading, setErrorMessage],
  );

  const refreshDirectoriesAndCounts = React.useCallback(() => {
    setIsLoading(true);
    addSubscription(
      context.api.doGet<ThreadDumpDirectory[]>('diagnostics/fs/threaddumps', 'beta').subscribe({
        next: handleDirectoriesAndCounts,
        error: handleError,
      }),
    );
  }, [addSubscription, context.api, setIsLoading, handleDirectoriesAndCounts, handleError]);

  const handleSearchInput = React.useCallback(
    (_, searchInput: string) => {
      setSearchText(searchInput);
    },
    [setSearchText],
  );

  const handleSearchInputClear = React.useCallback(() => {
    setSearchText('');
  }, [setSearchText]);

  React.useEffect(() => {
    refreshDirectoriesAndCounts();
  }, [refreshDirectoriesAndCounts]);

  const searchedDirectories = React.useMemo(() => {
    let updatedSearchedDirectories: _ThreadDumpDirectory[];
    if (!searchText) {
      updatedSearchedDirectories = directories;
    } else {
      const reg = new RegExp(_.escape(searchText), 'i');
      updatedSearchedDirectories = directories.filter((d: _ThreadDumpDirectory) => reg.test(d.jvmId));
    }
    return sortResources(
      {
        index: sortBy.index ?? 0,
        direction: sortBy.direction ?? SortByDirection.asc,
      },
      updatedSearchedDirectories,
      tableColumns,
    );
  }, [directories, searchText, sortBy]);

  React.useEffect(() => {
    addSubscription(
      context.target.authFailure().subscribe(() => {
        setErrorMessage(authFailMessage);
      }),
    );
  }, [context, context.target, setErrorMessage, addSubscription]);

  React.useEffect(() => {
    if (!context.settings.autoRefreshEnabled()) {
      return;
    }
    const id = window.setInterval(
      () => refreshDirectoriesAndCounts(),
      context.settings.autoRefreshPeriod() * context.settings.autoRefreshUnits(),
    );
    return () => window.clearInterval(id);
  }, [context.settings, refreshDirectoriesAndCounts]);

  React.useEffect(() => {
    addSubscription(
      context.notificationChannel.messages(NotificationCategory.ThreadDumpMetadataUpdated).subscribe((event) => {
        const updatedThreadDumpInfo = event.message;

        setDirectories((currentDirectories) => {
          const newDirectories = currentDirectories.map((directory) => ({
            ...directory,
            threadDumps: directory.threadDumps.map((threadDump) => {
              if (threadDump.threadDumpId === updatedThreadDumpInfo.recording.name) {
                return {
                  ...threadDump,
                  metadata: { ...threadDump.metadata, labels: updatedThreadDumpInfo?.threadDump?.metadata?.labels },
                };
              }
              return threadDump;
            }),
          }));

          return newDirectories;
        });
      }),
    );
  }, [addSubscription, context.notificationChannel, setDirectories]);

  React.useEffect(() => {
    addSubscription(
      context.notificationChannel.messages(NotificationCategory.ThreadDumpSuccess).subscribe(() => {
        refreshDirectoriesAndCounts();
      }),
    );
  }, [addSubscription, context.notificationChannel, refreshDirectoriesAndCounts]);

  React.useEffect(() => {
    addSubscription(
      context.notificationChannel.messages(NotificationCategory.ThreadDumpDeleted).subscribe(() => {
        refreshDirectoriesAndCounts();
      }),
    );
  }, [addSubscription, context.notificationChannel, refreshDirectoriesAndCounts]);

  const toggleExpanded = React.useCallback(
    (dir) => {
      const idx = indexOfDirectory(expandedDirectories, dir);
      setExpandedDirectories((prevExpandedDirectories) =>
        idx >= 0
          ? [
              ...prevExpandedDirectories.slice(0, idx),
              ...prevExpandedDirectories.slice(idx + 1, prevExpandedDirectories.length),
            ]
          : [...prevExpandedDirectories, dir],
      );
    },
    [expandedDirectories, setExpandedDirectories],
  );

  const directoryRows = React.useMemo(() => {
    return searchedDirectories.map((dir, idx) => {
      const isExpanded: boolean = includesDirectory(expandedDirectories, dir);

      return (
        <Tr key={`${idx}_parent`}>
          <Td
            key={`directory-table-row-${idx}_1`}
            id={`directory-ex-toggle-${idx}`}
            aria-controls={`directory-ex-expand-${idx}`}
            expand={{
              rowIndex: idx,
              isExpanded: isExpanded,
              onToggle: () => toggleExpanded(dir),
            }}
          />
          <Td key={`directory-table-row-${idx}_2`} dataLabel={tableColumns[0].title}>
            <Split hasGutter>
              <SplitItem>
                <Text>{dir.jvmId}</Text>
              </SplitItem>
              <SplitItem>
                <Tooltip hidden={!dir.jvmId} content={`JVM hash ID: ${dir.jvmId}`} appendTo={portalRoot}>
                  <HelpIcon />
                </Tooltip>
              </SplitItem>
            </Split>
          </Td>
          <Td key={`directory-table-row-${idx}_3`} dataLabel={tableColumns[1].title}>
            <Button variant="plain" onClick={() => toggleExpanded(dir)}>
              <Icon iconSize="md">
                <FileIcon />
              </Icon>
              <span style={{ marginLeft: 'var(--pf-v5-global--spacer--sm)' }}>{dir.threadDumps.length || 0}</span>
            </Button>
          </Td>
        </Tr>
      );
    });
  }, [toggleExpanded, searchedDirectories, expandedDirectories]);

  const threadDumpRows = React.useMemo(() => {
    return searchedDirectories.map((dir, idx) => {
      const isExpanded: boolean = includesDirectory(expandedDirectories, dir);

      return (
        <Tr key={`${idx}_child`} isExpanded={isExpanded}>
          <Td key={`directory-ex-expand-${idx}`} dataLabel={'Content Details'} colSpan={tableColumns.length + 1}>
            {isExpanded ? (
              <ExpandableRowContent>
                <ThreadDumpsTable
                  directory={dir}
                  directoryThreadDumps={dir.threadDumps}
                  target={dir.targetAsObs}
                  isNestedTable={true}
                />
              </ExpandableRowContent>
            ) : null}
          </Td>
        </Tr>
      );
    });
  }, [searchedDirectories, expandedDirectories]);

  const rowPairs = React.useMemo(() => {
    const rowPairs: JSX.Element[] = [];
    for (let i = 0; i < directoryRows.length; i++) {
      rowPairs.push(directoryRows[i]);
      rowPairs.push(threadDumpRows[i]);
    }
    return rowPairs;
  }, [directoryRows, threadDumpRows]);

  let view: JSX.Element;

  const authRetry = React.useCallback(() => {
    context.target.setAuthRetry();
  }, [context.target]);

  const isError = React.useMemo(() => errorMessage != '', [errorMessage]);

  if (isError) {
    view = (
      <>
        <ErrorView
          title={'Error retrieving Archived Thread Dumps in All Archives View'}
          message={errorMessage}
          retry={isAuthFail(errorMessage) ? authRetry : undefined}
        />
      </>
    );
  } else if (isLoading) {
    view = <LoadingView />;
  } else if (!searchedDirectories.length) {
    view = (
      <>
        <Bullseye>
          <EmptyState>
            <EmptyStateHeader
              titleText={t('ThreadDumps.NO_ARCHIVES')}
              icon={<EmptyStateIcon icon={SearchIcon} />}
              headingLevel="h4"
            />
          </EmptyState>
        </Bullseye>
      </>
    );
  } else {
    view = (
      <Table aria-label="all-archives-table" isStickyHeader>
        <Thead>
          <Tr>
            <Th key="table-header-expand" screenReaderText="column space" />
            {tableColumns.map(({ title, width }, index) => (
              <Th
                key={`table-header-${title}`}
                width={width as React.ComponentProps<typeof Th>['width']}
                sort={getSortParams(index)}
              >
                {title}
              </Th>
            ))}
          </Tr>
        </Thead>
        <Tbody>{rowPairs}</Tbody>
      </Table>
    );
  }

  return (
    <OuterScrollContainer className="archive-table-outer-container">
      <Toolbar id="all-archives-toolbar">
        <ToolbarContent>
          <ToolbarGroup variant="filter-group">
            <ToolbarItem>
              <SearchInput
                style={{ minWidth: '30ch' }}
                placeholder={t('AllArchivedRecordingsTable.SEARCH_PLACEHOLDER')}
                value={searchText}
                onChange={handleSearchInput}
                onClear={handleSearchInputClear}
              />
            </ToolbarItem>
          </ToolbarGroup>
        </ToolbarContent>
      </Toolbar>
      <InnerScrollContainer className="">{view}</InnerScrollContainer>
    </OuterScrollContainer>
  );
};
