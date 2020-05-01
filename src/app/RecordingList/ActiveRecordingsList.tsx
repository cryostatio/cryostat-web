import * as React from 'react';
import { useHistory, useRouteMatch } from 'react-router-dom';
import { filter, map } from 'rxjs/operators';
import { Button, DataList, DataListCheck, DataListItem, DataListItemRow, DataListItemCells, DataListCell, Text, TextVariants, Title, Toolbar, ToolbarGroup, ToolbarItem } from '@patternfly/react-core';
import { ServiceContext } from '@app/Shared/Services/Services';
import { TargetView } from '@app/TargetView/TargetView';
import { Recording, RecordingState } from './RecordingList';

export interface ActiveRecordingsListProps {
  archiveEnabled: boolean;
}

export const ActiveRecordingsList = (props: ActiveRecordingsListProps) => {
  const context = React.useContext(ServiceContext);
  const routerHistory = useHistory();

  const [recordings, setRecordings] = React.useState([]);
  const [headerChecked, setHeaderChecked] = React.useState(false);
  const [checkedIndices, setCheckedIndices] = React.useState([] as number[]);
  const { url } = useRouteMatch();

  const tableColumns: string[] = [
    'Name',
    'Start Time',
    'Duration',
    'Download',
    'Report',
    'State',
  ];

  const handleCreateRecording = () => {
    routerHistory.push(`${url}/create`);
  };

  const handleHeaderCheck = (checked) => {
    setHeaderChecked(checked);
    setCheckedIndices(checked ? recordings.map((r, idx) => idx) : []);
  };

  const handleRowCheck = (checked, index) => {
    if (checked) {
      setCheckedIndices(ci => ([...ci, index]));
    } else {
      setHeaderChecked(false);
      setCheckedIndices(ci => ci.filter(v => v !== index));
    }
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
    const id = setInterval(() => context.commandChannel.sendMessage('list'), 5000);
    return () => clearInterval(id);
  }, []);

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
            <DataListCell key={`table-row-${props.index}-4`}>
              <Link url={`${props.recording.downloadUrl}.jfr`} />
            </DataListCell>,
            // TODO make row expandable and render report in collapsed iframe
            <DataListCell key={`table-row-${props.index}-5`}>
              <Link url={props.recording.reportUrl} />
            </DataListCell>,
            <DataListCell key={`table-row-${props.index}-6`}>
              {props.recording.state}
            </DataListCell>
          ]}
        />
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

  const Link = (props) => {
    return (<a href={props.url} target="_blank">{props.display || props.url}</a>);
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
      <ToolbarGroup>
        <ToolbarItem>
          <Button variant="primary" onClick={handleCreateRecording}>Create</Button>
        </ToolbarItem>
      </ToolbarGroup>
    ];
    if (props.archiveEnabled) {
      buttons.push((
        <ToolbarGroup>
          <ToolbarItem>
            <Button variant="secondary" onClick={handleArchiveRecordings} isDisabled={!checkedIndices.length}>Archive</Button>
          </ToolbarItem>
        </ToolbarGroup>
      ));
    }
    buttons.push((
      <ToolbarGroup>
        <ToolbarItem>
          <Button variant="tertiary" onClick={handleStopRecordings} isDisabled={isStopDisabled()}>Stop</Button>
        </ToolbarItem>
      </ToolbarGroup>
    ));
    buttons.push((
      <ToolbarGroup>
        <ToolbarItem>
          <Button variant="danger" onClick={handleDeleteRecordings} isDisabled={!checkedIndices.length}>Delete</Button>
        </ToolbarItem>
      </ToolbarGroup>
    ));

    return (
      <Toolbar>
        {
          buttons.map(btn => (
            <ToolbarGroup>
              <ToolbarItem>
                { btn }
              </ToolbarItem>
            </ToolbarGroup>
          ))
        }
      </Toolbar>
    );
  };

  return (<>
    <RecordingsToolbar />
    <DataList aria-label="Active Recording List">
      <DataListItem aria-labelledby="table-header-1">
        <DataListItemRow>
          <DataListCheck aria-labelledby="table-header-1" name="header-check" onChange={handleHeaderCheck} isChecked={headerChecked} />
          <DataListItemCells
            dataListCells={tableColumns.map((key , idx) => (
              <DataListCell key={key}>
                <span id={`table-header-${idx}`}>{key}</span>
              </DataListCell>
            ))}
          />
        </DataListItemRow>
      </DataListItem>
      <DataListItem aria-labelledby="table-row-1-1">
      {
        recordings.map((r, idx) => <RecordingRow recording={r} index={idx}/>)
      }
      </DataListItem>
    </DataList>
  </>);
};
