import * as React from 'react';
import { useHistory, useRouteMatch } from 'react-router-dom';
import { filter, map } from 'rxjs/operators';
import { Button, Card, CardBody, CardHeader, DataList, DataListCheck, DataListItem, DataListItemRow, DataListItemCells, DataListCell, PageSection, Text, TextVariants, Title, Toolbar, ToolbarGroup, ToolbarItem } from '@patternfly/react-core';
import { ServiceContext } from '@app/Shared/Services/Services';
import { TargetView } from '@app/TargetView/TargetView';

interface Recording {
  id: number;
  name: string;
  state: RecordingState;
  startTime: number;
  duration: number;
  continuous: boolean;
  toDisk: boolean;
  maxSize: number;
  maxAge: number;
  downloadUrl: string;
  reportUrl: string;
}

enum RecordingState {
  STOPPED = 'STOPPED',
  STARTING = 'STARTING',
  RUNNING = 'RUNNING',
  STOPPING = 'STOPPING',
}

export const RecordingList = (props) => {
  const context = React.useContext(ServiceContext);
  const routerHistory = useHistory();

  const [recordings, setRecordings] = React.useState([]);
  const [headerChecked, setHeaderChecked] = React.useState(false);
  const [checkedIndices, setCheckedIndices] = React.useState([] as number[]);
  const { path, url } = useRouteMatch();

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
      setCheckedIndices([...checkedIndices, index]);
    } else {
      setHeaderChecked(false);
      const idx = checkedIndices.indexOf(index);
      if (idx < 0) {
        return;
      }
      const before = checkedIndices.slice(0, idx);
      const after = checkedIndices.slice(idx + 1, checkedIndices.length);
      setCheckedIndices([...before, ...after]);
    }
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

  const handleStopRecordings = () => {
    recordings.forEach((r: Recording, idx) => {
      if (checkedIndices.includes(idx)) {
        handleRowCheck(false, idx);
        context.commandChannel.sendMessage('stop', [ r.name ]);
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

  const RecordingsToolbar = (props) => {
    return (
      <Toolbar>
        <ToolbarGroup>
          <ToolbarItem>
            <Button variant="primary" onClick={handleCreateRecording}>Create</Button>
          </ToolbarItem>
        </ToolbarGroup>
        <ToolbarGroup>
          <ToolbarItem>
            <Button variant="secondary" onClick={handleStopRecordings} isDisabled={!checkedIndices.length}>Stop</Button>
          </ToolbarItem>
        </ToolbarGroup>
        <ToolbarGroup>
          <ToolbarItem>
            <Button variant="danger" onClick={handleDeleteRecordings} isDisabled={!checkedIndices.length}>Delete</Button>
          </ToolbarItem>
        </ToolbarGroup>
      </Toolbar>
    );
  };

  return (
    <TargetView pageTitle="Recordings">
      <Card>
        <CardHeader><Text component={TextVariants.h4}>Active Recordings</Text></CardHeader>
        <CardBody>
          <RecordingsToolbar />
          <DataList aria-label="Recording List">
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
        </CardBody>
      </Card>
    </TargetView>
  );
};
