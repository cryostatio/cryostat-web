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
import { Recording } from '@app/Shared/Services/Api.service';
import { ServiceContext } from '@app/Shared/Services/Services';
import { useSubscriptions } from '@app/utils/useSubscriptions';
import {
  Button,
  Checkbox,
  Toolbar,
  ToolbarContent,
  ToolbarGroup,
  ToolbarItem } from '@patternfly/react-core';
import {  Tbody, Tr, Td, ExpandableRowContent } from '@patternfly/react-table';
import { RecordingActions } from './RecordingActions';
import { RecordingsDataTable } from './RecordingsDataTable';
import { ReportFrame } from './ReportFrame';
import { Observable, Subject, forkJoin } from 'rxjs';
import { first } from 'rxjs/operators';
import { PlusIcon } from '@patternfly/react-icons';
import { ArchiveUploadModal } from './ArchiveUploadModal';

interface ArchivedRecordingsTableProps {
  updater: Subject<void>;
}

export const ArchivedRecordingsTable: React.FunctionComponent<ArchivedRecordingsTableProps> = (props) => {
  const context = React.useContext(ServiceContext);

  const [recordings, setRecordings] = React.useState([] as Recording[]);
  const [headerChecked, setHeaderChecked] = React.useState(false);
  const [checkedIndices, setCheckedIndices] = React.useState([] as number[]);
  const [expandedRows, setExpandedRows] = React.useState([] as string[]);
  const [showUploadModal, setShowUploadModal] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isEmpty, setIsEmpty] = React.useState(true);
  const addSubscription = useSubscriptions();

  const tableColumns: string[] = [
    'Name'
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
    recordings.length === 0 ? setIsEmpty(true) : setIsEmpty(false);
  }, [setRecordings, setIsLoading, setIsEmpty]);

  const refreshRecordingList = React.useCallback(() => {
    setIsLoading(true);
    addSubscription(
      context.api.doGet<Recording[]>(`recordings`)
      .pipe(first())
      .subscribe(handleRecordings)
    );
  }, [addSubscription, context, context.api, setIsLoading, handleRecordings]);

  React.useEffect(() => {
    addSubscription(
      context.target.target().subscribe(refreshRecordingList)
    );
  }, [addSubscription, context, context.target, refreshRecordingList]);

  const handleDeleteRecordings = () => {
    const tasks: Observable<any>[] = [];
    recordings.forEach((r: Recording, idx) => {
      if (checkedIndices.includes(idx)) {
        handleRowCheck(false, idx);
        tasks.push(
          context.api.deleteArchivedRecording(r.name).pipe(first())
        );
      }
    });
    addSubscription(
      forkJoin(tasks).subscribe(refreshRecordingList)
    );
  };

  const toggleExpanded = (id) => {
    const idx = expandedRows.indexOf(id);
    setExpandedRows(expandedRows => idx >= 0 ? [...expandedRows.slice(0, idx), ...expandedRows.slice(idx + 1, expandedRows.length)] : [...expandedRows, id]);
  };

  React.useEffect(() => {
    const sub = props.updater.subscribe(refreshRecordingList);
    return () => sub.unsubscribe();
  }, [props.updater])

  React.useEffect(() => {
    if (!context.settings.autoRefreshEnabled()) {
      return;
    }
    const id = window.setInterval(() => refreshRecordingList(), context.settings.autoRefreshPeriod() * context.settings.autoRefreshUnits());
    return () => window.clearInterval(id);
  }, [context, context.settings, refreshRecordingList]);

  const RecordingRow = (props) => {
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
      let rowIndex = props.index;
      return(
        <Tr key={rowIndex}>
          <Td key={`${rowIndex}_0`}>
            <Checkbox
                  isChecked={checkedIndices.includes(props.index)}
                  onChange={handleCheck}
                  aria-label="checkbox"
                  id="id"
                  name={`row-${props.index}-check`}
                />
          </Td>
          <Td
              key={`${rowIndex}_1`}
              id={`active-ex-toggle-${props.index}`}
              aria-controls={`ex-expand-${props.index}`}
              expand={{
                rowIndex: rowIndex,
                isExpanded: isExpanded,
                onToggle: handleToggle,
              }}
            />
          <Td key={`${rowIndex}_2`} dataLabel={tableColumns[0]}>
            {props.recording.name}
          </Td>
          <RecordingActions recording={props.recording} index={props.index} uploadFn={() => context.api.uploadArchivedRecordingToGrafana(props.recording.name)} />
        </Tr>
      );
    }, [props.recording, props.recording.name, props.index]);

    const childRow = React.useMemo(() => {
      return (
        <Tr key={`${props.index}_child`} isExpanded={isExpanded}>
          <Td
            key={`${props.index}_automated`}
            dataLabel={"Content Details"}
            colSpan={4}
          >
            <ExpandableRowContent>
              <ReportFrame isExpanded={isExpanded} recording={props.recording} width="100%" height="640" />
            </ExpandableRowContent>
          </Td>
        </Tr>
      )
    }, [props.recording, props.recording.name, props.index]);

    return (<>
      <Tbody key={props.index} isExpanded={isExpanded[props.index]}>
        {parentRow}
        {childRow}
      </Tbody>
    </>);
  };

  const RecordingsToolbar = () => {
    return (
      <Toolbar id="archived-recordings-toolbar">
        <ToolbarContent>
          <ToolbarGroup variant="button-group">
            <ToolbarItem>
              <Button variant="danger" onClick={handleDeleteRecordings} isDisabled={!checkedIndices.length}>Delete</Button>
            </ToolbarItem>
          </ToolbarGroup>
          <ToolbarGroup variant="icon-button-group">
            <ToolbarItem>
              <Button variant="plain" aria-label="add" onClick={() => setShowUploadModal(true)}><PlusIcon /></Button>
            </ToolbarItem>
          </ToolbarGroup>
        </ToolbarContent>
      </Toolbar>
    );
  };

  const recordingRows = React.useMemo(() => {
    return recordings.map((r, idx) => <RecordingRow key={idx} recording={r} index={idx}/>)
  }, [recordings, expandedRows, checkedIndices]);

  const handleModalClose = () => {
    setShowUploadModal(false);
    refreshRecordingList();
  };

  return (<>
    <RecordingsDataTable
        tableTitle="Archived Flight Recordings"
        toolbar={<RecordingsToolbar />}
        tableColumns={tableColumns}
        isHeaderChecked={headerChecked}
        onHeaderCheck={handleHeaderCheck}
        isLoading={isLoading}
        isEmpty={isEmpty}
        errorMessage=''
    >
      {recordingRows}
    </RecordingsDataTable>

    <ArchiveUploadModal visible={showUploadModal} onClose={handleModalClose}/>
  </>);
};
