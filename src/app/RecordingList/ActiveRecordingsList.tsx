import * as React from 'react';
import { useHistory, useRouteMatch } from 'react-router-dom';
import { filter, map } from 'rxjs/operators';
import { Button, DataList, DataListAction, DataListCheck, DataListItem, DataListItemRow, DataListItemCells, DataListCell, DataListContent, DataListToggle, DataToolbar, DataToolbarContent, DataToolbarItem, Dropdown, DropdownItem, DropdownPosition, KebabToggle, Spinner, Text, TextVariants, Title } from '@patternfly/react-core';
import { ServiceContext } from '@app/Shared/Services/Services';
import { TargetView } from '@app/TargetView/TargetView';
import { Recording, RecordingState } from './RecordingList';
import { RecordingsDataTable } from './RecordingsDataTable';

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
  const [openAction, setOpenAction] = React.useState(-1);
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
      .subscribe(recordings => setRecordings(recordings));
    return () => sub.unsubscribe();
  }, []);

  React.useEffect(() => {
    context.commandChannel.sendMessage('list');
    const id = setInterval(() => context.commandChannel.sendMessage('list'), 30_000);
    return () => clearInterval(id);
  }, []);

  const RecordingRow = (props) => {
    const [reportLoaded, setReportLoaded] = React.useState(false);

    const expandedRowId =`active-table-row-${props.index}-exp`;
    const handleToggle = () => {
      setReportLoaded(false);
      toggleExpanded(expandedRowId);
    };

    return (
      <DataListItem aria-labelledby={`table-row-${props.index}-1`} isExpanded={expandedRows.includes(expandedRowId)} >
        <DataListItemRow>
          <DataListCheck aria-labelledby="table-row-1-1" name={`row-${props.index}-check`} onChange={(checked) => handleRowCheck(checked, props.index)} isChecked={checkedIndices.includes(props.index)} />
          <DataListToggle onClick={handleToggle} isExpanded={expandedRows.includes(expandedRowId)} id={`ex-toggle-${props.index}`} aria-controls={`ex-expand-${props.index}`} />
          <DataListItemCells
            dataListCells={[
              <DataListCell key={`table-row-${props.index}-1`}>
                {props.recording.name}
              </DataListCell>,
              <DataListCell key={`table-row-${props.index}-2`}>
                <ISOTime timeStr={props.recording.startTime} />
              </DataListCell>,
              <DataListCell key={`table-row-${props.index}-3`}>
                <RecordingDuration duration={props.recording.duration} />
              </DataListCell>,
              <DataListCell key={`table-row-${props.index}-4`}>
                {props.recording.state}
              </DataListCell>
            ]}
          />
          <RecordingActions index={props.index} recording={props.recording} isOpen={props.index === openAction} setOpen={o => setOpenAction(o ? props.index : -1)} />
        </DataListItemRow>
        <DataListContent
          aria-label="Content Details"
          id={`ex-expand-${props.index}`}
          isHidden={!expandedRows.includes(expandedRowId)}
        >
          <div>{
            reportLoaded ? null : <Spinner />
          }</div>
          <iframe src={props.recording.reportUrl} width="100%" height="640" onLoad={() => setReportLoaded(true)} hidden={!reportLoaded} ></iframe>
        </DataListContent>
      </DataListItem>
    );
  };

  const ISOTime = (props) => {
    const fmt = new Date(props.timeStr).toISOString();
    return (<span>{fmt}</span>);
  };

  const RecordingDuration = (props) => {
    const str = props.duration === 0 ? 'Continuous' : `${props.duration / 1000}s`
    return (<span>{str}</span>);
  };

  const isStopDisabled = () => {
    if (!checkedIndices.length) {
      return true;
    }
    const filtered = recordings.filter((r: Recording, idx: number) => checkedIndices.includes(idx));
    const anyRunning = filtered.some((r: Recording) => r.state === RecordingState.RUNNING || r.state == RecordingState.STARTING);
    return !anyRunning;
  };

  const toggleExpanded = (id) => {
    const idx = expandedRows.indexOf(id);
    setExpandedRows(expandedRows => idx >= 0 ? [...expandedRows.slice(0, idx), ...expandedRows.slice(idx + 1, expandedRows.length)] : [...expandedRows, id]);
  };

  const RecordingsToolbar = () => {
    const buttons = [
      <Button variant="primary" onClick={handleCreateRecording}>Create</Button>
    ];
    if (props.archiveEnabled) {
      buttons.push((
        <Button variant="secondary" onClick={handleArchiveRecordings} isDisabled={!checkedIndices.length}>Archive</Button>
      ));
    }
    buttons.push((
      <Button variant="tertiary" onClick={handleStopRecordings} isDisabled={isStopDisabled()}>Stop</Button>
    ));
    buttons.push((
      <Button variant="danger" onClick={handleDeleteRecordings} isDisabled={!checkedIndices.length}>Delete</Button>
    ));

    return (
      <DataToolbar id="active-recordings-toolbar">
        <DataToolbarContent>
        {
          buttons.map((btn, idx) => (
              <DataToolbarItem key={idx}>
                { btn }
              </DataToolbarItem>
          ))
        }
        </DataToolbarContent>
      </DataToolbar>
    );
  };

  return (<>
    <RecordingsDataTable
        listTitle="Active Flight Recordings"
        toolbar={<RecordingsToolbar />}
        tableColumns={tableColumns}
        isHeaderChecked={headerChecked}
        onHeaderCheck={handleHeaderCheck}
    >
      {
        recordings.map((r, idx) => <RecordingRow recording={r} index={idx}/>)
      }
    </RecordingsDataTable>
  </>);
};

export interface RecordingActionsProps {
  isOpen: boolean;
  setOpen: (open: boolean) => void;
  index: number;
  recording: Recording;
}

export const RecordingActions: React.FunctionComponent<RecordingActionsProps> = (props) => {
  const DownloadLink = (props) => {
    return <a href={props.url} target="_blank" download={props.as}>Download</a>;
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
        isOpen={props.isOpen}
        onSelect={() => props.setOpen(!props.isOpen)}
        toggle={<KebabToggle onToggle={props.setOpen} />}
        dropdownItems={[
          <DropdownItem key="download" component={
              <Text>
                <DownloadLink url={props.recording.downloadUrl} as={`${props.recording.name}.jfr`} />
              </Text>
            }>
          </DropdownItem>,
          <DropdownItem key="report" component={
              <Text>
                <a href={props.recording.reportUrl} target="_blank">View report ...</a>
              </Text>
            }>
          </DropdownItem>
        ]}
      />
    </DataListAction>
  );
};
