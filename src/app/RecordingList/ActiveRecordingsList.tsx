import * as React from 'react';
import { ServiceContext } from '@app/Shared/Services/Services';
import { Button, DataListAction, DataListCell, DataListCheck, DataListItemCells, DataListItemRow, DataToolbar, DataToolbarContent, DataToolbarItem, Dropdown, DropdownItem, DropdownPosition, KebabToggle, Text } from '@patternfly/react-core';
import { useHistory, useRouteMatch } from 'react-router-dom';
import { filter, map } from 'rxjs/operators';
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
  }, [context.commandChannel]);

  React.useEffect(() => {
    context.commandChannel.sendMessage('list');
    const id = window.setInterval(() => context.commandChannel.sendMessage('list'), 5000);
    return () => window.clearInterval(id);
  }, [context.commandChannel]);

  const RecordingRow = (props) => {
    return (
      <DataListItemRow>
        <DataListCheck aria-labelledby="table-row-1-1" name={`row-${props.index}-check`} onChange={(checked) => handleRowCheck(checked, props.index)} isChecked={checkedIndices.includes(props.index)} />
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
            // TODO make row expandable and render report in collapsed iframe
            <DataListCell key={`table-row-${props.index}-4`}>
              {props.recording.state}
            </DataListCell>
          ]}
        />
        <RecordingActions index={props.index} recording={props.recording} isOpen={props.index === openAction} setOpen={o => setOpenAction(o ? props.index : -1)} />
      </DataListItemRow>
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

  const RecordingsToolbar = () => {
    const buttons = [
      <Button key="create" variant="primary" onClick={handleCreateRecording}>Create</Button>
    ];
    if (props.archiveEnabled) {
      buttons.push((
        <Button key="archive" variant="secondary" onClick={handleArchiveRecordings} isDisabled={!checkedIndices.length}>Archive</Button>
      ));
    }
    buttons.push((
      <Button key="stop" variant="tertiary" onClick={handleStopRecordings} isDisabled={isStopDisabled()}>Stop</Button>
    ));
    buttons.push((
      <Button key="delete" variant="danger" onClick={handleDeleteRecordings} isDisabled={!checkedIndices.length}>Delete</Button>
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
        recordings.map((r, idx) => <RecordingRow key={idx} recording={r} index={idx}/>)
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
          </DropdownItem>
        ]}
      />
    </DataListAction>
  );
};
