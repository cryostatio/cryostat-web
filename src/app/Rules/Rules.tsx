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
import { BreadcrumbPage } from '@app/BreadcrumbPage/BreadcrumbPage';
import { LoadingView } from '@app/LoadingView/LoadingView';
import { DeleteOrDisableWarningType } from '@app/Modal/DeleteWarningUtils';
import { NotificationCategory } from '@app/Shared/Services/NotificationChannel.service';
import { ServiceContext } from '@app/Shared/Services/Services';
import { useSubscriptions } from '@app/utils/useSubscriptions';
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
  TableVariant,
  ISortBy,
  IAction,
  TableComposable,
  Thead,
  Tr,
  Th,
  ThProps,
  Td,
  Tbody,
  ActionsColumn,
} from '@patternfly/react-table';
import * as React from 'react';
import { Link, useHistory, useRouteMatch } from 'react-router-dom';
import { first } from 'rxjs/operators';
import { RuleDeleteWarningModal } from './RuleDeleteWarningModal';
import { RuleUploadModal } from './RulesUploadModal';

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

export interface RuleTableHeader {
  title?: string;
  sortable?: boolean;
  tooltip?: React.ReactNode;
}

export const ruleObjKeys = [
  'name',
  'description',
  'matchExpression',
  'enabled',
  'eventSpecifier',
  'archivalPeriodSeconds',
  'initialDelaySeconds',
  'preservedArchives',
  'maxAgeSeconds',
  'maxSizeBytes',
];

export const isRule = (obj: object): boolean => {
  for (const key of ruleObjKeys) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      return false;
    }
  } // Ignore unknown fields
  return true;
};

export interface RuleToDeleteOrDisable {
  rule: Rule;
  type: 'DELETE' | 'DISABLE';
}

export interface RulesProps {}

