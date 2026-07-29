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
import { ColumnConfig, DiagnosticsTable } from '@app/Diagnostics/DiagnosticsTable';
import { DeleteWarningModal } from '@app/Modal/DeleteWarningModal';
import { DeleteOrDisableWarningType } from '@app/Modal/types';
import { LabelCell } from '@app/RecordingMetadata/LabelCell';
import { RowAction } from '@app/Recordings/RecordingActions';
import { UpdateFilterOptions } from '@app/Shared/Redux/Filters/Common';
import {
  UnifiedLogDeleteCategoryFiltersIntent,
  UnifiedLogDeleteFilterIntent,
  UnifiedLogAddFilterIntent,
  UnifiedLogDeleteAllFiltersIntent,
  TargetUnifiedLogFilters,
  emptyArchivedUnifiedLogFilters,
} from '@app/Shared/Redux/Filters/UnifiedLogFilterSlice';
import { RootState, StateDispatch } from '@app/Shared/Redux/ReduxStore';
import { UnifiedLog, NotificationCategory, NullableTarget, Target } from '@app/Shared/Services/api.types';
import { NotificationsContext } from '@app/Shared/Services/Notifications.service';
import { ServiceContext } from '@app/Shared/Services/Services';
import useDayjs from '@app/utils/hooks/useDayjs';
import { useSubscriptions } from '@app/utils/hooks/useSubscriptions';
import { formatBytes, hashCode, portalRoot, TableColumn } from '@app/utils/utils';
import { useCryostatTranslation } from '@i18n/i18nextUtil';
import {
  Button,
  Checkbox,
  Drawer,
  DrawerContent,
  DrawerContentBody,
  Dropdown,
  DropdownItem,
  DropdownList,
  MenuToggle,
  MenuToggleElement,
  OverflowMenu,
  OverflowMenuContent,
  OverflowMenuControl,
  OverflowMenuDropdownItem,
  OverflowMenuGroup,
  OverflowMenuItem,
  Timestamp,
  TimestampTooltipVariant,
  Toolbar,
  ToolbarContent,
  ToolbarGroup,
  ToolbarItem,
  Tooltip,
} from '@patternfly/react-core';
import { EllipsisVIcon, ImportIcon } from '@patternfly/react-icons';
import { ISortBy, SortByDirection, Tbody, Td, ThProps, Tr } from '@patternfly/react-table';
import * as React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { combineLatest, concatMap, first, forkJoin, Observable, of } from 'rxjs';
import { UnifiedLogFilters, UnifiedLogFiltersCategories, filterUnifiedLogs } from './Filters/UnifiedLogFilters';
import { UnifiedLogLabelsPanel } from './UnifiedLogLabelsPanel';

const tableColumns: TableColumn[] = [
  {
    title: 'Name',
    keyPaths: ['logId'],
    sortable: true,
  },
  {
    title: 'Last Modified',
    keyPaths: ['lastModified'],
    sortable: true,
  },
  {
    title: 'Labels',
    keyPaths: ['metadata', 'labels'],
  },
  {
    title: 'Size',
    keyPaths: ['size'],
    sortable: true,
  },
];

export type UnifiedLogTableActions = 'DELETE' | 'PULL';

export interface UnifiedLogsTableProps {
  target: Observable<NullableTarget>;
  isNestedTable?: boolean;
  /** When set, use these logs directly (nested/read-only mode) instead of fetching */
  logs?: UnifiedLog[];
  /** When set, delete via jvmId path rather than targetId */
  jvmId?: string;
  /** Pull button is only enabled when logging is active on the target */
  loggingEnabled?: boolean;
  /** The log file path reported by the logging status */
  logFilePath?: string;
}

