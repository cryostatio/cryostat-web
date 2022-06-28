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
import { Button, Checkbox, Label, Text, Toolbar, ToolbarContent, ToolbarGroup, ToolbarItem } from '@patternfly/react-core';
import { Tbody, Tr, Td, ExpandableRowContent } from '@patternfly/react-table';
import { RecordingActions } from '@app/Recordings/RecordingActions';
import { RecordingsTable } from '@app/Recordings/RecordingsTable';
import { ReportFrame } from '@app/Recordings/ReportFrame';
import { Observable, forkJoin, merge } from 'rxjs';
import { first } from 'rxjs/operators';
import { PlusIcon, UploadIcon } from '@patternfly/react-icons';
import { ArchiveUploadModal } from './ArchiveUploadModal';
import { parseLabels } from '@app/RecordingMetadata/RecordingLabel';
import { LabelCell } from '@app/RecordingMetadata/LabelCell';
import { DeleteWarningModal } from '@app/Modal/DeleteWarningModal';
import { DeleteWarningType } from '@app/Modal/DeleteWarningUtils';

export interface AllArchivedRecordingsTableProps { }

export const AllArchivedRecordingsTable: React.FunctionComponent<AllArchivedRecordingsTableProps> = () => {
  const context = React.useContext(ServiceContext);

  const [recordings, setRecordings] = React.useState([] as ArchivedRecording[]);
  const [headerChecked, setHeaderChecked] = React.useState(false);
  const [checkedIndices, setCheckedIndices] = React.useState([] as number[]);
  const [expandedRows, setExpandedRows] = React.useState([] as string[]);
  const [showUploadModal, setShowUploadModal] = React.useState(false);
  const [warningModalOpen, setWarningModalOpen] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const addSubscription = useSubscriptions();

  const tableColumns: string[] = [
    'Name',
    'Labels',
  ];

  const handleHeaderCheck = React.useCallback((event, checked) => {
    setHeaderChecked(checked);
    setCheckedIndices(checked ? Array.from(new Array(recordings.length), (x, i) => i) : []);
  }, [setHeaderChecked, setCheckedIndices, recordings]);

  const handleRowCheck = React.useCallback((checked, index) => {
    if (checked) {
      setCheckedIndices(ci => ([...ci, index]));
    } else {
      setHeaderChecked(false);
      setCheckedIndices(ci => ci.filter(v => v !== index));
    }
  }, [setCheckedIndices, setHeaderChecked]);

  const handleRecordings = React.useCallback((recordings) => {
    setRecordings(recordings);
    setIsLoading(false);
  }, [setRecordings, setIsLoading]);

  const refreshRecordingList = React.useCallback(() => {
    setIsLoading(true);
    addSubscription(
      context.api.doGet<ArchivedRecording[]>('recordings', 'v1')
      .subscribe(handleRecordings)
    );
  }, [addSubscription, context, context.api, setIsLoading, handleRecordings]);

  React.useEffect(() => {
    addSubscription(
      context.target.target().subscribe(refreshRecordingList)
    );
  }, [addSubscription, context, context.target, refreshRecordingList]);

  React.useEffect(() => {
    addSubscription(
      merge(
        context.notificationChannel.messages(NotificationCategory.ArchivedRecordingCreated),
        context.notificationChannel.messages(NotificationCategory.ActiveRecordingSaved)
      ).subscribe(v => setRecordings(old => old.concat(v.message.recording)))
    );
  }, [addSubscription, context, context.notificationChannel, setRecordings]);

  React.useEffect(() => {
    addSubscription(
      context.notificationChannel.messages(NotificationCategory.ArchivedRecordingDeleted)
        .subscribe(v => setRecordings(old => old.filter(o => o.name != v.message.recording.name)))
    )
  }, [addSubscription, context, context.notificationChannel, setRecordings]);

  React.useEffect(() => {
    addSubscription(
      context.notificationChannel.messages(NotificationCategory.RecordingMetadataUpdated)
        .subscribe(v => setRecordings(old => old.map(
          o => o.name == v.message.recordingName ? { ...o, metadata: { labels: v.message.metadata.labels } } : o)))
    );
  }, [addSubscription, context, context.notificationChannel, setRecordings]);


  const handleDeleteRecordings = () => {
    const tasks: Observable<any>[] = [];
    recordings.forEach((r: ArchivedRecording, idx) => {
      if (checkedIndices.includes(idx)) {
        handleRowCheck(false, idx);
        context.reports.delete(r);
        tasks.push(
          context.api.deleteArchivedRecording(r.name).pipe(first())
        );
      }
    });
    addSubscription(
      forkJoin(tasks).subscribe()
    );
  };

  const toggleExpanded = (id) => {
    const idx = expandedRows.indexOf(id);
    setExpandedRows(expandedRows => idx >= 0 ? [...expandedRows.slice(0, idx), ...expandedRows.slice(idx + 1, expandedRows.length)] : [...expandedRows, id]);
  };

  React.useEffect(() => {
    if (!context.settings.autoRefreshEnabled()) {
      return;
    }
    const id = window.setInterval(() => refreshRecordingList(), context.settings.autoRefreshPeriod() * context.settings.autoRefreshUnits());
    return () => window.clearInterval(id);
  }, [context, context.settings, refreshRecordingList]);

  const RecordingRow = (props) => {
    const parsedLabels = React.useMemo(() => {
      return parseLabels(props.recording.metadata.labels);
    }, [props.recording.metadata.labels]);

    const expandedRowId =`archived-table-row-${props.index}-exp`;
    const handleToggle = () => {
      toggleExpanded(expandedRowId);
    };

    const isExpanded = React.useMemo(() => {
      return expandedRows.includes(expandedRowId);
    }, [expandedRows, expandedRowId]);

    const handleCheck = (checked) => {
      handleRowCheck(checked, props.index);
    };

    const parentRow = React.useMemo(() => {
      return(
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
          <Td key={`active-table-row-${props.index}_3`} dataLabel={tableColumns[1]}>
            <LabelCell 
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
    }, [props.recording, props.recording.metadata.labels, props.recording.name, props.index, handleCheck, checkedIndices, isExpanded, handleToggle, tableColumns, context.api]);

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

  const handleDeleteButton = () => {
    if (context.settings.deletionDialogsEnabledFor(DeleteWarningType.DeleteArchivedRecordings)) {
      setWarningModalOpen(true);
    }
    else {
      handleDeleteRecordings();
    }
  }

  const RecordingsToolbar = () => {
    const deleteArchivedWarningModal = React.useMemo(() => {
      const filtered = recordings.filter((r: ArchivedRecording, idx: number) => checkedIndices.includes(idx));
      return <DeleteWarningModal 
        warningType={DeleteWarningType.DeleteArchivedRecordings}
        items={filtered.map((r) => `${r.name}`)}
        visible={warningModalOpen}
        onAccept={handleDeleteRecordings}
        onClose={() => setWarningModalOpen(false)} 
        setShowDialog={() => {context.settings.setDeletionDialogsEnabledFor(DeleteWarningType.DeleteArchivedRecordings, false)}}
        />
    }, [recordings, checkedIndices]);
    return (
      <Toolbar id="archived-recordings-toolbar">
        <ToolbarContent>
          <ToolbarGroup variant="button-group">
            <ToolbarItem>
              <Button variant="danger" onClick={handleDeleteButton} isDisabled={!checkedIndices.length}>Delete</Button>
            </ToolbarItem>
          </ToolbarGroup>
          <ToolbarGroup variant="icon-button-group">
            <ToolbarItem>
                <Button key="upload" variant="secondary" onClick={() => setShowUploadModal(true)}>
                  <UploadIcon/>
                </Button>
            </ToolbarItem>
          </ToolbarGroup>
          { deleteArchivedWarningModal }
        </ToolbarContent>
      </Toolbar>
    );
  };

  const recordingRows = React.useMemo(() => {
    return recordings.map((r, idx) => <RecordingRow key={idx} recording={r} index={idx}/>)
  }, [recordings, expandedRows, checkedIndices]);

  const handleModalClose = React.useCallback(() => {
    setShowUploadModal(false);
    refreshRecordingList();
  }, [setShowUploadModal, refreshRecordingList]);

  return (<>
    <RecordingsTable
        tableTitle="Archived Flight Recordings"
        toolbar={<RecordingsToolbar />}
        tableColumns={tableColumns}
        isHeaderChecked={headerChecked}
        onHeaderCheck={handleHeaderCheck}
        isLoading={isLoading}
        isEmpty={!recordings.length}
        errorMessage=''
    >
      {recordingRows}
    </RecordingsTable>

    <ArchiveUploadModal visible={showUploadModal} onClose={handleModalClose}/>
  </>);
};

