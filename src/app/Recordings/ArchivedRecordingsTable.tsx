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

import { ArchiveUploadModal } from '@app/Archives/ArchiveUploadModal';
import {
  ClickableAutomatedAnalysisLabel,
  clickableAutomatedAnalysisKey,
} from '@app/Dashboard/AutomatedAnalysis/ClickableAutomatedAnalysisLabel';
import { DeleteWarningModal } from '@app/Modal/DeleteWarningModal';
import { DeleteOrDisableWarningType } from '@app/Modal/types';
import { LoadingProps } from '@app/Shared/Components/types';
import { UpdateFilterOptions } from '@app/Shared/Redux/Filters/Common';
import { emptyArchivedRecordingFilters, TargetRecordingFilters } from '@app/Shared/Redux/Filters/RecordingFilterSlice';
import {
  recordingAddFilterIntent,
  recordingDeleteFilterIntent,
  recordingAddTargetIntent,
  recordingDeleteCategoryFiltersIntent,
  recordingDeleteAllFiltersIntent,
  RootState,
  StateDispatch,
} from '@app/Shared/Redux/ReduxStore';
import {
  ArchivedRecording,
  Target,
  RecordingDirectory,
  UPLOADS_SUBDIRECTORY,
  NotificationCategory,
  NullableTarget,
  CategorizedRuleEvaluations,
  AnalysisResult,
} from '@app/Shared/Services/api.types';
import { ServiceContext } from '@app/Shared/Services/Services';
import { useSort } from '@app/utils/hooks/useSort';
import { useSubscriptions } from '@app/utils/hooks/useSubscriptions';
import { formatBytes, hashCode, portalRoot, sortResources, TableColumn } from '@app/utils/utils';
import {
  Bullseye,
  Button,
  Checkbox,
  Drawer,
  DrawerContent,
  DrawerContentBody,
  Grid,
  GridItem,
  LabelGroup,
  OverflowMenu,
  OverflowMenuContent,
  OverflowMenuControl,
  OverflowMenuDropdownItem,
  OverflowMenuGroup,
  OverflowMenuItem,
  Spinner,
  Title,
  Toolbar,
  ToolbarContent,
  ToolbarGroup,
  ToolbarItem,
  Dropdown,
  DropdownList,
  MenuToggle,
  MenuToggleElement,
} from '@patternfly/react-core';
import { UploadIcon, EllipsisVIcon } from '@patternfly/react-icons';
import { Tbody, Tr, Td, ExpandableRowContent, Table, SortByDirection } from '@patternfly/react-table';
import * as React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Observable, forkJoin, merge, combineLatest } from 'rxjs';
import { concatMap, filter, first, map } from 'rxjs/operators';
import { LabelCell } from '../RecordingMetadata/LabelCell';
import { RecordingActions } from './RecordingActions';
import { RecordingFiltersCategories, filterRecordings, RecordingFilters } from './RecordingFilters';
import { RecordingLabelsPanel } from './RecordingLabelsPanel';
import { ColumnConfig, RecordingsTable } from './RecordingsTable';

