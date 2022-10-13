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
import * as React from 'react';
import { ServiceContext } from '@app/Shared/Services/Services';
import { includesTarget, indexOfTarget, isEqualTarget, Target } from '@app/Shared/Services/Target.service';
import { NotificationCategory } from '@app/Shared/Services/NotificationChannel.service';
import { useSubscriptions } from '@app/utils/useSubscriptions';
import {
  Toolbar,
  ToolbarContent,
  ToolbarGroup,
  ToolbarItem,
  SearchInput,
  Badge,
  Checkbox,
  EmptyState,
  EmptyStateIcon,
  Title,
} from '@patternfly/react-core';
import { TableComposable, Th, Thead, Tbody, Tr, Td, ExpandableRowContent } from '@patternfly/react-table';
import SearchIcon from '@patternfly/react-icons/dist/esm/icons/search-icon';
import { ArchivedRecordingsTable } from '@app/Recordings/ArchivedRecordingsTable';
import { of } from 'rxjs';
import { map } from 'rxjs/operators';
import { TargetDiscoveryEvent } from '@app/Shared/Services/Targets.service';
import { LoadingView } from '@app/LoadingView/LoadingView';
import { AllArchivesResponse, RecordingDirectory } from '@app/Shared/Services/Api.service';

export interface AllArchivedRecordingsTableProps {}

