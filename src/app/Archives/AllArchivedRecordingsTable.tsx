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
import * as React from 'react';
import { ArchivedRecording, UPLOADS_SUBDIRECTORY } from '@app/Shared/Services/Api.service';
import { ServiceContext } from '@app/Shared/Services/Services';
import { NotificationCategory } from '@app/Shared/Services/NotificationChannel.service';
import { useSubscriptions } from '@app/utils/useSubscriptions';
import {
  Button,
  Checkbox,
  Drawer,
  DrawerContent,
  DrawerContentBody,
  Toolbar,
  ToolbarContent,
  ToolbarGroup,
  ToolbarItem,
  Text,
  TextVariants,
  FlexItem,
  Flex,
  Chip,
  Badge,
} from '@patternfly/react-core';
import { Tbody, Tr, Td, ExpandableRowContent, TableComposable } from '@patternfly/react-table';
import { PlusIcon } from '@patternfly/react-icons';

import { Observable, forkJoin, merge, combineLatest, of } from 'rxjs';
import { concatMap, filter, first, map } from 'rxjs/operators';
import { NO_TARGET, Target } from '@app/Shared/Services/Target.service';
import { parseLabels } from '@app/RecordingMetadata/RecordingLabel';
import { LabelCell } from '../RecordingMetadata/LabelCell';

import { DeleteWarningModal } from '@app/Modal/DeleteWarningModal';
import { DeleteWarningType } from '@app/Modal/DeleteWarningUtils';

import { ArchiveUploadModal } from '@app/Archives/ArchiveUploadModal';
import { useDispatch, useSelector } from 'react-redux';
import { TargetRecordingFilters, UpdateFilterOptions } from '@app/Shared/Redux/RecordingFilterReducer';
import {
  addFilterIntent,
  addTargetIntent,
  deleteAllFiltersIntent,
  deleteCategoryFiltersIntent,
  deleteFilterIntent,
} from '@app/Shared/Redux/RecordingFilterActions';
import { RootState, StateDispatch } from '@app/Shared/Redux/ReduxStore';
import { formatBytes, hashCode } from '@app/utils/utils';
import { RecordingActions } from '@app/Recordings/RecordingActions';
import { ReportFrame } from '@app/Recordings/ReportFrame';
import { RecordingLabelsPanel } from '@app/Recordings/RecordingLabelsPanel';
import { RecordingsTable } from '@app/Recordings/RecordingsTable';
import { emptyArchivedRecordingFilters, filterRecordings, RecordingFilters, RecordingFiltersCategories } from '@app/Recordings/RecordingFilters';

export interface AllArchivedRecordingsTableProps {
  isUploadsTable: boolean;
  isNestedTable: boolean;
}

