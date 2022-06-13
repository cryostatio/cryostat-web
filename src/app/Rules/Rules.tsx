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
import { Card, CardBody, EmptyState, EmptyStateIcon, Title, Toolbar, ToolbarContent, ToolbarItem, ToolbarGroup, Dropdown, DropdownToggle, DropdownToggleAction, DropdownItem } from '@patternfly/react-core';
import { PlusIcon, SearchIcon } from '@patternfly/react-icons';
import { SortByDirection, Table, TableBody, TableHeader, TableVariant, ICell, ISortBy, info, sortable, IRowData, IExtraData, IAction } from '@patternfly/react-table';
import { useHistory, useRouteMatch } from 'react-router-dom';
import { first } from 'rxjs/operators';
import { ServiceContext } from '@app/Shared/Services/Services';
import { NotificationCategory } from '@app/Shared/Services/NotificationChannel.service';
import { useSubscriptions } from '@app/utils/useSubscriptions';
import { BreadcrumbPage } from '@app/BreadcrumbPage/BreadcrumbPage';
import { LoadingView } from '@app/LoadingView/LoadingView';
import { RuleUploadModal } from './RulesUploadModal';
import { from, Observable, of } from 'rxjs';

export interface Rule {
  name: string;
  description: string;
  matchExpression: string;
  eventSpecifier: string;
  archivalPeriodSeconds: number;
  preservedArchives: number;
  maxAgeSeconds: number;
  maxSizeBytes: number;
}

export const parseRule = (file: File): Observable<Rule> => {
  return from(
    file.text()
    .then(content => {
      const ruleConfig = JSON.parse(content);
      const rule: Rule = {
        name: ruleConfig.name,
        description: ruleConfig.description,
        matchExpression: ruleConfig.matchExpression,
        eventSpecifier: ruleConfig.eventSpecifier,
        archivalPeriodSeconds: ruleConfig.archivalPeriodSeconds,
        preservedArchives: ruleConfig.preservedArchives,
        maxAgeSeconds: ruleConfig.maxAgeSeconds,
        maxSizeBytes: ruleConfig.maxSizeBytes
      };
      return rule;
    }
    )
  );
};