export const Rules: React.FC<RulesProps> = (_) => {
  const context = React.useContext(ServiceContext);
  const routerHistory = useHistory();
  const addSubscription = useSubscriptions();

  const { url } = useRouteMatch();
  const [isLoading, setIsLoading] = React.useState(false);
  const [sortBy, setSortBy] = React.useState({} as ISortBy);
  const [rules, setRules] = React.useState([] as Rule[]);
  const [warningModalOpen, setWarningModalOpen] = React.useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = React.useState(false);
  const [ruleToWarn, setRuleToWarn] = React.useState<RuleToDeleteOrDisable | undefined>(undefined);
  const [cleanRuleEnabled, setCleanRuleEnabled] = React.useState(true);

  const tableColumns = React.useMemo(
    () =>
      [
        { title: 'Enabled' },
        {
          title: 'Name',
          sortable: true,
        },
        { title: 'Description' },
        {
          title: 'Match Expression',
          tooltip:
            'A code-snippet expression which must evaluate to a boolean when applied to a given target. If the expression evaluates to true then the rule applies to that target.',
        },
        {
          title: 'Event Specifier',
          tooltip: 'The name and location of the Event Template applied by this rule.',
        },
        {
          title: 'Archival Period',
          tooltip:
            'Period in seconds. Cryostat will connect to matching targets at this interval and copy the relevant recording data into its archives. Values less than 1 prevent data from being repeatedly copied into archives - recordings will be started and remain only in target JVM memory.',
        },
        {
          title: 'Initial Delay',
          tooltip:
            'Initial delay in seconds. Cryostat will wait this amount of time before first copying recording data into its archives. Values less than 0 default to equal to the Archival Period. You can set a non-zero Initial Delay with a zero Archival Period, which will start a recording and copy it into archives exactly once after a set delay.',
        },
        {
          title: 'Preserved Archives',
          tooltip:
            'The number of recording copies to be maintained in the Cryostat archives. Cryostat will continue retrieving further archived copies and trimming the oldest copies from the archive to maintain this limit. Values less than 1 prevent data from being copied into archives - recordings will be started and remain only in target JVM memory.',
        },
        {
          title: 'Maximum Age',
          tooltip:
            'The maximum age in seconds for data kept in the JFR recordings started by this rule. Values less than 1 indicate no limit.',
        },
        {
          title: 'Maximum Size',
          tooltip:
            'The maximum size in bytes for JFR recordings started by this rule. Values less than 1 indicate no limit.',
        },
      ] as RuleTableHeader[],
    []
  );

  const getSortParams = React.useCallback(
    (columnIndex: number): ThProps['sort'] => ({
      sortBy: sortBy,
      onSort: (_event, index, direction) => {
        setSortBy({
          index: index,
          direction: direction,
        });
      },
      columnIndex,
    }),
    [sortBy, setSortBy]
  );

  const refreshRules = React.useCallback(() => {
    setIsLoading(true);
    addSubscription(
      context.api.getRules().subscribe((rules) => {
        setRules(rules);
        setIsLoading(false);
      })
    );
  }, [setIsLoading, addSubscription, context.api, setRules]);

  React.useEffect(() => {
    refreshRules();
  }, [refreshRules]);

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
          const match = old.find((r) => r.name === msg.message.name);
          if (match) {
            return [...old.filter((r) => r.name !== msg.message.name), { ...match, enabled: msg.message.enabled }];
          }
          return old;
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
  }, [context.settings, refreshRules]);

  const handleCreateRule = React.useCallback(() => {
    routerHistory.push(`${url}/create`);
  }, [routerHistory, url]);

  const handleUploadRule = React.useCallback(() => {
    setIsUploadModalOpen(true);
  }, [setIsUploadModalOpen]);

  const handleDisableRule = React.useCallback(
    (rule: Rule, cleanRuleEnabled: boolean) => {
      addSubscription(context.api.updateRule({ ...rule, enabled: false }, cleanRuleEnabled).subscribe());
    },
    [context.api, addSubscription]
  );

  const handleToggle = React.useCallback(
    (rule: Rule, enabled: boolean): void => {
      if (enabled) {
        addSubscription(context.api.updateRule({ ...rule, enabled }).subscribe());
      } else {
        if (context.settings.deletionDialogsEnabledFor(DeleteOrDisableWarningType.DisableAutomatedRules)) {
          setRuleToWarn({ rule: rule, type: 'DISABLE' });
          setWarningModalOpen(true);
        } else {
          handleDisableRule(rule, cleanRuleEnabled);
        }
      }
    },
    [
      context.api,
      context.settings,
      cleanRuleEnabled,
      addSubscription,
      handleDisableRule,
      setRuleToWarn,
      setWarningModalOpen,
    ]
  );

  const handleDelete = React.useCallback(
    (rule: Rule, clean = true) => {
      addSubscription(
        context.api
          .deleteRule(rule.name, clean)
          .pipe(first())
          .subscribe(() => undefined /* do nothing - notification will handle updating state */)
      );
    },
    [addSubscription, context.api]
  );

  const handleDeleteButton = React.useCallback(
    (rule: Rule) => {
      if (context.settings.deletionDialogsEnabledFor(DeleteOrDisableWarningType.DeleteAutomatedRules)) {
        setRuleToWarn({ rule: rule, type: 'DELETE' });
        setWarningModalOpen(true);
      } else {
        handleDelete(rule, cleanRuleEnabled);
      }
    },
    [context.settings, setWarningModalOpen, handleDelete, setRuleToWarn, cleanRuleEnabled]
  );

  const handleWarningModalAccept = React.useCallback(() => {
    if (ruleToWarn) {
      if (ruleToWarn?.type === 'DELETE') {
        handleDelete(ruleToWarn.rule, cleanRuleEnabled);
      } else {
        handleDisableRule(ruleToWarn.rule, cleanRuleEnabled);
      }
    } else {
      console.error('ruleToWarn is undefined');
    }
  }, [handleDelete, handleDisableRule, ruleToWarn, cleanRuleEnabled]);

  const handleWarningModalClose = React.useCallback(() => {
    setWarningModalOpen(false);
    setRuleToWarn(undefined);
  }, [setWarningModalOpen, setRuleToWarn]);

  const actionResolver = React.useCallback(
    (rule: Rule): IAction[] => {
      return [
        {
          title: 'Download',
          onClick: () => context.api.downloadRule(rule.name),
        },
        {
          isSeparator: true,
        },
        {
          title: 'Delete',
          onClick: () => handleDeleteButton(rule),
        },
      ];
    },
    [context.api, handleDeleteButton]
  );

  const handleUploadModalClose = React.useCallback(() => {
    setIsUploadModalOpen(false);
  }, [setIsUploadModalOpen]);

  const ruleRows = React.useMemo(() => {
    const { index, direction } = sortBy;
    let sorted = [...rules];
    if (typeof index === 'number') {
      const keys = [
        'enabled',
        'name',
        'description',
        'matchExpression',
        'eventSpecifier',
        'archivalPeriodSeconds',
        'initialDelaySeconds',
        'preservedArchives',
        'maxAgeSeconds',
        'maxSizeBytes',
      ];
      const key = keys[index];
      sorted = rules.sort((a: Rule, b: Rule): number => (a[key] < b[key] ? -1 : a[key] > b[key] ? 1 : 0));
      sorted = direction === SortByDirection.asc ? sorted : sorted.reverse();
    }
    return sorted.map((r: Rule, index) => (
      <Tr key={`automatic-rule-${index}`}>
        <Td key={`automatic-rule-enabled-${index}`} dataLabel={tableColumns[0].title}>
          <Switch
            aria-label={`${r.name} is enabled`}
            className={'switch-toggle-' + String(r.enabled)}
            isChecked={r.enabled}
            onChange={(state) => handleToggle(r, state)}
          />
        </Td>
        <Td key={`automatic-rule-name-${index}`} dataLabel={tableColumns[1].title}>
          {r.name}
        </Td>
        <Td key={`automatic-rule-description-${index}`} dataLabel={tableColumns[2].title}>
          {r.description}
        </Td>
        <Td key={`automatic-rule-matchExpression-${index}`} dataLabel={tableColumns[3].title}>
          {r.matchExpression}
        </Td>
        <Td key={`automatic-rule-eventSpecifier-${index}`} dataLabel={tableColumns[4].title}>
          {r.eventSpecifier}
        </Td>
        <Td key={`automatic-rule-archivalPeriodSeconds-${index}`} dataLabel={tableColumns[5].title}>
          {r.archivalPeriodSeconds}
        </Td>
        <Td key={`automatic-rule-initialDelaySeconds-${index}`} dataLabel={tableColumns[6].title}>
          {r.initialDelaySeconds}
        </Td>
        <Td key={`automatic-rule-preservedArchives-${index}`} dataLabel={tableColumns[7].title}>
          {r.preservedArchives}
        </Td>
        <Td key={`automatic-rule-maxAgeSeconds-${index}`} dataLabel={tableColumns[8].title}>
          {r.maxAgeSeconds}
        </Td>
        <Td key={`automatic-rule-maxSizeBytes-${index}`} dataLabel={tableColumns[9].title}>
          {r.maxSizeBytes}
        </Td>
        <Td key={`automatic-rule-action-${index}`} isActionCell style={{ paddingRight: '0' }}>
          <ActionsColumn items={actionResolver(r)} />
        </Td>
      </Tr>
    ));
  }, [rules, sortBy, tableColumns, handleToggle, actionResolver]);

  const viewContent = React.useMemo(() => {
    if (isLoading) {
      return <LoadingView />;
    } else if (!rules.length) {
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
        <TableComposable aria-label="Automated Rules Table" variant={TableVariant.compact}>
          <Thead>
            <Tr>
              {tableColumns.map((col, index) => (
                <Th
                  key={`automatic-rule-header-${col.title}`}
                  sort={col.sortable ? getSortParams(index) : undefined}
                  info={
                    col.tooltip
                      ? {
                          tooltip: col.tooltip,
                        }
                      : undefined
                  }
                >
                  {col.title}
                </Th>
              ))}
            </Tr>
          </Thead>
          <Tbody>{ruleRows}</Tbody>
        </TableComposable>
      );
    }
  }, [getSortParams, isLoading, rules, ruleRows, tableColumns]);

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
                {ruleToWarn ? (
                  <RuleDeleteWarningModal
                    warningType={
                      ruleToWarn.type === 'DELETE'
                        ? DeleteOrDisableWarningType.DeleteAutomatedRules
                        : DeleteOrDisableWarningType.DisableAutomatedRules
                    }
                    ruleName={ruleToWarn.rule.name}
                    visible={warningModalOpen}
                    onAccept={handleWarningModalAccept}
                    onClose={handleWarningModalClose}
                    clean={cleanRuleEnabled}
                    setClean={setCleanRuleEnabled}
                  />
                ) : (
                  <></>
                )}
              </ToolbarContent>
            </Toolbar>
            {viewContent}
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