const tableColumns: TableColumn[] = [
  {
    title: 'Name',
    keyPaths: ['name'],
    sortable: true,
    transform: (name: string, _recording: ArchivedRecording) => {
      return name.replace(/\.[^/.]+$/, '');
    },
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

export interface ArchivedRecordingsTableProps {
  target: Observable<NullableTarget>;
  isUploadsTable: boolean;
  isNestedTable: boolean;
  directory?: RecordingDirectory;
  directoryRecordings?: ArchivedRecording[];
  toolbarBreakReference?: HTMLElement | (() => HTMLElement);
}

export const ArchivedRecordingsTable: React.FC<ArchivedRecordingsTableProps> = ({
  target: propsTarget,
  isUploadsTable,
  isNestedTable,
  directory: propsDirectory,
  directoryRecordings,
  toolbarBreakReference,
}) => {
  const context = React.useContext(ServiceContext);
  const addSubscription = useSubscriptions();
  const dispatch = useDispatch<StateDispatch>();

  const [targetConnectURL, setTargetConnectURL] = React.useState('');
  const [recordings, setRecordings] = React.useState([] as ArchivedRecording[]);
  const [filteredRecordings, setFilteredRecordings] = React.useState([] as ArchivedRecording[]);
  const [headerChecked, setHeaderChecked] = React.useState(false);
  const [checkedIndices, setCheckedIndices] = React.useState([] as number[]);
  const [expandedRows, setExpandedRows] = React.useState([] as string[]);
  const [showUploadModal, setShowUploadModal] = React.useState(false);
  const [showDetailsPanel, setShowDetailsPanel] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState('');
  const [actionLoadings, setActionLoadings] = React.useState<Record<ArchiveActions, boolean>>({ DELETE: false });
  const [sortBy, getSortParams] = useSort();

  const targetRecordingFilters = useSelector((state: RootState) => {
    const filters = state.recordingFilters.list.filter(
      (targetFilter: TargetRecordingFilters) => targetFilter.target === targetConnectURL,
    );
    return filters.length > 0 ? filters[0].archived.filters : emptyArchivedRecordingFilters;
  }) as RecordingFiltersCategories;

  const handleHeaderCheck = React.useCallback(
    (event, checked) => {
      setHeaderChecked(checked);
      setCheckedIndices(checked ? filteredRecordings.map((r) => hashCode(r.name)) : []);
    },
    [setHeaderChecked, setCheckedIndices, filteredRecordings],
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

  const handleEditLabels = React.useCallback(() => {
    setShowDetailsPanel(true);
  }, [setShowDetailsPanel]);

  const handleRecordings = React.useCallback(
    (recordings) => {
      setRecordings(recordings);
      setIsLoading(false);
    },
    [setRecordings, setIsLoading],
  );

  const handleError = React.useCallback(
    (error) => {
      setIsLoading(false);
      setErrorMessage(error.message);
      setRecordings([]);
    },
    [setIsLoading, setErrorMessage, setRecordings],
  );

  const queryTargetRecordings = React.useCallback(
    (targetId: number) => {
      /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
      return context.api.graphql<any>(
        `
      query ArchivedRecordingsForTarget($id: BigInteger!) {
        targetNodes(filter: { targetIds: [$id] }) {
          target {
            archivedRecordings {
              data {
                name
                downloadUrl
                reportUrl
                metadata {
                  labels {
                    key
                    value
                  }
                }
                size
              }
            }
          }
        }
      }`,
        { id: targetId },
      );
    },
    [context.api],
  );

  const queryUploadedRecordings = React.useCallback(() => {
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
    return context.api.graphql<any>(
      `query UploadedRecordings($filter: ArchivedRecordingsFilterInput) {
        archivedRecordings(filter: $filter) {
          data {
            name
            downloadUrl
            reportUrl
            metadata {
              labels {
                key
                value
              }
            }
            size
          }
        }
      }`,
      { filter: { sourceTarget: UPLOADS_SUBDIRECTORY } },
    );
  }, [context.api]);

  const refreshRecordingList = React.useCallback(() => {
    setIsLoading(true);
    if (propsDirectory) {
      handleRecordings(directoryRecordings);
    } else if (isUploadsTable) {
      addSubscription(
        queryUploadedRecordings()
          .pipe(map((v) => (v?.data?.archivedRecordings?.data as ArchivedRecording[]) ?? []))
          .subscribe({
            next: handleRecordings,
            error: handleError,
          }),
      );
    } else {
      addSubscription(
        propsTarget
          .pipe(
            filter((target) => !!target),
            first(),
            concatMap((target: Target) => queryTargetRecordings(target.id!)),
            map((v) => (v.data?.targetNodes[0]?.target?.archivedRecordings?.data as ArchivedRecording[]) ?? []),
          )
          .subscribe({
            next: handleRecordings,
            error: handleError,
          }),
      );
    }
  }, [
    addSubscription,
    setIsLoading,
    handleRecordings,
    handleError,
    queryTargetRecordings,
    queryUploadedRecordings,
    isUploadsTable,
    propsDirectory,
    propsTarget,
    directoryRecordings,
  ]);

  const handleClearFilters = React.useCallback(() => {
    dispatch(recordingDeleteAllFiltersIntent(targetConnectURL, true));
  }, [dispatch, targetConnectURL]);

  const updateFilters = React.useCallback(
    (target, { filterValue, filterKey, deleted = false, deleteOptions }: UpdateFilterOptions) => {
      if (deleted) {
        if (deleteOptions && deleteOptions.all) {
          dispatch(recordingDeleteCategoryFiltersIntent(target, filterKey, true));
        } else {
          dispatch(recordingDeleteFilterIntent(target, filterKey, filterValue, true));
        }
      } else {
        dispatch(recordingAddFilterIntent(target, filterKey, filterValue, true));
      }
    },
    [dispatch],
  );

  React.useEffect(() => {
    addSubscription(
      propsTarget.subscribe((target) => {
        setTargetConnectURL(target?.connectUrl || '');
        dispatch(recordingAddTargetIntent(target?.connectUrl || ''));
        refreshRecordingList();
      }),
    );
  }, [addSubscription, refreshRecordingList, dispatch, setTargetConnectURL, propsTarget]);

  React.useEffect(() => {
    addSubscription(
      combineLatest([
        propsTarget,
        merge(
          context.notificationChannel.messages(NotificationCategory.ArchivedRecordingCreated),
          context.notificationChannel.messages(NotificationCategory.ActiveRecordingSaved),
        ),
      ]).subscribe(([currentTarget, event]) => {
        if (currentTarget?.connectUrl != event.message.target && currentTarget?.jvmId != event.message.jvmId) {
          return;
        }
        setRecordings((old) =>
          old.filter((r) => r.name !== event.message.recording.name).concat(event.message.recording),
        );
      }),
    );
  }, [addSubscription, context.notificationChannel, setRecordings, propsTarget]);

  React.useEffect(() => {
    addSubscription(
      combineLatest([
        propsTarget,
        context.notificationChannel.messages(NotificationCategory.ArchivedRecordingDeleted),
      ]).subscribe(([currentTarget, event]) => {
        const eventConnectUrlLabel = event.message.recording.metadata.labels.find(
          (label) => label.key === 'connectUrl',
        );
        const matchesUploadsUrlAndJvmId =
          currentTarget?.connectUrl === 'uploads' && event.message.recording.jvmId === 'uploads';
        if (isUploadsTable && matchesUploadsUrlAndJvmId) {
          refreshRecordingList();
        }
        if (
          currentTarget?.jvmId != event.message.recording.jvmId &&
          currentTarget?.connectUrl != eventConnectUrlLabel?.value
        ) {
          return;
        }
        setRecordings((old) => old.filter((r) => r.name !== event.message.recording.name));
        setCheckedIndices((old) => old.filter((idx) => idx !== hashCode(event.message.recording.name)));
      }),
    );
  }, [
    addSubscription,
    context.notificationChannel,
    setRecordings,
    setCheckedIndices,
    propsTarget,
    isUploadsTable,
    refreshRecordingList,
  ]);

  React.useEffect(() => {
    addSubscription(
      combineLatest([
        propsTarget,
        context.notificationChannel.messages(NotificationCategory.RecordingMetadataUpdated),
      ]).subscribe(([currentTarget, event]) => {
        const eventConnectUrlLabel = event.message.recording.metadata.labels.find(
          (label) => label.key === 'connectUrl',
        );

        if (
          currentTarget?.jvmId != event.message.recording.jvmId &&
          currentTarget?.connectUrl != eventConnectUrlLabel?.value
        ) {
          return;
        }

        setRecordings((oldRecordings) => {
          return oldRecordings.map((recording) => {
            if (recording.name === event.message.recording.name) {
              const updatedRecording = { ...recording, metadata: { labels: event.message.recording.metadata.labels } };
              return updatedRecording;
            }
            return recording;
          });
        });
      }),
    );
  }, [addSubscription, context, context.notificationChannel, setRecordings, propsTarget]);

  React.useEffect(() => {
    setFilteredRecordings(
      sortResources(
        {
          index: sortBy.index ?? 0,
          direction: sortBy.direction ?? SortByDirection.asc,
        },
        filterRecordings(recordings, targetRecordingFilters),
        tableColumns,
      ),
    );
  }, [sortBy, recordings, targetRecordingFilters, setFilteredRecordings]);

  React.useEffect(() => {
    if (!context.settings.autoRefreshEnabled()) {
      return;
    }
    const id = window.setInterval(
      () => refreshRecordingList(),
      context.settings.autoRefreshPeriod() * context.settings.autoRefreshUnits(),
    );
    return () => window.clearInterval(id);
  }, [context, context.settings, refreshRecordingList]);

  React.useEffect(() => {
    setCheckedIndices((ci) => {
      const filteredRecordingIdx = new Set(filteredRecordings.map((r) => hashCode(r.name)));
      return ci.filter((idx) => filteredRecordingIdx.has(idx));
    });
  }, [filteredRecordings, setCheckedIndices]);

  React.useEffect(() => {
    setHeaderChecked(checkedIndices.length === filteredRecordings.length);
  }, [setHeaderChecked, checkedIndices, filteredRecordings.length]);

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

  const handleDeleteRecordings = React.useCallback(() => {
    setActionLoadings((old) => ({ ...old, DELETE: true }));
    const tasks: Observable<boolean>[] = [];
    if (propsDirectory) {
      const directory = propsDirectory;
      filteredRecordings.forEach((r: ArchivedRecording) => {
        if (checkedIndices.includes(hashCode(r.name))) {
          context.reports.delete(r);
          tasks.push(context.api.deleteArchivedRecordingFromPath(directory.jvmId, r.name).pipe(first()));
        }
      });
      addSubscription(forkJoin(tasks).subscribe());
    } else {
      addSubscription(
        propsTarget.subscribe((t) => {
          if (!t) {
            return;
          }
          filteredRecordings.forEach((r: ArchivedRecording) => {
            if (checkedIndices.includes(hashCode(r.name))) {
              context.reports.delete(r);
              tasks.push(context.api.deleteArchivedRecording(t.connectUrl, r.name).pipe(first()));
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
    }
  }, [
    addSubscription,
    filteredRecordings,
    checkedIndices,
    context.reports,
    context.api,
    propsDirectory,
    propsTarget,
    setActionLoadings,
    handlePostActions,
  ]);

  const toggleExpanded = React.useCallback(
    (id: string) => {
      setExpandedRows((expandedRows) => {
        const idx = expandedRows.indexOf(id);
        return idx >= 0
          ? [...expandedRows.slice(0, idx), ...expandedRows.slice(idx + 1, expandedRows.length)]
          : [...expandedRows, id];
      });
    },
    [setExpandedRows],
  );

  const RecordingsToolbar = React.useMemo(
    () => (
      <ArchivedRecordingsToolbar
        target={targetConnectURL}
        checkedIndices={checkedIndices}
        targetRecordingFilters={targetRecordingFilters}
        recordings={recordings}
        filteredRecordings={filteredRecordings}
        updateFilters={updateFilters}
        handleClearFilters={handleClearFilters}
        handleEditLabels={handleEditLabels}
        handleDeleteRecordings={handleDeleteRecordings}
        handleShowUploadModal={() => setShowUploadModal(true)}
        isUploadsTable={isUploadsTable}
        actionLoadings={actionLoadings}
        toolbarBreakReference={toolbarBreakReference}
      />
    ),
    [
      targetConnectURL,
      checkedIndices,
      targetRecordingFilters,
      recordings,
      filteredRecordings,
      updateFilters,
      handleClearFilters,
      handleEditLabels,
      handleDeleteRecordings,
      setShowUploadModal,
      isUploadsTable,
      actionLoadings,
      toolbarBreakReference,
    ],
  );

  const handleUploadModalClose = React.useCallback(() => {
    setShowUploadModal(false); // Do nothing else as notifications will handle update
  }, [setShowUploadModal]);

  const LabelsPanel = React.useMemo(
    () => (
      <RecordingLabelsPanel
        setShowPanel={setShowDetailsPanel}
        isTargetRecording={false}
        isUploadsTable={isUploadsTable}
        checkedIndices={checkedIndices}
        directory={propsDirectory}
        directoryRecordings={directoryRecordings}
      />
    ),
    [checkedIndices, setShowDetailsPanel, isUploadsTable, propsDirectory, directoryRecordings],
  );

  const totalArchiveSize = React.useMemo(() => {
    let size = 0;
    filteredRecordings.forEach((r) => (size += r.size));
    return size;
  }, [filteredRecordings]);

  const columnConfig: ColumnConfig = React.useMemo(
    () => ({
      columns: tableColumns,
      onSort: getSortParams,
    }),
    [getSortParams],
  );
  return (
    <Drawer isExpanded={showDetailsPanel} isInline id={'archived-recording-drawer'}>
      <DrawerContent panelContent={LabelsPanel} className="recordings-table-drawer-content">
        <DrawerContentBody hasPadding>
          <RecordingsTable
            tableTitle="Archived Recordings"
            toolbar={RecordingsToolbar}
            tableColumns={columnConfig}
            tableFooter={
              filteredRecordings.length > 0 && (
                <Table borders={false}>
                  <Tbody>
                    <Tr>
                      <Td></Td>
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
            isEmpty={!recordings.length}
            isEmptyFilterResult={!filteredRecordings.length}
            clearFilters={handleClearFilters}
            isNestedTable={isNestedTable}
            errorMessage={errorMessage}
          >
            {filteredRecordings.map((r) => (
              <ArchivedRecordingRow
                key={r.name}
                recording={r}
                labelFilters={targetRecordingFilters.Label}
                index={hashCode(r.name)}
                sourceTarget={propsTarget}
                propsDirectory={propsDirectory}
                currentSelectedTargetURL={targetConnectURL}
                expandedRows={expandedRows}
                checkedIndices={checkedIndices}
                toggleExpanded={toggleExpanded}
                handleRowCheck={handleRowCheck}
                updateFilters={updateFilters}
              />
            ))}
          </RecordingsTable>

          {isUploadsTable ? <ArchiveUploadModal visible={showUploadModal} onClose={handleUploadModalClose} /> : null}
        </DrawerContentBody>
      </DrawerContent>
    </Drawer>
  );
};

export type ArchiveActions = 'DELETE';

export interface ArchivedRecordingsToolbarProps {
  target: string;
  checkedIndices: number[];
  targetRecordingFilters: RecordingFiltersCategories;
  recordings: ArchivedRecording[];
  filteredRecordings: ArchivedRecording[];
  updateFilters: (target: string, updateFilterOptions: UpdateFilterOptions) => void;
  handleClearFilters: () => void;
  handleEditLabels: () => void;
  handleDeleteRecordings: () => void;
  handleShowUploadModal: () => void;
  isUploadsTable: boolean;
  actionLoadings: Record<ArchiveActions, boolean>;
  toolbarBreakReference?: HTMLElement | (() => HTMLElement);
}

const ArchivedRecordingsToolbar: React.FC<ArchivedRecordingsToolbarProps> = (props) => {
  const context = React.useContext(ServiceContext);
  const [warningModalOpen, setWarningModalOpen] = React.useState(false);
  const [actionToggleOpen, setActionToggleOpen] = React.useState(false);

  const handleActionToggle = React.useCallback(() => setActionToggleOpen((old) => !old), [setActionToggleOpen]);

  const handleWarningModalClose = React.useCallback(() => {
    setWarningModalOpen(false);
  }, [setWarningModalOpen]);

  const handleDeleteButton = React.useCallback(() => {
    if (context.settings.deletionDialogsEnabledFor(DeleteOrDisableWarningType.DeleteArchivedRecordings)) {
      setWarningModalOpen(true);
    } else {
      props.handleDeleteRecordings();
    }
  }, [context.settings, setWarningModalOpen, props]);

  const deleteArchivedWarningModal = React.useMemo(() => {
    return (
      <DeleteWarningModal
        warningType={DeleteOrDisableWarningType.DeleteArchivedRecordings}
        visible={warningModalOpen}
        onAccept={props.handleDeleteRecordings}
        onClose={handleWarningModalClose}
      />
    );
  }, [warningModalOpen, props.handleDeleteRecordings, handleWarningModalClose]);

  const actionLoadingProps = React.useMemo<Record<ArchiveActions, LoadingProps>>(
    () => ({
      DELETE: {
        spinnerAriaValueText: 'Deleting',
        spinnerAriaLabel: 'deleting-archived-recording',
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
    <Toolbar
      id="archived-recordings-toolbar"
      aria-label="archived-recording-toolbar"
      clearAllFilters={props.handleClearFilters}
      isSticky
    >
      <ToolbarContent>
        <RecordingFilters
          target={props.target}
          isArchived={true}
          recordings={props.recordings}
          filters={props.targetRecordingFilters}
          updateFilters={props.updateFilters}
          breakpoint={'xl'}
        />
        <ToolbarGroup variant="button-group" style={{ alignSelf: 'start' }}>
          <ToolbarItem variant="overflow-menu">
            <OverflowMenu
              breakpoint="sm"
              breakpointReference={
                props.toolbarBreakReference ||
                (() => document.getElementById('archived-recordings-toolbar') || document.body)
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
                  isPlain
                  onSelect={() => setActionToggleOpen(false)}
                  toggle={(toggleRef: React.Ref<MenuToggleElement>) => (
                    <MenuToggle ref={toggleRef} onClick={() => handleActionToggle()}>
                      <EllipsisVIcon />
                    </MenuToggle>
                  )}
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
        {deleteArchivedWarningModal}
        {props.isUploadsTable ? (
          <ToolbarGroup variant="icon-button-group">
            <ToolbarItem>
              <Button variant="secondary" aria-label="upload-recording" onClick={props.handleShowUploadModal}>
                <UploadIcon />
              </Button>
            </ToolbarItem>
          </ToolbarGroup>
        ) : null}
      </ToolbarContent>
    </Toolbar>
  );
};

export interface ArchivedRecordingRowProps {
  recording: ArchivedRecording;
  index: number;
  propsDirectory?: RecordingDirectory;
  currentSelectedTargetURL: string;
  sourceTarget: Observable<NullableTarget>;
  expandedRows: string[];
  checkedIndices: number[];
  labelFilters: string[];
  toggleExpanded: (rowId: string) => void;
  handleRowCheck: (checked: boolean, rowIdx: string | number) => void;
  updateFilters: (target: string, updateFilterOptions: UpdateFilterOptions) => void;
}

export const ArchivedRecordingRow: React.FC<ArchivedRecordingRowProps> = ({
  recording,
  index,
  propsDirectory,
  currentSelectedTargetURL,
  sourceTarget,
  expandedRows,
  checkedIndices,
  labelFilters,
  toggleExpanded,
  handleRowCheck,
  updateFilters,
}) => {
  const context = React.useContext(ServiceContext);
  const [loadingAnalysis, setLoadingAnalysis] = React.useState(false);
  const [analyses, setAnalyses] = React.useState<CategorizedRuleEvaluations[]>([]);

  const expandedRowId = React.useMemo(() => `archived-table-row-${index}-exp`, [index]);

  const handleToggle = React.useCallback(() => {
    toggleExpanded(expandedRowId);
  }, [expandedRowId, toggleExpanded]);

  const isExpanded = React.useMemo(() => {
    return expandedRows.includes(expandedRowId);
  }, [expandedRowId, expandedRows]);

  const handleCheck = React.useCallback(
    (_, checked: boolean) => {
      handleRowCheck(checked, index);
    },
    [index, handleRowCheck],
  );

  React.useEffect(() => {
    if (!isExpanded) {
      return;
    }
    setLoadingAnalysis(true);
    context.reports
      .reportJson(recording, currentSelectedTargetURL)
      .pipe(first())
      .subscribe((report) => {
        const map = new Map<string, AnalysisResult[]>();
        report.forEach((evaluation) => {
          const topicValue = map.get(evaluation.topic);
          if (topicValue === undefined) {
            map.set(evaluation.topic, [evaluation]);
          } else {
            topicValue.push(evaluation);
            topicValue.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
          }
        });
        const sorted = (Array.from(map) as CategorizedRuleEvaluations[]).sort();
        setAnalyses(sorted);
        setLoadingAnalysis(false);
      });
  }, [context.reports, isExpanded, recording, currentSelectedTargetURL, setAnalyses, setLoadingAnalysis]);

  const parentRow = React.useMemo(() => {
    return (
      <Tr key={`${index}_parent`}>
        <Td key={`archived-table-row-${index}_0`}>
          <Checkbox
            name={`archived-table-row-${index}-check`}
            onChange={handleCheck}
            isChecked={checkedIndices.includes(index)}
            id={`archived-table-row-${index}-check`}
          />
        </Td>
        <Td
          key={`archived-table-row-${index}_1`}
          id={`archived-ex-toggle-${index}`}
          aria-controls={`archived-ex-expand-${index}`}
          expand={{
            rowIndex: index,
            isExpanded: isExpanded,
            onToggle: handleToggle,
          }}
        />
        <Td key={`archived-table-row-${index}_2`} dataLabel={tableColumns[0].title}>
          {recording.name}
        </Td>
        <Td key={`active-table-row-${index}_3`} dataLabel={tableColumns[2].title}>
          <LabelCell
            target={currentSelectedTargetURL}
            clickableOptions={{
              updateFilters: updateFilters,
              labelFilters: labelFilters,
            }}
            labels={recording.metadata.labels}
          />
        </Td>
        <Td key={`archived-table-row-${index}_4`} dataLabel={tableColumns[1].title}>
          {formatBytes(recording.size)}
        </Td>
        {propsDirectory ? (
          <RecordingActions
            recording={recording}
            index={index}
            uploadFn={() => context.api.uploadArchivedRecordingToGrafanaFromPath(propsDirectory.jvmId, recording.name)}
          />
        ) : (
          <RecordingActions
            recording={recording}
            index={index}
            uploadFn={() => context.api.uploadArchivedRecordingToGrafana(sourceTarget, recording.name)}
          />
        )}
      </Tr>
    );
  }, [
    index,
    checkedIndices,
    isExpanded,
    labelFilters,
    currentSelectedTargetURL,
    sourceTarget,
    propsDirectory,
    recording,
    context.api,
    updateFilters,
    handleCheck,
    handleToggle,
  ]);

  const childRow = React.useMemo(() => {
    return (
      <Tr key={`${index}_child`} isExpanded={isExpanded}>
        <Td key={`archived-ex-expand-${index}`} dataLabel={'Content Details'} colSpan={tableColumns.length + 3}>
          <ExpandableRowContent>
            <Title headingLevel={'h5'}>Automated analysis</Title>
            <Grid>
              {loadingAnalysis ? (
                <Bullseye>
                  <Spinner />
                </Bullseye>
              ) : (
                analyses.map(([topic, evaluations]) => {
                  return (
                    <GridItem className="automated-analysis-grid-item" span={2} key={`gridItem-${topic}`}>
                      <LabelGroup
                        className="automated-analysis-topic-label-groups"
                        categoryName={topic}
                        isVertical
                        numLabels={2}
                        isCompact
                        key={topic}
                      >
                        {evaluations.map((evaluation) => {
                          return (
                            <ClickableAutomatedAnalysisLabel result={evaluation} key={clickableAutomatedAnalysisKey} />
                          );
                        })}
                      </LabelGroup>
                    </GridItem>
                  );
                })
              )}
            </Grid>
          </ExpandableRowContent>
        </Td>
      </Tr>
    );
  }, [index, isExpanded, analyses, loadingAnalysis]);

  return (
    <Tbody key={index} isExpanded={isExpanded}>
      {parentRow}
      {childRow}
    </Tbody>
  );
};
