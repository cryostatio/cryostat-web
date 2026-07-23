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
import { RowAction } from '@app/Recordings/RecordingActions';
import { GcLog, NotificationCategory, NullableTarget, Target } from '@app/Shared/Services/api.types';
import { NotificationsContext } from '@app/Shared/Services/Notifications.service';
import { ServiceContext } from '@app/Shared/Services/Services';
import useDayjs from '@app/utils/hooks/useDayjs';
import { useSubscriptions } from '@app/utils/hooks/useSubscriptions';
import { formatBytes, hashCode, portalRoot, TableColumn } from '@app/utils/utils';
import { useCryostatTranslation } from '@i18n/i18nextUtil';
import {
  Button,
  Checkbox,
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
import { concatMap, first, forkJoin, Observable, of } from 'rxjs';

const tableColumns: TableColumn[] = [
  {
    title: 'Name',
    keyPaths: ['gcLogId'],
    sortable: true,
  },
  {
    title: 'Timestamp',
    keyPaths: ['lastModified'],
    sortable: true,
  },
  {
    title: 'Size',
    keyPaths: ['size'],
    sortable: true,
  },
];

export type GcLogTableActions = 'DELETE' | 'PULL';

export interface GcLogsTableProps {
  target: Observable<NullableTarget>;
  isNestedTable?: boolean;
  /** When set, use these gc logs directly (nested/read-only mode) instead of fetching */
  gcLogs?: GcLog[];
  /** When set, delete via jvmId path rather than targetId */
  jvmId?: string;
  /** Pull button is only enabled when GC logging is active on the target */
  gcLoggingEnabled?: boolean;
  /** The log file path reported by the GC logging status */
  gcLogFilePath?: string;
}

export const GcLogsTable: React.FC<GcLogsTableProps> = ({
  target: propsTarget,
  isNestedTable = false,
  gcLogs: propGcLogs,
  jvmId,
  gcLoggingEnabled = false,
  gcLogFilePath,
}) => {
  const { t } = useCryostatTranslation();
  const context = React.useContext(ServiceContext);
  const notifications = React.useContext(NotificationsContext);
  const addSubscription = useSubscriptions();

  const [gcLogs, setGcLogs] = React.useState<GcLog[]>([]);
  const [checkedIndices, setCheckedIndices] = React.useState<number[]>([]);
  const [headerChecked, setHeaderChecked] = React.useState(false);
  const [sortBy, setSortBy] = React.useState<ISortBy>({});
  const [isLoading, setIsLoading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState('');
  const [actionLoadings, setActionLoadings] = React.useState<Record<GcLogTableActions, boolean>>({
    DELETE: false,
    PULL: false,
  });

  const getSortParams = React.useCallback(
    (columnIndex: number): ThProps['sort'] => ({
      sortBy,
      onSort: (_event, index, direction) => setSortBy({ index, direction }),
      columnIndex,
    }),
    [sortBy],
  );

  const handleGcLogs = React.useCallback((logs: GcLog[]) => {
    setGcLogs(logs);
    setIsLoading(false);
    setErrorMessage('');
  }, []);

  const handleError = React.useCallback((error) => {
    setIsLoading(false);
    setErrorMessage(error.message);
  }, []);

  const refreshGcLogs = React.useCallback(() => {
    if (propGcLogs !== undefined) {
      handleGcLogs(propGcLogs);
      return;
    }
    setIsLoading(true);
    addSubscription(
      propsTarget
        .pipe(
          first(),
          concatMap((target: Target | undefined) => (target ? context.api.getGcLogs(target) : of([]))),
        )
        .subscribe({ next: handleGcLogs, error: handleError }),
    );
  }, [addSubscription, propsTarget, propGcLogs, context.api, handleGcLogs, handleError]);

  React.useEffect(() => {
    addSubscription(
      propsTarget.subscribe(() => {
        setCheckedIndices([]);
        setHeaderChecked(false);
        refreshGcLogs();
      }),
    );
  }, [addSubscription, propsTarget, refreshGcLogs]);

  React.useEffect(() => {
    if (propGcLogs !== undefined) {
      handleGcLogs(propGcLogs);
    }
  }, [propGcLogs, handleGcLogs]);

  React.useEffect(() => {
    addSubscription(
      context.notificationChannel.messages(NotificationCategory.GcLogUploaded).subscribe(() => refreshGcLogs()),
    );
  }, [addSubscription, context.notificationChannel, refreshGcLogs]);

  React.useEffect(() => {
    addSubscription(
      context.notificationChannel.messages(NotificationCategory.GcLogDeleted).subscribe((msg) => {
        setGcLogs((old) => old.filter((l) => l.gcLogId !== msg.message.gcLog.gcLogId));
      }),
    );
  }, [addSubscription, context.notificationChannel]);

  React.useEffect(() => {
    if (!context.settings.autoRefreshEnabled()) return;
    const id = window.setInterval(
      () => refreshGcLogs(),
      context.settings.autoRefreshPeriod() * context.settings.autoRefreshUnits(),
    );
    return () => window.clearInterval(id);
  }, [context.settings, refreshGcLogs]);

  const sortedGcLogs = React.useMemo(() => {
    const idx = sortBy.index ?? 0;
    const dir = sortBy.direction ?? SortByDirection.asc;
    const key = tableColumns[idx]?.keyPaths?.[0] ?? 'gcLogId';
    return [...gcLogs].sort((a, b) => {
      const av = a[key] ?? '';
      const bv = b[key] ?? '';
      return dir === SortByDirection.asc ? (av < bv ? -1 : av > bv ? 1 : 0) : av > bv ? -1 : av < bv ? 1 : 0;
    });
  }, [gcLogs, sortBy]);

  const handleHeaderCheck = React.useCallback(
    (_event, checked: boolean) => {
      setHeaderChecked(checked);
      setCheckedIndices(checked ? sortedGcLogs.map((l) => hashCode(l.gcLogId)) : []);
    },
    [sortedGcLogs],
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
      const ids = new Set(sortedGcLogs.map((l) => hashCode(l.gcLogId)));
      return ci.filter((i) => ids.has(i));
    });
  }, [sortedGcLogs]);

  React.useEffect(() => {
    setHeaderChecked(sortedGcLogs.length > 0 && checkedIndices.length === sortedGcLogs.length);
  }, [checkedIndices, sortedGcLogs]);

  const handleDownload = React.useCallback(
    (gcLog: GcLog) => {
      addSubscription(
        propsTarget.pipe(first()).subscribe((t) => {
          if (t) context.api.downloadGcLog(t, gcLog);
        }),
      );
    },
    [addSubscription, propsTarget, context.api],
  );

  const handleDeleteSelected = React.useCallback(() => {
    setActionLoadings((old) => ({ ...old, DELETE: true }));
    const tasks: Observable<boolean>[] = [];
    if (jvmId) {
      sortedGcLogs.forEach((l) => {
        if (checkedIndices.includes(hashCode(l.gcLogId))) {
          tasks.push(context.api.deleteArchivedGcLogFromPath(jvmId, l.gcLogId).pipe(first()));
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
              sortedGcLogs.forEach((l) => {
                if (checkedIndices.includes(hashCode(l.gcLogId))) {
                  tasks.push(context.api.deleteGcLog(t, l.gcLogId).pipe(first()));
                }
              });
              return forkJoin(tasks.length ? tasks : [of(true)]);
            }),
          )
          .subscribe(() => setActionLoadings((old) => ({ ...old, DELETE: false }))),
      );
    }
  }, [addSubscription, propsTarget, jvmId, sortedGcLogs, checkedIndices, context.api]);

  const handlePull = React.useCallback(() => {
    setActionLoadings((old) => ({ ...old, PULL: true }));
    addSubscription(
      propsTarget
        .pipe(
          first(),
          concatMap((t: Target | undefined) => (t ? context.api.pullGcLog(t) : of(null))),
        )
        .subscribe({
          next: (gcLog) => {
            setActionLoadings((old) => ({ ...old, PULL: false }));
            if (gcLog === null) {
              notifications.info(t('GcLogs.PULL_NO_CONTENT_TITLE'), t('GcLogs.PULL_NO_CONTENT_MESSAGE'));
            }
          },
          error: () => setActionLoadings((old) => ({ ...old, PULL: false })),
        }),
    );
  }, [addSubscription, propsTarget, context.api, notifications, t]);

  const toolbar = React.useMemo(
    () => (
      <GcLogsToolbar
        checkedIndices={checkedIndices}
        actionLoadings={actionLoadings}
        handleDelete={handleDeleteSelected}
        handlePull={isNestedTable ? undefined : handlePull}
        gcLoggingEnabled={gcLoggingEnabled}
        gcLogFilePath={gcLogFilePath}
      />
    ),
    [checkedIndices, actionLoadings, handleDeleteSelected, handlePull, isNestedTable, gcLoggingEnabled, gcLogFilePath],
  );

  const columnConfig: ColumnConfig = React.useMemo(
    () => ({ columns: tableColumns, onSort: getSortParams }),
    [getSortParams],
  );

  return (
    <DiagnosticsTable
      tableTitle={t('GcLogs.TABLE_TITLE')}
      toolbar={toolbar}
      tableColumns={columnConfig}
      isHeaderChecked={headerChecked}
      onHeaderCheck={handleHeaderCheck}
      isLoading={isLoading}
      isEmpty={!gcLogs.length}
      isNestedTable={isNestedTable}
      errorMessage={errorMessage}
    >
      {sortedGcLogs.map((l) => (
        <GcLogRow
          key={l.gcLogId}
          gcLog={l}
          index={hashCode(l.gcLogId)}
          checkedIndices={checkedIndices}
          handleRowCheck={handleRowCheck}
          onDownload={handleDownload}
        />
      ))}
    </DiagnosticsTable>
  );
};

