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
import { LoadingView } from '@app/Shared/Components/LoadingView';
import { Target, TargetDiscoveryEvent, NotificationCategory, ThreadDump } from '@app/Shared/Services/api.types';
import { isEqualTarget, indexOfTarget, includesTarget } from '@app/Shared/Services/api.utils';
import { ServiceContext } from '@app/Shared/Services/Services';
import { useSort } from '@app/utils/hooks/useSort';
import { useSubscriptions } from '@app/utils/hooks/useSubscriptions';
import { hashCode, sortResources, TableColumn } from '@app/utils/utils';
import { useCryostatTranslation } from '@i18n/i18nextUtil';
import {
  Toolbar,
  ToolbarContent,
  ToolbarGroup,
  ToolbarItem,
  SearchInput,
  Checkbox,
  EmptyState,
  EmptyStateIcon,
  EmptyStateHeader,
  Button,
  Icon,
  Bullseye,
} from '@patternfly/react-core';
import { FileIcon, SearchIcon } from '@patternfly/react-icons';
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
import { TFunction } from 'i18next';
import _ from 'lodash';
import * as React from 'react';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { ThreadDumpsTable } from './ThreadDumpsTable';

const tableColumns: TableColumn[] = [
  {
    title: 'Target',
    keyPaths: ['target'],
    transform: (target: Target, _obj: ArchivesForTarget, t?: TFunction) => {
      return target.alias === target.connectUrl || !target.alias
        ? `${target.connectUrl}`
        : t
          ? t('AllTargetsThreadDumpsTable.TARGET_DISPLAY', {
              alias: target.alias,
              connectUrl: target.connectUrl,
            })
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

type ArchivesForTarget = {
  target: Target;
  targetAsObs: Observable<Target>;
  archiveCount: number;
  threadDumps: ThreadDump[];
};

export interface AllTargetsThreadDumpsTableProps {}

export const AllTargetsThreadDumpsTable: React.FC<AllTargetsThreadDumpsTableProps> = () => {
  const context = React.useContext(ServiceContext);
  const { t } = useCryostatTranslation();

  const [searchText, setSearchText] = React.useState('');
  const [archivesForTargets, setArchivesForTargets] = React.useState<ArchivesForTarget[]>([]);
  const [expandedTargets, setExpandedTargets] = React.useState([] as Target[]);
  const [hideEmptyTargets, setHideEmptyTargets] = React.useState(true);
  const [errorMessage, setErrorMessage] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const addSubscription = useSubscriptions();
  const [sortBy, getSortParams] = useSort();

  const handleNotification = React.useCallback(
    (_: string, threadDump: ThreadDump, delta: number) => {
      setArchivesForTargets((old) => {
        const matchingTargets = old.filter(({ target }) => {
          return target.jvmId === threadDump.jvmId;
        });
        for (const matchedTarget of matchingTargets) {
          const targetIdx = old.findIndex(({ target }) => target.connectUrl === matchedTarget.target.connectUrl);
          const threadDumps = [...matchedTarget.threadDumps];
          if (delta === 1) {
            threadDumps.push(threadDump);
          } else {
            const threadDumpIdx = threadDumps.findIndex((t) => t.threadDumpId === threadDump.threadDumpId);
            threadDumps.splice(threadDumpIdx, 1);
          }

          old.splice(targetIdx, 1, { ...matchedTarget, archiveCount: matchedTarget.archiveCount + delta, threadDumps });
        }

        return [...old];
      });
    },
    [setArchivesForTargets],
  );

  const handleError = React.useCallback(
    (error) => {
      setIsLoading(false);
      setErrorMessage(error.message);
    },
    [setIsLoading, setErrorMessage],
  );

  const handleArchivesForTargets = React.useCallback(
    (targetNodes: any[]) => {
      setIsLoading(false);
      setErrorMessage('');
      setArchivesForTargets(
        targetNodes.map((node) => {
          const target: Target = {
            agent: node.target.agent,
            id: node.target.id,
            jvmId: node.target.jvmId,
            connectUrl: node.target.connectUrl,
            alias: node.target.alias,
            labels: [],
            annotations: {
              cryostat: [],
              platform: [],
            },
          };
          return {
            target,
            targetAsObs: of(target),
            archiveCount: node?.archiveCount ?? 0,
            threadDumps: node?.threadDumps ?? [],
          };
        }),
      );
    },
    [setArchivesForTargets, setIsLoading, setErrorMessage],
  );

  const refreshArchivesForTargets = React.useCallback(() => {
    setIsLoading(true);
    addSubscription(
      context.api
        .graphql<any>(
          `query AllTargetsThreadDumps {
              targetNodes {
                target {
                  agent
                  id
                  connectUrl
                  alias
                  jvmId
                  threadDumps {
                    data {
                      jvmId
                      downloadUrl
                      threadDumpId
                      lastModified
                      size
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
            return v.data?.targetNodes
              ?.map((node) => {
                const target: Target = node?.target;
                return {
                  target,
                  targetAsObs: of(target),
                  archiveCount: node?.target?.threadDumps?.aggregate?.count ?? 0,
                  threadDumps: (node?.target?.threadDumps?.data as ThreadDump[]) ?? [],
                };
              })
              .filter((v) => !!v.target);
          }),
        )
        .subscribe({
          next: handleArchivesForTargets,
          error: handleError,
        }),
    );
  }, [addSubscription, context.api, setIsLoading, handleArchivesForTargets, handleError]);

  const getCountForNewTarget = React.useCallback(
    (target: Target) => {
      addSubscription(
        context.api
          .graphql<any>(
            `query ThreadDumpCountForTarget($id: BigInteger!) {
                targetNodes(filter: { targetIds: [$id] }) {
                  target {
                    threadDumps {
                      data {
                        jvmId
                        downloadUrl
                        threadDumpId
                        lastModified
                        size
                      }
                      aggregate {
                        count
                      }
                    }
                  }
                }
              }`,
            { id: target.id! },
          )
          .subscribe((v) => {
            setArchivesForTargets((old) => {
              return [
                ...old,
                {
                  target: target,
                  targetAsObs: of(target),
                  archiveCount: v.data.targetNodes[0]?.target?.threadDumps?.aggregate?.count ?? 0,
                  threadDumps: v.data.targetNodes[0]?.target?.threadDumps ?? [],
                },
              ];
            });
          }),
      );
    },
    [addSubscription, context.api],
  );

  const handleLostTarget = React.useCallback(
    (target: Target) => {
      setArchivesForTargets((old) => old.filter(({ target: t }) => !isEqualTarget(t, target)));
      setExpandedTargets((old) => old.filter((t) => !isEqualTarget(t, target)));
    },
    [setArchivesForTargets, setExpandedTargets],
  );

  const handleTargetNotification = React.useCallback(
    (evt: TargetDiscoveryEvent) => {
      if (evt.kind === 'FOUND') {
        getCountForNewTarget(evt.serviceRef);
      } else if (evt.kind === 'MODIFIED') {
        setArchivesForTargets((old) => {
          const idx = old.findIndex(({ target: t }) => isEqualTarget(t, evt.serviceRef));
          if (idx >= 0) {
            const matched = old[idx];
            if (
              evt.serviceRef.connectUrl === matched.target.connectUrl &&
              evt.serviceRef.alias === matched.target.alias
            ) {
              // If alias and connectUrl are not updated, ignore changes.
              return old;
            }
            return old.splice(idx, 1, { ...matched, target: evt.serviceRef, targetAsObs: of(evt.serviceRef) });
          }
          return old;
        });
      } else if (evt.kind === 'LOST') {
        handleLostTarget(evt.serviceRef);
      }
    },
    [setArchivesForTargets, getCountForNewTarget, handleLostTarget],
  );

  const handleSearchInput = React.useCallback(
    (_, searchInput: string) => {
      setSearchText(searchInput);
    },
    [setSearchText],
  );

  const handleHideEmptyTarget = React.useCallback(
    (_, hide: boolean) => setHideEmptyTargets(hide),
    [setHideEmptyTargets],
  );

  const handleSearchInputClear = React.useCallback(() => {
    setSearchText('');
  }, [setSearchText]);

  const targetDisplay = React.useCallback(
    (target: Target): string => {
      const _transform = tableColumns[0].transform;
      if (_transform) {
        return `${_transform(target, undefined, t)}`;
      }
      // should not occur
      return `${target.connectUrl}`;
    },
    [t],
  );

  React.useEffect(() => {
    refreshArchivesForTargets();
  }, [refreshArchivesForTargets]);

  const searchedArchivesForTargets = React.useMemo(() => {
    let updated: ArchivesForTarget[] = archivesForTargets;
    if (searchText) {
      const reg = new RegExp(_.escapeRegExp(searchText), 'i');
      updated = archivesForTargets.filter(({ target }) => reg.test(targetDisplay(target)));
    }
    return sortResources(
      {
        index: sortBy.index ?? 0,
        direction: sortBy.direction ?? SortByDirection.asc,
      },
      updated.filter((v) => !hideEmptyTargets || v.archiveCount > 0),
      tableColumns,
    );
  }, [searchText, archivesForTargets, sortBy, hideEmptyTargets, targetDisplay]);

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

  React.useEffect(() => {
    addSubscription(
      context.notificationChannel.messages(NotificationCategory.ThreadDumpSuccess).subscribe((v) => {
        handleNotification(v.message.target, v.message.threadDumpId, 1);
      }),
    );
  }, [addSubscription, context.notificationChannel, handleNotification]);

  React.useEffect(() => {
    addSubscription(
      context.notificationChannel.messages(NotificationCategory.ThreadDumpDeleted).subscribe((v) => {
        handleNotification(v.message.target, v.message.threadDumpId, -1);
      }),
    );
  }, [addSubscription, context.notificationChannel, handleNotification]);

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
            {targetDisplay(target)}
          </Td>
          <Td key={`target-table-row-${idx}_3`} dataLabel={tableColumns[1].title}>
            <Button variant="plain" onClick={() => toggleExpanded(target)}>
              <Icon iconSize="md">
                <FileIcon />
              </Icon>
              <span style={{ marginLeft: 'var(--pf-v5-global--spacer--sm)' }}>{archiveCount}</span>
            </Button>
          </Td>
        </Tr>
      );
    });
  }, [toggleExpanded, searchedArchivesForTargets, expandedTargets, targetDisplay]);

  const recordingRows = React.useMemo(() => {
    return searchedArchivesForTargets.map(({ target, targetAsObs }) => {
      const isExpanded: boolean = includesTarget(expandedTargets, target);
      const keyBase = hashCode(JSON.stringify(target));
      return (
        <Tr key={`child-${keyBase}`} isExpanded={isExpanded}>
          <Td key={`target-ex-expand-${keyBase}`} dataLabel={'Content Details'} colSpan={tableColumns.length + 1}>
            {isExpanded ? (
              <ExpandableRowContent>
                <ThreadDumpsTable target={targetAsObs} />
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
          title={'Error retrieving Thread Dumps in All Targets View'}
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
        <Bullseye>
          <EmptyState>
            <EmptyStateHeader
              titleText={t('ThreadDumpsTable.NO_ARCHIVES')}
              icon={<EmptyStateIcon icon={SearchIcon} />}
              headingLevel="h4"
            />
          </EmptyState>
        </Bullseye>
      </>
    );
  } else {
    view = (
      <Table aria-label="all-targets-table" isStickyHeader>
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
      </Table>
    );
  }

  return (
    <OuterScrollContainer className="archive-table-outer-container">
      <Toolbar id="all-targets-toolbar">
        <ToolbarContent>
          <ToolbarGroup variant="filter-group">
            <ToolbarItem>
              <SearchInput
                style={{ minWidth: '30ch' }}
                placeholder={t('AllTargetsThreadDumpsTable.SEARCH_PLACEHOLDER')}
                value={searchText}
                onChange={handleSearchInput}
                onClear={handleSearchInputClear}
              />
            </ToolbarItem>
          </ToolbarGroup>
          <ToolbarItem alignSelf="center">
            <Checkbox
              name={`all-targets-hide-check`}
              label={t('AllTargetsThreadDumpsTable.HIDE_TARGET_WITH_ZERO_DUMPS')}
              onChange={handleHideEmptyTarget}
              isChecked={hideEmptyTargets}
              id={`all-targets-hide-check`}
              aria-label={`all-targets-hide-check`}
            />
          </ToolbarItem>
        </ToolbarContent>
      </Toolbar>
      <InnerScrollContainer className="">{view}</InnerScrollContainer>
    </OuterScrollContainer>
  );
};
