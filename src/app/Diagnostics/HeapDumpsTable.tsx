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
  emptyArchivedHeapDumpFilters,
  HeapDumpAddFilterIntent,
  HeapDumpDeleteAllFiltersIntent,
  HeapDumpDeleteCategoryFiltersIntent,
  HeapDumpDeleteFilterIntent,
  TargetHeapDumpFilters,
} from '@app/Shared/Redux/Filters/HeapDumpFilterSlice';
import { RootState, StateDispatch } from '@app/Shared/Redux/ReduxStore';
import { NotificationCategory, HeapDump, NullableTarget, Target } from '@app/Shared/Services/api.types';
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
  TimestampTooltipVariant,
  Timestamp,
  Divider,
} from '@patternfly/react-core';
import { EllipsisVIcon } from '@patternfly/react-icons';
import { ISortBy, SortByDirection, Table, Tbody, Td, ThProps, Tr } from '@patternfly/react-table';
import _ from 'lodash';
import * as React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { combineLatest, concatMap, first, forkJoin, Observable, of } from 'rxjs';
import { ColumnConfig, DiagnosticsTable } from './DiagnosticsTable';
import { HeapDumpFilters, HeapDumpFiltersCategories } from './Filters/HeapDumpFilters';
import { HeapDumpLabelsPanel } from './HeapDumpLabelsPanel';

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

export interface HeapDumpsProps {
  target: Observable<NullableTarget>;
  isNestedTable: boolean;
  toolbarBreakReference?: HTMLElement | (() => HTMLElement);
}