export const AllArchivedRecordingsTable: React.FunctionComponent<AllArchivedRecordingsTableProps> = (props) => {
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

  const targetRecordingFilters = useSelector((state: RootState) => {
    const filters = state.recordingFilters.list.filter(
      (targetFilter: TargetRecordingFilters) => targetFilter.target === targetConnectURL
    );
    return filters.length > 0 ? filters[0].archived.filters : emptyArchivedRecordingFilters;
  }) as RecordingFiltersCategories;

  const tableColumns: string[] = ['Name', 'Labels', 'Size'];

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
      console.log(recordings)
      setRecordings(recordings);
      setIsLoading(false);
    },
    [setRecordings, setIsLoading]
  );

  const refreshRecordingList = React.useCallback(() => {
    setIsLoading(true);
      addSubscription(
        context.api.doGet<ArchivedRecording[]>(`recordings`)
          .subscribe(handleRecordings)
      );
  }, [addSubscription, context.api, setIsLoading, handleRecordings]);

  const handleClearFilters = React.useCallback(() => {
    dispatch(deleteAllFiltersIntent(targetConnectURL, true));
  }, [dispatch, deleteAllFiltersIntent, targetConnectURL]);

  const updateFilters = React.useCallback(
    (target, { filterValue, filterKey, deleted = false, deleteOptions }) => {
      if (deleted) {
        if (deleteOptions && deleteOptions.all) {
          dispatch(deleteCategoryFiltersIntent(target, filterKey, true));
        } else {
          dispatch(deleteFilterIntent(target, filterKey, filterValue, true));
        }
      } else {
        dispatch(addFilterIntent(target, filterKey, filterValue, true));
      }
    },
    [dispatch, deleteCategoryFiltersIntent, deleteFilterIntent, addFilterIntent]
  );

  // React.useEffect(() => {
  //   addSubscription(
  //     combineLatest([
  //       props.target,
  //       merge(
  //         context.notificationChannel.messages(NotificationCategory.ArchivedRecordingCreated),
  //         context.notificationChannel.messages(NotificationCategory.ActiveRecordingSaved)
  //       ),
  //     ]).subscribe((parts) => {
  //       const currentTarget = parts[0];
  //       const event = parts[1];
  //       if (currentTarget.connectUrl != event.message.target) {
  //         return;
  //       }
  //       setRecordings((old) => old.concat(event.message.recording));
  //     })
  //   );
  // }, [addSubscription, context, context.notificationChannel, setRecordings]);

  React.useEffect(() => {
    addSubscription(
        context.notificationChannel.messages(NotificationCategory.ArchivedRecordingDeleted)
      .subscribe((evt) => {
        setRecordings((old) => old.filter((r) => r.name !== evt.message.recording.name));
        setCheckedIndices((old) => old.filter((idx) => idx !== hashCode(evt.message.recording.name)));
      })
    );
  }, [addSubscription, context, context.notificationChannel, setRecordings, setCheckedIndices]);

  React.useEffect(() => {
    addSubscription(
        context.notificationChannel.messages(NotificationCategory.RecordingMetadataUpdated)
        .subscribe((evt) => {
        setRecordings((old) =>
          old.map((o) =>
            o.name == evt.message.recordingName ? { ...o, metadata: { labels: evt.message.metadata.labels } } : o
          )
        );
      })
    );
  }, [addSubscription, context, context.notificationChannel, setRecordings]);

  React.useEffect(() => {
    setFilteredRecordings(filterRecordings(recordings, targetRecordingFilters));
  }, [recordings, targetRecordingFilters, setFilteredRecordings, filterRecordings]);

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
  }, [setHeaderChecked, checkedIndices]);

  const handleDeleteRecordings = React.useCallback(() => {
    const tasks: Observable<any>[] = [];
        filteredRecordings.forEach((r: ArchivedRecording) => {
          if (checkedIndices.includes(hashCode(r.name))) {
            context.reports.delete(r);
            tasks.push(context.api.deleteAllArchivedRecording(r.name).pipe(first()));
          }
        }
    );
    addSubscription(forkJoin(tasks).subscribe());
  }, [filteredRecordings, checkedIndices, context.reports, context.api, addSubscription]);

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

  const RecordingRow = (props) => {
    const parsedLabels = React.useMemo(() => {
      return parseLabels(props.recording.metadata.labels);
    }, [props.recording.metadata.labels]);

    const expandedRowId = React.useMemo(() => `archived-table-row-${props.index}-exp`, [props.index]);
    const handleToggle = React.useCallback(() => {
      toggleExpanded(expandedRowId);
    }, [toggleExpanded, expandedRowId]);

    const isExpanded = React.useMemo(() => {
      return expandedRows.includes(expandedRowId);
    }, [expandedRows, expandedRowId]);

    const handleCheck = React.useCallback(
      (checked) => {
        handleRowCheck(checked, props.index);
      },
      [handleRowCheck, props.index]
    );

    const parentRow = React.useMemo(() => {
      return (
        <Tr key={`${props.index}_parent`}>
          <Td key={`archived-table-row-${props.index}_0`}>
            <Checkbox
              name={`archived-table-row-${props.index}-check`}
              onChange={handleCheck}
              isChecked={checkedIndices.includes(props.index)}
              id={`archived-table-row-${props.index}-check`}
            />
          </Td>
          <Td
            key={`archived-table-row-${props.index}_1`}
            id={`archived-ex-toggle-${props.index}`}
            aria-controls={`archived-ex-expand-${props.index}`}
            expand={{
              rowIndex: props.index,
              isExpanded: isExpanded,
              onToggle: handleToggle,
            }}
          />
          <Td key={`archived-table-row-${props.index}_2`} dataLabel={tableColumns[0]}>
            {props.recording.name}
          </Td>
          <Td key={`active-table-row-${props.index}_3`} dataLabel={tableColumns[2]}>
            <LabelCell
              target={targetConnectURL}
              clickableOptions={{
                updateFilters: updateFilters,
                labelFilters: props.labelFilters,
              }}
              labels={parsedLabels}
            />
          </Td>
          <Td key={`archived-table-row-${props.index}_4`} dataLabel={tableColumns[1]}>
            {formatBytes(props.recording.size)}
          </Td>
          <RecordingActions
            recording={props.recording}
            index={props.index}
            uploadFn={() => of(true)}
          />
        </Tr>
      );
    }, [
      props.recording,
      props.recording.metadata.labels,
      props.recording.name,
      props.index,
      props.labelFilters,
      checkedIndices,
      isExpanded,
      handleCheck,
      handleToggle,
      updateFilters,
      tableColumns,
      parsedLabels,
      context.api,
      context.api.uploadArchivedRecordingToGrafana,
      targetConnectURL,
    ]);

    const childRow = React.useMemo(() => {
      return (
        <Tr key={`${props.index}_child`} isExpanded={isExpanded}>
          <Td key={`archived-ex-expand-${props.index}`} dataLabel={'Content Details'} colSpan={tableColumns.length + 3}>
            <ExpandableRowContent>
              <ReportFrame isExpanded={isExpanded} recording={props.recording} width="100%" height="640" />
            </ExpandableRowContent>
          </Td>
        </Tr>
      );
    }, [props.recording, props.recording.name, props.index, isExpanded, tableColumns]);

    return (
      <Tbody key={props.index} isExpanded={isExpanded[props.index]}>
        {parentRow}
        {childRow}
      </Tbody>
    );
  };

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
      props.isUploadsTable,
    ]
  );

  const recordingRows = React.useMemo(() => {
    return filteredRecordings.map((r) => (
      <RecordingRow
        key={r.name}
        recording={r}
        labelFilters={targetRecordingFilters.Label}
        index={hashCode(r.name)}
        sourceTarget={UPLOADS_SUBDIRECTORY}
      />
    ));
  }, [filteredRecordings, expandedRows, checkedIndices]);

  const LabelsPanel = React.useMemo(
    () => (
      <RecordingLabelsPanel
        setShowPanel={setShowDetailsPanel}
        isTargetRecording={false}
        isUploadsTable={false}
        checkedIndices={checkedIndices}
      />
    ),
    [checkedIndices, setShowDetailsPanel]
  );

  const totalArchiveSize = React.useMemo(() => {
    let size = 0;
    filteredRecordings.forEach((r) => (size += r.size));
    return size;
  }, [filteredRecordings]);

  return (
    <Drawer isExpanded={showDetailsPanel} isInline id={'archived-recording-drawer'}>
      <DrawerContent panelContent={LabelsPanel} className="recordings-table-drawer-content">
        <DrawerContentBody hasPadding>
          <RecordingsTable
            tableTitle="Archived Flight Recordings"
            toolbar={RecordingsToolbar}
            tableColumns={tableColumns}
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
            isNestedTable={false}
            errorMessage={''}
          >
            {recordingRows}
          </RecordingsTable>
        </DrawerContentBody>
      </DrawerContent>
    </Drawer>
  );
};
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
}

