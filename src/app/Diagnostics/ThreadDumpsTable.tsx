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
import { DeleteWarningModal } from '@app/Modal/DeleteWarningModal';
import { DeleteOrDisableWarningType } from '@app/Modal/types';
import { LabelCell } from '@app/RecordingMetadata/LabelCell';
import { RowAction } from '@app/Recordings/RecordingActions';
import { LoadingProps } from '@app/Shared/Components/types';
import { UpdateFilterOptions } from '@app/Shared/Redux/Filters/Common';
import {
  emptyArchivedThreadDumpFilters,
  ThreadDumpAddFilterIntent,
  ThreadDumpDeleteAllFiltersIntent,
  ThreadDumpDeleteCategoryFiltersIntent,
  ThreadDumpDeleteFilterIntent,
  TargetThreadDumpFilters,
} from '@app/Shared/Redux/Filters/ThreadDumpFilterSlice';
import { RootState, StateDispatch } from '@app/Shared/Redux/ReduxStore';
import { NotificationCategory, NullableTarget, Target, ThreadDump } from '@app/Shared/Services/api.types';
import { ServiceContext } from '@app/Shared/Services/Services';
import useDayjs from '@app/utils/hooks/useDayjs';
import { useSubscriptions } from '@app/utils/hooks/useSubscriptions';
import { TableColumn, formatBytes, hashCode, portalRoot, sortResources } from '@app/utils/utils';
import { useCryostatTranslation } from '@i18n/i18nextUtil';
import {
  Toolbar,
  ToolbarContent,
  ToolbarGroup,
  ToolbarItem,
  Dropdown,
  DropdownItem,
  DropdownList,
  MenuToggleElement,
  MenuToggle,
  Drawer,
  DrawerContent,
  DrawerContentBody,
  Checkbox,
  Button,
  OverflowMenuDropdownItem,
  OverflowMenu,
  OverflowMenuContent,
  OverflowMenuGroup,
  OverflowMenuItem,
  OverflowMenuControl,
  Timestamp,
  TimestampTooltipVariant,
} from '@patternfly/react-core';
import { EllipsisVIcon } from '@patternfly/react-icons';
import { ISortBy, SortByDirection, Table, Tbody, Td, ThProps, Tr } from '@patternfly/react-table';
import _ from 'lodash';
import * as React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { combineLatest, concatMap, first, forkJoin, Observable, of } from 'rxjs';
import { ColumnConfig, DiagnosticsTable } from './DiagnosticsTable';
import { ThreadDumpFilters, ThreadDumpFiltersCategories } from './Filters/ThreadDumpFilters';
import { ThreadDumpLabelsPanel } from './ThreadDumpLabelsPanel';

