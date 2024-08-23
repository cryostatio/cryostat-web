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
import { EmptyText } from '@app/Shared/Components/EmptyText';
import { LoadingView } from '@app/Shared/Components/LoadingView';
import { Rule, NotificationCategory } from '@app/Shared/Services/api.types';
import { ServiceContext } from '@app/Shared/Services/Services';
import { useSubscriptions } from '@app/utils/hooks/useSubscriptions';
import { TableColumn, formatBytes, formatDuration, sortResources } from '@app/utils/utils';
import {
  Button,
  Card,
  CardBody,
  CardTitle,
  EmptyState,
  EmptyStateIcon,
  Switch,
  Toolbar,
  ToolbarContent,
  ToolbarItem,
  EmptyStateHeader,
  TextContent,
  Text,
  TextVariants,
  SearchInput,
  Bullseye,
} from '@patternfly/react-core';
import { SearchIcon, UploadIcon } from '@patternfly/react-icons';
import {
  ActionsColumn,
  IAction,
  InnerScrollContainer,
  ISortBy,
  OuterScrollContainer,
  SortByDirection,
  Table,
  Tbody,
  Td,
  Th,
  Thead,
  ThProps,
  Tr,
} from '@patternfly/react-table';
import _ from 'lodash';
import * as React from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { first } from 'rxjs/operators';
import { RuleDeleteWarningModal } from './RuleDeleteWarningModal';
import { RuleUploadModal } from './RulesUploadModal';
import { RuleToDeleteOrDisable } from './types';

export interface RulesTableProps {}

