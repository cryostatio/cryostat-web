import * as React from 'react';
import { useHistory, useRouteMatch } from 'react-router-dom';
import { filter, map } from 'rxjs/operators';
import { Button, Card, CardBody, CardHeader, PageSection, Text, TextVariants, Title } from '@patternfly/react-core';
import { Table, TableHeader, TableBody, textCenter } from '@patternfly/react-table';
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
      `${recording.duration / 1000} s`,
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

  return (
    <TargetView pageTitle="Flight Recordings">
      <Card>
        <CardHeader><Text component={TextVariants.h4}>Active Recordings</Text></CardHeader>
        <CardBody>
          <Button onClick={handleCreateRecording} >Create</Button>
          <Table aria-label="Recordings Table" cells={tableColumns} rows={getRecordingRows()}>
            <TableHeader />
            <TableBody />
          </Table>
        </CardBody>
      </Card>
    </TargetView>
  );
};
