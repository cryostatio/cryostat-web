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
import { GcLog, GcLogDirectory, NotificationCategory } from '@app/Shared/Services/api.types';
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
import { GcLogsTable } from './GcLogsTable';

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

type GcLogsForTarget = {
  jvmId: string;
  archiveCount: number;
  gcLogs: GcLog[];
};

export interface AllTargetsGcLogsTableProps {}

export const AllTargetsGcLogsTable: React.FC<AllTargetsGcLogsTableProps> = () => {
  const context = React.useContext(ServiceContext);
  const { t } = useCryostatTranslation();

  const [searchText, setSearchText] = React.useState('');
  const [gcLogsForTargets, setGcLogsForTargets] = React.useState<GcLogsForTarget[]>([]);
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
    (dirs: GcLogDirectory[]) => {
      setIsLoading(false);
      setErrorMessage('');
      setGcLogsForTargets(
        dirs.map((dir) => ({
          jvmId: dir.jvmId,
          archiveCount: dir.gcLogs.length,
          gcLogs: dir.gcLogs,
        })),
      );
    },
    [setIsLoading, setErrorMessage, setGcLogsForTargets],
  );

  const refreshDirectories = React.useCallback(() => {
    setIsLoading(true);
    addSubscription(
      context.api.getAllGcLogs(true).subscribe({
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
      context.notificationChannel.messages(NotificationCategory.GcLogUploaded).subscribe(() => refreshDirectories()),
    );
  }, [addSubscription, context.notificationChannel, refreshDirectories]);

  React.useEffect(() => {
    addSubscription(
      context.notificationChannel.messages(NotificationCategory.GcLogDeleted).subscribe(() => refreshDirectories()),
    );
  }, [addSubscription, context.notificationChannel, refreshDirectories]);

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
    let updated = gcLogsForTargets;
    if (searchText) {
      const reg = new RegExp(_.escapeRegExp(searchText), 'i');
      updated = gcLogsForTargets.filter(({ jvmId }) => reg.test(jvmId));
    }
    return sortResources(
      {
        index: sortBy.index ?? 0,
        direction: sortBy.direction ?? SortByDirection.asc,
      },
      updated.filter((v) => !hideEmptyTargets || v.archiveCount > 0),
      tableColumns,
    );
  }, [searchText, gcLogsForTargets, sortBy, hideEmptyTargets]);

  const authRetry = React.useCallback(() => {
    context.target.setAuthRetry();
  }, [context.target]);

  const isError = errorMessage !== '';

  let view: React.ReactElement;

  if (isError) {
    view = (
      <ErrorView
        title={t('AllTargetsGcLogsTable.ERROR_TITLE')}
        message={errorMessage}
        retry={isAuthFail(errorMessage) ? authRetry : undefined}
      />
    );
  } else if (isLoading) {
    view = <LoadingView />;
  } else if (!filteredAndSorted.length) {
    view = (
      <Bullseye>
        <EmptyState headingLevel="h4" icon={SearchIcon} titleText={t('AllTargetsGcLogsTable.NO_ARCHIVES')} />
      </Bullseye>
    );
  } else {
    const rowPairs: React.ReactElement[] = [];
    filteredAndSorted.forEach(({ jvmId, archiveCount, gcLogs }, idx) => {
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
                <GcLogsTable target={of(undefined)} isNestedTable jvmId={jvmId} gcLogs={gcLogs} />
              </ExpandableRowContent>
            ) : null}
          </Td>
        </Tr>,
      );
    });

    view = (
      <Table aria-label="all-targets-gc-logs-table" isStickyHeader>
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
      <Toolbar id="all-targets-gc-logs-toolbar">
        <ToolbarContent>
          <ToolbarGroup variant="filter-group">
            <ToolbarItem>
              <SearchInput
                style={{ minWidth: '30ch' }}
                placeholder={t('AllTargetsGcLogsTable.SEARCH_PLACEHOLDER')}
                value={searchText}
                onChange={handleSearchInput}
                onClear={handleSearchInputClear}
              />
            </ToolbarItem>
          </ToolbarGroup>
          <ToolbarItem alignSelf="center">
            <Checkbox
              name="all-targets-gc-logs-hide-check"
              id="all-targets-gc-logs-hide-check"
              aria-label="all-targets-gc-logs-hide-check"
              label={t('AllTargetsGcLogsTable.HIDE_TARGET_WITH_ZERO_LOGS')}
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

export default AllTargetsGcLogsTable;
