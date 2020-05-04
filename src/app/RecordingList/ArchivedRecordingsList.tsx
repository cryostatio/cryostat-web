import * as React from 'react';
import { filter, map } from 'rxjs/operators';
import { Button, DataList, DataListCheck, DataListItem, DataListItemRow, DataListItemCells, DataListCell, DataToolbar, DataToolbarContent, DataToolbarItem, Text, TextVariants, Title } from '@patternfly/react-core';
import { ServiceContext } from '@app/Shared/Services/Services';
import { TargetView } from '@app/TargetView/TargetView';
import { Recording, RecordingState } from './RecordingList';
import { RecordingsDataTable } from './RecordingsDataTable';
import { RecordingActions } from './ActiveRecordingsList';

export const ArchivedRecordingsList = (props) => {
  const context = React.useContext(ServiceContext);

  const [recordings, setRecordings] = React.useState([]);
  const [headerChecked, setHeaderChecked] = React.useState(false);
  const [checkedIndices, setCheckedIndices] = React.useState([] as number[]);
  const [openAction, setOpenAction] = React.useState(-1);

  const tableColumns: string[] = [
    'Name',
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
        context.commandChannel.sendMessage('delete-saved', [ r.name ]);
      }
    });
    context.commandChannel.sendMessage('list-saved');
  };

  React.useEffect(() => {
    const sub = context.commandChannel.onResponse('save').subscribe(() => context.commandChannel.sendMessage('list-saved'));
    return () => sub.unsubscribe();
  });

  React.useEffect(() => {
    const sub = context.commandChannel.onResponse('list-saved')
      .pipe(
        filter(m => m.status === 0),
        map(m => m.payload),
      )
      .subscribe(recordings => setRecordings(recordings));
    return () => sub.unsubscribe();
  }, []);

  React.useEffect(() => {
    context.commandChannel.sendMessage('list-saved');
    const id = setInterval(() => context.commandChannel.sendMessage('list-saved'), 5000);
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
            // TODO make row expandable and render report in collapsed iframe
            <DataListCell key={`table-row-${props.index}-2`}>
              <Link url={props.recording.reportUrl} />
            </DataListCell>
          ]}
        />
        <RecordingActions index={props.index} recording={props.recording} isOpen={props.index === openAction} setOpen={o => setOpenAction(o ? props.index : -1)} />
      </DataListItemRow>
    );
  };

  const Link = (props) => {
    return (<a href={props.url} target="_blank">{props.display || props.url}</a>);
  };

  const RecordingsToolbar = (props) => {
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
        recordings.map((r, idx) => <RecordingRow recording={r} index={idx}/>)
      }
    </RecordingsDataTable>
  </>);
};