const tableColumns: TableColumn[] = [
  {
    title: 'ID',
    keyPaths: ['id'],
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

export interface ThreadDumpsProps {
  target: Observable<NullableTarget>;
  isNestedTable: boolean;
  toolbarBreakReference?: HTMLElement | (() => HTMLElement);
}

export const ThreadDumpsTable: React.FC<ThreadDumpsProps> = ({
  target: propsTarget,
  isNestedTable,
  toolbarBreakReference,
}) => {
  const context = React.useContext(ServiceContext);
  const dispatch = useDispatch<StateDispatch>();
  const addSubscription = useSubscriptions();

  const [threadDumps, setThreadDumps] = React.useState<ThreadDump[]>([]);
  const [filteredThreadDumps, setFilteredThreadDumps] = React.useState<ThreadDump[]>([]);
  const [showLabelsPanel, setShowLabelsPanel] = React.useState(false);
  const [checkedIndices, setCheckedIndices] = React.useState([] as number[]);
  const [headerChecked, setHeaderChecked] = React.useState(false);
  const [filterText, setFilterText] = React.useState('');
  const [sortBy, setSortBy] = React.useState<ISortBy>({});
  const [isLoading, setIsLoading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState('');
  const [targetConnectURL, setTargetConnectURL] = React.useState('');
  const [actionLoadings, setActionLoadings] = React.useState<Record<ArchiveActions, boolean>>({ DELETE: false });

  const targetThreadDumpFilters = useSelector((state: RootState) => {
    const filters = state.threadDumpFilters.list.filter(
      (targetFilter: TargetThreadDumpFilters) => targetFilter.target === targetConnectURL,
    );
    return filters.length > 0 ? filters[0].archived.filters : emptyArchivedThreadDumpFilters;
  }) as ThreadDumpFiltersCategories;

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

  React.useEffect(() => {
    addSubscription(
      combineLatest([
        propsTarget,
        context.notificationChannel.messages(NotificationCategory.ThreadDumpMetadataUpdated),
      ]).subscribe(([currentTarget, event]) => {
        if (currentTarget?.jvmId != event.message.threadDump.jvmId) {
          return;
        }

        setThreadDumps((oldThreadDumps) => {
          return oldThreadDumps.map((threadDump) => {
            if (threadDump.threadDumpId === event.message.threadDump.threadDumpId) {
              const updatedThreadDump = {
                ...threadDump,
                metadata: { labels: event.message.threadDump.metadata.labels },
              };
              return updatedThreadDump;
            }
            return threadDump;
          });
        });
      }),
    );
  }, [addSubscription, context, context.notificationChannel, setThreadDumps, propsTarget]);

  const handleThreadDumps = React.useCallback(
    (threadDumps: ThreadDump[]) => {
      setThreadDumps(threadDumps);
      setIsLoading(false);
      setErrorMessage('');
    },
    [setThreadDumps, setIsLoading, setErrorMessage],
  );

  const handleError = React.useCallback(
    (error) => {
      setIsLoading(false);
      setErrorMessage(error.message);
    },
    [setIsLoading, setErrorMessage],
  );

  const handleHeaderCheck = React.useCallback(
    (event, checked) => {
      setHeaderChecked(checked);
      setCheckedIndices(checked ? filteredThreadDumps.map((r) => hashCode(r.threadDumpId)) : []);
    },
    [setHeaderChecked, setCheckedIndices, filteredThreadDumps],
  );

  const handlePostActions = React.useCallback(
    (action: ArchiveActions) => {
      setActionLoadings((old) => {
        const newActionLoadings = { ...old };
        newActionLoadings[action] = false;
        return newActionLoadings;
      });
    },
    [setActionLoadings],
  );

  const handleDeleteThreadDumps = React.useCallback(() => {
    setActionLoadings((old) => ({ ...old, DELETE: true }));
    const tasks: Observable<boolean>[] = [];
    addSubscription(
      propsTarget.subscribe((t) => {
        if (!t) {
          return;
        }
        filteredThreadDumps.forEach((r: ThreadDump) => {
          if (checkedIndices.includes(hashCode(r.threadDumpId))) {
            tasks.push(context.api.deleteThreadDump(t, r.threadDumpId).pipe(first()));
          }
        });
        addSubscription(
          forkJoin(tasks).subscribe({
            next: () => handlePostActions('DELETE'),
            error: () => handlePostActions('DELETE'),
          }),
        );
      }),
    );
  }, [
    addSubscription,
    filteredThreadDumps,
    checkedIndices,
    context.api,
    propsTarget,
    setActionLoadings,
    handlePostActions,
  ]);

  const handleRowCheck = React.useCallback(
    (checked, index) => {
      if (checked) {
        setCheckedIndices((ci) => [...ci, index]);
      } else {
        setHeaderChecked(false);
        setCheckedIndices((ci) => ci.filter((v) => v !== index));
      }
    },
    [setCheckedIndices, setHeaderChecked],
  );

  const queryTargetThreadDumps = React.useCallback(
    (target: Target) => context.api.getTargetThreadDumps(target),
    [context.api],
  );

  const refreshThreadDumps = React.useCallback(() => {
    setIsLoading(true);
    addSubscription(
      propsTarget
        .pipe(
          first(),
          concatMap((target: Target | undefined) => {
            if (target) {
              return queryTargetThreadDumps(target);
            } else {
              setIsLoading(false);
              return of([]);
            }
          }),
        )
        .subscribe({
          next: handleThreadDumps,
          error: handleError,
        }),
    );
  }, [addSubscription, propsTarget, setIsLoading, handleThreadDumps, handleError, queryTargetThreadDumps]);

  const handleClearFilters = React.useCallback(() => {
    dispatch(ThreadDumpDeleteAllFiltersIntent(targetConnectURL));
  }, [dispatch, targetConnectURL]);

  const updateFilters = React.useCallback(
    (target, { filterValue, filterKey, filterValueIndex, deleted = false, deleteOptions }: UpdateFilterOptions) => {
      if (deleted) {
        if (deleteOptions && deleteOptions.all) {
          dispatch(ThreadDumpDeleteCategoryFiltersIntent(target, filterKey));
        } else {
          dispatch(ThreadDumpDeleteFilterIntent(target, filterKey, filterValue, filterValueIndex));
        }
      } else {
        dispatch(ThreadDumpAddFilterIntent(target, filterKey, filterValue));
      }
    },
    [dispatch],
  );

  React.useEffect(() => {
    setCheckedIndices((ci) => {
      const filteredThreadDumpIdx = new Set(filteredThreadDumps.map((r) => hashCode(r.threadDumpId)));
      return ci.filter((idx) => filteredThreadDumpIdx.has(idx));
    });
  }, [filteredThreadDumps, setCheckedIndices]);

  React.useEffect(() => {
    setHeaderChecked(checkedIndices.length === filteredThreadDumps.length);
  }, [setHeaderChecked, checkedIndices, filteredThreadDumps.length]);

  React.useEffect(() => {
    addSubscription(
      context.notificationChannel.messages(NotificationCategory.ThreadDumpDeleted).subscribe((msg) => {
        setThreadDumps((old) => old.filter((t) => t.threadDumpId !== msg.message.threadDump.threadDumpId));
      }),
    );
  }, [addSubscription, context.notificationChannel, refreshThreadDumps]);

  React.useEffect(() => {
    addSubscription(
      context.notificationChannel.messages(NotificationCategory.ThreadDumpSuccess).subscribe(() => {
        refreshThreadDumps();
      }),
    );
  }, [addSubscription, context.notificationChannel, refreshThreadDumps]);

  React.useEffect(() => {
    addSubscription(
      propsTarget.subscribe((target) => {
        setTargetConnectURL(target?.connectUrl || '');
        setFilterText('');
        refreshThreadDumps();
      }),
    );
  }, [propsTarget, addSubscription, refreshThreadDumps]);

  React.useEffect(() => {
    if (!context.settings.autoRefreshEnabled()) {
      return;
    }
    const id = window.setInterval(
      () => refreshThreadDumps(),
      context.settings.autoRefreshPeriod() * context.settings.autoRefreshUnits(),
    );
    return () => window.clearInterval(id);
  }, [context.settings, refreshThreadDumps]);

  React.useEffect(() => {
    let filtered: ThreadDump[];
    if (!filterText) {
      filtered = threadDumps;
    } else {
      const reg = new RegExp(_.escapeRegExp(filterText), 'i');
      filtered = threadDumps.filter((t: ThreadDump) => reg.test(t.threadDumpId));
    }

    setFilteredThreadDumps(
      sortResources(
        {
          index: sortBy.index ?? 0,
          direction: sortBy.direction ?? SortByDirection.asc,
        },
        filtered,
        tableColumns,
      ),
    );
  }, [filterText, threadDumps, sortBy, setFilteredThreadDumps]);

  const handleDownloadThreadDump = React.useCallback(
    (threadDump) => {
      context.api.downloadThreadDump(threadDump);
    },
    [context.api],
  );

  const handleEditLabels = React.useCallback(() => {
    setShowLabelsPanel(true);
  }, [setShowLabelsPanel]);

  const LabelsPanel = React.useMemo(
    () => (
      <ThreadDumpLabelsPanel setShowPanel={setShowLabelsPanel} checkedIndices={checkedIndices} target={propsTarget} />
    ),
    [checkedIndices, propsTarget, setShowLabelsPanel],
  );

  const threadDumpsToolbar = React.useMemo(
    () => (
      <ThreadDumpsToolbar
        target={targetConnectURL}
        checkedIndices={checkedIndices}
        threadDumpFilters={targetThreadDumpFilters}
        threadDumps={threadDumps}
        filteredThreadDumps={filteredThreadDumps}
        updateFilters={updateFilters}
        handleClearFilters={handleClearFilters}
        handleEditLabels={handleEditLabels}
        handleDelete={handleDeleteThreadDumps}
        actionLoadings={actionLoadings}
        toolbarBreakReference={toolbarBreakReference}
      />
    ),
    [
      targetConnectURL,
      checkedIndices,
      targetThreadDumpFilters,
      threadDumps,
      filteredThreadDumps,
      updateFilters,
      handleClearFilters,
      handleEditLabels,
      handleDeleteThreadDumps,
      actionLoadings,
      toolbarBreakReference,
    ],
  );

  const totalArchiveSize = React.useMemo(
    () => filteredThreadDumps.reduce((total, r) => total + r.size, 0),
    [filteredThreadDumps],
  );

  const columnConfig: ColumnConfig = React.useMemo(
    () => ({
      columns: tableColumns,
      onSort: getSortParams,
    }),
    [getSortParams],
  );

  return (
    <Drawer isExpanded={showLabelsPanel} isInline id={'thread-dumps-drawer'}>
      <DrawerContent panelContent={LabelsPanel} className="thread-dumps-table-drawer-content">
        <DrawerContentBody hasPadding>
          <DiagnosticsTable
            tableTitle="Thread Dumps"
            toolbar={threadDumpsToolbar}
            tableColumns={columnConfig}
            tableFooter={
              threadDumps.length > 0 && (
                <Table borders={false}>
                  <Tbody>
                    <Tr>
                      <Td width={15}>
                        <b>Total size: {formatBytes(totalArchiveSize)}</b>
                      </Td>
                    </Tr>
                  </Tbody>
                </Table>
              )
            }
            isHeaderChecked={headerChecked}
            onHeaderCheck={handleHeaderCheck}
            isLoading={isLoading}
            isEmpty={!threadDumps.length}
            isEmptyFilterResult={!filteredThreadDumps.length}
            clearFilters={handleClearFilters}
            isNestedTable={isNestedTable}
            errorMessage={errorMessage}
          >
            {filteredThreadDumps.map((r) => (
              <ThreadDumpRow
                key={r.threadDumpId}
                threadDump={r}
                labelFilters={targetThreadDumpFilters.Label}
                index={hashCode(r.threadDumpId)}
                sourceTarget={propsTarget}
                currentSelectedTargetURL={targetConnectURL}
                checkedIndices={checkedIndices}
                handleRowCheck={handleRowCheck}
                updateFilters={updateFilters}
                onDownload={handleDownloadThreadDump}
              />
            ))}
          </DiagnosticsTable>
        </DrawerContentBody>
      </DrawerContent>
    </Drawer>
  );
};

export interface ThreadDumpActionProps {
  threadDump: ThreadDump;
  onDownload: (threadDump: ThreadDump) => void;
}

export const ThreadDumpAction: React.FC<ThreadDumpActionProps> = ({ threadDump, onDownload }) => {
  const { t } = useCryostatTranslation();
  const [isOpen, setIsOpen] = React.useState(false);

  const actionItems = React.useMemo(() => {
    return [
      {
        title: 'Download Thread Dump',
        key: 'download-threaddump',
        onClick: () => onDownload(threadDump),
      },
    ] as RowAction[];
  }, [onDownload, threadDump]);

  const handleToggle = React.useCallback((_, opened: boolean) => setIsOpen(opened), [setIsOpen]);

  const dropdownItems = React.useMemo(
    () =>
      actionItems.map((action) => (
        <DropdownItem
          aria-label={action.key}
          key={action.key}
          onClick={() => {
            setIsOpen(false);
            action.onClick && action.onClick();
          }}
          data-quickstart-id={action.key}
        >
          {action.title}
        </DropdownItem>
      )),
    [actionItems, setIsOpen],
  );

  return (
    <Dropdown
      toggle={(toggleRef: React.Ref<MenuToggleElement>) => (
        <MenuToggle
          aria-label={t('ThreadDumpActions.ARIA_LABELS.MENU_TOGGLE')}
          variant="plain"
          ref={toggleRef}
          onClick={(event) => handleToggle(event, !isOpen)}
        >
          <EllipsisVIcon />
        </MenuToggle>
      )}
      onOpenChange={setIsOpen}
      onOpenChangeKeys={['Escape']}
      isOpen={isOpen}
      popperProps={{
        position: 'right',
        enableFlip: true,
      }}
    >
      <DropdownList>{dropdownItems}</DropdownList>
    </Dropdown>
  );
};

export interface ThreadDumpRowProps {
  threadDump: ThreadDump;
  index: number;
  currentSelectedTargetURL: string;
  sourceTarget: Observable<NullableTarget>;
  checkedIndices: number[];
  labelFilters: string[];
  handleRowCheck: (checked: boolean, rowIdx: string | number) => void;
  updateFilters: (target: string, updateFilterOptions: UpdateFilterOptions) => void;
  onDownload: (threadDump: ThreadDump) => void;
}

export const ThreadDumpRow: React.FC<ThreadDumpRowProps> = ({
  threadDump,
  index,
  currentSelectedTargetURL,
  checkedIndices,
  labelFilters,
  handleRowCheck,
  updateFilters,
  onDownload,
}) => {
  const [dayjs, datetimeContext] = useDayjs();

  const handleCheck = React.useCallback(
    (_, checked: boolean) => {
      handleRowCheck(checked, index);
    },
    [index, handleRowCheck],
  );

  const parentRow = React.useMemo(() => {
    return (
      <Tr key={`${index}_parent`}>
        <Td key={`thread-dump-table-row-${index}_0`}>
          <Checkbox
            name={`thread-dump-table-row-${index}-check`}
            onChange={handleCheck}
            isChecked={checkedIndices.includes(index)}
            id={`thread-dump-table-row-${index}-check`}
          />
        </Td>
        <Td key={`thread-dump-table-row-${index}_1`} dataLabel={tableColumns[0].title}>
          {threadDump.threadDumpId}
        </Td>
        <Td key={`thread-dump-table-row-${index}_2`} dataLabel={tableColumns[1].title}>
          <Timestamp
            className="thread-dump-table__timestamp"
            tooltip={{ variant: TimestampTooltipVariant.custom, content: dayjs(threadDump.lastModified).toISOString() }}
          >
            {dayjs(threadDump.lastModified).tz(datetimeContext.timeZone.full).format('L LTS z')}
          </Timestamp>
        </Td>
        <Td key={`thread-dump-table-row-${index}_3`} dataLabel={tableColumns[2].title}>
          <LabelCell
            target={currentSelectedTargetURL}
            clickableOptions={{
              updateFilters: updateFilters,
              labelFilters: labelFilters,
            }}
            labels={threadDump.metadata.labels}
          />
        </Td>
        <Td key={`thread-dump-table-row-${index}_4`} dataLabel={tableColumns[3].title}>
          {formatBytes(threadDump.size ?? 0)}
        </Td>
        {<ThreadDumpAction threadDump={threadDump} onDownload={onDownload} />}
      </Tr>
    );
  }, [
    datetimeContext.timeZone.full,
    dayjs,
    onDownload,
    threadDump,
    index,
    checkedIndices,
    labelFilters,
    currentSelectedTargetURL,
    updateFilters,
    handleCheck,
  ]);

  return <Tbody key={index}>{parentRow}</Tbody>;
};

export type ArchiveActions = 'DELETE';

export interface ThreadDumpsTableToolbarProps {
  target: string;
  checkedIndices: number[];
  threadDumpFilters: ThreadDumpFiltersCategories;
  threadDumps: ThreadDump[];
  filteredThreadDumps: ThreadDump[];
  updateFilters: (target: string, updateFilterOptions: UpdateFilterOptions) => void;
  handleClearFilters: () => void;
  handleEditLabels: () => void;
  handleDelete: () => void;
  actionLoadings: Record<ArchiveActions, boolean>;
  toolbarBreakReference?: HTMLElement | (() => HTMLElement);
}

const ThreadDumpsToolbar: React.FC<ThreadDumpsTableToolbarProps> = (props) => {
  const context = React.useContext(ServiceContext);
  const [warningModalOpen, setWarningModalOpen] = React.useState(false);
  const [actionToggleOpen, setActionToggleOpen] = React.useState(false);

  const handleActionToggle = React.useCallback(() => setActionToggleOpen((old) => !old), [setActionToggleOpen]);

  const handleWarningModalClose = React.useCallback(() => {
    setWarningModalOpen(false);
  }, [setWarningModalOpen]);

  const handleDeleteButton = React.useCallback(() => {
    if (context.settings.deletionDialogsEnabledFor(DeleteOrDisableWarningType.DeleteThreadDump)) {
      setWarningModalOpen(true);
    } else {
      props.handleDelete();
    }
  }, [context.settings, setWarningModalOpen, props]);

  const deleteThreadDumpWarningModal = React.useMemo(() => {
    return (
      <DeleteWarningModal
        warningType={DeleteOrDisableWarningType.DeleteThreadDump}
        visible={warningModalOpen}
        onAccept={props.handleDelete}
        onClose={handleWarningModalClose}
      />
    );
  }, [warningModalOpen, props.handleDelete, handleWarningModalClose]);

  const actionLoadingProps = React.useMemo<Record<ArchiveActions, LoadingProps>>(
    () => ({
      DELETE: {
        spinnerAriaValueText: 'Deleting',
        spinnerAriaLabel: 'deleting-thread-dump',
        isLoading: props.actionLoadings['DELETE'],
      } as LoadingProps,
    }),
    [props],
  );

  const buttons = React.useMemo(() => {
    return [
      {
        default: (
          <Button variant="secondary" onClick={props.handleEditLabels} isDisabled={!props.checkedIndices.length}>
            Edit Labels
          </Button>
        ),
        collapsed: (
          <OverflowMenuDropdownItem key={'Edit Labels'} isShared onClick={props.handleEditLabels}>
            Edit Labels
          </OverflowMenuDropdownItem>
        ),
        key: 'Edit Labels',
      },
      {
        default: (
          <Button
            variant="danger"
            onClick={handleDeleteButton}
            isDisabled={!props.checkedIndices.length || props.actionLoadings['DELETE']}
            {...actionLoadingProps['DELETE']}
          >
            {props.actionLoadings['DELETE'] ? 'Deleting' : 'Delete'}
          </Button>
        ),
        collapsed: (
          <OverflowMenuDropdownItem key={'Delete'} isShared onClick={handleDeleteButton}>
            {props.actionLoadings['DELETE'] ? 'Deleting' : 'Delete'}
          </OverflowMenuDropdownItem>
        ),
        key: 'Delete',
      },
    ];
  }, [
    props.handleEditLabels,
    handleDeleteButton,
    props.checkedIndices.length,
    props.actionLoadings,
    actionLoadingProps,
  ]);

  return (
    <Toolbar id="thread-dumps-toolbar" aria-label="thread-dumps-toolbar" clearAllFilters={props.handleClearFilters}>
      <ToolbarContent>
        <ThreadDumpFilters
          target={props.target}
          threadDumps={props.threadDumps}
          filters={props.threadDumpFilters}
          updateFilters={props.updateFilters}
          breakpoint={'xl'}
        />
        <ToolbarItem variant="separator" className="thread-dumps-toolbar-separator" />
        <ToolbarGroup variant="button-group" style={{ alignSelf: 'start' }}>
          <ToolbarItem variant="overflow-menu">
            <OverflowMenu
              breakpoint="sm"
              breakpointReference={
                props.toolbarBreakReference || (() => document.getElementById('thread-dumps-toolbar') || document.body)
              }
            >
              <OverflowMenuContent>
                <OverflowMenuGroup groupType="button">
                  {buttons.map((b) => (
                    <OverflowMenuItem key={b.key}>{b.default}</OverflowMenuItem>
                  ))}
                </OverflowMenuGroup>
              </OverflowMenuContent>
              <OverflowMenuControl>
                <Dropdown
                  onSelect={() => setActionToggleOpen(false)}
                  toggle={(toggleRef: React.Ref<MenuToggleElement>) => (
                    <MenuToggle variant="plain" ref={toggleRef} onClick={() => handleActionToggle()}>
                      <EllipsisVIcon />
                    </MenuToggle>
                  )}
                  onOpenChange={setActionToggleOpen}
                  onOpenChangeKeys={['Escape']}
                  isOpen={actionToggleOpen}
                  popperProps={{
                    appendTo: portalRoot,
                    enableFlip: true,
                  }}
                >
                  <DropdownList>{buttons.map((b) => b.collapsed)}</DropdownList>
                </Dropdown>
              </OverflowMenuControl>
            </OverflowMenu>
          </ToolbarItem>
        </ToolbarGroup>
        {deleteThreadDumpWarningModal}
      </ToolbarContent>
    </Toolbar>
  );
};
