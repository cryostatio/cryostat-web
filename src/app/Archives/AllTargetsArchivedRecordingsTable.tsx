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
import { Target } from '@app/Shared/Services/Target.service';
import { NotificationCategory } from '@app/Shared/Services/NotificationChannel.service';
import { useSubscriptions } from '@app/utils/useSubscriptions';
import { Toolbar, ToolbarContent, ToolbarGroup, ToolbarItem, SearchInput, Badge } from '@patternfly/react-core';
import { TableComposable, Th, Thead, Tbody, Tr, Td, ExpandableRowContent } from '@patternfly/react-table';
import { ArchivedRecordingsTable } from '@app/Recordings/ArchivedRecordingsTable';
import { of } from 'rxjs';
import { map } from 'rxjs/operators';
import { TargetDiscoveryEvent } from '@app/Shared/Services/Targets.service';
import { LoadingView } from '@app/LoadingView/LoadingView';
import _ from 'lodash';

export interface AllTargetsArchivedRecordingsTableProps { }

export const AllTargetsArchivedRecordingsTable: React.FunctionComponent<AllTargetsArchivedRecordingsTableProps> = () => {
  const context = React.useContext(ServiceContext);

  const [targets, setTargets] = React.useState([] as Target[]);
  const [counts, setCounts] = React.useState([] as number[]);
  const [search, setSearch] = React.useState('');
  const [searchedTargets, setSearchedTargets] = React.useState([] as Target[]);
  const [expandedTargets, setExpandedTargets] = React.useState([] as Target[]);
  const [isLoading, setIsLoading] = React.useState(false);
  const addSubscription = useSubscriptions();

  const searchedTargetsRef = React.useRef(searchedTargets);

  const tableColumns: string[] = [
    'Target',
    'Count'
  ];

  const updateCount = React.useCallback((connectUrl: string, delta: number) => {
    let idx = 0;
    for (const t of targets) {
      if (t.connectUrl === connectUrl) {
        setCounts(old => {
          let updated = [...old];
          updated[idx] += delta;
          return updated;
        });
        break;
      }
      idx++;
    }
  }, [targets, setCounts]);

  const handleTargetsAndCounts = React.useCallback((targetNodes) => {
    let updatedTargets: Target[] = [];
    let updatedCounts: number[] = [];
    for (const node of targetNodes) {
      const target: Target = {
        connectUrl: node.target.serviceUri,
        alias: node.target.alias,
      }
      updatedTargets.push(target);
      updatedCounts.push(node.recordings.archived.aggregate.count as number);
    }
    setTargets(updatedTargets);
    setCounts(updatedCounts);
    setIsLoading(false);
  },[setTargets, setCounts, setIsLoading]);

  const refreshTargetsAndCounts = React.useCallback(() => {
    setIsLoading(true);
    addSubscription(
      context.api.graphql<any>(`
        query {
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
        }`)
      .pipe(
        map(v => v.data.targetNodes)
      )
      .subscribe(handleTargetsAndCounts)
    );
  }, [addSubscription, context, context.api, setIsLoading, handleTargetsAndCounts]);

  const getCountForNewTarget = React.useCallback((target: Target) => {
    addSubscription(
      context.api.graphql<any>(`
        query {
          targetNodes(filter: { name: "${target.connectUrl}" }) {
            recordings {
              archived {
                aggregate {
                  count
                }
              }
            }
          }
        }`)
      .subscribe(v => setCounts(old => old.concat(v.data.targetNodes.recordings.archived.aggregate.count as number)))
    );
  },[addSubscription, context, context.api, setCounts]);

  React.useEffect(() => {
    searchedTargetsRef.current = searchedTargets;
  });

  React.useEffect(() => {
    refreshTargetsAndCounts();
  }, []);

  React.useEffect(() => {
    if (!context.settings.autoRefreshEnabled()) {
      return;
    }
    const id = window.setInterval(() => refreshTargetsAndCounts(), context.settings.autoRefreshPeriod() * context.settings.autoRefreshUnits());
    return () => window.clearInterval(id);
  }, [context.target, context.settings, refreshTargetsAndCounts]);

  React.useEffect(() => {
    let updatedSearchedTargets;
    if (!search) {
      updatedSearchedTargets = targets;
    } else {
      const searchText = search.trim().toLowerCase();
      updatedSearchedTargets = targets.filter((t: Target) => t.alias.toLowerCase().includes(searchText) || t.connectUrl.toLowerCase().includes(searchText))
    }

    if (!_.isEqual(searchedTargetsRef.current, updatedSearchedTargets)) {
      setSearchedTargets([...updatedSearchedTargets]);
    }
  }, [search, targets]);

  React.useEffect(() => {
    addSubscription(
      context.notificationChannel.messages(NotificationCategory.TargetJvmDiscovery)
        .subscribe(v => {
          const evt: TargetDiscoveryEvent = v.message.event;
          const target: Target = {
            connectUrl: evt.serviceRef.connectUrl,
            alias: evt.serviceRef.alias,
          }
          if (evt.kind === 'FOUND') {
            setTargets(old => old.concat(target));
            getCountForNewTarget(target);
          } else if (evt.kind === 'LOST') {
            const idx = targets.indexOf(target);
            setTargets(old => old.filter(o => o.connectUrl != target.connectUrl));
            setCounts(old => old.splice(idx, 1));
          }
        })
    );
  }, [addSubscription, context, context.notificationChannel, getCountForNewTarget, setTargets, setCounts]);

  React.useEffect(() => {
    addSubscription(
      context.notificationChannel.messages(NotificationCategory.ActiveRecordingSaved)
      .subscribe(v => {
        updateCount(v.message.target, 1);
      })
    );
  }, [addSubscription, context, context.notificationChannel, updateCount]);

  React.useEffect(() => {
    addSubscription(
      context.notificationChannel.messages(NotificationCategory.ArchivedRecordingDeleted)
      .subscribe(v => {
        updateCount(v.message.target, -1);
      })
    );
  }, [addSubscription, context, context.notificationChannel, updateCount]);

  const toggleExpanded = React.useCallback((target) => {
    const idx = expandedTargets.indexOf(target);
    setExpandedTargets(expandedTargets => idx >= 0 ? [...expandedTargets.slice(0, idx), ...expandedTargets.slice(idx + 1, expandedTargets.length)] : [...expandedTargets, target]);
  }, [expandedTargets]);

  const targetRows = React.useMemo(() => {
    let targetRows: Map<Target, JSX.Element> = new Map<Target, JSX.Element>();
    targets.map((target, idx) => {
      let isExpanded: boolean = expandedTargets.includes(target);
      const handleToggle = () => {
        if (counts[idx] !== 0 || isExpanded) {
          toggleExpanded(target);
        }
      };

      let view: JSX.Element;
      view = (<> 
        <Tr isHidden={!searchedTargets.includes(target)}>
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
            {(target.alias == target.connectUrl) || !target.alias ?
              `${target.connectUrl}`
            : 
              `${target.alias} (${target.connectUrl})`}
          </Td>
          <Td>
            <Badge key={idx}> 
              {counts[idx]}
            </Badge>          
          </Td>
        </Tr>
      </>);
      targetRows.set(target, view);
    });
    return targetRows;
  }, [targets, counts, expandedTargets, searchedTargets]);

  const recordingRows = React.useMemo(() => {
    let recordingRows: Map<Target, JSX.Element> = new Map<Target, JSX.Element>();
    targets.map((target, idx) => {
      let isExpanded: boolean = expandedTargets.includes(target);
      let view: JSX.Element;
      view =(<>
        <Tr key={`${idx}_child`} isExpanded={isExpanded} isHidden={!searchedTargets.includes(target)}>
          <Td
            key={`target-ex-expand-${idx}`}
            dataLabel={"Content Details"}
            colSpan={tableColumns.length + 1}
          >
            {isExpanded ?
              <ExpandableRowContent>
                <ArchivedRecordingsTable isUploadsTable={false} target={of(target)}/>
              </ExpandableRowContent>
            :
              null}
          </Td>
        </Tr>
      </>);
      recordingRows.set(target, view);
    });
    return recordingRows;
  }, [targets, expandedTargets, searchedTargets]);

  const tableRows = React.useMemo(() => {
    return targets.map((target) => <>{targetRows.get(target)}{recordingRows.get(target)}</>);
  }, [targets, targetRows, recordingRows]);

  let view: JSX.Element;
  if (isLoading) {
    view = (<LoadingView/>);
  } else {
    view = (<>
      <TableComposable aria-label="all-archives" className='pf-c-table-all-archives'>
        <Thead>
          <Tr>
            <Th key="table-header-expand"/>
            {tableColumns.map((key) => (
              <Th key={`table-header-${key}`}>{key}</Th>
            ))}
          </Tr>
        </Thead>
        <Tbody>
          {tableRows}
        </Tbody>
      </TableComposable>
    </>)
  }

  return (<>
    <Toolbar id="all-archives-toolbar">
      <ToolbarContent>
        <ToolbarGroup variant="filter-group">
          <ToolbarItem> 
            <SearchInput
              placeholder="Search"
              value={search}
              onChange={setSearch}
              onClear={evt => setSearch('')}
            />
          </ToolbarItem>
        </ToolbarGroup>
      </ToolbarContent>
    </Toolbar>
    {view}
  </>);
};