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
import { DeleteWarningModal } from '@app/Modal/DeleteWarningModal';
import { DeleteOrDisableWarningType } from '@app/Modal/types';
import { LabelCell } from '@app/RecordingMetadata/LabelCell';
import { LoadingView } from '@app/Shared/Components/LoadingView';
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
import { NotificationsContext } from '@app/Shared/Services/Notifications.service';
import { ServiceContext } from '@app/Shared/Services/Services';
import useDayjs from '@app/utils/hooks/useDayjs';
import { useSubscriptions } from '@app/utils/hooks/useSubscriptions';
import { TableColumn, formatBytes, hashCode, sortResources } from '@app/utils/utils';
import { useCryostatTranslation } from '@i18n/i18nextUtil';
import {
  EmptyState,
  EmptyStateIcon,
  Stack,
  StackItem,
  Toolbar,
  ToolbarContent,
  ToolbarGroup,
  ToolbarItem,
  EmptyStateHeader,
  Dropdown,
  DropdownItem,
  DropdownList,
  MenuToggleElement,
  MenuToggle,
  SearchInput,
  Divider,
  Drawer,
  DrawerContent,
  DrawerContentBody,
  Checkbox,
} from '@patternfly/react-core';
import { SearchIcon, EllipsisVIcon } from '@patternfly/react-icons';
import {
  ISortBy,
  SortByDirection,
  Table,
  TableVariant,
  Tbody,
  Td,
  Th,
  Thead,
  ThProps,
  Tr,
} from '@patternfly/react-table';
import _ from 'lodash';
import * as React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { concatMap, first, Observable, of } from 'rxjs';
import { HeapDumpFiltersCategories } from './Filters/HeapDumpFilters';
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
    title: 'Size',
    keyPaths: ['size'],
    sortable: true,
  },
  {
    title: 'Labels',
    keyPaths: ['metadata', 'labels'],
  },
];

export interface HeapDumpsProps {
  target: Observable<NullableTarget>;
}

