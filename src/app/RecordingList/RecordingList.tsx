import * as React from 'react';
import { useHistory, useRouteMatch } from 'react-router-dom';
import { filter, map } from 'rxjs/operators';
import { Button, Card, CardBody, CardHeader, DataList, DataListItem, DataListItemRow, DataListItemCells, DataListCell, PageSection, Text, TextVariants, Title } from '@patternfly/react-core';
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
  const { path, url } = useRouteMatch();

  const tableColumns: string[] = [
    'Name',
    'Start Time',
    'Duration',
    'Download',
    'Report',
    'State',
  ];

  const getRecordingRows = () => {
    return recordings.map((recording: Recording) => [
      recording.name,
      new Date(recording.startTime).toISOString(),
      recording.duration === 0 ? 'Continuous' : `${recording.duration / 1000} s`,
      recording.downloadUrl,
      recording.reportUrl,
      recording.state,
    ]);
  };

  const handleCreateRecording = () => {
    routerHistory.push(`${url}/create`);
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
              <Link download url={props.recording.downloadUrl} />
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
    return (<a href={props.url} download={!!props.download} target="_blank">{props.display || props.url}</a>);
  };

  return (
    <TargetView pageTitle="Recordings">
      <Card>
        <CardHeader><Text component={TextVariants.h4}>Active Recordings</Text></CardHeader>
        <CardBody>
          <Button onClick={handleCreateRecording}>Create</Button>
          <DataList aria-label="Recording List">
            <DataListItem aria-labelledby="table-header-1">
              <DataListItemRow>
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
