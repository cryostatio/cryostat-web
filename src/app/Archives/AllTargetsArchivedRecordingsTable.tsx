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
import { SearchIcon } from '@patternfly/react-icons';
import { TableComposable, Th, Thead, Tbody, Tr, Td, ExpandableRowContent } from '@patternfly/react-table';
import * as React from 'react';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';

export interface AllTargetsArchivedRecordingsTableProps {}

export const AllTargetsArchivedRecordingsTable: React.FC<AllTargetsArchivedRecordingsTableProps> = () => {
  const context = React.useContext(ServiceContext);

  const [targets, setTargets] = React.useState(
    [] as {
      target: Target;
      targetAsObs: Observable<Target>;
    }[]
  );
  const [counts, setCounts] = React.useState(new Map<string, number>());
  const [searchText, setSearchText] = React.useState('');
  const [searchedTargets, setSearchedTargets] = React.useState([] as Target[]);
  const [expandedTargets, setExpandedTargets] = React.useState([] as Target[]);
  const [hideEmptyTargets, setHideEmptyTargets] = React.useState(true);
  const [isLoading, setIsLoading] = React.useState(false);
  const addSubscription = useSubscriptions();

  const tableColumns: string[] = React.useMemo(() => ['Target', 'Count'], []);

  const updateCount = React.useCallback(
    (connectUrl: string, delta: number) => {
      setCounts((old) => {
        const newMap = new Map<string, number>(old);
        const curr = newMap.get(connectUrl) || 0;
        newMap.set(connectUrl, curr + delta);
        return newMap;
      });
    },
    [setCounts]
  );

  const handleTargetsAndCounts = React.useCallback(
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
    (targetNodes: any) => {
      const updatedTargets: {
        target: Target;
        targetAsObs: Observable<Target>;
      }[] = [];
      const updatedCounts = new Map<string, number>();
      for (const node of targetNodes) {
        const target: Target = {
          connectUrl: node.target.serviceUri,
          alias: node.target.alias,
        };
        updatedTargets.push({ target: target, targetAsObs: of(target) });
        updatedCounts.set(target.connectUrl, node.recordings.archived.aggregate.count as number);
      }
      setTargets(updatedTargets);
      setCounts(updatedCounts);
      setIsLoading(false);
    },
    [setTargets, setCounts, setIsLoading]
  );

  /* eslint-disable @typescript-eslint/no-explicit-any */
  const refreshTargetsAndCounts = React.useCallback(() => {
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
        .subscribe(handleTargetsAndCounts)
    );
  }, [addSubscription, context.api, setIsLoading, handleTargetsAndCounts]);
  /* eslint-enable @typescript-eslint/no-explicit-any */

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
          .subscribe((v) =>
            setCounts((old) => {
              const newMap = new Map<string, number>(old);
              newMap.set(target.connectUrl, v.data.targetNodes[0].recordings.archived.aggregate.count as number);
              return newMap;
            })
          )
      );
    },
    [addSubscription, context.api, setCounts]
  );

  /* eslint-enable @typescript-eslint/no-explicit-any */
  const handleLostTarget = React.useCallback(
    (target: Target) => {
      setTargets((old) => {
        return old.filter(({ target: t }) => !isEqualTarget(t, target));
      });
      setExpandedTargets((old) => old.filter((t) => !isEqualTarget(t, target)));
      setCounts((old) => {
        const newMap = new Map<string, number>(old);
        newMap.delete(target.connectUrl);
        return newMap;
      });
    },
    [setTargets, setExpandedTargets, setCounts]
  );

  const handleTargetNotification = React.useCallback(
    (evt: TargetDiscoveryEvent) => {
      const target: Target = {
        connectUrl: evt.serviceRef.connectUrl,
        alias: evt.serviceRef.alias,
      };
      if (evt.kind === 'FOUND') {
        setTargets((old) => old.concat({ target: target, targetAsObs: of(target) }));
        getCountForNewTarget(target);
      } else if (evt.kind === 'MODIFIED') {
        setTargets((old) => {
          return [...old.filter(({ target: t }) => !isEqualTarget(t, target))].concat({
            target: target,
            targetAsObs: of(target),
          });
        });
      } else if (evt.kind === 'LOST') {
        handleLostTarget(target);
      }
    },
    [setTargets, getCountForNewTarget, handleLostTarget]
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
    refreshTargetsAndCounts();
  }, [refreshTargetsAndCounts]);

  React.useEffect(() => {
    let updatedSearchedTargets: Target[];
    if (!searchText) {
      updatedSearchedTargets = targets.map((t) => t.target);
    } else {
      const formattedSearchText = searchText.trim().toLowerCase();
      updatedSearchedTargets = targets
        .map((t) => t.target)
        .filter(
          (t: Target) =>
            t.alias.toLowerCase().includes(formattedSearchText) ||
            t.connectUrl.toLowerCase().includes(formattedSearchText)
        );
    }
    setSearchedTargets(updatedSearchedTargets);
  }, [searchText, targets, setSearchedTargets]);

  React.useEffect(() => {
    if (!context.settings.autoRefreshEnabled()) {
      return;
    }
    const id = window.setInterval(
      () => refreshTargetsAndCounts(),
      context.settings.autoRefreshPeriod() * context.settings.autoRefreshUnits()
    );
    return () => window.clearInterval(id);
  }, [context.target, context.settings, refreshTargetsAndCounts]);

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

  const isHidden = React.useMemo(() => {
    return targets.map(({ target }) => {
      return (
        !includesTarget(searchedTargets, target) || (hideEmptyTargets && (counts.get(target.connectUrl) || 0) === 0)
      );
    });
  }, [targets, searchedTargets, hideEmptyTargets, counts]);

  const targetRows = React.useMemo(() => {
    return targets.map(({ target }, idx) => {
      const isExpanded: boolean = includesTarget(expandedTargets, target);

      const handleToggle = () => {
        if ((counts.get(target.connectUrl) || 0) !== 0 || isExpanded) {
          toggleExpanded(target);
        }
      };

      return (
        <Tr key={`${idx}_parent`} isHidden={isHidden[idx]}>
          <Td
            key={`target-table-row-${idx}_1`}
            id={`target-ex-toggle-${idx}`}
            aria-controls={`target-ex-expand-${idx}`}
            expand={{
              rowIndex: idx,
              isExpanded: isExpanded,
              onToggle: handleToggle,
            }}
          />
          <Td key={`target-table-row-${idx}_2`} dataLabel={tableColumns[0]}>
            {target.alias == target.connectUrl || !target.alias
              ? `${target.connectUrl}`
              : `${target.alias} (${target.connectUrl})`}
          </Td>
          <Td key={`target-table-row-${idx}_3`}>
            <Badge key={`${idx}_count`}>{counts.get(target.connectUrl) || 0}</Badge>
          </Td>
        </Tr>
      );
    });
  }, [toggleExpanded, targets, expandedTargets, counts, isHidden, tableColumns]);

  const recordingRows = React.useMemo(() => {
    return targets.map(({ target, targetAsObs }, idx) => {
      const isExpanded: boolean = includesTarget(expandedTargets, target);

      return (
        <Tr key={`${idx}_child`} isExpanded={isExpanded} isHidden={isHidden[idx]}>
          <Td key={`target-ex-expand-${idx}`} dataLabel={'Content Details'} colSpan={tableColumns.length + 1}>
            {isExpanded ? (
              <ExpandableRowContent>
                <ArchivedRecordingsTable target={targetAsObs} isUploadsTable={false} isNestedTable={true} />
              </ExpandableRowContent>
            ) : null}
          </Td>
        </Tr>
      );
    });
  }, [targets, expandedTargets, isHidden, tableColumns.length]);

  const rowPairs = React.useMemo(() => {
    const rowPairs: JSX.Element[] = [];
    for (let i = 0; i < targetRows.length; i++) {
      rowPairs.push(targetRows[i]);
      rowPairs.push(recordingRows[i]);
    }
    return rowPairs;
  }, [targetRows, recordingRows]);

  const noTargets = React.useMemo(() => {
    return isHidden.reduce((a, b) => a && b, true);
  }, [isHidden]);

  let view: JSX.Element;
  if (isLoading) {
    view = <LoadingView />;
  } else if (noTargets) {
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
              {tableColumns.map((key) => (
                <Th key={`table-header-${key}`} width={key === 'Target' ? 90 : 15}>
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