export const UnifiedLogsTable: React.FC<UnifiedLogsTableProps> = ({
  target: propsTarget,
  isNestedTable = false,
  logs,
  jvmId,
  loggingEnabled = false,
  logFilePath,
}) => {
  const { t } = useCryostatTranslation();
  const context = React.useContext(ServiceContext);
  const notifications = React.useContext(NotificationsContext);
  const addSubscription = useSubscriptions();
  const dispatch = useDispatch<StateDispatch>();

  const [unifiedLogs, setUnifiedLogs] = React.useState<UnifiedLog[]>([]);
  const [checkedIndices, setCheckedIndices] = React.useState<number[]>([]);
  const [headerChecked, setHeaderChecked] = React.useState(false);
  const [showLabelsPanel, setShowLabelsPanel] = React.useState(false);
  const [targetConnectURL, setTargetConnectURL] = React.useState('');
  const [sortBy, setSortBy] = React.useState<ISortBy>({
    index: 1,
    direction: SortByDirection.desc,
  });
  const [isLoading, setIsLoading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState('');
  const [actionLoadings, setActionLoadings] = React.useState<Record<UnifiedLogTableActions, boolean>>({
    DELETE: false,
    PULL: false,
  });

  const targetUnifiedLogFilters = useSelector((state: RootState) => {
    const filters = state.unifiedLogFilters.list.filter(
      (targetFilter: TargetUnifiedLogFilters) => targetFilter.target === targetConnectURL,
    );
    return filters.length > 0 ? filters[0].archived.filters : emptyArchivedUnifiedLogFilters;
  }) as UnifiedLogFiltersCategories;

  const updateFilters = React.useCallback(
    (
      target: string,
      { filterValue, filterKey, filterValueIndex, deleted = false, deleteOptions }: UpdateFilterOptions,
    ) => {
      if (deleted) {
        if (deleteOptions && deleteOptions.all) {
          dispatch(UnifiedLogDeleteCategoryFiltersIntent(target, filterKey));
        } else {
          dispatch(UnifiedLogDeleteFilterIntent(target, filterKey, filterValue, filterValueIndex));
        }
      } else {
        dispatch(UnifiedLogAddFilterIntent(target, filterKey, filterValue));
      }
    },
    [dispatch],
  );

  const handleClearFilters = React.useCallback(() => {
    dispatch(UnifiedLogDeleteAllFiltersIntent(targetConnectURL));
  }, [dispatch, targetConnectURL]);

  const getSortParams = React.useCallback(
    (columnIndex: number): ThProps['sort'] => ({
      sortBy,
      onSort: (_event, index, direction) => setSortBy({ index, direction }),
      columnIndex,
    }),
    [sortBy],
  );

  const handleUnifiedLogs = React.useCallback((logs: UnifiedLog[]) => {
    setUnifiedLogs(logs);
    setIsLoading(false);
    setErrorMessage('');
  }, []);

  const handleError = React.useCallback((error) => {
    setIsLoading(false);
    setErrorMessage(error.message);
  }, []);

  const refreshUnifiedLogs = React.useCallback(() => {
    if (logs !== undefined) {
      handleUnifiedLogs(logs);
      return;
    }
    setIsLoading(true);
    addSubscription(
      propsTarget
        .pipe(
          first(),
          concatMap((target: Target | undefined) => (target ? context.api.getUnifiedLogs(target) : of([]))),
        )
        .subscribe({ next: handleUnifiedLogs, error: handleError }),
    );
  }, [addSubscription, propsTarget, logs, context.api, handleUnifiedLogs, handleError]);

  React.useEffect(() => {
    addSubscription(
      propsTarget.subscribe((target) => {
        setTargetConnectURL(target?.connectUrl || '');
        setCheckedIndices([]);
        setHeaderChecked(false);
        refreshUnifiedLogs();
      }),
    );
  }, [addSubscription, propsTarget, refreshUnifiedLogs]);

  React.useEffect(() => {
    if (logs !== undefined) {
      handleUnifiedLogs(logs);
    }
  }, [logs, handleUnifiedLogs]);

  React.useEffect(() => {
    addSubscription(
      context.notificationChannel
        .messages(NotificationCategory.UnifiedLogUploaded)
        .subscribe(() => refreshUnifiedLogs()),
    );
  }, [addSubscription, context.notificationChannel, refreshUnifiedLogs]);

  React.useEffect(() => {
    addSubscription(
      context.notificationChannel.messages(NotificationCategory.UnifiedLogDeleted).subscribe((msg) => {
        setUnifiedLogs((old) => old.filter((l) => l.logId !== msg.message.unifiedLog.logId));
      }),
    );
  }, [addSubscription, context.notificationChannel]);

  React.useEffect(() => {
    addSubscription(
      combineLatest([
        propsTarget,
        context.notificationChannel.messages(NotificationCategory.UnifiedLogMetadataUpdated),
      ]).subscribe(([currentTarget, event]) => {
        const targetJvmId = jvmId ?? currentTarget?.jvmId;
        if (targetJvmId !== event.message.jvmId && targetJvmId !== event.message.unifiedLog.jvmId) {
          return;
        }
        setUnifiedLogs((old) =>
          old.map((log) => {
            if (log.logId === event.message.unifiedLog.logId) {
              return { ...log, metadata: { labels: event.message.unifiedLog.metadata?.labels ?? [] } };
            }
            return log;
          }),
        );
      }),
    );
  }, [addSubscription, propsTarget, jvmId, context.notificationChannel]);

  React.useEffect(() => {
    if (!context.settings.autoRefreshEnabled()) return;
    const id = window.setInterval(
      () => refreshUnifiedLogs(),
      context.settings.autoRefreshPeriod() * context.settings.autoRefreshUnits(),
    );
    return () => window.clearInterval(id);
  }, [context.settings, refreshUnifiedLogs]);

  const filteredUnifiedLogs = React.useMemo(() => {
    return filterUnifiedLogs(unifiedLogs, targetUnifiedLogFilters);
  }, [unifiedLogs, targetUnifiedLogFilters]);

  const sortedUnifiedLogs = React.useMemo(() => {
    const idx = sortBy.index ?? 0;
    const dir = sortBy.direction ?? SortByDirection.asc;
    const key = tableColumns[idx]?.keyPaths?.[0] ?? 'unifiedLogId';
    return [...filteredUnifiedLogs].sort((a, b) => {
      const av = a[key] ?? '';
      const bv = b[key] ?? '';
      return dir === SortByDirection.asc ? (av < bv ? -1 : av > bv ? 1 : 0) : av > bv ? -1 : av < bv ? 1 : 0;
    });
  }, [filteredUnifiedLogs, sortBy]);

  const handleHeaderCheck = React.useCallback(
    (_event, checked: boolean) => {
      setHeaderChecked(checked);
      setCheckedIndices(checked ? sortedUnifiedLogs.map((l) => hashCode(l.logId)) : []);
    },
    [sortedUnifiedLogs],
  );

  const handleRowCheck = React.useCallback((checked: boolean, index: number) => {
    if (checked) {
      setCheckedIndices((ci) => [...ci, index]);
    } else {
      setHeaderChecked(false);
      setCheckedIndices((ci) => ci.filter((v) => v !== index));
    }
  }, []);

  React.useEffect(() => {
    setCheckedIndices((ci) => {
      const ids = new Set(sortedUnifiedLogs.map((l) => hashCode(l.logId)));
      return ci.filter((i) => ids.has(i));
    });
  }, [sortedUnifiedLogs]);

  React.useEffect(() => {
    setHeaderChecked(sortedUnifiedLogs.length > 0 && checkedIndices.length === sortedUnifiedLogs.length);
  }, [checkedIndices, sortedUnifiedLogs]);

  const handleDownload = React.useCallback(
    (log: UnifiedLog) => {
      addSubscription(
        propsTarget.pipe(first()).subscribe((t) => {
          if (t) context.api.downloadUnifiedLog(t, log);
        }),
      );
    },
    [addSubscription, propsTarget, context.api],
  );

  const handleDeleteSelected = React.useCallback(() => {
    setActionLoadings((old) => ({ ...old, DELETE: true }));
    const tasks: Observable<boolean>[] = [];
    if (jvmId) {
      sortedUnifiedLogs.forEach((l) => {
        if (checkedIndices.includes(hashCode(l.logId))) {
          tasks.push(context.api.deleteArchivedUnifiedLogFromPath(jvmId, l.logId).pipe(first()));
        }
      });
      addSubscription(
        forkJoin(tasks.length ? tasks : [of(true)]).subscribe(() =>
          setActionLoadings((old) => ({ ...old, DELETE: false })),
        ),
      );
    } else {
      addSubscription(
        propsTarget
          .pipe(
            first(),
            concatMap((t: Target | undefined) => {
              if (!t) return of([]);
              sortedUnifiedLogs.forEach((l) => {
                if (checkedIndices.includes(hashCode(l.logId))) {
                  tasks.push(context.api.deleteUnifiedLog(t, l.logId).pipe(first()));
                }
              });
              return forkJoin(tasks.length ? tasks : [of(true)]);
            }),
          )
          .subscribe(() => setActionLoadings((old) => ({ ...old, DELETE: false }))),
      );
    }
  }, [addSubscription, propsTarget, jvmId, sortedUnifiedLogs, checkedIndices, context.api]);

  const handlePull = React.useCallback(() => {
    setActionLoadings((old) => ({ ...old, PULL: true }));
    addSubscription(
      propsTarget
        .pipe(
          first(),
          concatMap((t: Target | undefined) => (t ? context.api.pullUnifiedLog(t) : of(null))),
        )
        .subscribe({
          next: (log) => {
            setActionLoadings((old) => ({ ...old, PULL: false }));
            if (log === null) {
              notifications.info(t('UnifiedLogs.PULL_NO_CONTENT_TITLE'), t('UnifiedLogs.PULL_NO_CONTENT_MESSAGE'));
            }
          },
          error: () => setActionLoadings((old) => ({ ...old, PULL: false })),
        }),
    );
  }, [addSubscription, propsTarget, context.api, notifications, t]);

  const handleEditLabels = React.useCallback(() => {
    setShowLabelsPanel(true);
  }, []);

  const LabelsPanel = React.useMemo(
    () => (
      <UnifiedLogLabelsPanel
        setShowPanel={setShowLabelsPanel}
        checkedIndices={checkedIndices}
        target={propsTarget}
        jvmId={jvmId}
        directoryUnifiedLogs={logs}
      />
    ),
    [checkedIndices, propsTarget, jvmId, logs],
  );

  const toolbar = React.useMemo(
    () => (
      <UnifiedLogsToolbar
        target={targetConnectURL}
        checkedIndices={checkedIndices}
        logFilters={targetUnifiedLogFilters}
        logs={unifiedLogs}
        updateFilters={updateFilters}
        handleClearFilters={handleClearFilters}
        handleEditLabels={handleEditLabels}
        actionLoadings={actionLoadings}
        handleDelete={handleDeleteSelected}
        handlePull={isNestedTable ? undefined : handlePull}
        loggingEnabled={loggingEnabled}
        logFilePath={logFilePath}
      />
    ),
    [
      targetConnectURL,
      checkedIndices,
      targetUnifiedLogFilters,
      unifiedLogs,
      updateFilters,
      handleClearFilters,
      handleEditLabels,
      actionLoadings,
      handleDeleteSelected,
      handlePull,
      isNestedTable,
      loggingEnabled,
      logFilePath,
    ],
  );

  const columnConfig: ColumnConfig = React.useMemo(
    () => ({ columns: tableColumns, onSort: getSortParams }),
    [getSortParams],
  );

  return (
    <Drawer isExpanded={showLabelsPanel} isInline id={'unified-logs-drawer'}>
      <DrawerContent panelContent={LabelsPanel} className="unified-logs-table-drawer-content">
        <DrawerContentBody hasPadding>
          <DiagnosticsTable
            tableTitle={t('UnifiedLogs.TABLE_TITLE')}
            toolbar={toolbar}
            tableColumns={columnConfig}
            isHeaderChecked={headerChecked}
            onHeaderCheck={handleHeaderCheck}
            isLoading={isLoading}
            isEmpty={!unifiedLogs.length}
            isEmptyFilterResult={!filteredUnifiedLogs.length}
            clearFilters={handleClearFilters}
            isNestedTable={isNestedTable}
            errorMessage={errorMessage}
          >
            {sortedUnifiedLogs.map((l) => (
              <UnifiedLogRow
                key={l.logId}
                log={l}
                index={hashCode(l.logId)}
                checkedIndices={checkedIndices}
                handleRowCheck={handleRowCheck}
                onDownload={handleDownload}
                labelFilters={targetUnifiedLogFilters.Label}
                updateFilters={updateFilters}
                currentSelectedTargetURL={targetConnectURL}
              />
            ))}
          </DiagnosticsTable>
        </DrawerContentBody>
      </DrawerContent>
    </Drawer>
  );
};

// ── Toolbar ───────────────────────────────────────────────────────────────────

const LOG_STREAM_PATHS = ['/dev/stdout', '/dev/stderr'];

interface UnifiedLogsToolbarProps {
  target: string;
  checkedIndices: number[];
  logFilters: UnifiedLogFiltersCategories;
  logs: UnifiedLog[];
  updateFilters: (target: string, updateFilterOptions: UpdateFilterOptions) => void;
  handleClearFilters: () => void;
  handleEditLabels: () => void;
  actionLoadings: Record<UnifiedLogTableActions, boolean>;
  handleDelete: () => void;
  handlePull?: () => void;
  loggingEnabled?: boolean;
  logFilePath?: string;
}

const UnifiedLogsToolbar: React.FC<UnifiedLogsToolbarProps> = ({
  target,
  checkedIndices,
  logFilters,
  logs,
  updateFilters,
  handleClearFilters,
  handleEditLabels,
  actionLoadings,
  handleDelete,
  handlePull,
  loggingEnabled = false,
  logFilePath,
}) => {
  const { t } = useCryostatTranslation();
  const context = React.useContext(ServiceContext);
  const [warningModalOpen, setWarningModalOpen] = React.useState(false);
  const [actionToggleOpen, setActionToggleOpen] = React.useState(false);

  const handleDeleteButton = React.useCallback(() => {
    if (context.settings.deletionDialogsEnabledFor(DeleteOrDisableWarningType.DeleteUnifiedLog)) {
      setWarningModalOpen(true);
    } else {
      handleDelete();
    }
  }, [context.settings, handleDelete]);

  const deleteModal = React.useMemo(
    () => (
      <DeleteWarningModal
        warningType={DeleteOrDisableWarningType.DeleteUnifiedLog}
        visible={warningModalOpen}
        onAccept={handleDelete}
        onClose={() => setWarningModalOpen(false)}
      />
    ),
    [warningModalOpen, handleDelete],
  );

  const pullButton = React.useMemo(() => {
    if (!handlePull) return null;
    const isPullDisabled =
      actionLoadings['PULL'] ||
      !loggingEnabled ||
      (logFilePath !== undefined && LOG_STREAM_PATHS.includes(logFilePath));
    return {
      default: (
        <Tooltip content={t('UnifiedLogs.PULL_TOOLTIP')} appendTo={portalRoot}>
          <Button
            variant="plain"
            aria-label={t('UnifiedLogs.PULL_ARIA')}
            onClick={handlePull}
            isLoading={actionLoadings['PULL']}
            isDisabled={isPullDisabled}
            data-quickstart-id="unified-logs-pull-btn"
          >
            <ImportIcon />
          </Button>
        </Tooltip>
      ),
      collapsed: (
        <OverflowMenuDropdownItem key="pull-log" isShared onClick={handlePull}>
          {t('UnifiedLogs.PULL_TOOLTIP')}
        </OverflowMenuDropdownItem>
      ),
      key: 'pull-log',
    };
  }, [handlePull, actionLoadings, loggingEnabled, logFilePath, t]);

  const editLabelsButton = React.useMemo(
    () => ({
      default: (
        <Button
          variant="secondary"
          onClick={handleEditLabels}
          isDisabled={!checkedIndices.length}
          data-quickstart-id="unified-logs-edit-labels-btn"
        >
          {t('UnifiedLogs.EDIT_LABELS')}
        </Button>
      ),
      collapsed: (
        <OverflowMenuDropdownItem key="edit-labels" isShared onClick={handleEditLabels}>
          {t('UnifiedLogs.EDIT_LABELS')}
        </OverflowMenuDropdownItem>
      ),
      key: 'edit-labels',
    }),
    [checkedIndices.length, handleEditLabels, t],
  );

  const deleteButton = React.useMemo(
    () => ({
      default: (
        <Button
          variant="danger"
          onClick={handleDeleteButton}
          isDisabled={!checkedIndices.length || actionLoadings['DELETE']}
          isLoading={actionLoadings['DELETE']}
          data-quickstart-id="unified-logs-delete-btn"
        >
          {actionLoadings['DELETE'] ? t('UnifiedLogs.DELETING') : t('UnifiedLogs.DELETE')}
        </Button>
      ),
      collapsed: (
        <OverflowMenuDropdownItem key="delete" isShared onClick={handleDeleteButton}>
          {t('UnifiedLogs.DELETE')}
        </OverflowMenuDropdownItem>
      ),
      key: 'delete',
    }),
    [checkedIndices.length, actionLoadings, handleDeleteButton, t],
  );

  const buttons = React.useMemo(
    () => [pullButton, editLabelsButton, deleteButton].filter(Boolean) as (typeof deleteButton)[],
    [pullButton, editLabelsButton, deleteButton],
  );

  return (
    <>
      <Toolbar clearAllFilters={handleClearFilters}>
        <ToolbarContent>
          <UnifiedLogFilters target={target} logs={logs} filters={logFilters} updateFilters={updateFilters} />
          <ToolbarGroup variant="action-group-plain">
            <ToolbarItem>
              <OverflowMenu breakpoint="lg">
                <OverflowMenuContent>
                  <OverflowMenuGroup groupType="button">
                    {buttons.map((b) => (
                      <OverflowMenuItem key={b.key}>{b.default}</OverflowMenuItem>
                    ))}
                  </OverflowMenuGroup>
                </OverflowMenuContent>
                <OverflowMenuControl>
                  <Dropdown
                    isOpen={actionToggleOpen}
                    onOpenChange={(o) => setActionToggleOpen(o)}
                    toggle={(ref: React.Ref<MenuToggleElement>) => (
                      <MenuToggle
                        ref={ref}
                        variant="plain"
                        onClick={() => setActionToggleOpen((o) => !o)}
                        isExpanded={actionToggleOpen}
                        aria-label={t('UnifiedLogs.ARIA_LABELS.ACTION_TOGGLE')}
                      >
                        <EllipsisVIcon />
                      </MenuToggle>
                    )}
                  >
                    <DropdownList>{buttons.map((b) => b.collapsed)}</DropdownList>
                  </Dropdown>
                </OverflowMenuControl>
              </OverflowMenu>
            </ToolbarItem>
          </ToolbarGroup>
        </ToolbarContent>
      </Toolbar>
      {deleteModal}
    </>
  );
};

// ── Row ───────────────────────────────────────────────────────────────────────

interface UnifiedLogRowProps {
  log: UnifiedLog;
  index: number;
  checkedIndices: number[];
  handleRowCheck: (checked: boolean, index: number) => void;
  onDownload: (log: UnifiedLog) => void;
  labelFilters: string[];
  updateFilters: (target: string, updateFilterOptions: UpdateFilterOptions) => void;
  currentSelectedTargetURL: string;
}

const UnifiedLogRow: React.FC<UnifiedLogRowProps> = ({
  log,
  index,
  checkedIndices,
  handleRowCheck,
  onDownload,
  labelFilters,
  updateFilters,
  currentSelectedTargetURL,
}) => {
  const { t } = useCryostatTranslation();
  const [dayjs, datetimeContext] = useDayjs();
  const [isOpen, setIsOpen] = React.useState(false);

  const handleCheck = React.useCallback(
    (_: unknown, checked: boolean) => handleRowCheck(checked, index),
    [index, handleRowCheck],
  );

  const actionItems = React.useMemo<RowAction[]>(
    () => [{ title: t('UnifiedLogs.DOWNLOAD'), key: 'download-unified-log', onClick: () => onDownload(log) }],
    [t, log, onDownload],
  );

  const toggle = React.useCallback(
    (toggleRef: React.Ref<MenuToggleElement>) => (
      <MenuToggle
        ref={toggleRef}
        onClick={() => setIsOpen((o) => !o)}
        isExpanded={isOpen}
        variant="plain"
        aria-label={t('UnifiedLogs.ARIA_LABELS.ROW_ACTION')}
        data-quickstart-id="unified-log-row-kebab"
      >
        <EllipsisVIcon />
      </MenuToggle>
    ),
    [t, isOpen],
  );

  return (
    <Tbody key={index}>
      <Tr>
        <Td>
          <Checkbox
            name={`unified-log-row-${index}-check`}
            id={`unified-log-row-${index}-check`}
            isChecked={checkedIndices.includes(index)}
            onChange={handleCheck}
          />
        </Td>
        <Td dataLabel={tableColumns[0].title}>{log.logId}</Td>
        <Td dataLabel={tableColumns[1].title}>
          {log.lastModified ? (
            <Timestamp
              tooltip={{
                variant: TimestampTooltipVariant.custom,
                content: dayjs(log.lastModified * 1000).toISOString(),
              }}
            >
              {dayjs(log.lastModified * 1000)
                .tz(datetimeContext.timeZone.full)
                .format('L LTS z')}
            </Timestamp>
          ) : (
            '—'
          )}
        </Td>
        <Td dataLabel={tableColumns[2].title}>
          <LabelCell
            target={currentSelectedTargetURL}
            clickableOptions={{
              updateFilters: updateFilters,
              labelFilters: labelFilters,
            }}
            labels={log.metadata?.labels ?? []}
          />
        </Td>
        <Td dataLabel={tableColumns[3].title}>{formatBytes(log.size ?? 0)}</Td>
        <Td isActionCell>
          <Dropdown
            toggle={toggle}
            popperProps={{ enableFlip: true, position: 'right' }}
            isOpen={isOpen}
            onOpenChange={(o) => setIsOpen(o)}
            onOpenChangeKeys={['Escape']}
          >
            <DropdownList>
              {actionItems.map((action) => (
                <DropdownItem
                  key={action.key}
                  onClick={() => {
                    setIsOpen(false);
                    action.onClick?.();
                  }}
                >
                  {action.title}
                </DropdownItem>
              ))}
            </DropdownList>
          </Dropdown>
        </Td>
      </Tr>
    </Tbody>
  );
};

export default UnifiedLogsTable;
