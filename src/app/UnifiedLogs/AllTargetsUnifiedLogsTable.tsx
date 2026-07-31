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
import { UnifiedLog, UnifiedLogDirectory, NotificationCategory } from '@app/Shared/Services/api.types';
import { ServiceContext } from '@app/Shared/Services/Services';
import { useSort } from '@app/utils/hooks/useSort';
import { useSubscriptions } from '@app/utils/hooks/useSubscriptions';
import { sortResources, TableColumn } from '@app/utils/utils';
import { useCryostatTranslation } from '@i18n/i18nextUtil';
import {
  Bullseye,
  Button,
  Checkbox,
  EmptyState,
  Icon,
  SearchInput,
  Toolbar,
  ToolbarContent,
  ToolbarGroup,
  ToolbarItem,
} from '@patternfly/react-core';
import { FileIcon, SearchIcon } from '@patternfly/react-icons';
import {
  ExpandableRowContent,
  InnerScrollContainer,
  OuterScrollContainer,
  SortByDirection,
  Table,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
} from '@patternfly/react-table';
import _ from 'lodash';
import * as React from 'react';
import { of } from 'rxjs';
import { UnifiedLogsTable } from './UnifiedLogsTable';

const tableColumns: TableColumn[] = [
  {
    title: 'Target',
    keyPaths: ['jvmId'],
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

type UnifiedLogsForTarget = {
  jvmId: string;
  archiveCount: number;
  logs: UnifiedLog[];
};

export interface AllTargetsUnifiedLogsTableProps {}

export const AllTargetsUnifiedLogsTable: React.FC<AllTargetsUnifiedLogsTableProps> = () => {
  const context = React.useContext(ServiceContext);
  const { t } = useCryostatTranslation();

  const [searchText, setSearchText] = React.useState('');
  const [logsForTargets, setUnifiedLogsForTargets] = React.useState<UnifiedLogsForTarget[]>([]);
  const [expandedJvmIds, setExpandedJvmIds] = React.useState<string[]>([]);
  const [hideEmptyTargets, setHideEmptyTargets] = React.useState(true);
  const [errorMessage, setErrorMessage] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const addSubscription = useSubscriptions();
  const [sortBy, getSortParams] = useSort();

  const handleError = React.useCallback(
    (error) => {
      setIsLoading(false);
      setErrorMessage(error.message);
    },
    [setIsLoading, setErrorMessage],
  );

  const handleDirectories = React.useCallback(
    (dirs: UnifiedLogDirectory[]) => {
      setIsLoading(false);
      setErrorMessage('');
      setUnifiedLogsForTargets(
        dirs.map((dir) => ({
          jvmId: dir.jvmId,
          archiveCount: dir.logs.length,
          logs: dir.logs,
        })),
      );
    },
    [setIsLoading, setErrorMessage, setUnifiedLogsForTargets],
  );

  const refreshDirectories = React.useCallback(() => {
    setIsLoading(true);
    addSubscription(
      context.api.getAllUnifiedLogs(true).subscribe({
        next: handleDirectories,
        error: handleError,
      }),
    );
  }, [addSubscription, context.api, handleDirectories, handleError]);

  React.useEffect(() => {
    refreshDirectories();
  }, [refreshDirectories]);

  React.useEffect(() => {
    if (!context.settings.autoRefreshEnabled()) {
      return;
    }
    const id = window.setInterval(
      () => refreshDirectories(),
      context.settings.autoRefreshPeriod() * context.settings.autoRefreshUnits(),
    );
    return () => window.clearInterval(id);
  }, [context.settings, refreshDirectories]);

  React.useEffect(() => {
    addSubscription(
      context.target.authFailure().subscribe(() => {
        setErrorMessage(authFailMessage);
      }),
    );
  }, [context, context.target, addSubscription]);

  React.useEffect(() => {
    addSubscription(
      context.notificationChannel
        .messages(NotificationCategory.UnifiedLogUploaded)
        .subscribe(() => refreshDirectories()),
    );
  }, [addSubscription, context.notificationChannel, refreshDirectories]);

  React.useEffect(() => {
    addSubscription(
      context.notificationChannel
        .messages(NotificationCategory.UnifiedLogDeleted)
        .subscribe(() => refreshDirectories()),
    );
  }, [addSubscription, context.notificationChannel, refreshDirectories]);

  React.useEffect(() => {
    addSubscription(
      context.notificationChannel.messages(NotificationCategory.UnifiedLogMetadataUpdated).subscribe((event) => {
        const updatedLogInfo = event.message;
        setUnifiedLogsForTargets((current) =>
          current.map((entry) => ({
            ...entry,
            logs: entry.logs.map((log) => {
              if (log.logId === updatedLogInfo.unifiedLog.logId) {
                return {
                  ...log,
                  metadata: { ...(log.metadata ?? {}), labels: updatedLogInfo?.unifiedLog?.metadata?.labels ?? [] },
                };
              }
              return log;
            }),
          })),
        );
      }),
    );
  }, [addSubscription, context.notificationChannel, setUnifiedLogsForTargets]);

  const handleSearchInput = React.useCallback((_, searchInput: string) => setSearchText(searchInput), [setSearchText]);

  const handleSearchInputClear = React.useCallback(() => setSearchText(''), [setSearchText]);

  const handleHideEmptyTarget = React.useCallback(
    (_, hide: boolean) => setHideEmptyTargets(hide),
    [setHideEmptyTargets],
  );

  const toggleExpanded = React.useCallback((jvmId: string) => {
    setExpandedJvmIds((prev) => (prev.includes(jvmId) ? prev.filter((id) => id !== jvmId) : [...prev, jvmId]));
  }, []);

  const filteredAndSorted = React.useMemo(() => {
    let updated = logsForTargets;
    if (searchText) {
      const reg = new RegExp(_.escapeRegExp(searchText), 'i');
      updated = logsForTargets.filter(({ jvmId }) => reg.test(jvmId));
    }
    return sortResources(
      {
        index: sortBy.index ?? 0,
        direction: sortBy.direction ?? SortByDirection.asc,
      },
      updated.filter((v) => !hideEmptyTargets || v.archiveCount > 0),
      tableColumns,
    );
  }, [searchText, logsForTargets, sortBy, hideEmptyTargets]);

  const authRetry = React.useCallback(() => {
    context.target.setAuthRetry();
  }, [context.target]);

  const isError = errorMessage !== '';

  let view: React.ReactElement;

  if (isError) {
    view = (
      <ErrorView
        title={t('AllTargetsUnifiedLogsTable.ERROR_TITLE')}
        message={errorMessage}
        retry={isAuthFail(errorMessage) ? authRetry : undefined}
      />
    );
  } else if (isLoading) {
    view = <LoadingView />;
  } else if (!filteredAndSorted.length) {
    view = (
      <Bullseye>
        <EmptyState headingLevel="h4" icon={SearchIcon} titleText={t('AllTargetsUnifiedLogsTable.NO_ARCHIVES')} />
      </Bullseye>
    );
  } else {
    const rowPairs: React.ReactElement[] = [];
    filteredAndSorted.forEach(({ jvmId, archiveCount, logs }, idx) => {
      const isExpanded = expandedJvmIds.includes(jvmId);
      rowPairs.push(
        <Tr key={`${jvmId}-parent`}>
          <Td
            expand={{
              rowIndex: idx,
              isExpanded,
              onToggle: () => toggleExpanded(jvmId),
            }}
          />
          <Td dataLabel={tableColumns[0].title}>{jvmId}</Td>
          <Td dataLabel={tableColumns[1].title}>
            <Button
              icon={
                <>
                  <Icon iconSize="md">
                    <FileIcon />
                  </Icon>
                  <span style={{ marginLeft: 'var(--pf-t--global--spacer--sm)' }}>{archiveCount}</span>
                </>
              }
              variant="plain"
              onClick={() => toggleExpanded(jvmId)}
            />
          </Td>
        </Tr>,
      );
      rowPairs.push(
        <Tr key={`${jvmId}-child`} isExpanded={isExpanded}>
          <Td colSpan={tableColumns.length + 1}>
            {isExpanded ? (
              <ExpandableRowContent>
                <UnifiedLogsTable target={of(undefined)} isNestedTable jvmId={jvmId} logs={logs} />
              </ExpandableRowContent>
            ) : null}
          </Td>
        </Tr>,
      );
    });

    view = (
      <Table aria-label="all-targets-unified-logs-table" isStickyHeader>
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
      <Toolbar id="all-targets-unified-logs-toolbar">
        <ToolbarContent>
          <ToolbarGroup variant="filter-group">
            <ToolbarItem>
              <SearchInput
                style={{ minWidth: '30ch' }}
                placeholder={t('AllTargetsUnifiedLogsTable.SEARCH_PLACEHOLDER')}
                value={searchText}
                onChange={handleSearchInput}
                onClear={handleSearchInputClear}
              />
            </ToolbarItem>
          </ToolbarGroup>
          <ToolbarItem alignSelf="center">
            <Checkbox
              name="all-targets-unified-logs-hide-check"
              id="all-targets-unified-logs-hide-check"
              aria-label="all-targets-unified-logs-hide-check"
              label={t('AllTargetsUnifiedLogsTable.HIDE_TARGET_WITH_ZERO_LOGS')}
              onChange={handleHideEmptyTarget}
              isChecked={hideEmptyTargets}
            />
          </ToolbarItem>
        </ToolbarContent>
      </Toolbar>
      <InnerScrollContainer>{view}</InnerScrollContainer>
    </OuterScrollContainer>
  );
};

export default AllTargetsUnifiedLogsTable;