export const HeapDumpsTable: React.FC<HeapDumpsProps> = ({ target: propsTarget }) => {
  const context = React.useContext(ServiceContext);
  const { t } = useCryostatTranslation();
  const dispatch = useDispatch<StateDispatch>();
  const addSubscription = useSubscriptions();
  const notificationsContext = React.useContext(NotificationsContext);

  const [heapDumps, setHeapDumps] = React.useState<HeapDump[]>([]);
  const [filteredHeapDumps, setFilteredHeapDumps] = React.useState<HeapDump[]>([]);
  const [showLabelsPanel, setShowLabelsPanel] = React.useState(false);
  const [checkedIndices, setCheckedIndices] = React.useState([] as number[]);
  const [headerChecked, setHeaderChecked] = React.useState(false);
  const [filterText, setFilterText] = React.useState('');
  const [sortBy, setSortBy] = React.useState<ISortBy>({});
  const [isLoading, setIsLoading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState('');
  const [heapDumpToDelete, setHeapDumpToDelete] = React.useState<HeapDump | undefined>(undefined);
  const [warningModalOpen, setWarningModalOpen] = React.useState(false);
  const [dayjs, datetimeContext] = useDayjs();
  const [targetConnectURL, setTargetConnectURL] = React.useState('');

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

  const handleDelete = React.useCallback(
    (heapDump: HeapDump) => {
      addSubscription(
        propsTarget
          .pipe(
            first(),
            concatMap((target: Target | undefined) => {
              if (target) {
                return context.api.deleteHeapDump(target, heapDump.heapDumpId);
              } else {
                return of([]);
              }
            }),
          )
          .subscribe({
            error: handleError,
          }),
      );
    },
    [addSubscription, handleError, propsTarget, context.api],
  );

  React.useEffect(() => {
    addSubscription(
      context.notificationChannel.messages(NotificationCategory.HeapDumpDeleted).subscribe((msg) => {
        setHeapDumps((old) => old.filter((t) => t.heapDumpId !== msg.message.heapDump.heapDumpId));
      }),
    );
  }, [addSubscription, context.notificationChannel, refreshHeapDumps]);

  const handleWarningModalAccept = React.useCallback(() => {
    if (heapDumpToDelete) {
      handleDelete(heapDumpToDelete);
    } else {
      notificationsContext.warning(t('HeapDumps.DELETION_FAILURE_CATEGORY'), t('HeapDumps.DELETION_FAILURE_MESSAGE'));
    }
  }, [handleDelete, notificationsContext, t, heapDumpToDelete]);

  const handleWarningModalClose = React.useCallback(() => {
    setWarningModalOpen(false);
  }, [setWarningModalOpen]);

  const handleFilterTextChange = React.useCallback((_, value: string) => setFilterText(value), [setFilterText]);

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

  const handleDeleteAction = React.useCallback(
    (heapDump: HeapDump) => {
      if (context.settings.deletionDialogsEnabledFor(DeleteOrDisableWarningType.DeleteHeapDump)) {
        setHeapDumpToDelete(heapDump);
        setWarningModalOpen(true);
      } else {
        handleDelete(heapDump);
      }
    },
    [context.settings, setWarningModalOpen, setHeapDumpToDelete, handleDelete],
  );

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
    () => <HeapDumpLabelsPanel setShowPanel={setShowLabelsPanel} checkedIndices={checkedIndices} />,
    [checkedIndices, setShowLabelsPanel],
  );

  const deleteHeapDumpModal = React.useMemo(() => {
    return (
      <DeleteWarningModal
        warningType={DeleteOrDisableWarningType.DeleteHeapDump}
        visible={warningModalOpen}
        onAccept={handleWarningModalAccept}
        onClose={handleWarningModalClose}
      />
    );
  }, [warningModalOpen, handleWarningModalAccept, handleWarningModalClose]);

  const heapDumpRows = React.useMemo(
    () =>
      filteredHeapDumps.map((t: HeapDump, index) => {
        return (
          <HeapDumpRow
            heapDump={t}
            index={index}
            currentSelectedTargetURL={targetConnectURL}
            sourceTarget={propsTarget}
            checkedIndices={checkedIndices}
            labelFilters={targetHeapDumpFilters.Label}
            updateFilters={updateFilters}
            handleRowCheck={handleRowCheck}
            onDownload={handleDownloadHeapDump}
            onDelete={handleDelete}
            handleEditLabels={handleEditLabels}
          />
        );
      }),
    [
      handleDelete,
      handleRowCheck,
      propsTarget,
      targetConnectURL,
      targetHeapDumpFilters.Label,
      updateFilters,
      checkedIndices,
      filteredHeapDumps,
      handleEditLabels,
      handleDownloadHeapDump,
    ],
  );

  if (errorMessage != '') {
    return <ErrorView title={'Error retrieving heap dumps'} message={`${errorMessage}`} />;
  } else if (isLoading) {
    return <LoadingView />;
  } else {
    return (
      <Stack hasGutter style={{ marginTop: '1em' }}>
        <StackItem>
          <Toolbar id="heap-dumps-toolbar" clearAllFilters={handleClearFilters}>
            <ToolbarContent>
              <ToolbarGroup variant="filter-group">
                <ToolbarItem>
                  <SearchInput
                    style={{ minWidth: '30ch' }}
                    name="heapDumpsFilter"
                    id="heapDumpsFilter"
                    type="search"
                    placeholder={t('HeapDumps.SEARCH_PLACEHOLDER')}
                    aria-label={t('HeapDumps.ARIA_LABELS.SEARCH_INPUT')}
                    onChange={handleFilterTextChange}
                    value={filterText}
                  />
                </ToolbarItem>
              </ToolbarGroup>
              {deleteHeapDumpModal}
            </ToolbarContent>
          </Toolbar>
          {heapDumpRows.length ? (
            <Drawer isExpanded={showLabelsPanel} isInline id={'heap-dumps-drawer'}>
              <DrawerContent panelContent={LabelsPanel} className="heap-dumps-table-drawer-content">
                <DrawerContentBody hasPadding>
                  <Table aria-label="Heap Dumps table" variant={TableVariant.compact}>
                    <Thead>
                      <Tr>
                        <Th
                          key="table-header-check-all"
                          select={{
                            onSelect: handleHeaderCheck,
                            isSelected: headerChecked,
                          }}
                        />
                        {tableColumns.map(({ title, sortable }, index) => (
                          <Th key={`heap-dump-header-${title}`} sort={sortable ? getSortParams(index) : undefined}>
                            {title}
                          </Th>
                        ))}
                      </Tr>
                    </Thead>
                    <Tbody>{heapDumpRows}</Tbody>
                  </Table>
                </DrawerContentBody>
              </DrawerContent>
            </Drawer>
          ) : (
            <EmptyState>
              <EmptyStateHeader
                titleText="No Heap Dumps"
                icon={<EmptyStateIcon icon={SearchIcon} />}
                headingLevel="h4"
              />
            </EmptyState>
          )}
        </StackItem>
      </Stack>
    );
  }
};

