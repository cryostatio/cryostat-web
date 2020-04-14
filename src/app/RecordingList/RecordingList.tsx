import * as React from 'react';
import { filter, map } from 'rxjs/operators';
import { Grid, GridItem, PageSection, Title } from '@patternfly/react-core';
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

  const [recordings, setRecordings] = React.useState([]);

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
    <TargetView pageTitle="Flight Recordings" allowDisconnect={false}>
      <Table aria-label="Recordings Table" cells={tableColumns} rows={getRecordingRows()}>
        <TableHeader />
        <TableBody />
      </Table>
    </TargetView>
  );
};