export const AllArchivedRecordingsTable: React.FunctionComponent<AllArchivedRecordingsTableProps> =
  () => {
    const context = React.useContext(ServiceContext);

    const [directories, setDirectories] = React.useState([] as RecordingDirectory[]);
    const [counts, setCounts] = React.useState(new Map<string, number>());
    const [searchText, setSearchText] = React.useState('');
    const [searchedDirectories, setSearchedDirectories] = React.useState([] as RecordingDirectory[]);
    const [expandedDirectories, setExpandedDirectories] = React.useState([] as RecordingDirectory[]);
    const [isLoading, setIsLoading] = React.useState(false);
    const addSubscription = useSubscriptions();

    const tableColumns: string[] = React.useMemo(() => ['Directories', 'Count'], []);

    const handleDirectoriesAndCounts = React.useCallback(
      (directories: RecordingDirectory []) => {
        const updatedDirectories: RecordingDirectory[] = [];
        const updatedCounts = new Map<string, number>();
        for (const dir of directories) {
          updatedDirectories.push(dir);
          updatedCounts.set(dir.connectUrl, dir.recordings.length as number);
        }
        setDirectories(updatedDirectories);
        setCounts(updatedCounts);
        setIsLoading(false);
      },
      [setDirectories, setCounts, setIsLoading]
    );

    const refreshDirectoriesAndCounts = React.useCallback(() => {
      setIsLoading(true);
      addSubscription(
        context.api.doGet<RecordingDirectory[]>('fs/recordings', 'beta')
          .subscribe(handleDirectoriesAndCounts)
      );
    }, [addSubscription, context.api, setIsLoading, handleDirectoriesAndCounts]);

    const handleSearchInput = React.useCallback(
      (searchInput) => {
        setSearchText(searchInput);
      },
      [setSearchText]
    );

    const handleSearchInputClear = React.useCallback(() => {
      handleSearchInput('');
    }, [handleSearchInput]);

    React.useEffect(() => {
      refreshDirectoriesAndCounts();
    }, [refreshDirectoriesAndCounts]);

    React.useEffect(() => {
      let updatedSearchedDirectories: RecordingDirectory[];
      if (!searchText) {
        updatedSearchedDirectories = directories;
      } else {
        const formattedSearchText = searchText.trim().toLowerCase();
        updatedSearchedDirectories = directories.filter(
          (d: RecordingDirectory) =>
            d.jvmId.toLowerCase().includes(formattedSearchText) ||
            d.connectUrl.toLowerCase().includes(formattedSearchText)
        );
      }
      setSearchedDirectories(updatedSearchedDirectories);
    }, [searchText, directories, setSearchedDirectories]);

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
        context.notificationChannel.messages(NotificationCategory.RecordingMetadataUpdated).subscribe((v) => {
          refreshDirectoriesAndCounts();
        })
      );
    }, [addSubscription, context.notificationChannel, refreshDirectoriesAndCounts]);

    React.useEffect(() => {
      addSubscription(
        context.notificationChannel.messages(NotificationCategory.ActiveRecordingSaved).subscribe((v) => {
          refreshDirectoriesAndCounts();
        })
      );
    }, [addSubscription, context.notificationChannel, refreshDirectoriesAndCounts]);

    React.useEffect(() => {
      addSubscription(
        context.notificationChannel.messages(NotificationCategory.ArchivedRecordingDeleted).subscribe((v) => {
          refreshDirectoriesAndCounts();
        })
      );
    }, [addSubscription, context.notificationChannel, refreshDirectoriesAndCounts]);

    const toggleExpanded = React.useCallback(
      (dir) => {
        const idx = indexOfDirectory(expandedDirectories, dir);
        setExpandedDirectories((expandedTargets) =>
          idx >= 0
            ? [...expandedTargets.slice(0, idx), ...expandedTargets.slice(idx + 1, expandedTargets.length)]
            : [...expandedTargets, dir]
        );
      },
      [expandedDirectories, setExpandedDirectories]
    );

    const includesDirectory = (arr: RecordingDirectory[], dir: RecordingDirectory): boolean => {
      return arr.some((t) => t.connectUrl === dir.connectUrl);
    };
    
    const indexOfDirectory = (arr: RecordingDirectory[], dir: RecordingDirectory): number => {
      let index = -1;
      arr.forEach((t, idx) => {
        if (t.connectUrl === dir.connectUrl) {
          index = idx;
        }
      });
      return index;
    };

    const isHidden = React.useMemo(() => {
      return directories.map((dir) => {
        return (
          !includesDirectory(searchedDirectories, dir) || ((counts.get(dir.connectUrl) || 0) === 0)
        );
      });
    }, [directories, searchedDirectories, counts]);

    const directoryRows = React.useMemo(() => {
      return directories.map((dir, idx) => {
        let isExpanded: boolean = includesDirectory(expandedDirectories, dir);

        const handleToggle = () => {
          if ((counts.get(dir.connectUrl) || 0) !== 0 || isExpanded) {
            toggleExpanded(dir);
          }
        };

        return (
          <Tr key={`${idx}_parent`} isHidden={isHidden[idx]}>
            <Td
              key={`directory-table-row-${idx}_1`}
              id={`directory-ex-toggle-${idx}`}
              aria-controls={`directory-ex-expand-${idx}`}
              expand={{
                rowIndex: idx,
                isExpanded: isExpanded,
                onToggle: handleToggle,
              }}
            />
            <Td key={`directory-table-row-${idx}_2`} dataLabel={tableColumns[0]}>
              {dir.jvmId == dir.connectUrl || !dir.jvmId
                ? `${dir.connectUrl}`
                : `${dir.jvmId} (${dir.connectUrl})`}
            </Td>
            <Td key={`directory-table-row-${idx}_3`}>
              <Badge key={`${idx}_count`}>{counts.get(dir.connectUrl) || 0}</Badge>
            </Td>
          </Tr>
        );
      });
    }, [directories, expandedDirectories, counts, isHidden]);

    const recordingRows = React.useMemo(() => {
      return directories.map((dir, idx) => {
        let isExpanded: boolean = includesDirectory(expandedDirectories, dir);

        const getTargetFromDirectory = (dir: RecordingDirectory): Target => {
          return {
            connectUrl: dir.connectUrl,
            alias: dir.jvmId,
          }
        }

        return (
          <Tr key={`${idx}_child`} isExpanded={isExpanded} isHidden={isHidden[idx]}>
            <Td key={`directory-ex-expand-${idx}`} dataLabel={'Content Details'} colSpan={tableColumns.length + 1}>
              {isExpanded ? (
                <ExpandableRowContent>
                  <ArchivedRecordingsTable directory={dir} target={of(getTargetFromDirectory(dir))} isUploadsTable={false} isNestedTable={true} directoryRecordings={dir.recordings} />
                </ExpandableRowContent>
              ) : null}
            </Td>
          </Tr>
        );
      });
    }, [directories, expandedDirectories, isHidden]);

    const rowPairs = React.useMemo(() => {
      let rowPairs: JSX.Element[] = [];
      for (let i = 0; i < directoryRows.length; i++) {
        rowPairs.push(directoryRows[i]);
        rowPairs.push(recordingRows[i]);
      }
      return rowPairs;
    }, [directoryRows, recordingRows]);

    const noDirectories = React.useMemo(() => {
      return isHidden.reduce((a, b) => a && b, true);
    }, [isHidden]);

    let view: JSX.Element;
    if (isLoading) {
      view = <LoadingView />;
    } else if (noDirectories) {
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
          <TableComposable aria-label="all-archives-directory-table">
            <Thead>
              <Tr>
                <Th key="table-header-expand" />
                {tableColumns.map((key) => (
                  <Th key={`table-header-${key}`} width={key === 'Directories' ? 90 : 15}>
                    {key}
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
        <Toolbar id="all-archives-directory-toolbar">
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