export const HeapDumpsTable: React.FC<HeapDumpsProps> = ({
  target: propsTarget,
  isNestedTable,
  toolbarBreakReference,
}) => {
  const context = React.useContext(ServiceContext);
  const dispatch = useDispatch<StateDispatch>();
  const addSubscription = useSubscriptions();

  const [heapDumps, setHeapDumps] = React.useState<HeapDump[]>([]);
  const [filteredHeapDumps, setFilteredHeapDumps] = React.useState<HeapDump[]>([]);
  const [showLabelsPanel, setShowLabelsPanel] = React.useState(false);
  const [checkedIndices, setCheckedIndices] = React.useState([] as number[]);
  const [headerChecked, setHeaderChecked] = React.useState(false);
  const [filterText, setFilterText] = React.useState('');
  const [sortBy, setSortBy] = React.useState<ISortBy>({});
  const [isLoading, setIsLoading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState('');
  const [targetConnectURL, setTargetConnectURL] = React.useState('');
  const [actionLoadings, setActionLoadings] = React.useState<Record<ArchiveActions, boolean>>({ DELETE: false });

  const targetHeapDumpFilters = useSelector((state: RootState) => {
    const filters = state.heapDumpFilters.list.filter(
      (targetFilter: TargetHeapDumpFilters) => targetFilter.target === targetConnectURL,
    );
    return filters.length > 0 ? filters[0].archived.filters : emptyArchivedHeapDumpFilters;
  }) as HeapDumpFiltersCategories;

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

  const handleHeapDumps = React.useCallback(
    (heapDumps: HeapDump[]) => {
      setHeapDumps(heapDumps);
      setIsLoading(false);
      setErrorMessage('');
    },
    [setHeapDumps, setIsLoading, setErrorMessage],
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
      setCheckedIndices(checked ? filteredHeapDumps.map((r) => hashCode(r.heapDumpId)) : []);
    },
    [setHeaderChecked, setCheckedIndices, filteredHeapDumps],
  );

  React.useEffect(() => {
    addSubscription(
      combineLatest([
        propsTarget,
        context.notificationChannel.messages(NotificationCategory.HeapDumpMetadataUpdated),
      ]).subscribe(([currentTarget, event]) => {
        if (currentTarget?.jvmId != event.message.heapDump.jvmId) {
          return;
        }

        setHeapDumps((oldHeapDumps) => {
          return oldHeapDumps.map((heapDump) => {
            if (heapDump.heapDumpId === event.message.heapDump.heapDumpId) {
              const updatedHeapDump = { ...heapDump, metadata: { labels: event.message.heapDump.metadata.labels } };
              return updatedHeapDump;
            }
            return heapDump;
          });
        });
      }),
    );
  }, [addSubscription, context, context.notificationChannel, setHeapDumps, propsTarget]);

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

  const handleDeleteHeapDumps = React.useCallback(() => {
    setActionLoadings((old) => ({ ...old, DELETE: true }));
    const tasks: Observable<boolean>[] = [];
    addSubscription(
      propsTarget.subscribe((t) => {
        if (!t) {
          return;
        }
        filteredHeapDumps.forEach((r: HeapDump) => {
          if (checkedIndices.includes(hashCode(r.heapDumpId))) {
            tasks.push(context.api.deleteHeapDump(t, r.heapDumpId).pipe(first()));
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
    filteredHeapDumps,
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

  const queryTargetHeapDumps = React.useCallback(
    (target: Target) => context.api.getTargetHeapDumps(target),
    [context.api],
  );

  const refreshHeapDumps = React.useCallback(() => {
    setIsLoading(true);
    addSubscription(
      propsTarget
        .pipe(
          first(),
          concatMap((target: Target | undefined) => {
            if (target) {
              return queryTargetHeapDumps(target);
            } else {
              setIsLoading(false);
              return of([]);
            }
          }),
        )
        .subscribe({
          next: handleHeapDumps,
          error: handleError,
        }),
    );
  }, [addSubscription, propsTarget, setIsLoading, handleHeapDumps, handleError, queryTargetHeapDumps]);

  const handleClearFilters = React.useCallback(() => {
    dispatch(HeapDumpDeleteAllFiltersIntent(targetConnectURL));
  }, [dispatch, targetConnectURL]);

  const updateFilters = React.useCallback(
    (target, { filterValue, filterKey, filterValueIndex, deleted = false, deleteOptions }: UpdateFilterOptions) => {
      if (deleted) {
        if (deleteOptions && deleteOptions.all) {
          dispatch(HeapDumpDeleteCategoryFiltersIntent(target, filterKey));
        } else {
          dispatch(HeapDumpDeleteFilterIntent(target, filterKey, filterValue, filterValueIndex));
        }
      } else {
        dispatch(HeapDumpAddFilterIntent(target, filterKey, filterValue));
      }
    },
    [dispatch],
  );

  React.useEffect(() => {
    setCheckedIndices((ci) => {
      const filteredHeapDumpIdx = new Set(filteredHeapDumps.map((r) => hashCode(r.heapDumpId)));
      return ci.filter((idx) => filteredHeapDumpIdx.has(idx));
    });
  }, [filteredHeapDumps, setCheckedIndices]);

  React.useEffect(() => {
    setHeaderChecked(checkedIndices.length === filteredHeapDumps.length);
  }, [setHeaderChecked, checkedIndices, filteredHeapDumps.length]);

  React.useEffect(() => {
    addSubscription(
      context.notificationChannel.messages(NotificationCategory.HeapDumpDeleted).subscribe((msg) => {
        setHeapDumps((old) => old.filter((t) => t.heapDumpId !== msg.message.heapDump.heapDumpId));
      }),
    );
  }, [addSubscription, context.notificationChannel, setHeapDumps]);

  React.useEffect(() => {
    addSubscription(
      context.notificationChannel.messages(NotificationCategory.HeapDumpUploaded).subscribe(() => {
        refreshHeapDumps();
      }),
    );
  }, [addSubscription, context.notificationChannel, refreshHeapDumps]);

  React.useEffect(() => {
    addSubscription(
      propsTarget.subscribe((target) => {
        setTargetConnectURL(target?.connectUrl || '');
        setFilterText('');
        refreshHeapDumps();
      }),
    );
  }, [propsTarget, addSubscription, refreshHeapDumps]);

  React.useEffect(() => {
    if (!context.settings.autoRefreshEnabled()) {
      return;
    }
    const id = window.setInterval(
      () => refreshHeapDumps(),
      context.settings.autoRefreshPeriod() * context.settings.autoRefreshUnits(),
    );
    return () => window.clearInterval(id);
  }, [context.settings, refreshHeapDumps]);

  React.useEffect(() => {
    let filtered: HeapDump[];
    if (!filterText) {
      filtered = heapDumps;
    } else {
      const reg = new RegExp(_.escapeRegExp(filterText), 'i');
      filtered = heapDumps.filter((t: HeapDump) => reg.test(t.heapDumpId));
    }

    setFilteredHeapDumps(
      sortResources(
        {
          index: sortBy.index ?? 0,
          direction: sortBy.direction ?? SortByDirection.asc,
        },
        filtered,
        tableColumns,
      ),
    );
  }, [filterText, heapDumps, sortBy, setFilteredHeapDumps]);

  const handleDownloadHeapDump = React.useCallback(
    (heapDump) => {
      context.api.downloadHeapDump(heapDump);
    },
    [context.api],
  );

  const handleEditLabels = React.useCallback(() => {
    setShowLabelsPanel(true);
  }, [setShowLabelsPanel]);

  const LabelsPanel = React.useMemo(
    () => (
      <HeapDumpLabelsPanel setShowPanel={setShowLabelsPanel} checkedIndices={checkedIndices} target={propsTarget} />
    ),
    [checkedIndices, propsTarget, setShowLabelsPanel],
  );

  const heapDumpsToolbar = React.useMemo(
    () => (
      <HeapDumpsToolbar
        target={targetConnectURL}
        checkedIndices={checkedIndices}
        heapDumpFilters={targetHeapDumpFilters}
        heapDumps={heapDumps}
        filteredHeapDumps={filteredHeapDumps}
        updateFilters={updateFilters}
        handleClearFilters={handleClearFilters}
        handleEditLabels={handleEditLabels}
        handleDelete={handleDeleteHeapDumps}
        actionLoadings={actionLoadings}
        toolbarBreakReference={toolbarBreakReference}
      />
    ),
    [
      targetConnectURL,
      checkedIndices,
      targetHeapDumpFilters,
      heapDumps,
      filteredHeapDumps,
      updateFilters,
      handleClearFilters,
      handleEditLabels,
      handleDeleteHeapDumps,
      actionLoadings,
      toolbarBreakReference,
    ],
  );

  const totalArchiveSize = React.useMemo(
    () => filteredHeapDumps.reduce((total, r) => total + r.size, 0),
    [filteredHeapDumps],
  );

  const columnConfig: ColumnConfig = React.useMemo(
    () => ({
      columns: tableColumns,
      onSort: getSortParams,
    }),
    [getSortParams],
  );

  return (
    <Drawer isExpanded={showLabelsPanel} isInline id={'heap-dumps-drawer'}>
      <DrawerContent panelContent={LabelsPanel} className="heap-dumps-table-drawer-content">
        <DrawerContentBody hasPadding>
          <DiagnosticsTable
            tableTitle="Heap Dumps"
            toolbar={heapDumpsToolbar}
            tableColumns={columnConfig}
            tableFooter={
              heapDumps.length > 0 && (
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
            isEmpty={!heapDumps.length}
            isEmptyFilterResult={!filteredHeapDumps.length}
            clearFilters={handleClearFilters}
            isNestedTable={isNestedTable}
            errorMessage={errorMessage}
          >
            {filteredHeapDumps.map((r) => (
              <HeapDumpRow
                key={r.heapDumpId}
                heapDump={r}
                labelFilters={targetHeapDumpFilters.Label}
                index={hashCode(r.heapDumpId)}
                sourceTarget={propsTarget}
                currentSelectedTargetURL={targetConnectURL}
                checkedIndices={checkedIndices}
                handleRowCheck={handleRowCheck}
                updateFilters={updateFilters}
                onDownload={handleDownloadHeapDump}
              />
            ))}
          </DiagnosticsTable>
        </DrawerContentBody>
      </DrawerContent>
    </Drawer>
  );
};

export interface HeapDumpActionProps {
  index: number;
  heapDump: HeapDump;
  onDownload: (heapDump: HeapDump) => void;
}

export const HeapDumpAction: React.FC<HeapDumpActionProps> = ({ heapDump, onDownload, ...props }) => {
  const { t } = useCryostatTranslation();
  const [isOpen, setIsOpen] = React.useState(false);

  const actionItems = React.useMemo(() => {
    return [
      {
        title: 'Download Heap Dump',
        key: 'download-heapdump',
        onClick: () => onDownload(heapDump),
      },
    ] as RowAction[];
  }, [onDownload, heapDump]);

  const toggle = React.useCallback(
    (toggleRef: React.Ref<MenuToggleElement>) => (
      <MenuToggle
        ref={toggleRef}
        onClick={() => setIsOpen((isOpen) => !isOpen)}
        isExpanded={isOpen}
        variant="plain"
        data-quickstart-id="recording-kebab"
        aria-label={t('HeapDumpActions.ARIA_LABELS.MENU_TOGGLE')}
      >
        <EllipsisVIcon />
      </MenuToggle>
    ),
    [t, setIsOpen, isOpen],
  );

  return (
    <Td {...props} isActionCell>
      <Dropdown
        toggle={toggle}
        popperProps={{
          enableFlip: true,
          position: 'right',
        }}
        isOpen={isOpen}
        onOpenChange={(isOpen) => setIsOpen(isOpen)}
        onOpenChangeKeys={['Escape']}
      >
        <DropdownList>
          {actionItems.map((action) =>
            action.isSeparator ? (
              <Divider />
            ) : (
              <DropdownItem
                key={action.key}
                onClick={() => {
                  setIsOpen(false);
                  action.onClick && action.onClick();
                }}
                data-quickstart-id={action.key}
              >
                {action.title}
              </DropdownItem>
            ),
          )}
        </DropdownList>
      </Dropdown>
    </Td>
  );
};

export interface HeapDumpRowProps {
  heapDump: HeapDump;
  index: number;
  currentSelectedTargetURL: string;
  sourceTarget: Observable<NullableTarget>;
  checkedIndices: number[];
  labelFilters: string[];
  handleRowCheck: (checked: boolean, rowIdx: string | number) => void;
  updateFilters: (target: string, updateFilterOptions: UpdateFilterOptions) => void;
  onDownload: (heapDump: HeapDump) => void;
}

export const HeapDumpRow: React.FC<HeapDumpRowProps> = ({
  heapDump,
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
        <Td key={`heap-dump-table-row-${index}_0`}>
          <Checkbox
            name={`heap-dump-table-row-${index}-check`}
            onChange={handleCheck}
            isChecked={checkedIndices.includes(index)}
            id={`heap-dump-table-row-${index}-check`}
          />
        </Td>
        <Td key={`heap-dump-table-row-${index}_1`} dataLabel={tableColumns[0].title}>
          {heapDump.heapDumpId}
        </Td>
        <Td key={`heap-dump-table-row-${index}_2`} dataLabel={tableColumns[1].title}>
          <Timestamp
            className="thread-dump-table__timestamp"
            tooltip={{ variant: TimestampTooltipVariant.custom, content: dayjs(heapDump.lastModified).toISOString() }}
          >
            {dayjs(heapDump.lastModified).tz(datetimeContext.timeZone.full).format('L LTS z')}
          </Timestamp>
        </Td>
        <Td key={`heap-dump-table-row-${index}_3`} dataLabel={tableColumns[2].title}>
          <LabelCell
            target={currentSelectedTargetURL}
            clickableOptions={{
              updateFilters: updateFilters,
              labelFilters: labelFilters,
            }}
            labels={heapDump.metadata.labels}
          />
        </Td>
        <Td key={`heap-dump-table-row-${index}_4`} dataLabel={tableColumns[3].title}>
          {formatBytes(heapDump.size ?? 0)}
        </Td>
        {<HeapDumpAction heapDump={heapDump} index={index} onDownload={onDownload} />}
      </Tr>
    );
  }, [
    onDownload,
    datetimeContext.timeZone.full,
    dayjs,
    heapDump,
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

export interface HeapDumpsTableToolbarProps {
  target: string;
  checkedIndices: number[];
  heapDumpFilters: HeapDumpFiltersCategories;
  heapDumps: HeapDump[];
  filteredHeapDumps: HeapDump[];
  updateFilters: (target: string, updateFilterOptions: UpdateFilterOptions) => void;
  handleClearFilters: () => void;
  handleEditLabels: () => void;
  handleDelete: () => void;
  actionLoadings: Record<ArchiveActions, boolean>;
  toolbarBreakReference?: HTMLElement | (() => HTMLElement);
}

const HeapDumpsToolbar: React.FC<HeapDumpsTableToolbarProps> = (props) => {
  const context = React.useContext(ServiceContext);
  const [warningModalOpen, setWarningModalOpen] = React.useState(false);
  const [actionToggleOpen, setActionToggleOpen] = React.useState(false);

  const handleActionToggle = React.useCallback(() => setActionToggleOpen((old) => !old), [setActionToggleOpen]);

  const handleWarningModalClose = React.useCallback(() => {
    setWarningModalOpen(false);
  }, [setWarningModalOpen]);

  const handleDeleteButton = React.useCallback(() => {
    if (context.settings.deletionDialogsEnabledFor(DeleteOrDisableWarningType.DeleteHeapDump)) {
      setWarningModalOpen(true);
    } else {
      props.handleDelete();
    }
  }, [context.settings, setWarningModalOpen, props]);

  const deleteHeapDumpWarningModal = React.useMemo(() => {
    return (
      <DeleteWarningModal
        warningType={DeleteOrDisableWarningType.DeleteHeapDump}
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
        spinnerAriaLabel: 'deleting-heap-dump',
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
    <Toolbar id="heap-dumps-toolbar" aria-label="heap-dumps-toolbar" clearAllFilters={props.handleClearFilters}>
      <ToolbarContent>
        <HeapDumpFilters
          target={props.target}
          heapDumps={props.heapDumps}
          filters={props.heapDumpFilters}
          updateFilters={props.updateFilters}
          breakpoint={'xl'}
        />
        <ToolbarItem variant="separator" className="heap-dumps-toolbar-separator" />
        <ToolbarGroup variant="button-group" style={{ alignSelf: 'start' }}>
          <ToolbarItem variant="overflow-menu">
            <OverflowMenu
              breakpoint="sm"
              breakpointReference={
                props.toolbarBreakReference || (() => document.getElementById('heap-dumps-toolbar') || document.body)
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
        {deleteHeapDumpWarningModal}
      </ToolbarContent>
    </Toolbar>
  );
};
