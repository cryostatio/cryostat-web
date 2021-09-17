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

import {NotificationsContext} from '@app/Notifications/Notifications';
import {Recording, RecordingState} from '@app/Shared/Services/Api.service';
import { NotificationCategory } from '@app/Shared/Services/NotificationChannel.service';
import {ServiceContext} from '@app/Shared/Services/Services';
import {NO_TARGET} from '@app/Shared/Services/Target.service';
import {useSubscriptions} from '@app/utils/useSubscriptions';
import {Button, DataListAction, DataListCell, DataListCheck, DataListContent, DataListItem, DataListItemCells, DataListItemRow, DataListToggle, Dropdown, DropdownItem, DropdownPosition, KebabToggle, Text, Toolbar, ToolbarContent, ToolbarItem} from '@patternfly/react-core';
import * as React from 'react';
import {useHistory, useRouteMatch} from 'react-router-dom';
import {combineLatest, forkJoin, Observable} from 'rxjs';
import {concatMap, filter, first} from 'rxjs/operators';
import {RecordingsDataTable} from './RecordingsDataTable';
import {ReportFrame} from './ReportFrame';

export interface ActiveRecordingsListProps {
  archiveEnabled: boolean;
  onArchive?: Function;
}

export const ActiveRecordingsList: React.FunctionComponent<ActiveRecordingsListProps> = (props) => {
  const notifications = React.useContext(NotificationsContext);
  const context = React.useContext(ServiceContext);
  const routerHistory = useHistory();

  const [recordings, setRecordings] = React.useState([] as Recording[]);
  const [headerChecked, setHeaderChecked] = React.useState(false);
  const [checkedIndices, setCheckedIndices] = React.useState([] as number[]);
  const [expandedRows, setExpandedRows] = React.useState([] as string[]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState('');
  const { url } = useRouteMatch();

  const tableColumns: string[] = [
    'Name',
    'Start Time',
    'Duration',
    'State',
  ];

  const addSubscription = useSubscriptions();

  const handleRowCheck = React.useCallback((checked, index) => {
    if (checked) {
      setCheckedIndices(ci => ([...ci, index]));
    } else {
      setHeaderChecked(false);
      setCheckedIndices(ci => ci.filter(v => v !== index));
    }
  }, [setCheckedIndices, setHeaderChecked]);

  const handleHeaderCheck = React.useCallback((checked) => {
    setHeaderChecked(checked);
    setCheckedIndices(checked ? Array.from(new Array(recordings.length), (x, i) => i) : []);
  }, [setHeaderChecked, setCheckedIndices, recordings]);

  const handleCreateRecording = React.useCallback(() => {
    routerHistory.push(`${url}/create`);
  }, [routerHistory]);

  const handleRecordings = React.useCallback((recordings) => {
    setRecordings(recordings);
    setIsLoading(false);
    setErrorMessage('');
  }, [setRecordings, setIsLoading, setErrorMessage]);

  const handleError = React.useCallback((error) => {
    setIsLoading(false);
    setErrorMessage(error.message);
  }, [setIsLoading, setErrorMessage]);

  const refreshRecordingList = React.useCallback(() => {
    setIsLoading(true);
    addSubscription(
      context.target.target()
      .pipe(
        filter(target => target !== NO_TARGET),
        concatMap(target => context.api.doGet<Recording[]>(`targets/${encodeURIComponent(target.connectUrl)}/recordings`)),
        first(),
      ).subscribe(value => handleRecordings(value), err => handleError(err))
    );
  }, [addSubscription, context, context.target, context.api, setIsLoading, handleRecordings, handleError]);

  React.useEffect(() => {
    addSubscription(
      context.target.target().subscribe(refreshRecordingList)
    );
  }, [addSubscription, context, context.target, refreshRecordingList]);

  React.useEffect(() => {
    combineLatest([
      context.notificationChannel.messages(NotificationCategory.RecordingCreated),
      context.notificationChannel.messages(NotificationCategory.RecordingSaved),
      context.notificationChannel.messages(NotificationCategory.RecordingArchived),
      context.notificationChannel.messages(NotificationCategory.RecordingDeleted)
    ]).subscribe(
      refreshRecordingList
    );
  }, [context, context.notificationChannel, refreshRecordingList]);

  React.useEffect(() => {
    const sub = context.target.authFailure().subscribe(() => {
      setErrorMessage("Auth failure");
    });
    return () => sub.unsubscribe();
  }, [context, context.target, setErrorMessage]);

  const handleArchiveRecordings = React.useCallback(() => {
    const tasks: Observable<boolean>[] = [];
    recordings.forEach((r: Recording, idx) => {
      if (checkedIndices.includes(idx)) {
        handleRowCheck(false, idx);
        tasks.push(
          context.api.archiveRecording(r.name).pipe(first())
        );
      }
    });
    addSubscription(
      forkJoin(tasks).subscribe(arr => {
        if (props.onArchive && arr.some(v => !!v)) {
          props.onArchive();
        }
      }, window.console.error)
    );
  }, [recordings, checkedIndices, handleRowCheck, context.api, addSubscription, props.onArchive]);

  const handleStopRecordings = React.useCallback(() => {
    const tasks: Observable<boolean>[] = [];
    recordings.forEach((r: Recording, idx) => {
      if (checkedIndices.includes(idx)) {
        handleRowCheck(false, idx);
        if (r.state === RecordingState.RUNNING || r.state === RecordingState.STARTING) {
          tasks.push(
            context.api.stopRecording(r.name).pipe(first())
          );
        }
      }
    });
    addSubscription(
      forkJoin(tasks).subscribe(refreshRecordingList, window.console.error)
    );
  }, [recordings, checkedIndices, handleRowCheck, context.api, addSubscription, refreshRecordingList]);

  const handleDeleteRecordings = React.useCallback(() => {
    const tasks: Observable<{}>[] = [];
    recordings.forEach((r: Recording, idx) => {
      if (checkedIndices.includes(idx)) {
        handleRowCheck(false, idx);
        context.reports.delete(r);
        tasks.push(
          context.api.deleteRecording(r.name).pipe(first())
        );
      }
    });
    addSubscription(
      forkJoin(tasks).subscribe(refreshRecordingList, window.console.error)
    );
  }, [recordings, checkedIndices, handleRowCheck, context.reports, context.api, addSubscription, refreshRecordingList]);

  React.useEffect(() => {
    if (!context.settings.autoRefreshEnabled()) {
      return;
    }
    const id = window.setInterval(() => refreshRecordingList(), context.settings.autoRefreshPeriod() * context.settings.autoRefreshUnits());
    return () => window.clearInterval(id);
  }, [refreshRecordingList, context, context.settings]);

  const RecordingRow = (props) => {
    const expandedRowId =`active-table-row-${props.recording.name}-${props.recording.startTime}-exp`;
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
    }, [props.recording, props.recording.name, props.duration, props.index]);

    return (
      <DataListItem aria-labelledby={`table-row-${props.index}-1`} isExpanded={isExpanded} >
        <DataListItemRow>
          <DataListCheck aria-labelledby="table-row-1-1" name={`row-${props.index}-check`} onChange={handleCheck} isChecked={checkedIndices.includes(props.index)} />
          <DataListToggle onClick={handleToggle} isExpanded={isExpanded} id={`active-ex-toggle-${props.index}`} aria-controls={`ex-expand-${props.index}`} />
          <DataListItemCells
            dataListCells={listColumns}
          />
          <RecordingActions index={props.index} recording={props.recording} uploadFn={() => context.api.uploadActiveRecordingToGrafana(props.recording.name)} />
        </DataListItemRow>
        <DataListContent
          aria-label="Content Details"
          id={`active-ex-expand-${props.index}`}
          isHidden={!isExpanded}
        >
          <Text>Recording Options:</Text>
          <Text>
            toDisk = { String(props.recording.toDisk) } &emsp;
            maxAge = {props.recording.maxAge / 1000}s &emsp;
            maxSize = { props.recording.maxSize }B
          </Text>
          <br></br>
          <hr></hr>
          <br></br>
          <Text>Automated Analysis:</Text>
          <ReportFrame isExpanded={isExpanded} recording={props.recording} width="100%" height="640" />
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
        isLoading = {isLoading}
        errorMessage = {errorMessage}
    >
      {recordingRows}
    </RecordingsDataTable>
  </>);
};

