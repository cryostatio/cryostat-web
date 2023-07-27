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
import { LoadingView } from '@app/LoadingView/LoadingView';
import { ArchivedRecordingsTable } from '@app/Recordings/ArchivedRecordingsTable';
import { ArchivedRecording, RecordingDirectory } from '@app/Shared/Services/Api.service';
import { NotificationCategory } from '@app/Shared/Services/NotificationChannel.service';
import { ServiceContext } from '@app/Shared/Services/Services';
import { Target } from '@app/Shared/Services/Target.service';
import { useSort } from '@app/utils/useSort';
import { useSubscriptions } from '@app/utils/useSubscriptions';
import { TableColumn, portalRoot, sortResources } from '@app/utils/utils';
import {
  Toolbar,
  ToolbarContent,
  ToolbarGroup,
  ToolbarItem,
  SearchInput,
  Badge,
  EmptyState,
  EmptyStateIcon,
  Text,
  Title,
  Tooltip,
  Split,
  SplitItem,
} from '@patternfly/react-core';
import { HelpIcon, SearchIcon } from '@patternfly/react-icons';
import {
  TableComposable,
  Th,
  Thead,
  Tbody,
  Tr,
  Td,
  ExpandableRowContent,
  SortByDirection,
} from '@patternfly/react-table';
import * as React from 'react';
import { Observable, of } from 'rxjs';
import { getTargetFromDirectory, includesDirectory, indexOfDirectory } from './ArchiveDirectoryUtil';

const tableColumns: TableColumn[] = [
  {
    title: 'Directory',
    keyPaths: ['connectUrl'],
    sortable: true,
    width: 80,
  },
  {
    title: 'Archives',
    keyPaths: ['recordings'],
    transform: (recordings: ArchivedRecording[], _obj: _RecordingDirectory) => {
      return recordings.length;
    },
    sortable: true,
    width: 15,
  },
];

type _RecordingDirectory = RecordingDirectory & { targetAsObs: Observable<Target> };

export interface AllArchivedRecordingsTableProps {}