export const Rules = () => {
  const context = React.useContext(ServiceContext);
  const routerHistory = useHistory();
  const addSubscription = useSubscriptions();

  const { url } = useRouteMatch();
  const [isLoading, setIsLoading] = React.useState(false);
  const [sortBy, setSortBy] = React.useState({} as ISortBy);
  const [rules, setRules] = React.useState([] as Rule[]);
  const [isUploadModalOpen, setIsUploadModalOpen] = React.useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = React.useState(false);

  const tableColumns = [
    {
      title: 'Name',
      transforms: [ sortable ],
    },
    { title: 'Description', },
    {
      title: 'Match Expression',
      transforms: [
        info({
          tooltip: 'A code-snippet expression which must evaluate to a boolean when applied to a given target. If the expression evaluates to true then the rule applies to that target.'
        })
      ],
    },
    {
      title: 'Event Specifier',
      transforms: [
        info({
          tooltip: 'The name and location of the Event Template applied by this rule.'
        })
      ],
    },
    {
      title: 'Archival Period',
      transforms: [
        info({
          tooltip: 'Period in seconds. Cryostat will connect to matching targets at this interval and copy the relevant recording data into its archives. Values less than 1 prevent data from being copied into archives - recordings will be started and remain only in target JVM memory.'
        })
      ],
    },
    {
      title: 'Preserved Archives',
      transforms: [
        info({
          tooltip: 'The number of recording copies to be maintained in the Cryostat archives. Cryostat will continue retrieving further archived copies and trimming the oldest copies from the archive to maintain this limit. Values less than 1 prevent data from being copied into archives - recordings will be started and remain only in target JVM memory.'
        })
      ],
    },
    {
      title: 'Maximum Age',
      transforms: [
        info({
          tooltip: 'The maximum age in seconds for data kept in the JFR recordings started by this rule. Values less than 1 indicate no limit.'
        })
      ],
    },
    {
      title: 'Maximum Size',
      transforms: [
        info({
          tooltip: 'The maximum size in bytes for JFR recordings started by this rule. Values less than 1 indicate no limit.'
        })
      ],
    },
  ] as ICell[];

  const refreshRules = React.useCallback(() => {
    setIsLoading(true);
    addSubscription(
      context.api.doGet('rules', 'v2').subscribe((v: any) => {
        setRules(v.data.result);
        setIsLoading(false);
      })
    );
  }, [setIsLoading, addSubscription, context, context.api, setRules]);

  React.useEffect(() => {
    refreshRules();
  }, [context, context.api]);

  React.useEffect(() => {
    addSubscription(
      context.notificationChannel.messages(NotificationCategory.RuleCreated)
        .subscribe(v => setRules(old => old.concat(v.message)))
    );
  }, [addSubscription, context, context.notificationChannel, setRules]);

  React.useEffect(() => {
    addSubscription(
      context.notificationChannel.messages(NotificationCategory.RuleDeleted)
        .subscribe(v => setRules(old => old.filter(o => o.name != v.message.name)))
    )
  }, [addSubscription, context, context.notificationChannel, setRules]);

  React.useEffect(() => {
    if (!context.settings.autoRefreshEnabled()) {
      return;
    }
    const id = window.setInterval(() => refreshRules(), context.settings.autoRefreshPeriod() * context.settings.autoRefreshUnits());
    return () => window.clearInterval(id);
  }, []);

  const handleSort = (event, index, direction) => {
    setSortBy({ index, direction });
  };

  const handleCreateRule = React.useCallback(() => {
    routerHistory.push(`${url}/create`);
  }, [routerHistory]);

  const handleUploadRule = React.useCallback(() => {
    setIsUploadModalOpen(true);
  }, [setIsUploadModalOpen]);

  const displayRules = React.useMemo(() => {
    const { index, direction } = sortBy;
    let sorted = [...rules];
    if (typeof index === 'number') {
      const keys = ['name'];
      const key = keys[index];
      sorted = rules
        .sort((a: Rule, b: Rule): number => (a[key] < b[key] ? -1 : a[key] > b[key] ? 1 : 0));
      sorted = direction === SortByDirection.asc ? sorted : sorted.reverse();
    }
    return sorted.map((r: Rule) => ([ r.name, r.description, r.matchExpression, r.eventSpecifier, r.archivalPeriodSeconds, r.preservedArchives, r.maxAgeSeconds, r.maxSizeBytes ]));
  }, [rules, sortBy]);

  const handleDelete = (rowData: IRowData) => {
    addSubscription(
      context.api.deleteRule(rowData[0])
      .pipe(first())
      .subscribe(() => {} /* do nothing - notification will handle updating state */)
    );
  };

  const handleDownload = (rowData: IRowData) => {
    context.api.downloadRule(rowData[0]);
  }

  const actionResolver = (rowData: IRowData, extraData: IExtraData): IAction[] => {
    if (typeof extraData.rowIndex == 'undefined') {
      return [];
    }
    return [
      {
        title: 'Delete',
        onClick: (event, rowId, rowData) => handleDelete(rowData)
      }, 
      {
        title: 'Download',
        onClick: (event, rowId, rowData) => handleDownload(rowData)
      }
    ]
  };

  const handleUploadModalClose = React.useCallback(() => {
    setIsUploadModalOpen(false);
    refreshRules();
  }, [setIsUploadModalOpen, refreshRules]);

  const onRuleGenerationMenuToggle = React.useCallback((isOpen: boolean) => {
    setIsDropdownOpen(isOpen);
  }, [setIsDropdownOpen]);

  const ruleGenerationActionItems = [
    <DropdownItem key="create" onClick={handleCreateRule}>Create</DropdownItem>,
    <DropdownItem key="upload"onClick={handleUploadRule}>Upload</DropdownItem>,
  ];

  const viewContent = () => {
    if (isLoading) {
      return <LoadingView />;
    } else if (rules.length === 0) {
      return (<>
        <EmptyState>
          <EmptyStateIcon icon={SearchIcon}/>
          <Title headingLevel="h4" size="lg">
            No Automated Rules
          </Title>
        </EmptyState>
      </>);
    } else {
      return (<>
        <Table aria-label="Automated Rules table"
          variant={TableVariant.compact}
          cells={tableColumns}
          rows={displayRules}
          actionResolver={actionResolver}
          sortBy={sortBy}
          onSort={handleSort}
        >
          <TableHeader />
          <TableBody />
        </Table>
      </>);
    }
  };

  return (<>
    <BreadcrumbPage pageTitle='Automated Rules' >
      <Card>
        <CardBody>
        <Toolbar id="event-templates-toolbar">
          <ToolbarContent>
            <ToolbarGroup variant="icon-button-group">
              <ToolbarItem>
                <Dropdown 
                  onSelect= {()=>setIsDropdownOpen(false)} 
                  toggle={
                    <DropdownToggle
                      toggleIndicator={null}
                      onToggle={onRuleGenerationMenuToggle} 
                      id="toggle-rule-generate-action">
                    <PlusIcon/>
                  </DropdownToggle>
                  }
                  isOpen={isDropdownOpen}
                  isPlain
                  dropdownItems={ruleGenerationActionItems}
                />
              </ToolbarItem>
            </ToolbarGroup>
          </ToolbarContent>
        </Toolbar>
          {viewContent()}
        </CardBody>
      </Card>
    </BreadcrumbPage>
    <RuleUploadModal visible={isUploadModalOpen} onClose={handleUploadModalClose}></RuleUploadModal>
  </>);
};
