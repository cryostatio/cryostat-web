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
import { BreadcrumbPage } from '@app/BreadcrumbPage/BreadcrumbPage';
import { DeleteOrDisableWarningType } from '@app/Modal/types';
import { LoadingView } from '@app/Shared/Components/LoadingView';
import { Rule, NotificationCategory } from '@app/Shared/Services/api.types';
import { ServiceContext } from '@app/Shared/Services/Services';
import { useSubscriptions } from '@app/utils/hooks/useSubscriptions';
import { TableColumn, sortResources } from '@app/utils/utils';
import {
  Button,
  Card,
  CardBody,
  CardTitle,
  EmptyState,
  EmptyStateIcon,
  Switch,
  Title,
  Toolbar,
  ToolbarContent,
  ToolbarGroup,
  ToolbarItem,
} from '@patternfly/react-core';
import { SearchIcon, UploadIcon } from '@patternfly/react-icons';
import {
  ActionsColumn,
  IAction,
  InnerScrollContainer,
  ISortBy,
  SortByDirection,
  TableComposable,
  TableVariant,
  Tbody,
  Td,
  Th,
  Thead,
  ThProps,
  Tr,
} from '@patternfly/react-table';
import * as React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { first } from 'rxjs/operators';
import { RuleDeleteWarningModal } from './RuleDeleteWarningModal';
import { RuleUploadModal } from './RulesUploadModal';
import { RuleToDeleteOrDisable } from './types';

const tableColumns: TableColumn[] = [
  {
    title: 'Enabled',
    keyPaths: ['enabled'],
  },
  {
    title: 'Name',
    keyPaths: ['name'],
    sortable: true,
  },
  {
    title: 'Description',
    keyPaths: ['description'],
  },
  {
    title: 'Match expression',
    keyPaths: ['matchExpression'],
    sortable: true,
    tooltip:
      'A code-snippet expression which must evaluate to a boolean when applied to a given target. If the expression evaluates to true then the rule applies to that target.',
  },
  {
    title: 'Event Specifier',
    keyPaths: ['eventSpecifier'],
    tooltip: 'The name and location of the Event Template applied by this rule.',
  },
  {
    title: 'Archival period',
    keyPaths: ['archivalPeriodSeconds'],
    tooltip:
      'Period in seconds. Cryostat will connect to matching targets at this interval and copy the relevant Recording data into its archives. Values less than 1 prevent data from being repeatedly copied into archives - Recordings will be started and remain only in target JVM memory.',
  },
  {
    title: 'Initial delay',
    keyPaths: ['initialDelaySeconds'],
    tooltip:
      'Initial delay in seconds. Cryostat will wait this amount of time before first copying Recording data into its archives. Values less than 0 default to equal to the Archival period. You can set a non-zero Initial delay with a zero Archival period, which will start a Recording and copy it into archives exactly once after a set delay.',
  },
  {
    title: 'Preserved archives',
    keyPaths: ['preservedArchives'],
    tooltip:
      'The number of Recording copies to be maintained in the Cryostat archives. Cryostat will continue retrieving further archived copies and trimming the oldest copies from the archive to maintain this limit. Values less than 1 prevent data from being copied into archives - Recordings will be started and remain only in target JVM memory.',
  },
  {
    title: 'Maximum age',
    keyPaths: ['maxAgeSeconds'],
    tooltip:
      'The maximum age in seconds for data kept in the JFR Recordings started by this rule. Values less than 1 indicate no limit.',
  },
  {
    title: 'Maximum size',
    keyPaths: ['maxSizeBytes'],
    tooltip: 'The maximum size in bytes for JFR Recordings started by this rule. Values less than 1 indicate no limit.',
  },
];

export interface RulesTableProps {}

