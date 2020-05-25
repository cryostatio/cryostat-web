import * as React from 'react';
import { ServiceContext } from '@app/Shared/Services/Services';
import { Button, DataListCell, DataListCheck, DataListItemCells, DataListItemRow, DataToolbar, DataToolbarContent, DataToolbarItem } from '@patternfly/react-core';
import { filter, map } from 'rxjs/operators';
import { Recording } from './RecordingList';
import { RecordingsDataTable } from './RecordingsDataTable';

export const ArchivedRecordingsList = () => {
  const context = React.useContext(ServiceContext);

  const [recordings, setRecordings] = React.useState([]);
  const [headerChecked, setHeaderChecked] = React.useState(false);
  const [checkedIndices, setCheckedIndices] = React.useState([] as number[]);

  const tableColumns: string[] = [
    'Name',
    'Download',
    'Report'
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

  React.useEffect(() => {
    const sub = context.commandChannel.onResponse('save').subscribe(() => context.commandChannel.sendControlMessage('list-saved'));
    return () => sub.unsubscribe();
  }, [context.commandChannel]);

  React.useEffect(() => {
    const sub = context.commandChannel.onResponse('list-saved')
      .pipe(
        filter(m => m.status === 0),
        map(m => m.payload),
      )
      .subscribe(recordings => setRecordings(recordings));
    return () => sub.unsubscribe();
  }, [context.commandChannel]);

  React.useEffect(() => {
    context.commandChannel.sendControlMessage('list-saved');
    const id = window.setInterval(() => context.commandChannel.sendControlMessage('list-saved'), 5000);
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
              <Link url={`${props.recording.downloadUrl}.jfr`} />
            </DataListCell>,
            // TODO make row expandable and render report in collapsed iframe
            <DataListCell key={`table-row-${props.index}-3`}>
              <Link url={props.recording.reportUrl} />
            </DataListCell>
          ]}
        />
      </DataListItemRow>
    );
  };

  const Link = (props) => {
    return (<a href={props.url} target="_blank">{props.display || props.url}</a>);
  };

  const RecordingsToolbar = () => {
    return (
      <DataToolbar id="archived-recordings-toolbar">
        <DataToolbarContent>
          <DataToolbarItem>
            <Button variant="danger" onClick={handleDeleteRecordings} isDisabled={!checkedIndices.length}>Delete</Button>
          </DataToolbarItem>
        </DataToolbarContent>
      </DataToolbar>
    );
  };

  return (<>
    <RecordingsDataTable
        listTitle="Archived Flight Recordings"
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
