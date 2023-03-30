/*
 * Copyright The Cryostat Authors
 *
 * The Universal Permissive License (UPL), Version 1.0
 *
 * Subject to the condition set forth below, permission is hereby granted to any
 * person obtaining a copy of this software, associated documentation and/or data
 * (collectively the "Software"), free of charge and under any and all copyright
 * rights in the Software, and any and all patent rights owned or freely
 * licensable by each licensor hereunder covering either (i) the unmodified
 * Software as contributed to or provided by such licensor, or (ii) the Larger
 * Works (as defined below), to deal in both
 *
 * (a) the Software, and
 * (b) any piece of software and/or hardware listed in the lrgrwrks.txt file if
 * one is included with the Software (each a "Larger Work" to which the Software
 * is contributed by such licensors),
 *
 * without restriction, including without limitation the rights to copy, create
 * derivative works of, display, perform, and distribute the Software and make,
 * use, sell, offer for sale, import, export, have made, and have sold the
 * Software and the Larger Work(s), and to sublicense the foregoing rights on
 * either these or other terms.
 *
 * This license is subject to the following condition:
 * The above copyright notice and either this complete permission notice or at
 * a minimum a reference to the UPL must be included in all copies or
 * substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

import { ArchiveUploadModal } from '@app/Archives/ArchiveUploadModal';
import { DeleteWarningModal } from '@app/Modal/DeleteWarningModal';
import { DeleteOrDisableWarningType } from '@app/Modal/DeleteWarningUtils';
import { parseLabels } from '@app/RecordingMetadata/RecordingLabel';
import { LoadingPropsType } from '@app/Shared/ProgressIndicator';
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
import { ArchivedRecording, RecordingDirectory, UPLOADS_SUBDIRECTORY } from '@app/Shared/Services/Api.service';
import { NotificationCategory } from '@app/Shared/Services/NotificationChannel.service';
import { ServiceContext } from '@app/Shared/Services/Services';
import { NO_TARGET, Target } from '@app/Shared/Services/Target.service';
import { useSort } from '@app/utils/useSort';
import { useSubscriptions } from '@app/utils/useSubscriptions';
import { formatBytes, hashCode, sortResouces } from '@app/utils/utils';
import {
  Button,
  Checkbox,
  Drawer,
  DrawerContent,
  DrawerContentBody,
  Dropdown,
  KebabToggle,
  OverflowMenu,
  OverflowMenuContent,
  OverflowMenuControl,
  OverflowMenuDropdownItem,
  OverflowMenuGroup,
  OverflowMenuItem,
  Toolbar,
  ToolbarContent,
  ToolbarGroup,
  ToolbarItem,
} from '@patternfly/react-core';
import { UploadIcon } from '@patternfly/react-icons';
import { Tbody, Tr, Td, ExpandableRowContent, TableComposable } from '@patternfly/react-table';
import * as React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Observable, forkJoin, merge, combineLatest } from 'rxjs';
import { concatMap, filter, first, map } from 'rxjs/operators';
import { LabelCell } from '../RecordingMetadata/LabelCell';
import { RecordingActions } from './RecordingActions';
import { RecordingFiltersCategories, filterRecordings, RecordingFilters } from './RecordingFilters';
import { RecordingLabelsPanel } from './RecordingLabelsPanel';
import { ColumnConfig, RecordingsTable } from './RecordingsTable';
import { ReportFrame } from './ReportFrame';

const tableColumns = [
  {
    title: 'Name',
    keyPaths: ['name'],
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

const mapper = (index?: number) => {
  if (index !== undefined) {
    return tableColumns[index].keyPaths;
  }
  return undefined;
};

const getTransform = (_index?: number) => undefined;

export interface ArchivedRecordingsTableProps {
  target: Observable<Target>;
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
      (targetFilter: TargetRecordingFilters) => targetFilter.target === targetConnectURL
    );
    return filters.length > 0 ? filters[0].archived.filters : emptyArchivedRecordingFilters;
  }) as RecordingFiltersCategories;

  const handleHeaderCheck = React.useCallback(
    (event, checked) => {
      setHeaderChecked(checked);
      setCheckedIndices(checked ? filteredRecordings.map((r) => hashCode(r.name)) : []);
    },
    [setHeaderChecked, setCheckedIndices, filteredRecordings]
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
    [setCheckedIndices, setHeaderChecked]
  );

  const handleEditLabels = React.useCallback(() => {
    setShowDetailsPanel(true);
  }, [setShowDetailsPanel]);

  const handleRecordings = React.useCallback(
    (recordings) => {
      setRecordings(recordings);
      setIsLoading(false);
    },
    [setRecordings, setIsLoading]
  );

  const handleError = React.useCallback(
    (error) => {
      setIsLoading(false);
      setErrorMessage(error.message);
      setRecordings([]);
    },
    [setIsLoading, setErrorMessage, setRecordings]
  );

  const queryTargetRecordings = React.useCallback(
    (connectUrl: string) => {
      /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
      return context.api.graphql<any>(
        `
      query ArchivedRecordingsForTarget($connectUrl: String) {
        archivedRecordings(filter: { sourceTarget: $connectUrl }) {
          data {
            name
            downloadUrl
            reportUrl
            metadata {
              labels
            }
            size
          }
        }
      }`,
        { connectUrl }
      );
    },
    [context.api]
  );

  const queryUploadedRecordings = React.useCallback(() => {
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
    return context.api.graphql<any>(
      `query UploadedRecordings($filter: ArchivedRecordingFilterInput){
        archivedRecordings(filter: $filter) {
          data {
            name
            downloadUrl
            reportUrl
            metadata {
              labels
            }
            size
          }
        }
      }`,
      { filter: { sourceTarget: UPLOADS_SUBDIRECTORY } }
    );
  }, [context.api]);

  const refreshRecordingList = React.useCallback(() => {
    setIsLoading(true);
    if (propsDirectory) {
      handleRecordings(directoryRecordings);
    } else if (isUploadsTable) {
      addSubscription(
        queryUploadedRecordings()
          .pipe(map((v) => v.data.archivedRecordings.data as ArchivedRecording[]))
          .subscribe({
            next: handleRecordings,
            error: handleError,
          })
      );
    } else {
      addSubscription(
        propsTarget
          .pipe(
            filter((target) => target !== NO_TARGET),
            first(),
            concatMap((target) => queryTargetRecordings(target.connectUrl)),
            map((v) => v.data.archivedRecordings.data as ArchivedRecording[])
          )
          .subscribe({
            next: handleRecordings,
            error: handleError,
          })
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
    [dispatch]
  );

  React.useEffect(() => {
    addSubscription(
      propsTarget.subscribe((target) => {
        setTargetConnectURL(target.connectUrl);
        dispatch(recordingAddTargetIntent(target.connectUrl));
        refreshRecordingList();
      })
    );
  }, [addSubscription, refreshRecordingList, dispatch, setTargetConnectURL, propsTarget]);

  React.useEffect(() => {
    addSubscription(
      combineLatest([
        propsTarget,
        merge(
          context.notificationChannel.messages(NotificationCategory.ArchivedRecordingCreated),
          context.notificationChannel.messages(NotificationCategory.ActiveRecordingSaved)
        ),
      ]).subscribe(([currentTarget, event]) => {
        if (currentTarget.connectUrl != event.message.target) {
          return;
        }
        setRecordings((old) =>
          old.filter((r) => r.name !== event.message.recording.name).concat(event.message.recording)
        );
      })
    );
  }, [addSubscription, context.notificationChannel, setRecordings, propsTarget]);

  React.useEffect(() => {
    addSubscription(
      combineLatest([
        propsTarget,
        context.notificationChannel.messages(NotificationCategory.ArchivedRecordingDeleted),
      ]).subscribe(([currentTarget, event]) => {
        if (currentTarget.connectUrl != event.message.target) {
          return;
        }
        setRecordings((old) => old.filter((r) => r.name !== event.message.recording.name));
        setCheckedIndices((old) => old.filter((idx) => idx !== hashCode(event.message.recording.name)));
      })
    );
  }, [addSubscription, context.notificationChannel, setRecordings, setCheckedIndices, propsTarget]);

  React.useEffect(() => {
    addSubscription(
      combineLatest([
        propsTarget,
        context.notificationChannel.messages(NotificationCategory.RecordingMetadataUpdated),
      ]).subscribe(([currentTarget, event]) => {
        if (currentTarget.connectUrl != event.message.target) {
          return;
        }
        setRecordings((old) =>
          old.map((o) =>
            o.name == event.message.recordingName ? { ...o, metadata: { labels: event.message.metadata.labels } } : o
          )
        );
      })
    );
  }, [addSubscription, context, context.notificationChannel, setRecordings, propsTarget]);

  React.useEffect(() => {
    setFilteredRecordings(
      sortResouces(sortBy, filterRecordings(recordings, targetRecordingFilters), mapper, getTransform)
    );
  }, [sortBy, recordings, targetRecordingFilters, setFilteredRecordings]);

  React.useEffect(() => {
    if (!context.settings.autoRefreshEnabled()) {
      return;
    }
    const id = window.setInterval(
      () => refreshRecordingList(),
      context.settings.autoRefreshPeriod() * context.settings.autoRefreshUnits()
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
    [setActionLoadings]
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
            })
          );
        })
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
    [setExpandedRows]
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
    ]
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
    [checkedIndices, setShowDetailsPanel, isUploadsTable, propsDirectory, directoryRecordings]
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
    [getSortParams]
  );
  return (
    <Drawer isExpanded={showDetailsPanel} isInline id={'archived-recording-drawer'}>
      <DrawerContent panelContent={LabelsPanel} className="recordings-table-drawer-content">
        <DrawerContentBody hasPadding>
          <RecordingsTable
            tableTitle="Archived Flight Recordings"
            toolbar={RecordingsToolbar}
            tableColumns={columnConfig}
            tableFooter={
              filteredRecordings.length > 0 && (
                <TableComposable borders={false}>
                  <Tbody>
                    <Tr>
                      <Td></Td>
                      <Td width={15}>
                        <b>Total size: {formatBytes(totalArchiveSize)}</b>
                      </Td>
                    </Tr>
                  </Tbody>
                </TableComposable>
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

  const actionLoadingProps = React.useMemo<Record<ArchiveActions, LoadingPropsType>>(
    () => ({
      DELETE: {
        spinnerAriaValueText: 'Deleting',
        spinnerAriaLabel: 'deleting-archived-recording',
        isLoading: props.actionLoadings['DELETE'],
      } as LoadingPropsType,
    }),
    [props]
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
                  aria-label={'archive-recording-actions'}
                  isPlain
                  isFlipEnabled
                  onSelect={() => setActionToggleOpen(false)}
                  menuAppendTo={'parent'}
                  isOpen={actionToggleOpen}
                  toggle={<KebabToggle id="archive-recording-actions-toggle-kebab" onToggle={handleActionToggle} />}
                  dropdownItems={buttons.map((b) => b.collapsed)}
                />
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
  sourceTarget: Observable<Target>;
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

  const parsedLabels = React.useMemo(() => {
    return parseLabels(recording.metadata.labels);
  }, [recording]);

  const expandedRowId = React.useMemo(() => `archived-table-row-${index}-exp`, [index]);

  const handleToggle = React.useCallback(() => {
    toggleExpanded(expandedRowId);
  }, [expandedRowId, toggleExpanded]);

  const isExpanded = React.useMemo(() => {
    return expandedRows.includes(expandedRowId);
  }, [expandedRowId, expandedRows]);

  const handleCheck = React.useCallback(
    (checked: boolean) => {
      handleRowCheck(checked, index);
    },
    [index, handleRowCheck]
  );

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
            labels={parsedLabels}
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
    parsedLabels,
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
            <ReportFrame isExpanded={isExpanded} recording={recording} width="100%" height="640" />
          </ExpandableRowContent>
        </Td>
      </Tr>
    );
  }, [recording, index, isExpanded]);

  return (
    <Tbody key={index} isExpanded={isExpanded}>
      {parentRow}
      {childRow}
    </Tbody>
  );
};
