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
import { LoadingView } from '@app/LoadingView/LoadingView';
import { ArchivedRecordingsTable } from '@app/Recordings/ArchivedRecordingsTable';
import { NotificationCategory } from '@app/Shared/Services/NotificationChannel.service';
import { ServiceContext } from '@app/Shared/Services/Services';
import { includesTarget, indexOfTarget, isEqualTarget, Target } from '@app/Shared/Services/Target.service';
import { TargetDiscoveryEvent } from '@app/Shared/Services/Targets.service';
import { useSort } from '@app/utils/useSort';
import { useSubscriptions } from '@app/utils/useSubscriptions';
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

type ArchivesForTarget = {
  target: Target;
  targetAsObs: Observable<Target>;
  archiveCount: number;
};

export interface AllTargetsArchivedRecordingsTableProps {}

export const AllTargetsArchivedRecordingsTable: React.FC<AllTargetsArchivedRecordingsTableProps> = () => {
  const context = React.useContext(ServiceContext);
  const [searchText, setSearchText] = React.useState('');
  const [archivesForTargets, setArchivesForTargets] = React.useState<ArchivesForTarget[]>([]);
  const [expandedTargets, setExpandedTargets] = React.useState([] as Target[]);
  const [hideEmptyTargets, setHideEmptyTargets] = React.useState(true);
  const [isLoading, setIsLoading] = React.useState(false);
  const addSubscription = useSubscriptions();
  const [sortBy, getSortParams] = useSort();

  const updateCount = React.useCallback(
    (connectUrl: string, delta: number) => {
      setArchivesForTargets((old) => {
        const idx = old.findIndex(({ target }) => target.connectUrl === connectUrl);
        if (idx >= 0) {
          const matched = old[idx];
          old.splice(idx, 1, { ...matched, archiveCount: matched.archiveCount + delta });
          return [...old];
        }
        return old;
      });
    },
    [setArchivesForTargets]
  );

  const handleArchivesForTargets = React.useCallback(
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
    (targetNodes: any[]) => {
      setIsLoading(false);
      setArchivesForTargets(
        targetNodes.map((node) => {
          const target: Target = {
            connectUrl: node.target.serviceUri,
            alias: node.target.alias,
          };
          return {
            target,
            targetAsObs: of(target),
            archiveCount: node.recordings.archived.aggregate.count,
          };
        })
      );
    },
    [setArchivesForTargets, setIsLoading]
  );

  /* eslint-disable @typescript-eslint/no-explicit-any */
  const refreshArchivesForTargets = React.useCallback(() => {
    setIsLoading(true);
    addSubscription(
      context.api
        .graphql<any>(
          `query AllTargetsArchives {
               targetNodes {
                 target {
                   serviceUri
                   alias
                 }
                 recordings {
                   archived {
                     aggregate {
                       count
                     }
                   }
                 }
               }
             }`
        )
        .pipe(map((v) => v.data.targetNodes))
        .subscribe(handleArchivesForTargets)
    );
  }, [addSubscription, context.api, setIsLoading, handleArchivesForTargets]);

  /* eslint-disable @typescript-eslint/no-explicit-any */
  const getCountForNewTarget = React.useCallback(
    (target: Target) => {
      addSubscription(
        context.api
          .graphql<any>(
            `
        query ArchiveCountForTarget($connectUrl: String) {
          targetNodes(filter: { name: $connectUrl }) {
            recordings {
              archived {
                aggregate {
                  count
                }
              }
            }
          }
        }`,
            { connectUrl: target.connectUrl }
          )
          .subscribe((v) => {
            setArchivesForTargets((old) => {
              return [
                ...old,
                {
                  target: target,
                  targetAsObs: of(target),
                  archiveCount: v.data.targetNodes[0].recordings.archived.aggregate.count,
                },
              ];
            });
          })
      );
    },
    [addSubscription, context.api]
  );

  /* eslint-enable @typescript-eslint/no-explicit-any */
  const handleLostTarget = React.useCallback(
    (target: Target) => {
      setArchivesForTargets((old) => old.filter(({ target: t }) => !isEqualTarget(t, target)));
      setExpandedTargets((old) => old.filter((t) => !isEqualTarget(t, target)));
    },
    [setArchivesForTargets, setExpandedTargets]
  );

  const handleTargetNotification = React.useCallback(
    (evt: TargetDiscoveryEvent) => {
      const target: Target = {
        connectUrl: evt.serviceRef.connectUrl,
        alias: evt.serviceRef.alias,
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
    [setArchivesForTargets, getCountForNewTarget, handleLostTarget]
  );

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
          t.connectUrl.toLowerCase().includes(formattedSearchText)
      );
    }
    return sortResources(
      {
        index: sortBy.index ?? 0,
        direction: sortBy.direction ?? SortByDirection.asc,
      },
      updated.filter((v) => !hideEmptyTargets || v.archiveCount > 0),
      tableColumns
    );
  }, [searchText, archivesForTargets, sortBy, hideEmptyTargets]);

  React.useEffect(() => {
    if (!context.settings.autoRefreshEnabled()) {
      return;
    }
    const id = window.setInterval(
      () => refreshArchivesForTargets(),
      context.settings.autoRefreshPeriod() * context.settings.autoRefreshUnits()
    );
    return () => window.clearInterval(id);
  }, [context.target, context.settings, refreshArchivesForTargets]);

  React.useEffect(() => {
    addSubscription(
      context.notificationChannel
        .messages(NotificationCategory.TargetJvmDiscovery)
        .subscribe((v) => handleTargetNotification(v.message.event))
    );
  }, [addSubscription, context.notificationChannel, handleTargetNotification]);

  React.useEffect(() => {
    addSubscription(
      context.notificationChannel.messages(NotificationCategory.ActiveRecordingSaved).subscribe((v) => {
        updateCount(v.message.target, 1);
      })
    );
  }, [addSubscription, context.notificationChannel, updateCount]);

  React.useEffect(() => {
    addSubscription(
      context.notificationChannel.messages(NotificationCategory.ArchivedRecordingCreated).subscribe((v) => {
        updateCount(v.message.target, 1);
      })
    );
  }, [addSubscription, context.notificationChannel, updateCount]);

  React.useEffect(() => {
    addSubscription(
      context.notificationChannel.messages(NotificationCategory.ArchivedRecordingDeleted).subscribe((v) => {
        updateCount(v.message.target, -1);
      })
    );
  }, [addSubscription, context.notificationChannel, updateCount]);

  const toggleExpanded = React.useCallback(
    (target) => {
      const idx = indexOfTarget(expandedTargets, target);
      setExpandedTargets((expandedTargets) =>
        idx >= 0
          ? [...expandedTargets.slice(0, idx), ...expandedTargets.slice(idx + 1, expandedTargets.length)]
          : [...expandedTargets, target]
      );
    },
    [expandedTargets, setExpandedTargets]
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
  if (isLoading) {
    view = <LoadingView />;
  } else if (!searchedArchivesForTargets.length) {
    view = (
      <>
        <EmptyState>
          <EmptyStateIcon icon={SearchIcon} />
          <Title headingLevel="h4" size="lg">
            No Targets
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
