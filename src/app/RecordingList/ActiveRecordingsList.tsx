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
import { NotificationsContext } from '@app/Notifications/Notifications';
import { Recording, RecordingState } from '@app/Shared/Services/Api.service';
import { ServiceContext } from '@app/Shared/Services/Services';
import { Button, DataListAction, DataListCell, DataListCheck, DataListContent, DataListItem, DataListItemCells, DataListItemRow, DataListToggle, Dropdown, DropdownItem, DropdownPosition, KebabToggle, Text, Toolbar, ToolbarContent, ToolbarItem } from '@patternfly/react-core';
import { useHistory, useRouteMatch } from 'react-router-dom';
import { filter, first, map } from 'rxjs/operators';
import { RecordingsDataTable } from './RecordingsDataTable';
import { ReportFrame } from './ReportFrame';

export interface ActiveRecordingsListProps {
  archiveEnabled: boolean;
}

export const ActiveRecordingsList: React.FunctionComponent<ActiveRecordingsListProps> = (props) => {
  const context = React.useContext(ServiceContext);
  const routerHistory = useHistory();

  const [recordings, setRecordings] = React.useState([]);
  const [headerChecked, setHeaderChecked] = React.useState(false);
  const [checkedIndices, setCheckedIndices] = React.useState([] as number[]);
  const [expandedRows, setExpandedRows] = React.useState([] as string[]);
  const { url } = useRouteMatch();

  const tableColumns: string[] = [
    'Name',
    'Start Time',
    'Duration',
    'State',
  ];

  const handleRowCheck = (checked, index) => {
    if (checked) {
      setCheckedIndices(ci => ([...ci, index]));
    } else {
      setHeaderChecked(false);
      setCheckedIndices(ci => ci.filter(v => v !== index));
    }
  };

  const handleHeaderCheck = (checked) => {
    setHeaderChecked(checked);
    setCheckedIndices(checked ? Array.from(new Array(recordings.length), (x, i) => i) : []);
  };

  const handleCreateRecording = () => {
    routerHistory.push(`${url}/create`);
  };

  const handleArchiveRecordings = () => {
    recordings.forEach((r: Recording, idx) => {
      if (checkedIndices.includes(idx)) {
        handleRowCheck(false, idx);
        context.commandChannel.sendMessage('save', [ r.name ]);
      }
    });
  };

  const handleStopRecordings = () => {
    recordings.forEach((r: Recording, idx) => {
      if (checkedIndices.includes(idx)) {
        handleRowCheck(false, idx);
        if (r.state === RecordingState.RUNNING || r.state === RecordingState.STARTING) {
          context.commandChannel.sendMessage('stop', [ r.name ]);
        }
      }
    });
    context.commandChannel.sendMessage('list');
  };

  const handleDeleteRecordings = () => {
    recordings.forEach((r: Recording, idx) => {
      if (checkedIndices.includes(idx)) {
        handleRowCheck(false, idx);
        context.commandChannel.sendMessage('delete', [ r.name ]);
      }
    });
    context.commandChannel.sendMessage('list');
  };

  React.useEffect(() => {
    const sub = context.commandChannel.onResponse('list')
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
    context.commandChannel.sendMessage('list');
    const id = setInterval(() => context.commandChannel.sendMessage('list'), 30_000);
    return () => clearInterval(id);
  }, [context.commandChannel]);

  const RecordingRow = (props) => {
    const expandedRowId =`active-table-row-${props.index}-exp`;
    const handleToggle = () => {
      toggleExpanded(expandedRowId);
    };

    const isExpanded = React.useMemo(() => {
      return expandedRows.includes(expandedRowId)
    }, [expandedRows, expandedRowId]);

    const handleCheck = (checked) => {
      handleRowCheck(checked, props.index);
    };

    const listColumns = React.useMemo(() => {
      const ISOTime = (props) => {
        const fmt = new Date(props.timeStr).toISOString();
        return (<span>{fmt}</span>);
      };

      const RecordingDuration = (props) => {
        const str = props.duration === 0 ? 'Continuous' : `${props.duration / 1000}s`
        return (<span>{str}</span>);
      };

      return <>
        <DataListCell key={`table-row-${props.index}-1`}>
          {props.recording.name}
        </DataListCell>
        <DataListCell key={`table-row-${props.index}-2`}>
          <ISOTime timeStr={props.recording.startTime} />
        </DataListCell>
        <DataListCell key={`table-row-${props.index}-3`}>
          <RecordingDuration duration={props.recording.duration} />
        </DataListCell>
        <DataListCell key={`table-row-${props.index}-4`}>
          {props.recording.state}
        </DataListCell>
      </>
    }, [props.recording]);

    return (
      <DataListItem aria-labelledby={`table-row-${props.index}-1`} isExpanded={isExpanded} >
        <DataListItemRow>
          <DataListCheck aria-labelledby="table-row-1-1" name={`row-${props.index}-check`} onChange={handleCheck} isChecked={checkedIndices.includes(props.index)} />
          <DataListToggle onClick={handleToggle} isExpanded={isExpanded} id={`active-ex-toggle-${props.index}`} aria-controls={`ex-expand-${props.index}`} />
          <DataListItemCells
            dataListCells={listColumns}
          />
          <RecordingActions index={props.index} recording={props.recording} />
        </DataListItemRow>
        <DataListContent
          aria-label="Content Details"
          id={`active-ex-expand-${props.index}`}
          isHidden={!isExpanded}
        >
          <ReportFrame recording={props.recording} width="100%" height="640" />
        </DataListContent>
      </DataListItem>
    );
  };

  const toggleExpanded = (id) => {
    const idx = expandedRows.indexOf(id);
    setExpandedRows(expandedRows => idx >= 0 ? [...expandedRows.slice(0, idx), ...expandedRows.slice(idx + 1, expandedRows.length)] : [...expandedRows, id]);
  };

  const RecordingsToolbar = () => {
    const isStopDisabled = React.useMemo(() => {
      if (!checkedIndices.length) {
        return true;
      }
      const filtered = recordings.filter((r: Recording, idx: number) => checkedIndices.includes(idx));
      const anyRunning = filtered.some((r: Recording) => r.state === RecordingState.RUNNING || r.state == RecordingState.STARTING);
      return !anyRunning;
    }, [checkedIndices, recordings]);

    const buttons = React.useMemo(() => {
      const arr = [
        <Button key="create" variant="primary" onClick={handleCreateRecording}>Create</Button>
      ];
      if (props.archiveEnabled) {
        arr.push((
          <Button key="archive" variant="secondary" onClick={handleArchiveRecordings} isDisabled={!checkedIndices.length}>Archive</Button>
        ));
      }
      arr.push((
        <Button key="stop" variant="tertiary" onClick={handleStopRecordings} isDisabled={isStopDisabled}>Stop</Button>
      ));
      arr.push((
        <Button key="delete" variant="danger" onClick={handleDeleteRecordings} isDisabled={!checkedIndices.length}>Delete</Button>
      ));
      return <>
        {
          arr.map((btn, idx) => (
            <ToolbarItem key={idx}>
              { btn }
            </ToolbarItem>
          ))
        }
      </>;
    }, [checkedIndices]);

    return (
      <Toolbar id="active-recordings-toolbar">
        <ToolbarContent>
        { buttons }
        </ToolbarContent>
      </Toolbar>
    );
  };

  const recordingRows = React.useMemo(() => {
    return recordings.map((r, idx) => <RecordingRow key={idx} recording={r} index={idx}/>)
  }, [recordings, expandedRows, checkedIndices]);

  return (<>
    <RecordingsDataTable
        listTitle="Active Flight Recordings"
        toolbar={<RecordingsToolbar />}
        tableColumns={tableColumns}
        isHeaderChecked={headerChecked}
        onHeaderCheck={handleHeaderCheck}
    >
      {recordingRows}
    </RecordingsDataTable>
  </>);
};