export const RulesTable: React.FC<RulesTableProps> = (_) => {
  const context = React.useContext(ServiceContext);
  const navigate = useNavigate();
  const addSubscription = useSubscriptions();

  const [isLoading, setIsLoading] = React.useState(false);
  const [sortBy, setSortBy] = React.useState({} as ISortBy);
  const [rules, setRules] = React.useState([] as Rule[]);
  const [warningModalOpen, setWarningModalOpen] = React.useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = React.useState(false);
  const [ruleToWarn, setRuleToWarn] = React.useState<RuleToDeleteOrDisable | undefined>(undefined);
  const [cleanRuleEnabled, setCleanRuleEnabled] = React.useState(true);

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
    [sortBy, setSortBy],
  );

  const refreshRules = React.useCallback(() => {
    setIsLoading(true);
    addSubscription(
      context.api.getRules().subscribe((rules) => {
        setRules(rules);
        setIsLoading(false);
      }),
    );
  }, [setIsLoading, addSubscription, context.api, setRules]);

  React.useEffect(() => {
    refreshRules();
  }, [refreshRules]);

  React.useEffect(() => {
    addSubscription(
      context.notificationChannel
        .messages(NotificationCategory.RuleCreated)
        .subscribe((v) => setRules((old) => old.concat(v.message))),
    );
  }, [addSubscription, context, context.notificationChannel, setRules]);

  React.useEffect(() => {
    addSubscription(
      context.notificationChannel
        .messages(NotificationCategory.RuleDeleted)
        .subscribe((v) => setRules((old) => old.filter((o) => o.name != v.message.name))),
    );
  }, [addSubscription, context, context.notificationChannel, setRules]);

  React.useEffect(() => {
    addSubscription(
      context.notificationChannel.messages(NotificationCategory.RuleUpdated).subscribe((msg) => {
        setRules((old) => {
          const matchIndex = old.findIndex((r) => r.name === msg.message.name);
          if (matchIndex >= 0) {
            const newArray = [...old];
            newArray.splice(matchIndex, 1, { ...old[matchIndex], enabled: msg.message.enabled });
            return newArray;
          }
          return old;
        });
      }),
    );
  }, [addSubscription, context, context.notificationChannel, setRules]);

  React.useEffect(() => {
    if (!context.settings.autoRefreshEnabled()) {
      return;
    }
    const id = window.setInterval(
      () => refreshRules(),
      context.settings.autoRefreshPeriod() * context.settings.autoRefreshUnits(),
    );
    return () => window.clearInterval(id);
  }, [context.settings, refreshRules]);

  const handleCreateRule = React.useCallback(() => {
    navigate('create', { relative: 'path' });
  }, [navigate]);

  const handleUploadRule = React.useCallback(() => {
    setIsUploadModalOpen(true);
  }, [setIsUploadModalOpen]);

  const handleDisableRule = React.useCallback(
    (rule: Rule, cleanRuleEnabled: boolean) => {
      addSubscription(context.api.updateRule({ ...rule, enabled: false }, cleanRuleEnabled).subscribe());
    },
    [context.api, addSubscription],
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
    ],
  );

  const handleDelete = React.useCallback(
    (rule: Rule, clean = true) => {
      addSubscription(
        context.api
          .deleteRule(rule.name, clean)
          .pipe(first())
          .subscribe(() => undefined /* do nothing - notification will handle updating state */),
      );
    },
    [addSubscription, context.api],
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
    [context.settings, setWarningModalOpen, handleDelete, setRuleToWarn, cleanRuleEnabled],
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
    [context.api, handleDeleteButton],
  );

  const handleUploadModalClose = React.useCallback(() => {
    setIsUploadModalOpen(false);
  }, [setIsUploadModalOpen]);

  const ruleRows = React.useMemo(() => {
    const sorted = sortResources(
      {
        index: sortBy.index ?? 1,
        direction: sortBy.direction ?? SortByDirection.asc,
      },
      rules,
      tableColumns,
    );

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
          <ActionsColumn
            items={actionResolver(r)}
            menuAppendTo={() => document.getElementById('automated-rule-toolbar') || document.body}
          />
        </Td>
      </Tr>
    ));
  }, [rules, sortBy, handleToggle, actionResolver]);

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
        <InnerScrollContainer>
          <TableComposable aria-label="Automated Rules Table" variant={TableVariant.compact}>
            <Thead>
              <Tr>
                {tableColumns.map(({ title, tooltip, sortable }, index) => (
                  <Th
                    key={`automatic-rule-header-${title}`}
                    sort={sortable ? getSortParams(index) : undefined}
                    info={
                      tooltip
                        ? {
                            tooltip: tooltip,
                          }
                        : undefined
                    }
                  >
                    {title}
                  </Th>
                ))}
              </Tr>
            </Thead>
            <Tbody>{ruleRows}</Tbody>
          </TableComposable>
        </InnerScrollContainer>
      );
    }
  }, [getSortParams, isLoading, rules, ruleRows]);

  return (
    <>
      <BreadcrumbPage pageTitle="Automated Rules">
        <Card data-quickstart-id="about-rules">
          <CardTitle>About Automated Rules</CardTitle>
          <CardBody>
            Automated Rules define a dynamic set of target JVMs to connect to and start{' '}
            <Link to="/recordings">Active Recordings</Link> using a specific <Link to="/events">Event Template</Link>{' '}
            when the Automated Rule is created and when any new matching target JVMs appear. If your target JVM
            connections require JMX Credentials, you can configure these in <Link to="/security">Security</Link>.
            Automated Rules can be configured to periodically copy the contents of the Active Recording to{' '}
            <Link to="/archives">Archives</Link> to ensure you always have up-to-date information about your JVMs.
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <Toolbar id="automated-rule-toolbar">
              <ToolbarContent>
                <ToolbarGroup variant="icon-button-group">
                  <ToolbarItem>
                    <Button
                      key="create"
                      variant="primary"
                      onClick={handleCreateRule}
                      data-quickstart-id="create-rule-btn"
                    >
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
      </BreadcrumbPage>
      <RuleUploadModal visible={isUploadModalOpen} onClose={handleUploadModalClose}></RuleUploadModal>
    </>
  );
};

export default RulesTable;