export interface RecordingActionsProps {
  index: number;
  recording: Recording;
  uploadFn: () => Observable<boolean>;
}

export const RecordingActions: React.FunctionComponent<RecordingActionsProps> = (props) => {
  const context = React.useContext(ServiceContext);
  const notifications = React.useContext(NotificationsContext);
  const [open, setOpen] = React.useState(false);
  const [grafanaEnabled, setGrafanaEnabled] = React.useState(false);

  const addSubscription = useSubscriptions();

  React.useEffect(() => {
    const sub = context.api.grafanaDatasourceUrl()
      .pipe(first())
      .subscribe(() => setGrafanaEnabled(true));
    return () => sub.unsubscribe();
  }, [context.api, notifications]);

  const grafanaUpload = React.useCallback(() => {
    notifications.info('Upload Started', `Recording "${props.recording.name}" uploading...`);
    addSubscription(
      props.uploadFn()
      .pipe(first())
      .subscribe(success => {
        if (success) {
          notifications.success('Upload Success', `Recording "${props.recording.name}" uploaded`);
          context.api.grafanaDashboardUrl().pipe(first()).subscribe(url => window.open(url, '_blank'));
        }
      })
    );
  }, [addSubscription]);

  const handleDownloadRecording = React.useCallback(() => {
    context.api.downloadRecording(props.recording);
  }, [context.api, props.recording]);

  const handleDownloadReport = React.useCallback(() => {
    context.api.downloadReport(props.recording);
  }, [context.api, props.recording]);

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
