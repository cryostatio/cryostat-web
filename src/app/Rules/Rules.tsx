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
import { Link } from 'react-router-dom';
import {
  Button,
  Card,
  CardBody,
  EmptyState,
  EmptyStateIcon,
  Switch,
  Title,
  Toolbar,
  ToolbarContent,
  ToolbarItem,
  ToolbarGroup,
  CardTitle,
} from '@patternfly/react-core';
import { SearchIcon, UploadIcon } from '@patternfly/react-icons';
import {
  SortByDirection,
  Table,
  TableBody,
  TableHeader,
  TableVariant,
  ICell,
  ISortBy,
  info,
  sortable,
  IRowData,
  IExtraData,
  IAction,
} from '@patternfly/react-table';
import { useHistory, useRouteMatch } from 'react-router-dom';
import { first } from 'rxjs/operators';
import { ServiceContext } from '@app/Shared/Services/Services';
import { NotificationCategory } from '@app/Shared/Services/NotificationChannel.service';
import { useSubscriptions } from '@app/utils/useSubscriptions';
import { BreadcrumbPage } from '@app/BreadcrumbPage/BreadcrumbPage';
import { LoadingView } from '@app/LoadingView/LoadingView';
import { RuleUploadModal } from './RulesUploadModal';
import { DeleteWarningType } from '@app/Modal/DeleteWarningUtils';
import { RuleDeleteWarningModal } from './RuleDeleteWarningModal';

export interface Rule {
  name: string;
  description: string;
  matchExpression: string;
  enabled: boolean;
  eventSpecifier: string;
  archivalPeriodSeconds: number;
  initialDelaySeconds: number;
  preservedArchives: number;
  maxAgeSeconds: number;
  maxSizeBytes: number;
}

export interface RulesProps {}

