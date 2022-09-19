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
import { ArchivedRecording } from '@app/Shared/Services/Api.service';
import { ServiceContext } from '@app/Shared/Services/Services';
import { NotificationCategory } from '@app/Shared/Services/NotificationChannel.service';
import { useSubscriptions } from '@app/utils/useSubscriptions';
import { Button, Checkbox, Drawer, DrawerContent, DrawerContentBody, Toolbar, ToolbarContent, ToolbarGroup, ToolbarItem } from '@patternfly/react-core';
import { Tbody, Tr, Td, ExpandableRowContent } from '@patternfly/react-table';
import { PlusIcon } from '@patternfly/react-icons';
import { RecordingActions } from './RecordingActions';
import { RecordingsTable } from './RecordingsTable';
import { ReportFrame } from './ReportFrame';
import { Observable, forkJoin, merge, combineLatest } from 'rxjs';
import { concatMap, filter, first, map } from 'rxjs/operators';
import { NO_TARGET, Target } from '@app/Shared/Services/Target.service';
import { parseLabels } from '@app/RecordingMetadata/RecordingLabel';
import { LabelCell } from '../RecordingMetadata/LabelCell';
import { RecordingLabelsPanel } from './RecordingLabelsPanel';
import { DeleteWarningModal } from '@app/Modal/DeleteWarningModal';
import { DeleteWarningType } from '@app/Modal/DeleteWarningUtils';
import { emptyArchivedRecordingFilters, RecordingFiltersCategories } from './RecordingFilters';
import { filterRecordings, RecordingFilters } from './RecordingFilters';
import { ArchiveUploadModal } from '@app/Archives/ArchiveUploadModal';
import { useDispatch, useSelector } from 'react-redux';
import { TargetRecordingFilters, UpdateFilterOptions } from '@app/Shared/Redux/RecordingFilterReducer';
import { addFilterIntent, addTargetIntent, deleteAllFiltersIntent, deleteCategoryFiltersIntent, deleteFilterIntent } from '@app/Shared/Redux/RecordingFilterActions';
import { RootState, StateDispatch } from '@app/Shared/Redux/ReduxStore';

export interface ArchivedRecordingsTableProps { 
  target: Observable<Target>;
  isUploadsTable: boolean;
  isNestedTable: boolean;
}