export const RulesTable: React.FC<RulesTableProps> = () => {
  const context = React.useContext(ServiceContext);
  const navigate = useNavigate();
  const addSubscription = useSubscriptions();
  const { t } = useTranslation();

  const [isLoading, setIsLoading] = React.useState(false);
  const [sortBy, setSortBy] = React.useState({} as ISortBy);
  const [rules, setRules] = React.useState([] as Rule[]);
  const [warningModalOpen, setWarningModalOpen] = React.useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = React.useState(false);
  const [ruleToWarn, setRuleToWarn] = React.useState<RuleToDeleteOrDisable | undefined>(undefined);
  const [cleanRuleEnabled, setCleanRuleEnabled] = React.useState(true);
  const [searchTerm, setSearchTerm] = React.useState('');

  const tableColumns: TableColumn[] = React.useMemo(
    () => [
      {
        title: t('ENABLED', { ns: 'common' }),
        keyPaths: ['enabled'],
      },
      {
        title: t('NAME', { ns: 'common' }),
        keyPaths: ['name'],
        sortable: true,
      },
      {
        title: t('DESCRIPTION', { ns: 'common' }),
        keyPaths: ['description'],
      },
      {
        title: t('MATCH_EXPRESSION', { ns: 'common' }),
        keyPaths: ['matchExpression'],
        sortable: true,
        tooltip: t('Rules.MATCH_EXPRESSION_TOOLTIP'),
      },
      {
        title: t('EVENT_SPECIFIER', { ns: 'common' }),
        keyPaths: ['eventSpecifier'],
        tooltip: t('Rules.EVENT_SPECIFIER_TOOLTIP'),
      },
      {
        title: t('MAXIMUM_AGE', { ns: 'common' }),
        keyPaths: ['maxAgeSeconds'],
        tooltip: t('Rules.MAX_AGE_TOOLTIP'),
      },
      {
        title: t('MAXIMUM_SIZE', { ns: 'common' }),
        keyPaths: ['maxSizeBytes'],
        tooltip: t('Rules.MAX_SIZE_TOOLTIP'),
      },
      {
        title: t('ARCHIVAL_PERIOD', { ns: 'common' }),
        keyPaths: ['archivalPeriodSeconds'],
        tooltip: t('Rules.ARCHIVAL_PERIOD_TOOLTIP'),
      },
      {
        title: t('INITIAL_DELAY', { ns: 'common' }),
        keyPaths: ['initialDelaySeconds'],
        tooltip: t('Rules.INITIAL_DELAY_TOOLTIP'),
      },
      {
        title: t('PRESERVED_ARCHIVES', { ns: 'common' }),
        keyPaths: ['preservedArchives'],
        tooltip: t('Rules.PRESERVED_ARCHIVES_TOOLTIP'),
      },
    ],
    [t],
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
          title: t('DOWNLOAD', { ns: 'common' }),
          onClick: () => context.api.downloadRule(rule.name),
        },
        {
          isSeparator: true,
        },
        {
          title: t('DELETE', { ns: 'common' }),
          onClick: () => handleDeleteButton(rule),
        },
      ];
    },
    [context.api, handleDeleteButton, t],
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

    const reg = new RegExp(_.escapeRegExp(searchTerm), 'i');

    return sorted
      .filter((rule) => reg.test(rule.name) || reg.test(rule.description))
      .map((r: Rule, index) => (
        <Tr key={`automatic-rule-${index}`}>
          <Td key={`automatic-rule-enabled-${index}`} dataLabel={tableColumns[0].title}>
            <Switch
              aria-label={`${r.name} is enabled`}
              className={'switch-toggle-' + String(r.enabled)}
              isChecked={r.enabled}
              onChange={(_event, state) => handleToggle(r, state)}
            />
          </Td>
          <Td key={`automatic-rule-name-${index}`} dataLabel={tableColumns[1].title}>
            {r.name}
          </Td>
          <Td key={`automatic-rule-description-${index}`} dataLabel={tableColumns[2].title}>
            {r.description || <EmptyText text={t('NO_DESCRIPTION', { ns: 'common' })} />}
          </Td>
          <Td key={`automatic-rule-matchExpression-${index}`} width={25} dataLabel={tableColumns[3].title}>
            {r.matchExpression}
          </Td>
          <Td key={`automatic-rule-eventSpecifier-${index}`} dataLabel={tableColumns[4].title}>
            {r.eventSpecifier}
          </Td>
          <Td key={`automatic-rule-maxAgeSeconds-${index}`} dataLabel={tableColumns[5].title}>
            {formatDuration(r.maxAgeSeconds)}
          </Td>
          <Td key={`automatic-rule-maxSizeBytes-${index}`} dataLabel={tableColumns[6].title}>
            {formatBytes(r.maxSizeBytes)}
          </Td>
          <Td key={`automatic-rule-archivalPeriodSeconds-${index}`} dataLabel={tableColumns[7].title}>
            {formatDuration(r.archivalPeriodSeconds)}
          </Td>
          <Td key={`automatic-rule-initialDelaySeconds-${index}`} dataLabel={tableColumns[8].title}>
            {formatDuration(r.initialDelaySeconds)}
          </Td>
          <Td key={`automatic-rule-preservedArchives-${index}`} dataLabel={tableColumns[9].title}>
            {r.preservedArchives}
          </Td>
          <Td key={`automatic-rule-action-${index}`} isActionCell style={{ paddingRight: '0' }}>
            <ActionsColumn
              items={actionResolver(r)}
              popperProps={{
                appendTo: () => document.getElementById('automated-rule-toolbar') || document.body,
                position: 'right',
              }}
            />
          </Td>
        </Tr>
      ));
  }, [rules, sortBy, handleToggle, actionResolver, t, tableColumns, searchTerm]);

  const toolbar = React.useMemo(
    () => (
      <Toolbar id="automated-rule-toolbar">
        <ToolbarContent>
          <ToolbarItem>
            <SearchInput
              placeholder={t('Rules.SEARCH_PLACEHOLDER')}
              value={searchTerm}
              onChange={(_event, value) => setSearchTerm(value)}
              onClear={() => setSearchTerm('')}
            />
          </ToolbarItem>
          <ToolbarItem variant="separator" />
          <ToolbarItem key="create" spacer={{ default: 'spacerSm' }}>
            <Button variant="primary" onClick={handleCreateRule} data-quickstart-id="create-rule-btn">
              {t('CREATE', { ns: 'common' })}
            </Button>
          </ToolbarItem>
          <ToolbarItem key="upload">
            <Button variant="secondary" aria-label="Upload" onClick={handleUploadRule}>
              <UploadIcon />
            </Button>
          </ToolbarItem>
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
          ) : null}
        </ToolbarContent>
      </Toolbar>
    ),
    [
      t,
      searchTerm,
      setSearchTerm,
      handleCreateRule,
      handleUploadRule,
      ruleToWarn,
      warningModalOpen,
      handleWarningModalAccept,
      handleWarningModalClose,
      cleanRuleEnabled,
      setCleanRuleEnabled,
    ],
  );

  const viewContent = React.useMemo(() => {
    if (isLoading) {
      return <LoadingView />;
    } else if (!rules.length) {
      return (
        <>
          <Bullseye>
            <EmptyState>
              <EmptyStateHeader
                titleText="No Automated Rules"
                icon={<EmptyStateIcon icon={SearchIcon} />}
                headingLevel="h4"
              />
            </EmptyState>
          </Bullseye>
        </>
      );
    } else {
      return (
        <OuterScrollContainer className="rules-table-outer-container">
          {toolbar}
          <InnerScrollContainer className="rules-table-inner-container">
            <Table aria-label="Automated Rules Table" isStickyHeader variant="compact">
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
                  <Th key="table-header-actions" />
                </Tr>
              </Thead>
              <Tbody>{ruleRows}</Tbody>
            </Table>
          </InnerScrollContainer>
        </OuterScrollContainer>
      );
    }
  }, [getSortParams, isLoading, rules, ruleRows, tableColumns, toolbar]);

  return (
    <>
      <BreadcrumbPage pageTitle="Automated Rules">
        <Card isFullHeight>
          <CardTitle>
            {t('AUTOMATED_RULES', { ns: 'common' })}
            <TextContent>
              <Text component={TextVariants.small}>
                <Trans
                  t={t}
                  components={[
                    <Link to={'/recordings'} />,
                    <Link to={'/events'} />,
                    <Link to={'/security'} />,
                    <Link to={'/archives'} />,
                  ]}
                >
                  Rules.ABOUT_BODY
                </Trans>
              </Text>
            </TextContent>
          </CardTitle>
          <CardBody isFilled>{viewContent}</CardBody>
        </Card>
        <></>
      </BreadcrumbPage>
      <RuleUploadModal visible={isUploadModalOpen} onClose={handleUploadModalClose}></RuleUploadModal>
    </>
  );
};

export default RulesTable;