const ArchivedRecordingsToolbar: React.FunctionComponent<ArchivedRecordingsToolbarProps> = (props) => {
  const context = React.useContext(ServiceContext);
  const [warningModalOpen, setWarningModalOpen] = React.useState(false);

  const deletionDialogsEnabled = React.useMemo(
    () => context.settings.deletionDialogsEnabledFor(DeleteWarningType.DeleteArchivedRecordings),
    [context, context.settings, context.settings.deletionDialogsEnabledFor]
  );

  const handleWarningModalClose = React.useCallback(() => {
    setWarningModalOpen(false);
  }, [setWarningModalOpen]);

  const handleDeleteButton = React.useCallback(() => {
    if (deletionDialogsEnabled) {
      setWarningModalOpen(true);
    } else {
      props.handleDeleteRecordings();
    }
  }, [deletionDialogsEnabled, setWarningModalOpen, props.handleDeleteRecordings]);

  const deleteArchivedWarningModal = React.useMemo(() => {
    return (
      <DeleteWarningModal
        warningType={DeleteWarningType.DeleteArchivedRecordings}
        visible={warningModalOpen}
        onAccept={props.handleDeleteRecordings}
        onClose={handleWarningModalClose}
      />
    );
  }, [warningModalOpen, props.handleDeleteRecordings, handleWarningModalClose]);

  return (
    <Toolbar id="archived-recordings-toolbar" clearAllFilters={props.handleClearFilters}>
      <ToolbarContent>
        <RecordingFilters
          target={props.target}
          isArchived={true}
          recordings={props.recordings}
          filters={props.targetRecordingFilters}
          updateFilters={props.updateFilters}
        />
        <ToolbarGroup variant="button-group">
          <ToolbarItem>
            <Button
              key="edit labels"
              variant="secondary"
              onClick={props.handleEditLabels}
              isDisabled={!props.checkedIndices.length}
            >
              Edit Labels
            </Button>
          </ToolbarItem>
          <ToolbarItem>
            <Button variant="danger" onClick={handleDeleteButton} isDisabled={!props.checkedIndices.length}>
              Delete
            </Button>
          </ToolbarItem>
        </ToolbarGroup>
        {deleteArchivedWarningModal}
      </ToolbarContent>
    </Toolbar>
  );
};