export interface RecordingActionsProps {
  index: number;
  recording: Recording;
}

export const RecordingActions: React.FunctionComponent<RecordingActionsProps> = (props) => {
  const context = React.useContext(ServiceContext);
  const notifications = React.useContext(NotificationsContext);
  const [open, setOpen] = React.useState(false);
  const [grafanaEnabled, setGrafanaEnabled] = React.useState(false);
  const [uploadIds, setUploadIds] = React.useState([] as string[]);

  React.useEffect(() => {
    const sub = context.commandChannel.grafanaDatasourceUrl()
      .pipe(first())
      .subscribe(() => setGrafanaEnabled(true));
    return () => sub.unsubscribe();
  }, [context.commandChannel]);

  React.useEffect(() => {
    const sub = context.commandChannel.onResponse('upload-recording')
      .pipe(
        filter(m => !!m.id && uploadIds.includes(m.id)),
        first()
      )
      .subscribe(resp => {
        const id = resp.id || '';
        setUploadIds(ids => [...ids.slice(0, ids.indexOf(id)), ...ids.slice(ids.indexOf(id) + 1, ids.length)]);
        if (resp.status === 0) {
          notifications.success('Upload Success', `Recording "${props.recording.name}" uploaded`);
          context.commandChannel.grafanaDashboardUrl().pipe(first()).subscribe(url => window.open(url, '_blank'));
        } else {
          notifications.danger('Upload Failed', `Recording "${props.recording.name}" could not be uploaded`);
        }
      });
    return () => sub.unsubscribe();
  }, [context.commandChannel, props.recording.name, notifications, uploadIds]);

  const grafanaUpload = () => {
    context.commandChannel.grafanaDatasourceUrl().pipe(first()).subscribe(url => {
      notifications.info('Upload Started', `Recording "${props.recording.name}" uploading...`);
      const id = context.commandChannel.createMessageId();
      setUploadIds(ids => [...ids, id]);
      context.commandChannel.sendMessage('upload-recording', [ props.recording.name ], id);
    });
  };

  const handleDownloadRecording = () => {
    context.api.downloadRecording(props.recording);
  };

  const handleDownloadReport = () => {
    context.api.downloadReport(props.recording);
  };

  const actionItems = React.useMemo(() => {
    const actionItems = [
      <DropdownItem key="download" component={
        <Text onClick={handleDownloadRecording}>
          Download Recording
        </Text>
        }>
      </DropdownItem>,
      <DropdownItem key="report" component={
        <Text onClick={handleDownloadReport} >
          Download Report
        </Text>
        }>
      </DropdownItem>
    ];
    if (grafanaEnabled) {
      actionItems.push(
        <DropdownItem key="grafana" component={
          <Text onClick={grafanaUpload} >
            View in Grafana ...
          </Text>
          }>
        </DropdownItem>
      );
    }
    return actionItems;
  }, [handleDownloadRecording, handleDownloadReport, grafanaEnabled, grafanaUpload]);

  const onSelect = () => {
    setOpen(o => !o);
  };

  return (
    <DataListAction
      aria-labelledby={`dropdown-actions-item-${props.index} dropdown-actions-action-${props.index}`}
      id={`dropdown-actions-action-${props.index}`}
      aria-label="Actions"
    >
      <Dropdown
        isPlain
        position={DropdownPosition.right}
        isOpen={open}
        onSelect={onSelect}
        toggle={<KebabToggle onToggle={setOpen} />}
        dropdownItems={actionItems}
      />
    </DataListAction>
  );
};