export interface HeapDumpActionProps {
  heapDump: HeapDump;
  checkedIndices: number[];
  onDownload: (heapDump: HeapDump) => void;
  onDelete: (heapDump: HeapDump) => void;
  handleEditLabels: () => void;
}

export const HeapDumpAction: React.FC<HeapDumpActionProps> = ({
  heapDump,
  checkedIndices,
  onDelete,
  onDownload,
  handleEditLabels,
}) => {
  const { t } = useCryostatTranslation();
  const [isOpen, setIsOpen] = React.useState(false);

  const actionItems = React.useMemo(() => {
    return [
      {
        title: 'Edit Labels',
        key: 'edit-heapdump-labels',
        variant: 'secondary',
        onClick: () => handleEditLabels(),
        isDisabled: !checkedIndices.length,
      },
      {
        isSeparator: true,
      },
      {
        title: 'Download',
        key: 'download-heapdump',
        onClick: () => onDownload(heapDump),
      },
      {
        isSeparator: true,
      },
      {
        key: 'delete-heapdump',
        title: 'Delete',
        isDanger: true,
        onClick: () => onDelete(heapDump),
      },
    ];
  }, [checkedIndices.length, handleEditLabels, onDelete, onDownload, heapDump]);

  const handleToggle = React.useCallback((_, opened: boolean) => setIsOpen(opened), [setIsOpen]);

  const dropdownItems = React.useMemo(
    () =>
      actionItems.map((action, idx) =>
        action.isSeparator ? (
          <Divider key={`separator-${idx}`} />
        ) : (
          <DropdownItem
            aria-label={action.key}
            key={action.key}
            onClick={() => {
              setIsOpen(false);
              action.onClick && action.onClick();
            }}
            isDanger={action.isDanger}
          >
            {action.title}
          </DropdownItem>
        ),
      ),
    [actionItems, setIsOpen],
  );

  return (
    <Dropdown
      toggle={(toggleRef: React.Ref<MenuToggleElement>) => (
        <MenuToggle
          aria-label={t('HeapDumps.ARIA_LABELS.ROW_ACTION')}
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
  onDelete: (heapDump: HeapDump) => void;
  handleEditLabels: () => void;
}

export const HeapDumpRow: React.FC<HeapDumpRowProps> = ({
  heapDump,
  index,
  currentSelectedTargetURL,
  sourceTarget,
  checkedIndices,
  labelFilters,
  handleRowCheck,
  updateFilters,
  onDownload,
  onDelete,
  handleEditLabels,
}) => {
  const context = React.useContext(ServiceContext);

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
        <Td key={`heap-dump-table-row-${index}_2`} dataLabel={tableColumns[0].title}>
          {heapDump.heapDumpId}
        </Td>
        <Td key={`active-table-row-${index}_3`} dataLabel={tableColumns[2].title}>
          <LabelCell
            target={currentSelectedTargetURL}
            clickableOptions={{
              updateFilters: updateFilters,
              labelFilters: labelFilters,
            }}
            labels={heapDump.metadata.labels}
          />
        </Td>
        <Td key={`archived-table-row-${index}_4`} dataLabel={tableColumns[1].title}>
          {formatBytes(heapDump.size ?? 0)}
        </Td>
        {
          <HeapDumpAction
            heapDump={heapDump}
            checkedIndices={checkedIndices}
            onDownload={onDownload}
            onDelete={onDelete}
            handleEditLabels={handleEditLabels}
          />
        }
      </Tr>
    );
  }, [
    handleEditLabels,
    onDelete,
    onDownload,
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