export const AllArchivedRecordingsTable: React.FC<AllArchivedRecordingsTableProps> = () => {
  const context = React.useContext(ServiceContext);

  const [directories, setDirectories] = React.useState<_RecordingDirectory[]>([]);
  const [searchText, setSearchText] = React.useState('');
  const [expandedDirectories, setExpandedDirectories] = React.useState<_RecordingDirectory[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const addSubscription = useSubscriptions();
  const [sortBy, getSortParams] = useSort();

  const handleDirectoriesAndCounts = React.useCallback(
    (directories: RecordingDirectory[]) => {
      setDirectories(directories.map((dir) => ({ ...dir, targetAsObs: of(getTargetFromDirectory(dir)) })));
      setIsLoading(false);
    },
    [setDirectories, setIsLoading]
  );

  const refreshDirectoriesAndCounts = React.useCallback(() => {
    setIsLoading(true);
    addSubscription(
      context.api.doGet<RecordingDirectory[]>('fs/recordings', 'beta').subscribe(handleDirectoriesAndCounts)
    );
  }, [addSubscription, context.api, setIsLoading, handleDirectoriesAndCounts]);

  const handleSearchInput = React.useCallback(
    (searchInput: string) => {
      setSearchText(searchInput);
    },
    [setSearchText]
  );

  const handleSearchInputClear = React.useCallback(() => {
    setSearchText('');
  }, [setSearchText]);

  React.useEffect(() => {
    refreshDirectoriesAndCounts();
  }, [refreshDirectoriesAndCounts]);

  const searchedDirectories = React.useMemo(() => {
    let updatedSearchedDirectories: _RecordingDirectory[];
    if (!searchText) {
      updatedSearchedDirectories = directories;
    } else {
      const formattedSearchText = searchText.trim().toLowerCase();
      updatedSearchedDirectories = directories.filter(
        (d: _RecordingDirectory) =>
          d.jvmId.toLowerCase().includes(formattedSearchText) ||
          d.connectUrl.toLowerCase().includes(formattedSearchText)
      );
    }
    return sortResources(
      {
        index: sortBy.index ?? 0,
        direction: sortBy.direction ?? SortByDirection.asc,
      },
      updatedSearchedDirectories,
      tableColumns
    );
  }, [directories, searchText, sortBy]);

  React.useEffect(() => {
    if (!context.settings.autoRefreshEnabled()) {
      return;
    }
    const id = window.setInterval(
      () => refreshDirectoriesAndCounts(),
      context.settings.autoRefreshPeriod() * context.settings.autoRefreshUnits()
    );
    return () => window.clearInterval(id);
  }, [context.settings, refreshDirectoriesAndCounts]);

  React.useEffect(() => {
    addSubscription(
      context.notificationChannel.messages(NotificationCategory.RecordingMetadataUpdated).subscribe(() => {
        refreshDirectoriesAndCounts();
      })
    );
  }, [addSubscription, context.notificationChannel, refreshDirectoriesAndCounts]);

  React.useEffect(() => {
    addSubscription(
      context.notificationChannel.messages(NotificationCategory.ActiveRecordingSaved).subscribe(() => {
        refreshDirectoriesAndCounts();
      })
    );
  }, [addSubscription, context.notificationChannel, refreshDirectoriesAndCounts]);

  React.useEffect(() => {
    addSubscription(
      context.notificationChannel.messages(NotificationCategory.ArchivedRecordingCreated).subscribe(() => {
        refreshDirectoriesAndCounts();
      })
    );
  }, [addSubscription, context.notificationChannel, refreshDirectoriesAndCounts]);

  React.useEffect(() => {
    addSubscription(
      context.notificationChannel.messages(NotificationCategory.ArchivedRecordingDeleted).subscribe(() => {
        refreshDirectoriesAndCounts();
      })
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
          : [...prevExpandedDirectories, dir]
      );
    },
    [expandedDirectories, setExpandedDirectories]
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
                <Text>{dir.connectUrl}</Text>
              </SplitItem>
              <SplitItem>
                <Tooltip hidden={!dir.jvmId} content={`JVM hash ID: ${dir.jvmId}`} appendTo={portalRoot}>
                  <HelpIcon />
                </Tooltip>
              </SplitItem>
            </Split>
          </Td>
          <Td key={`directory-table-row-${idx}_3`} dataLabel={tableColumns[1].title}>
            <Badge key={`${idx}_count`}>{dir.recordings.length || 0}</Badge>
          </Td>
        </Tr>
      );
    });
  }, [toggleExpanded, searchedDirectories, expandedDirectories]);

  const recordingRows = React.useMemo(() => {
    return searchedDirectories.map((dir, idx) => {
      const isExpanded: boolean = includesDirectory(expandedDirectories, dir);

      return (
        <Tr key={`${idx}_child`} isExpanded={isExpanded}>
          <Td key={`directory-ex-expand-${idx}`} dataLabel={'Content Details'} colSpan={tableColumns.length + 1}>
            {isExpanded ? (
              <ExpandableRowContent>
                <ArchivedRecordingsTable
                  directory={dir}
                  target={dir.targetAsObs}
                  isUploadsTable={false}
                  isNestedTable={true}
                  directoryRecordings={dir.recordings}
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
      rowPairs.push(recordingRows[i]);
    }
    return rowPairs;
  }, [directoryRows, recordingRows]);

  let view: JSX.Element;
  if (isLoading) {
    view = <LoadingView />;
  } else if (!searchedDirectories.length) {
    view = (
      <>
        <EmptyState>
          <EmptyStateIcon icon={SearchIcon} />
          <Title headingLevel="h4" size="lg">
            No Archived Recordings
          </Title>
        </EmptyState>
      </>
    );
  } else {
    view = (
      <>
        <TableComposable aria-label="all-archives-table">
          <Thead>
            <Tr>
              <Th key="table-header-expand" />
              {tableColumns.map(({ title, width }, index) => (
                <Th
                  key={`table-header-${title}`}
                  sort={getSortParams(index)}
                  width={width as React.ComponentProps<typeof Th>['width']}
                >
                  {title}
                </Th>
              ))}
            </Tr>
          </Thead>
          <Tbody>{rowPairs}</Tbody>
        </TableComposable>
      </>
    );
  }

  return (
    <>
      <Toolbar id="all-archives-toolbar">
        <ToolbarContent>
          <ToolbarGroup variant="filter-group">
            <ToolbarItem>
              <SearchInput
                placeholder="Search"
                value={searchText}
                onChange={handleSearchInput}
                onClear={handleSearchInputClear}
              />
            </ToolbarItem>
          </ToolbarGroup>
        </ToolbarContent>
      </Toolbar>
      {view}
    </>
  );
};