export const Rules: React.FunctionComponent<RulesProps> = (props) => {
  const context = React.useContext(ServiceContext);
  const routerHistory = useHistory();
  const addSubscription = useSubscriptions();

  const { url } = useRouteMatch();
  const [isLoading, setIsLoading] = React.useState(false);
  const [sortBy, setSortBy] = React.useState({} as ISortBy);
  const [rules, setRules] = React.useState([] as Rule[]);
  const [warningModalOpen, setWarningModalOpen] = React.useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = React.useState(false);
  const [rowDeleteData, setRowDeleteData] = React.useState({} as IRowData);
  const [cleanRuleEnabled, setCleanRuleEnabled] = React.useState(true);

  const tableColumns = [
    { title: 'Enabled' },
    {
      title: 'Name',
      transforms: [sortable],
    },
    { title: 'Description' },
    {
      title: 'Match Expression',
      transforms: [
        info({
          tooltip:
            'A code-snippet expression which must evaluate to a boolean when applied to a given target. If the expression evaluates to true then the rule applies to that target.',
        }),
      ],
    },
    {
      title: 'Event Specifier',
      transforms: [
        info({
          tooltip: 'The name and location of the Event Template applied by this rule.',
        }),
      ],
    },
    {
      title: 'Archival Period',
      transforms: [
        info({
          tooltip:
            'Period in seconds. Cryostat will connect to matching targets at this interval and copy the relevant recording data into its archives. Values less than 1 prevent data from being repeatedly copied into archives - recordings will be started and remain only in target JVM memory.',
        }),
      ],
    },
    {
      title: 'Initial Delay',
      transforms: [
        info({
          tooltip:
            'Initial delay in seconds. Cryostat will wait this amount of time before first copying recording data into its archives. Values less than 0 default to equal to the Archival Period. You can set a non-zero Initial Delay with a zero Archival Period, which will start a recording and copy it into archives exactly once after a set delay.',
        }),
      ],
    },
    {
      title: 'Preserved Archives',
      transforms: [
        info({
          tooltip:
            'The number of recording copies to be maintained in the Cryostat archives. Cryostat will continue retrieving further archived copies and trimming the oldest copies from the archive to maintain this limit. Values less than 1 prevent data from being copied into archives - recordings will be started and remain only in target JVM memory.',
        }),
      ],
    },
    {
      title: 'Maximum Age',
      transforms: [
        info({
          tooltip:
            'The maximum age in seconds for data kept in the JFR recordings started by this rule. Values less than 1 indicate no limit.',
        }),
      ],
    },
    {
      title: 'Maximum Size',
      transforms: [
        info({
          tooltip:
            'The maximum size in bytes for JFR recordings started by this rule. Values less than 1 indicate no limit.',
        }),
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
      context.notificationChannel
        .messages(NotificationCategory.RuleCreated)
        .subscribe((v) => setRules((old) => old.concat(v.message)))
    );
  }, [addSubscription, context, context.notificationChannel, setRules]);

  React.useEffect(() => {
    addSubscription(
      context.notificationChannel
        .messages(NotificationCategory.RuleDeleted)
        .subscribe((v) => setRules((old) => old.filter((o) => o.name != v.message.name)))
    );
  }, [addSubscription, context, context.notificationChannel, setRules]);

  React.useEffect(() => {
    addSubscription(
      context.notificationChannel.messages(NotificationCategory.RuleUpdated).subscribe((msg) => {
        setRules((old) => {
          for (const r of old) {
            if (r.name === msg.message.name) {
              r.enabled = msg.message.enabled;
            }
          }
          return [...old];
        });
      })
    );
  }, [addSubscription, context, context.notificationChannel, setRules]);

  React.useEffect(() => {
    if (!context.settings.autoRefreshEnabled()) {
      return;
    }
    const id = window.setInterval(
      () => refreshRules(),
      context.settings.autoRefreshPeriod() * context.settings.autoRefreshUnits()
    );
    return () => window.clearInterval(id);
  }, []);

  const handleSort = React.useCallback(
    (event, index, direction) => {
      setSortBy({ index, direction });
    },
    [setSortBy]
  );

  const handleCreateRule = React.useCallback(() => {
    routerHistory.push(`${url}/create`);
  }, [routerHistory]);

  const handleUploadRule = React.useCallback(() => {
    setIsUploadModalOpen(true);
  }, [setIsUploadModalOpen]);

  const handleToggle = React.useCallback(
    (rule: Rule, enabled: boolean): void => {
      addSubscription(context.api.updateRule({ ...rule, enabled }).subscribe());
    },
    [context, context.api, addSubscription]
  );

  const displayRules = React.useMemo(() => {
    const { index, direction } = sortBy;
    let sorted = [...rules];
    if (typeof index === 'number') {
      const keys = ['name'];
      const key = keys[index];
      sorted = rules.sort((a: Rule, b: Rule): number => (a[key] < b[key] ? -1 : a[key] > b[key] ? 1 : 0));
      sorted = direction === SortByDirection.asc ? sorted : sorted.reverse();
    }
    return sorted.map((r: Rule) => [
      <>
        <Switch
          aria-label={`${r.name} is enabled`}
          className={'switch-toggle-' + String(r.enabled)}
          isChecked={r.enabled}
          onChange={(state) => handleToggle(r, state)}
        />
      </>,
      r.name,
      r.description,
      r.matchExpression,
      r.eventSpecifier,
      r.archivalPeriodSeconds,
      r.initialDelaySeconds,
      r.preservedArchives,
      r.maxAgeSeconds,
      r.maxSizeBytes,
    ]);
  }, [rules, sortBy, handleToggle]);

  const handleDelete = React.useCallback(
    (rowData: IRowData, clean: boolean = true) => {
      addSubscription(
        context.api
          .deleteRule(rowData[1], clean)
          .pipe(first())
          .subscribe(() => {} /* do nothing - notification will handle updating state */)
      );
    },
    [addSubscription, context, context.api]
  );

  const handleDownload = React.useCallback(
    (rowData: IRowData) => {
      context.api.downloadRule(rowData[1]);
    },
    [context, context.api]
  );

  const actionResolver = (rowData: IRowData, extraData: IExtraData): IAction[] => {
    if (typeof extraData.rowIndex == 'undefined') {
      return [];
    }
    return [
      {
        title: 'Download',
        onClick: (event, rowId, rowData) => handleDownload(rowData),
      },
      {
        isSeparator: true,
      },
      {
        title: 'Delete',
        onClick: (event, rowId, rowData) => {
          setRowDeleteData(rowData);
          handleDeleteButton(rowData);
        },
      },
    ];
  };

  const handleDeleteButton = React.useCallback(
    (rowData) => {
      if (context.settings.deletionDialogsEnabledFor(DeleteWarningType.DeleteAutomatedRules)) {
        setWarningModalOpen(true);
      } else {
        handleDelete(rowData, cleanRuleEnabled);
      }
    },
    [context, context.settings, setWarningModalOpen, handleDelete, cleanRuleEnabled]
  );

  const handleUploadModalClose = React.useCallback(() => {
    setIsUploadModalOpen(false);
    refreshRules();
  }, [setIsUploadModalOpen, refreshRules]);

  const viewContent = () => {
    if (isLoading) {
      return <LoadingView />;
    } else if (rules.length === 0) {
      return (
        <>
          <EmptyState>
            <EmptyStateIcon icon={SearchIcon} />
            <Title headingLevel="h4" size="lg">
              No Automated Rules
            </Title>
          </EmptyState>
        </>
      );
    } else {
      return (
        <>
          <Table
            aria-label="Automated Rules table"
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
        </>
      );
    }
  };

  const handleWarningModalAccept = React.useCallback(() => {
    handleDelete(rowDeleteData, cleanRuleEnabled);
  }, [handleDelete, rowDeleteData, cleanRuleEnabled]);

  const handleWarningModalClose = React.useCallback(() => {
    setWarningModalOpen(false);
  }, [setWarningModalOpen]);

  return (
    <>
      <BreadcrumbPage pageTitle="Automated Rules">
        <Card>
          <CardBody>
            <Toolbar id="event-templates-toolbar">
              <ToolbarContent>
                <ToolbarGroup variant="icon-button-group">
                  <ToolbarItem>
                    <Button key="create" variant="primary" onClick={handleCreateRule}>
                      Create
                    </Button>{' '}
                    <Button key="upload" variant="secondary" aria-label="Upload" onClick={handleUploadRule}>
                      <UploadIcon />
                    </Button>
                  </ToolbarItem>
                </ToolbarGroup>
                <RuleDeleteWarningModal
                  warningType={DeleteWarningType.DeleteAutomatedRules}
                  rule={rowDeleteData[1]}
                  visible={warningModalOpen}
                  onAccept={handleWarningModalAccept}
                  onClose={handleWarningModalClose}
                  clean={cleanRuleEnabled}
                  setClean={setCleanRuleEnabled}
                />
              </ToolbarContent>
            </Toolbar>
            {viewContent()}
          </CardBody>
        </Card>
        <Card>
          <CardTitle>About Automated Rules</CardTitle>
          <CardBody>
            Automated Rules define a dynamic set of Target JVMs to connect to and start{' '}
            <Link to="/recordings">Active Recordings</Link> using a specific <Link to="/events">Event Template</Link>{' '}
            when the Automated Rule is created and when any new matching Target JVMs appear. If your Target JVM
            connections require JMX Credentials, you can configure these in <Link to="/security">Security</Link>.
            Automated Rules can be configured to periodically copy the contents of the Active Recording to{' '}
            <Link to="/archives">Archives</Link> to ensure you always have up-to-date information about your JVMs.
          </CardBody>
        </Card>
      </BreadcrumbPage>
      <RuleUploadModal visible={isUploadModalOpen} onClose={handleUploadModalClose}></RuleUploadModal>
    </>
  );
};

export default Rules;
