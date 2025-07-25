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
import { CryostatLink } from '@app/Shared/Components/CryostatLink';
import { EmptyText } from '@app/Shared/Components/EmptyText';
import { LoadingView } from '@app/Shared/Components/LoadingView';
import { MatchExpressionDisplay } from '@app/Shared/Components/MatchExpression/MatchExpressionDisplay';
import { Rule, NotificationCategory, keyValueToString, KeyValue } from '@app/Shared/Services/api.types';
import { CapabilitiesContext } from '@app/Shared/Services/Capabilities';
import { ServiceContext } from '@app/Shared/Services/Services';
import { useSubscriptions } from '@app/utils/hooks/useSubscriptions';
import {
  TableColumn,
  formatBytes,
  formatDuration,
  sortResources,
  portalRoot,
  LABEL_TEXT_MAXWIDTH,
} from '@app/utils/utils';
import { useCryostatTranslation } from '@i18n/i18nextUtil';
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
  LabelGroup,
  Label,
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
import { Trans } from 'react-i18next';
import { useNavigate } from 'react-router-dom-v5-compat';
import { first } from 'rxjs/operators';
import { AUTOANALYZE_KEY } from './CreateRule';
import { RuleDeleteWarningModal } from './RuleDeleteWarningModal';
import { RuleUploadModal } from './RulesUploadModal';
import { RuleToDeleteOrDisable } from './types';

export interface RulesTableProps {}

