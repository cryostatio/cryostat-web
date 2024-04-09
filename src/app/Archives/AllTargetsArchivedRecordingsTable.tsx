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
import { authFailMessage, isAuthFail } from '@app/ErrorView/types';
import { ArchivedRecordingsTable } from '@app/Recordings/ArchivedRecordingsTable';
import { LoadingView } from '@app/Shared/Components/LoadingView';
import { Target, TargetDiscoveryEvent, NotificationCategory, Metadata } from '@app/Shared/Services/api.types';
import { isEqualTarget, indexOfTarget, includesTarget } from '@app/Shared/Services/api.utils';
import { ServiceContext } from '@app/Shared/Services/Services';
import { useSort } from '@app/utils/hooks/useSort';
import { useSubscriptions } from '@app/utils/hooks/useSubscriptions';
import { hashCode, sortResources, TableColumn } from '@app/utils/utils';
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
import { SearchIcon } from '@patternfly/react-icons';
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
import { map } from 'rxjs/operators';

const tableColumns: TableColumn[] = [
  {
    title: 'Target',
    keyPaths: ['target'],
    transform: (target: Target, _obj: ArchivesForTarget) => {
      return target.alias === target.connectUrl || !target.alias
        ? `${target.connectUrl}`
        : `${target.alias} (${target.connectUrl})`;
    },
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

interface ArchivedRecording {
  name: string;
  downloadUrl: string;
  reportUrl: string;
  metadata: Metadata;
  size: number;
  archivedTime: number;
}

type ArchivesForTarget = {
  target: Target;
  targetAsObs: Observable<Target>;
  archiveCount: number;
  recordings: ArchivedRecording[];
};

export interface AllTargetsArchivedRecordingsTableProps {}

export const AllTargetsArchivedRecordingsTable: React.FC<AllTargetsArchivedRecordingsTableProps> = () => {
  const context = React.useContext(ServiceContext);
  const [searchText, setSearchText] = React.useState('');
  const [archivesForTargets, setArchivesForTargets] = React.useState<ArchivesForTarget[]>([]);
  const [expandedTargets, setExpandedTargets] = React.useState([] as Target[]);
  const [hideEmptyTargets, setHideEmptyTargets] = React.useState(true);
  const [errorMessage, setErrorMessage] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const addSubscription = useSubscriptions();
  const [sortBy, getSortParams] = useSort();

  const handleNotification = React.useCallback(
    (connectUrl: string, recording: ArchivedRecording, delta: number) => {
      console.log(`Updating count for URL: ${connectUrl} with delta: ${delta}`);

      setArchivesForTargets((old) => {
        console.log('Current archivesForTargets:', old);
        console.log('connectUrl being searched for:', connectUrl);

        const targetIdx = old.findIndex(({ target }) => target.connectUrl === connectUrl);
        if (targetIdx >= 0) {
          const matchedTarget = old[targetIdx];
          console.log('Found target to update:', matchedTarget);

          const recordings = [...matchedTarget.recordings];
          if (delta === 1) {
            recordings.push(recording);
          } else {
            const recordingIdx = recordings.findIndex((r) => r.name === recording.name);
            recordings.splice(recordingIdx, 1);
          }

          old.splice(targetIdx, 1, { ...matchedTarget, archiveCount: matchedTarget.archiveCount + delta, recordings });
          console.log('New archivesForTargets after update:', [...old]);

          return [...old];
        }
        console.log('Target not found for URL:', connectUrl);

        return old;
      });
    },
    [setArchivesForTargets],
  );

    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  const handleArchivesForTargets = React.useCallback(
    (targetNodes: any[]) => {
      setIsLoading(false);
      setErrorMessage('');
      setArchivesForTargets(
        targetNodes.map((node) => {
          const target: Target = {
            jvmId: node.target.jvmId,
            connectUrl: node.target.connectUrl,
            alias: node.target.alias,
            labels: [],
            annotations: {
              cryostat: [],
              platform: [],
            },
          };
          console.log('handleArchivesForTargets', { node, target });
          return {
            target,
            targetAsObs: of(target),
            archiveCount: node?.archiveCount ?? 0,
            recordings: node?.recordings ?? [],
          };
        }),
      );
    },
    [setArchivesForTargets, setIsLoading, setErrorMessage],
  );

  const handleError = React.useCallback(
    (error) => {
      setIsLoading(false);
      setErrorMessage(error.message);
    },
    [setIsLoading, setErrorMessage],
  );

  /* eslint-disable @typescript-eslint/no-explicit-any */
  /* const refreshArchivesForTargets = React.useCallback(() => {
    setIsLoading(true);
    addSubscription(
      context.api
        .graphql<any>(
          `query AllTargetsArchives {
             targetNodes {
               target {
                 connectUrl
                 alias
                 archivedRecordings {
                   aggregate {
                     count
                   }
                 }
               }
             }
           }`,
        )
        .pipe(map((v) => v.data.targetNodes))
        .subscribe({
          next: handleArchivesForTargets,
          error: handleError,
        }),
    );
  }, [addSubscription, context.api, setIsLoading, handleArchivesForTargets, handleError]); */

  const refreshArchivesForTargets = React.useCallback(() => {
    setIsLoading(true);
    addSubscription(
      context.api
        .graphql<any>(
          `query AllTargetsArchives {
            targetNodes {
              target {
                connectUrl
                alias
                jvmId
                archivedRecordings {
                  data {
                    name
                    downloadUrl
                    reportUrl
                    metadata {
                      labels {
                        key
                        value
                      }
                    }
                    size
                    archivedTime
                  }
                  aggregate {
                    count
                  }
                }
              }
            }
          }`,
        )
        .pipe(
          map((v) => {
            console.log('++V', v);
            return v.data.targetNodes.map((node) => {
              console.log('++X', node);
              return {
                target: {
                  jvmId: node.target.jvmId,
                  connectUrl: node.target.connectUrl,
                  alias: node.target.alias,
                  labels: [],
                  annotations: {
                    cryostat: [],
                    platform: [],
                  },
                },
                targetAsObs: of({
                  jvmId: node.target.jvmId,
                  connectUrl: node.target.connectUrl,
                  alias: node.target.alias,
                  labels: [],
                  annotations: {
                    cryostat: [],
                    platform: [],
                  },
                }),
                archiveCount: node.target.archivedRecordings.aggregate.count,
                recordings: node.target.archivedRecordings.data as ArchivedRecording[],
              };
            });
          }),
        )
        .subscribe({
          next: handleArchivesForTargets,
          error: handleError,
        }),
    );
  }, [addSubscription, context.api, setIsLoading, handleArchivesForTargets, handleError]);

  /* eslint-disable @typescript-eslint/no-explicit-any */
  const getCountForNewTarget = React.useCallback(
    (target: Target) => {
      addSubscription(
        context.api
          .graphql<any>(
            `query ArchiveCountForTarget($connectUrl: String) {
              targetNodes(filter: { name: $connectUrl }) {
                target {
                  archivedRecordings {
                    data {
                      name
                      downloadUrl
                      reportUrl
                      metadata {
                        labels {
                          key
                          value
                        }
                      }
                      size
                      archivedTime
                    }
                    aggregate {
                      count
                    }
                  }
                }
              }
            }`,
            { connectUrl: target.connectUrl },
          )
          .subscribe((v) => {
            console.log("++v2",v);
            setArchivesForTargets((old) => {
              return [
                ...old,
                {
                  target: target,
                  targetAsObs: of(target),
                  archiveCount: v.data.targetNodes[0]?.target?.archivedRecordings?.aggregate?.count ?? 0,
                  recordings: v.data.targetNodes[0]?.target?.archivedRecordings,
                },
              ];
            });
          }),
      );
    },
    [addSubscription, context.api],
  );

  /* eslint-enable @typescript-eslint/no-explicit-any */
  const handleLostTarget = React.useCallback(
    (target: Target) => {
      setArchivesForTargets((old) => old.filter(({ target: t }) => !isEqualTarget(t, target)));
      setExpandedTargets((old) => old.filter((t) => !isEqualTarget(t, target)));
    },
    [setArchivesForTargets, setExpandedTargets],
  );

  const handleTargetNotification = React.useCallback(
    (evt: TargetDiscoveryEvent) => {
      console.log('Event object:', evt);
      const target: Target = {
        connectUrl: evt.serviceRef.connectUrl,
        alias: evt.serviceRef.alias,
        labels: [],
        annotations: {
          cryostat: [],
          platform: [],
        },
      };
      if (evt.kind === 'FOUND') {
        getCountForNewTarget(target);
      } else if (evt.kind === 'MODIFIED') {
        setArchivesForTargets((old) => {
          const idx = old.findIndex(({ target: t }) => isEqualTarget(t, target));
          if (idx >= 0) {
            const matched = old[idx];
            if (target.connectUrl === matched.target.connectUrl && target.alias === matched.target.alias) {
              // If alias and connectUrl are not updated, ignore changes.
              return old;
            }
            return old.splice(idx, 1, { ...matched, target: target, targetAsObs: of(target) });
          }
          return old;
        });
      } else if (evt.kind === 'LOST') {
        handleLostTarget(target);
      }
    },
    [setArchivesForTargets, getCountForNewTarget, handleLostTarget],
  );

  const handleSearchInput = React.useCallback(
    (searchInput: string) => {
      setSearchText(searchInput);
    },
    [setSearchText],
  );

  const handleSearchInputClear = React.useCallback(() => {
    setSearchText('');
  }, [setSearchText]);

  React.useEffect(() => {
    refreshArchivesForTargets();
  }, [refreshArchivesForTargets]);

  const searchedArchivesForTargets = React.useMemo(() => {
    let updated: ArchivesForTarget[];
    if (!searchText) {
      updated = archivesForTargets;
    } else {
      const formattedSearchText = searchText.trim().toLowerCase();
      updated = archivesForTargets.filter(
        ({ target: t }) =>
          t.alias.toLowerCase().includes(formattedSearchText) ||
          t.connectUrl.toLowerCase().includes(formattedSearchText),
      );
    }
    return sortResources(
      {
        index: sortBy.index ?? 0,
        direction: sortBy.direction ?? SortByDirection.asc,
      },
      updated.filter((v) => !hideEmptyTargets || v.archiveCount > 0),
      tableColumns,
    );
  }, [searchText, archivesForTargets, sortBy, hideEmptyTargets]);

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
      () => refreshArchivesForTargets(),
      context.settings.autoRefreshPeriod() * context.settings.autoRefreshUnits(),
    );
    return () => window.clearInterval(id);
  }, [context.target, context.settings, refreshArchivesForTargets]);

  React.useEffect(() => {
    addSubscription(
      context.notificationChannel
        .messages(NotificationCategory.TargetJvmDiscovery)
        .subscribe((v) => handleTargetNotification(v.message.event)),
    );
  }, [addSubscription, context.notificationChannel, handleTargetNotification]);

  // React.useEffect(() => {
  //   addSubscription(
  //     context.notificationChannel.messages(NotificationCategory.ActiveRecordingSaved).subscribe((v) => {
  //       updateCount(v.message.target, 1);
  //     }),
  //   );
  // }, [addSubscription, context.notificationChannel, updateCount]);

  React.useEffect(() => {
    addSubscription(
      context.notificationChannel.messages(NotificationCategory.ArchivedRecordingCreated).subscribe((v) => {
        handleNotification(v.message.target, v.message.recording, 1);
      }),
    );
  }, [addSubscription, context.notificationChannel, handleNotification]);

  React.useEffect(() => {
    addSubscription(
      context.notificationChannel.messages(NotificationCategory.ArchivedRecordingDeleted).subscribe((v) => {
        console.log('++v', v);
        console.log('++v', v.message.target);
        handleNotification(v.message.target, v.message.recording, -1);
      }),
    );
  }, [
    addSubscription,
    context.notificationChannel,
    handleNotification,
    refreshArchivesForTargets,
    getCountForNewTarget,
  ]);

  const toggleExpanded = React.useCallback(
    (target) => {
      const idx = indexOfTarget(expandedTargets, target);
      setExpandedTargets((expandedTargets) =>
        idx >= 0
          ? [...expandedTargets.slice(0, idx), ...expandedTargets.slice(idx + 1, expandedTargets.length)]
          : [...expandedTargets, target],
      );
    },
    [expandedTargets, setExpandedTargets],
  );

  const targetRows = React.useMemo(() => {
    return searchedArchivesForTargets.map(({ target, archiveCount }, idx) => {
      const isExpanded: boolean = includesTarget(expandedTargets, target);

      return (
        <Tr key={`${idx}_parent`}>
          <Td
            key={`target-table-row-${idx}_1`}
            id={`target-ex-toggle-${idx}`}
            aria-controls={`target-ex-expand-${idx}`}
            expand={{
              rowIndex: idx,
              isExpanded: isExpanded,
              onToggle: () => {
                toggleExpanded(target);
              },
            }}
          />
          <Td key={`target-table-row-${idx}_2`} dataLabel={tableColumns[0].title}>
            {target.alias == target.connectUrl || !target.alias
              ? `${target.connectUrl}`
              : `${target.alias} (${target.connectUrl})`}
          </Td>
          <Td key={`target-table-row-${idx}_3`} dataLabel={tableColumns[1].title}>
            <Badge key={`${idx}_count`}>{archiveCount}</Badge>
          </Td>
        </Tr>
      );
    });
  }, [toggleExpanded, searchedArchivesForTargets, expandedTargets]);

  const recordingRows = React.useMemo(() => {
    return searchedArchivesForTargets.map(({ target, targetAsObs }) => {
      const isExpanded: boolean = includesTarget(expandedTargets, target);
      const keyBase = hashCode(JSON.stringify(target));
      return (
        <Tr key={`child-${keyBase}`} isExpanded={isExpanded}>
          <Td key={`target-ex-expand-${keyBase}`} dataLabel={'Content Details'} colSpan={tableColumns.length + 1}>
            {isExpanded ? (
              <ExpandableRowContent>
                <ArchivedRecordingsTable target={targetAsObs} isUploadsTable={false} isNestedTable={true} />
              </ExpandableRowContent>
            ) : null}
          </Td>
        </Tr>
      );
    });
  }, [searchedArchivesForTargets, expandedTargets]);

  const rowPairs = React.useMemo(() => {
    const rowPairs: JSX.Element[] = [];
    for (let i = 0; i < targetRows.length; i++) {
      rowPairs.push(targetRows[i]);
      rowPairs.push(recordingRows[i]);
    }
    return rowPairs;
  }, [targetRows, recordingRows]);

  let view: JSX.Element;

  const authRetry = React.useCallback(() => {
    context.target.setAuthRetry();
  }, [context.target]);

  const isError = React.useMemo(() => errorMessage != '', [errorMessage]);

  if (isError) {
    view = (
      <>
        <ErrorView
          title={'Error retrieving archived recordings in All Targets View'}
          message={errorMessage}
          retry={isAuthFail(errorMessage) ? authRetry : undefined}
        />
      </>
    );
  } else if (isLoading) {
    view = <LoadingView />;
  } else if (!searchedArchivesForTargets.length) {
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
        <TableComposable aria-label="all-targets-table">
          <Thead>
            <Tr>
              <Th key="table-header-expand" />
              {tableColumns.map(({ title, width }, idx) => (
                <Th
                  key={`table-header-${title}`}
                  width={width as React.ComponentProps<typeof Th>['width']}
                  sort={getSortParams(idx)}
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
      <Toolbar id="all-targets-toolbar">
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
          <ToolbarGroup>
            <ToolbarItem>
              <Checkbox
                name={`all-targets-hide-check`}
                label="Hide targets with zero recordings"
                onChange={setHideEmptyTargets}
                isChecked={hideEmptyTargets}
                id={`all-targets-hide-check`}
                aria-label={`all-targets-hide-check`}
              />
            </ToolbarItem>
          </ToolbarGroup>
        </ToolbarContent>
      </Toolbar>
      {view}
    </>
  );
};
