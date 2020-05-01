import * as React from 'react';
import { filter, map } from 'rxjs/operators';
import { Button, DataList, DataListCheck, DataListItem, DataListItemRow, DataListItemCells, DataListCell, Text, TextVariants, Title, Toolbar, ToolbarGroup, ToolbarItem } from '@patternfly/react-core';
import { ServiceContext } from '@app/Shared/Services/Services';
import { TargetView } from '@app/TargetView/TargetView';
import { Recording, RecordingState } from './RecordingList';

export const ArchivedRecordingsList = (props) => {
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

  const RecordingsToolbar = (props) => {
    return (
      <Toolbar>
        <ToolbarGroup>
          <ToolbarItem>
            <Button variant="danger" onClick={handleDeleteRecordings} isDisabled={!checkedIndices.length}>Delete</Button>
          </ToolbarItem>
        </ToolbarGroup>
      </Toolbar>
    );
  };

  return (<>
    <RecordingsToolbar />
    <DataList aria-label="Archived Recording List">
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