export const RulesTable: React.FC<RulesTableProps> = () => {
  const context = React.useContext(ServiceContext);
  const capabilities = React.useContext(CapabilitiesContext);
  const navigate = useNavigate();
  const addSubscription = useSubscriptions();
  const { t } = useCryostatTranslation();

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
        title: t('ENABLED'),
        keyPaths: ['enabled'],
        sortable: true,
      },
      {
        title: t('NAME'),
        keyPaths: ['name'],
        sortable: true,
      },
      {
        title: t('DESCRIPTION'),
        keyPaths: ['description'],
      },
      {
        title: t('MATCH_EXPRESSION'),
        keyPaths: ['matchExpression'],
        sortable: true,
        tooltip: t('Rules.MATCH_EXPRESSION_TOOLTIP'),
      },
      {
        title: t('EVENT_SPECIFIER'),
        keyPaths: ['eventSpecifier'],
        sortable: true,
        tooltip: t('Rules.EVENT_SPECIFIER_TOOLTIP'),
      },
      {
        title: t('OPTIONS'),
        keyPaths: ['options'],
        sortable: false,
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

  const handleEditButton = React.useCallback(
    (rule: Rule) => {
      navigate('create', {
        relative: 'path',
        state: {
          ...rule,
          edit: true,
        },
      });
    },
    [navigate],
  );

  const handleCopyButton = React.useCallback(
    (rule: Rule) => {
      navigate('create', {
        relative: 'path',
        state: {
          ...rule,
          name: `${rule.name}_copy`,
        },
      });
    },
    [navigate],
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
          title: t('EDIT'),
          onClick: () => handleEditButton(rule),
        },
        {
          title: t('COPY'),
          onClick: () => handleCopyButton(rule),
        },
        {
          title: t('DOWNLOAD'),
          onClick: () => context.api.downloadRule(rule.name),
        },
        {
          isSeparator: true,
        },
        {
          title: t('DELETE'),
          onClick: () => handleDeleteButton(rule),
          isDanger: true,
        },
      ];
    },
    [context.api, handleEditButton, handleDeleteButton, handleCopyButton, t],
  );

  const handleUploadModalClose = React.useCallback(() => {
    setIsUploadModalOpen(false);
  }, [setIsUploadModalOpen]);

  const ruleOptions = React.useCallback(
    (rule: Rule): KeyValue[] => {
      const options: KeyValue[] = [];
      [
        {
          key: 'archivalPeriodSeconds',
          fmt: formatDuration,
        },
        {
          key: 'initialDelaySeconds',
          fmt: formatDuration,
        },
        {
          key: 'maxAgeSeconds',
          fmt: formatDuration,
        },
        {
          key: 'maxSizeBytes',
          fmt: formatBytes,
        },
        {
          key: 'preservedArchives',
          fmt: (v) => v,
        },
      ].forEach((e) => {
        if (rule[e.key]) {
          options.push({
            key: t(`Rules.Options.${e.key}`),
            value: e.fmt(rule[e.key]),
          });
        }
      });
      (rule.metadata?.labels ?? []).forEach((label) => {
        if (label.key === AUTOANALYZE_KEY) {
          options.push({
            key: t('AUTOANALYZE'),
            value: label.value,
          });
        }
      });
      return options;
    },
    [t],
  );

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
            {r.description || <EmptyText text={t('NO_DESCRIPTION')} />}
          </Td>
          <Td key={`automatic-rule-matchExpression-${index}`} width={25} dataLabel={tableColumns[3].title}>
            <MatchExpressionDisplay matchExpression={r.matchExpression} />
          </Td>
          <Td key={`automatic-rule-event-specifier-${index}`} dataLabel={tableColumns[4].title}>
            {r.eventSpecifier}
          </Td>
          <Td key={`automatic-rule-description-${index}`} dataLabel={tableColumns[5].title}>
            <LabelGroup isVertical style={{ padding: '0.2em' }}>
              {ruleOptions(r).length ? (
                ruleOptions(r).map((options) => (
                  <Label color="purple" key={options.key} textMaxWidth={LABEL_TEXT_MAXWIDTH}>
                    {keyValueToString(options)}
                  </Label>
                ))
              ) : (
                <EmptyText text="No options" />
              )}
            </LabelGroup>
          </Td>
          <Td key={`automatic-rule-action-${index}`} isActionCell style={{ paddingRight: '0' }}>
            <ActionsColumn
              items={actionResolver(r)}
              popperProps={{
                appendTo: portalRoot,
                position: 'right',
              }}
            />
          </Td>
        </Tr>
      ));
  }, [rules, ruleOptions, sortBy, handleToggle, actionResolver, t, tableColumns, searchTerm]);

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
              {t('CREATE')}
            </Button>
          </ToolbarItem>
          {capabilities.fileUploads ? (
            <ToolbarItem key="upload">
              <Button variant="secondary" aria-label="Upload" onClick={handleUploadRule}>
                <UploadIcon />
              </Button>
            </ToolbarItem>
          ) : (
            <></>
          )}
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
      capabilities.fileUploads,
    ],
  );

  const viewContent = React.useMemo(() => {
    let view: JSX.Element;
    if (isLoading) {
      view = <LoadingView />;
    } else if (!rules.length) {
      view = (
        <>
          <Bullseye>
            <EmptyState>
              <EmptyStateHeader
                titleText={t('Rules.NO_RULES')}
                icon={<EmptyStateIcon icon={SearchIcon} />}
                headingLevel="h4"
              />
            </EmptyState>
          </Bullseye>
        </>
      );
    } else {
      view = (
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
      );
    }
    return (
      <OuterScrollContainer className="rules-table-outer-container">
        {toolbar}
        <InnerScrollContainer className="rules-table-inner-container">{view}</InnerScrollContainer>
      </OuterScrollContainer>
    );
  }, [getSortParams, isLoading, rules, ruleRows, tableColumns, toolbar, t]);

  return (
    <>
      <BreadcrumbPage pageTitle="Automated Rules">
        <Card isCompact>
          <CardTitle>
            {t('AUTOMATED_RULES')}
            <TextContent>
              <Text component={TextVariants.small}>
                <Trans
                  t={t}
                  components={[
                    <CryostatLink to={'/recordings'} />,
                    <CryostatLink to={'/events'} />,
                    <CryostatLink to={'/security'} />,
                    <CryostatLink to={'/archives'} />,
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