// ── Toolbar ───────────────────────────────────────────────────────────────────

const GC_LOG_STREAM_PATHS = ['/dev/stdout', '/dev/stderr'];

interface GcLogsToolbarProps {
  checkedIndices: number[];
  actionLoadings: Record<GcLogTableActions, boolean>;
  handleDelete: () => void;
  handlePull?: () => void;
  gcLoggingEnabled?: boolean;
  gcLogFilePath?: string;
}

const GcLogsToolbar: React.FC<GcLogsToolbarProps> = ({
  checkedIndices,
  actionLoadings,
  handleDelete,
  handlePull,
  gcLoggingEnabled = false,
  gcLogFilePath,
}) => {
  const { t } = useCryostatTranslation();
  const context = React.useContext(ServiceContext);
  const [warningModalOpen, setWarningModalOpen] = React.useState(false);
  const [actionToggleOpen, setActionToggleOpen] = React.useState(false);

  const handleDeleteButton = React.useCallback(() => {
    if (context.settings.deletionDialogsEnabledFor(DeleteOrDisableWarningType.DeleteGcLog)) {
      setWarningModalOpen(true);
    } else {
      handleDelete();
    }
  }, [context.settings, handleDelete]);

  const deleteModal = React.useMemo(
    () => (
      <DeleteWarningModal
        warningType={DeleteOrDisableWarningType.DeleteGcLog}
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
      !gcLoggingEnabled ||
      (gcLogFilePath !== undefined && GC_LOG_STREAM_PATHS.includes(gcLogFilePath));
    return {
      default: (
        <Tooltip content={t('GcLogs.PULL_TOOLTIP')} appendTo={portalRoot}>
          <Button
            variant="plain"
            aria-label={t('GcLogs.PULL_ARIA')}
            onClick={handlePull}
            isLoading={actionLoadings['PULL']}
            isDisabled={isPullDisabled}
          >
            <ImportIcon />
          </Button>
        </Tooltip>
      ),
      collapsed: (
        <OverflowMenuDropdownItem key="pull-log" isShared onClick={handlePull}>
          {t('GcLogs.PULL_TOOLTIP')}
        </OverflowMenuDropdownItem>
      ),
      key: 'pull-log',
    };
  }, [handlePull, actionLoadings, gcLoggingEnabled, gcLogFilePath, t]);

  const deleteButton = React.useMemo(
    () => ({
      default: (
        <Button
          variant="danger"
          onClick={handleDeleteButton}
          isDisabled={!checkedIndices.length || actionLoadings['DELETE']}
          isLoading={actionLoadings['DELETE']}
        >
          {actionLoadings['DELETE'] ? t('GcLogs.DELETING') : t('GcLogs.DELETE')}
        </Button>
      ),
      collapsed: (
        <OverflowMenuDropdownItem key="delete" isShared onClick={handleDeleteButton}>
          {t('GcLogs.DELETE')}
        </OverflowMenuDropdownItem>
      ),
      key: 'delete',
    }),
    [checkedIndices.length, actionLoadings, handleDeleteButton, t],
  );

  const buttons = React.useMemo(
    () => [pullButton, deleteButton].filter(Boolean) as (typeof deleteButton)[],
    [pullButton, deleteButton],
  );

  return (
    <>
      <Toolbar>
        <ToolbarContent>
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
                        aria-label={t('GcLogs.ARIA_LABELS.ACTION_TOGGLE')}
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

interface GcLogRowProps {
  gcLog: GcLog;
  index: number;
  checkedIndices: number[];
  handleRowCheck: (checked: boolean, index: number) => void;
  onDownload: (gcLog: GcLog) => void;
}

const GcLogRow: React.FC<GcLogRowProps> = ({ gcLog, index, checkedIndices, handleRowCheck, onDownload }) => {
  const { t } = useCryostatTranslation();
  const [dayjs, datetimeContext] = useDayjs();
  const [isOpen, setIsOpen] = React.useState(false);

  const handleCheck = React.useCallback(
    (_: unknown, checked: boolean) => handleRowCheck(checked, index),
    [index, handleRowCheck],
  );

  const actionItems = React.useMemo<RowAction[]>(
    () => [{ title: t('GcLogs.DOWNLOAD'), key: 'download-gc-log', onClick: () => onDownload(gcLog) }],
    [t, gcLog, onDownload],
  );

  const toggle = React.useCallback(
    (toggleRef: React.Ref<MenuToggleElement>) => (
      <MenuToggle
        ref={toggleRef}
        onClick={() => setIsOpen((o) => !o)}
        isExpanded={isOpen}
        variant="plain"
        aria-label={t('GcLogs.ARIA_LABELS.ROW_ACTION')}
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
            name={`gc-log-row-${index}-check`}
            id={`gc-log-row-${index}-check`}
            isChecked={checkedIndices.includes(index)}
            onChange={handleCheck}
          />
        </Td>
        <Td dataLabel={tableColumns[0].title}>{gcLog.gcLogId}</Td>
        <Td dataLabel={tableColumns[1].title}>
          {gcLog.lastModified ? (
            <Timestamp
              tooltip={{
                variant: TimestampTooltipVariant.custom,
                content: dayjs(gcLog.lastModified * 1000).toISOString(),
              }}
            >
              {dayjs(gcLog.lastModified * 1000)
                .tz(datetimeContext.timeZone.full)
                .format('L LTS z')}
            </Timestamp>
          ) : (
            '—'
          )}
        </Td>
        <Td dataLabel={tableColumns[2].title}>{formatBytes(gcLog.size ?? 0)}</Td>
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

export default GcLogsTable;