export const ArchivedRecordingsTable: React.FunctionComponent<ArchivedRecordingsTableProps> = (props) => {
  const context = React.useContext(ServiceContext);
  const addSubscription = useSubscriptions();
  const dispatch = useDispatch<StateDispatch>();
  
  const [target, setTarget] = React.useState(""); // connectURL of the target
  const [recordings, setRecordings] = React.useState([] as ArchivedRecording[]);
  const [filteredRecordings, setFilteredRecordings] = React.useState([] as ArchivedRecording[]);
  const [headerChecked, setHeaderChecked] = React.useState(false);
  const [checkedIndices, setCheckedIndices] = React.useState([] as number[]);
  const [expandedRows, setExpandedRows] = React.useState([] as string[]);
  const [showUploadModal, setShowUploadModal] = React.useState(false);
  const [showDetailsPanel, setShowDetailsPanel] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  
  const targetRecordingFilters = useSelector((state: RootState) => {
    const filters = state.recordingFilters.list.filter((targetFilter: TargetRecordingFilters) => targetFilter.target === target);
    return filters.length > 0? filters[0].archived.filters: emptyArchivedRecordingFilters;
  }) as RecordingFiltersCategories;

  const tableColumns: string[] = [
    'Name',
    'Labels',
  ];

  const handleHeaderCheck = React.useCallback((event, checked) => {
    setHeaderChecked(checked);
    setCheckedIndices(checked ? filteredRecordings.map((r) => convertToNumber(r.name)) : []);
  }, [setHeaderChecked, setCheckedIndices, filteredRecordings]);

  const handleRowCheck = React.useCallback((checked, index) => {
    if (checked) {
      setCheckedIndices(ci => ([...ci, index]));
    } else {
      setHeaderChecked(false);
      setCheckedIndices(ci => ci.filter(v => v !== index));
    }
  }, [setCheckedIndices, setHeaderChecked]);

  const handleEditLabels = React.useCallback(() => {
    setShowDetailsPanel(true);
  }, [setShowDetailsPanel]);

  const handleRecordings = React.useCallback((recordings) => {
    setRecordings(recordings);
    setIsLoading(false);
  }, [setRecordings, setIsLoading]);

  const queryTargetRecordings = React.useCallback((connectUrl: string) => {
    return context.api.graphql<any>(`
      query {
        archivedRecordings(filter: { sourceTarget: "${connectUrl}" }) {
          name
          downloadUrl
          reportUrl
          metadata {
            labels
          }
        }
      }`)
  }, [context.api, context.api.graphql]);

  const queryUploadedRecordings = React.useCallback(() => {
    return context.api.graphql<any>(`
      query {
        archivedRecordings(filter: { sourceTarget: "uploads" }) {
          name
          downloadUrl
          reportUrl
          metadata {
            labels
          }
        }
      }`)
  }, [context.api, context.api.graphql])

  const refreshRecordingList = React.useCallback(() => {
    setIsLoading(true);
    if (props.isUploadsTable) {
      addSubscription(
        queryUploadedRecordings()
          .pipe(
            map(v => v.data.archivedRecordings as ArchivedRecording[])
          )
        .subscribe(handleRecordings)
      );
    } else {
      addSubscription(
        props.target
        .pipe(
          filter(target => target !== NO_TARGET),
          first(),
          concatMap(target =>
            queryTargetRecordings(target.connectUrl)
          ),
          map(v => v.data.archivedRecordings as ArchivedRecording[]),
        )
        .subscribe(handleRecordings)
      );
    }
  }, [addSubscription, context, context.api, setIsLoading, handleRecordings]);

  const handleClearFilters = React.useCallback(() => {
    dispatch(deleteAllFiltersIntent(target, true));
  }, [dispatch, target]);
  
  const updateFilters = React.useCallback((target, {filterValue, filterKey, deleted = false, deleteOptions}) => {
    if (deleted) {
      if (deleteOptions && deleteOptions.all) {
        dispatch(deleteCategoryFiltersIntent(target, filterKey, true));
      } else {
        dispatch(deleteFilterIntent(target, filterKey, filterValue, true));
      }
    } else {
      dispatch(addFilterIntent(target, filterKey, filterValue, true));
    }
  }, [dispatch]);

  React.useEffect(() => {
    addSubscription(
      props.target.subscribe((target) => {
        setTarget(target.connectUrl);
        dispatch(addTargetIntent(target.connectUrl));
        refreshRecordingList();
      })
    );
  }, [addSubscription, refreshRecordingList, dispatch, setTarget]);

  React.useEffect(() => {
    addSubscription(
      combineLatest([
        props.target,
        merge(
          context.notificationChannel.messages(NotificationCategory.ArchivedRecordingCreated),
          context.notificationChannel.messages(NotificationCategory.ActiveRecordingSaved),
        ),
      ])
      .subscribe(parts => {
        const currentTarget = parts[0];
        const event = parts[1];
        if (currentTarget.connectUrl != event.message.target) {
          return;
        }
        setRecordings(old => old.concat(event.message.recording));
      })
    );
  }, [addSubscription, context, context.notificationChannel, setRecordings]);

  React.useEffect(() => {
    addSubscription(
      combineLatest([
        props.target,
        context.notificationChannel.messages(NotificationCategory.ArchivedRecordingDeleted),
      ])
        .subscribe(parts => {
          const currentTarget = parts[0];
          const event = parts[1];
          if (currentTarget.connectUrl != event.message.target) {
            return;
          }

          setRecordings((old) =>  old.filter((r) => r.name !== event.message.recording.name));
          setCheckedIndices(old => old.filter((idx) => idx !==  convertToNumber(event.message.recording.name)));
      })
    );
  }, [addSubscription, context, context.notificationChannel, setRecordings, setCheckedIndices]);

  React.useEffect(() => {
    addSubscription(
      combineLatest([
        context.target.target(),
      context.notificationChannel.messages(NotificationCategory.RecordingMetadataUpdated)
      ])
      .subscribe(parts => {
        const currentTarget = parts[0];
        const event = parts[1];
        if (currentTarget.connectUrl != event.message.target) {
          return;
        }
        setRecordings(old => old.map(
          o => o.name == event.message.recordingName 
            ? { ...o, metadata: { labels: event.message.metadata.labels } } 
            : o));
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
    const id = window.setInterval(() => refreshRecordingList(), context.settings.autoRefreshPeriod() * context.settings.autoRefreshUnits());
    return () => window.clearInterval(id);
  }, [context, context.settings, refreshRecordingList]);

  React.useEffect(() => {
    setCheckedIndices((ci) => {
      const filteredRecordingIdx = new Set(filteredRecordings.map((r) => convertToNumber(r.name)));
      return ci.filter((idx) => filteredRecordingIdx.has(idx));
    });
  }, [filteredRecordings, setCheckedIndices]);

  React.useEffect(() => {
    setHeaderChecked(checkedIndices.length === filteredRecordings.length);
  }, [setHeaderChecked, checkedIndices]);

  const handleDeleteRecordings = React.useCallback(() => {
    const tasks: Observable<any>[] = [];
    filteredRecordings.forEach((r: ArchivedRecording) => {
      if (checkedIndices.includes(convertToNumber(r.name))) {
        context.reports.delete(r);
        tasks.push(
          context.api.deleteArchivedRecording(r.name).pipe(first())
        );
      }
    });
    addSubscription(
      forkJoin(tasks).subscribe()
    );
  }, [filteredRecordings, checkedIndices, context.reports, context.api, addSubscription]);
 
  const toggleExpanded = React.useCallback(
    (id: string) => {
      setExpandedRows((expandedRows) => {
        const idx = expandedRows.indexOf(id);
        return idx >= 0 ? [...expandedRows.slice(0, idx), ...expandedRows.slice(idx + 1, expandedRows.length)] : [...expandedRows, id]
      });
    }, [setExpandedRows]
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

    const handleCheck = React.useCallback((checked) => {
      handleRowCheck(checked, props.index);
    }, [handleRowCheck, props.index]);

    const parentRow = React.useMemo(() => {
      return(
        <Tr key={`${props.index}_parent`} >
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
          <Td key={`active-table-row-${props.index}_3`} dataLabel={tableColumns[1]}>
            <LabelCell
              target={target}
              updateFilters={updateFilters}
              labelFilters={props.labelFilters}
              labels={parsedLabels} 
            />
          </Td>
          <RecordingActions
            recording={props.recording}
            index={props.index}
            uploadFn={() => context.api.uploadArchivedRecordingToGrafana(props.recording.name)}
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
      target
    ]);

    const childRow = React.useMemo(() => {
      return (
        <Tr key={`${props.index}_child`} isExpanded={isExpanded}>
          <Td
            key={`archived-ex-expand-${props.index}`}
            dataLabel={"Content Details"}
            colSpan={tableColumns.length + 3}
          >
          <ExpandableRowContent>
            <ReportFrame isExpanded={isExpanded} recording={props.recording} width="100%" height="640" />
          </ExpandableRowContent>
          </Td>
        </Tr>
      )
    }, [props.recording, props.recording.name, props.index, isExpanded, tableColumns]);

    return (
      <Tbody key={props.index} isExpanded={isExpanded[props.index]}>
        {parentRow}
        {childRow}
      </Tbody>
    );
  };

  const RecordingsToolbar = React.useMemo(() => (
    <ArchivedRecordingsToolbar 
      target={target}
      checkedIndices={checkedIndices}
      targetRecordingFilters={targetRecordingFilters}
      recordings={recordings}
      filteredRecordings={filteredRecordings}
      updateFilters={updateFilters}
      handleClearFilters={handleClearFilters}
      handleEditLabels={handleEditLabels}
      handleDeleteRecordings={handleDeleteRecordings}
      deletionDialogsEnabled={context.settings.deletionDialogsEnabledFor(DeleteWarningType.DeleteArchivedRecordings)} 
      handleShowUploadModal={() => setShowUploadModal(true)} 
      isUploadsTable={props.isUploadsTable}/>
  ), [
    target,
    checkedIndices,
    targetRecordingFilters, 
    recordings, 
    filteredRecordings,
    updateFilters,
    handleClearFilters,
    handleEditLabels, 
    handleDeleteRecordings,
    context,
    context.settings,
    context.settings.deletionDialogsEnabledFor,
    setShowUploadModal,
    props.isUploadsTable
  ]);

  const recordingRows = React.useMemo(() => {
    return filteredRecordings.map((r) => <RecordingRow key={r.name} recording={r} labelFilters={targetRecordingFilters.Labels} index={convertToNumber(r.name)}/>)
  }, [filteredRecordings, expandedRows, checkedIndices]);

  const handleModalClose = React.useCallback(() => {
    setShowUploadModal(false);
    refreshRecordingList();
  }, [setShowUploadModal, refreshRecordingList]);

  const LabelsPanel = React.useMemo(() => (
    <RecordingLabelsPanel
      setShowPanel={setShowDetailsPanel}  
      isTargetRecording={false}
      checkedIndices={checkedIndices}
    />
  ), [checkedIndices, setShowDetailsPanel]);

  return (
    <Drawer isExpanded={showDetailsPanel} isInline>
      <DrawerContent panelContent={LabelsPanel} className='recordings-table-drawer-content'>
        <DrawerContentBody hasPadding>
          <RecordingsTable
              tableTitle="Archived Flight Recordings"
              toolbar={RecordingsToolbar}
              tableColumns={tableColumns}
              isHeaderChecked={headerChecked}
              onHeaderCheck={handleHeaderCheck}
              isLoading={isLoading}
              isEmpty={!recordings.length}
              isEmptyFilterResult={!filteredRecordings.length}
              clearFilters={handleClearFilters}
              isNestedTable={props.isNestedTable}
              errorMessage=''
          >
            {recordingRows}
          </RecordingsTable>

          {props.isUploadsTable ?
            <ArchiveUploadModal visible={showUploadModal} onClose={handleModalClose}/>
          :
            null
          }
        </DrawerContentBody>
      </DrawerContent>
    </Drawer>
  );
};

export const convertToNumber = (recordingName: string): number => {
  let hash = 0;
  for (let i = 0; i < recordingName.length; i++) {
    hash = ((hash << 5) - hash) + recordingName.charCodeAt(i);
    hash |= 0; // Force 32-bit number
  }
  return hash;
};

export interface ArchivedRecordingsToolbarProps {
  target: string,
  checkedIndices: number[],
  targetRecordingFilters: RecordingFiltersCategories,
  recordings: ArchivedRecording[],
  filteredRecordings: ArchivedRecording[],
  updateFilters: (target: string, updateFilterOptions: UpdateFilterOptions) => void,
  handleClearFilters: () => void,
  handleEditLabels: () => void,
  handleDeleteRecordings: () => void,
  handleShowUploadModal: () => void,
  deletionDialogsEnabled: boolean,
  isUploadsTable: boolean
}

const ArchivedRecordingsToolbar: React.FunctionComponent<ArchivedRecordingsToolbarProps> = (props) => {
  const [warningModalOpen, setWarningModalOpen] = React.useState(false);
  
  const handleWarningModalClose = React.useCallback(() => {
    setWarningModalOpen(false);
  }, [setWarningModalOpen]);

  const handleDeleteButton = React.useCallback(() => {
    if (props.deletionDialogsEnabled) {
      setWarningModalOpen(true);
    } else {
      props.handleDeleteRecordings();
    }
  }, [props.deletionDialogsEnabled, setWarningModalOpen, props.handleDeleteRecordings]);

  const deleteArchivedWarningModal = React.useMemo(() => {
    return <DeleteWarningModal 
      warningType={DeleteWarningType.DeleteArchivedRecordings}
      visible={warningModalOpen}
      onAccept={props.handleDeleteRecordings}
      onClose={handleWarningModalClose}
    />
  }, [warningModalOpen, props.handleDeleteRecordings, handleWarningModalClose]);

  return (
    <Toolbar id="archived-recordings-toolbar" clearAllFilters={props.handleClearFilters}>
        <ToolbarContent>
          <RecordingFilters
            target={props.target}
            isArchived={true}
            recordings={props.recordings} 
            filters={props.targetRecordingFilters} 
            updateFilters={props.updateFilters} />
          <ToolbarGroup variant="button-group">
            <ToolbarItem>
              <Button key="edit labels" variant="secondary" onClick={props.handleEditLabels} isDisabled={!props.checkedIndices.length}>Edit Labels</Button>
            </ToolbarItem>
            <ToolbarItem>
              <Button variant="danger" onClick={handleDeleteButton} isDisabled={!props.checkedIndices.length}>Delete</Button>
            </ToolbarItem>
          </ToolbarGroup>
          { deleteArchivedWarningModal }
          {props.isUploadsTable ? 
            <ToolbarGroup variant="icon-button-group">
              <ToolbarItem>
                <Button variant="plain" aria-label="add" onClick={props.handleShowUploadModal}><PlusIcon /></Button>
              </ToolbarItem>
            </ToolbarGroup>
          :
            null
          }
        </ToolbarContent>
      </Toolbar>
  );
};
