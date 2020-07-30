/*
 * Copyright (c) 2020 Red Hat, Inc.
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
import * as _ from 'lodash';
import { Recording } from '@app/Shared/Services/Api.service';
import { ServiceContext } from '@app/Shared/Services/Services';
import { Button, DataListCell, DataListCheck, DataListContent, DataListItem, DataListItemCells, DataListItemRow, DataListToggle, Spinner, Toolbar, ToolbarContent, ToolbarItem } from '@patternfly/react-core';
import { filter, map } from 'rxjs/operators';
import { RecordingActions } from './ActiveRecordingsList';
import { RecordingsDataTable } from './RecordingsDataTable';
import { ReportFrame } from './ReportFrame';
import { Subject } from 'rxjs';

interface ArchivedRecordingsListProps {
  updater: Subject<void>;
}

export const ArchivedRecordingsList: React.FunctionComponent<ArchivedRecordingsListProps> = (props) => {
  const context = React.useContext(ServiceContext);

  const [recordings, setRecordings] = React.useState([]);
  const [headerChecked, setHeaderChecked] = React.useState(false);
  const [checkedIndices, setCheckedIndices] = React.useState([] as number[]);
  const [expandedRows, setExpandedRows] = React.useState([] as string[]);
  const [openAction, setOpenAction] = React.useState(-1);

  const tableColumns: string[] = [
    'Name'
  ];

  const handleHeaderCheck = (checked) => {
    setHeaderChecked(checked);
    setCheckedIndices(checked ? Array.from(new Array(recordings.length), (x, i) => i) : []);
  };

  const handleRowCheck = (checked, index) => {
    if (checked) {
      setCheckedIndices(ci => ([...ci, index]));
    } else {
      setHeaderChecked(false);
      setCheckedIndices(ci => ci.filter(v => v !== index));
    }
  };

  const handleDeleteRecordings = () => {
    recordings.forEach((r: Recording, idx) => {
      if (checkedIndices.includes(idx)) {
        handleRowCheck(false, idx);
        context.commandChannel.sendControlMessage('delete-saved', [ r.name ]);
      }
    });
    context.commandChannel.sendControlMessage('list-saved');
  };

  const toggleExpanded = (id) => {
    const idx = expandedRows.indexOf(id);
    setExpandedRows(expandedRows => idx >= 0 ? [...expandedRows.slice(0, idx), ...expandedRows.slice(idx + 1, expandedRows.length)] : [...expandedRows, id]);
  };

  React.useEffect(() => {
    const sub = props.updater.subscribe(() => {
      context.commandChannel.sendControlMessage('list-saved');
    });
    return () => sub.unsubscribe();
  }, [props.updater])

  React.useEffect(() => {
    const sub = context.commandChannel.onResponse('list-saved')
      .pipe(
        filter(m => m.status === 0),
        map(m => m.payload),
      )
      .subscribe(newRecordings => {
        if (!_.isEqual(newRecordings, recordings)) {
          setRecordings(newRecordings);
        }
      });
    return () => sub.unsubscribe();
  }, [context.commandChannel, recordings]);

  React.useEffect(() => {
    context.commandChannel.sendControlMessage('list-saved');
    const id = setInterval(() => context.commandChannel.sendControlMessage('list-saved'), 30_000);
    return () => clearInterval(id);
  }, [context.commandChannel]);

  const RecordingRow = (props) => {
    const [reportLoaded, setReportLoaded] = React.useState(false);

    const expandedRowId =`archived-table-row-${props.index}-exp`;
    const handleToggle = () => {
      setReportLoaded(false);
      toggleExpanded(expandedRowId);
    };

    const isExpanded = React.useMemo(() => {
      return expandedRows.includes(expandedRowId);
    }, [expandedRows, expandedRowId]);

    const onLoad = () => {
      setReportLoaded(true);
    };

    const handleCheck = (checked) => {
      handleRowCheck(checked, props.index);
    };

    return (<>
      <DataListItem aria-labelledby={`table-row-${props.index}-1`} name={`row-${props.index}-check`} isExpanded={isExpanded} >
        <DataListItemRow>
          <DataListCheck aria-labelledby="table-row-1-1" name={`row-${props.index}-check`} onChange={handleCheck} isChecked={checkedIndices.includes(props.index)} />
          <DataListToggle onClick={handleToggle} isExpanded={isExpanded} id={`archived-ex-toggle-${props.index}`} aria-controls={`ex-expand-${props.index}`} />
          <DataListItemCells
            dataListCells={[
              <DataListCell key={`table-row-${props.index}-1`}>
                {props.recording.name}
              </DataListCell>
            ]}
          />
          <RecordingActions recording={props.recording} index={props.index} />
        </DataListItemRow>
        <DataListContent
          aria-label="Content Details"
          id={`archived-ex-expand-${props.index}`}
          isHidden={!isExpanded}
        >
          <ReportFrame recording={props.recording} width="100%" height="640" />
        </DataListContent>
      </DataListItem>
    </>);
  };

  const RecordingsToolbar = () => {
    return (
      <Toolbar id="archived-recordings-toolbar">
        <ToolbarContent>
          <ToolbarItem>
            <Button variant="danger" onClick={handleDeleteRecordings} isDisabled={!checkedIndices.length}>Delete</Button>
          </ToolbarItem>
        </ToolbarContent>
      </Toolbar>
    );
  };

  const recordingRows = React.useMemo(() => {
    return recordings.map((r, idx) => <RecordingRow key={idx} recording={r} index={idx}/>)
  }, [recordings, expandedRows, checkedIndices]);

  return (<>
    <RecordingsDataTable
        listTitle="Archived Flight Recordings"
        toolbar={<RecordingsToolbar />}
        tableColumns={tableColumns}
        isHeaderChecked={headerChecked}
        onHeaderCheck={handleHeaderCheck}
    >
      {
        recordingRows
      }
    </RecordingsDataTable>
  </>);
};
