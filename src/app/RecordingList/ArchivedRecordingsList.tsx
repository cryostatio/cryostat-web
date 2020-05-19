import * as React from 'react';
import { filter, map } from 'rxjs/operators';
import { Button, DataList, DataListCheck, DataListItem, DataListItemRow, DataListItemCells, DataListCell, DataListContent, DataListToggle, DataToolbar, DataToolbarContent, DataToolbarItem, Spinner, Text, TextVariants, Title } from '@patternfly/react-core';
import { ServiceContext } from '@app/Shared/Services/Services';
import { Recording, RecordingState } from '@app/Shared/Services/Api.service';
import { TargetView } from '@app/TargetView/TargetView';
import { RecordingsDataTable } from './RecordingsDataTable';
import { RecordingActions } from './ActiveRecordingsList';

export const ArchivedRecordingsList = (props) => {
  const context = React.useContext(ServiceContext);

  const [recordings, setRecordings] = React.useState([]);
  const [headerChecked, setHeaderChecked] = React.useState(false);
  const [checkedIndices, setCheckedIndices] = React.useState([] as number[]);
  const [expandedRows, setExpandedRows] = React.useState([] as string[]);
  const [openAction, setOpenAction] = React.useState(-1);

  const tableColumns: string[] = [
    'Name'
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

  const toggleExpanded = (id) => {
    const idx = expandedRows.indexOf(id);
    setExpandedRows(expandedRows => idx >= 0 ? [...expandedRows.slice(0, idx), ...expandedRows.slice(idx + 1, expandedRows.length)] : [...expandedRows, id]);
  };

  React.useEffect(() => {
    const sub = context.commandChannel.onResponse('save').subscribe(() => context.commandChannel.sendControlMessage('list-saved'));
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
    context.commandChannel.sendControlMessage('list-saved');
    const id = setInterval(() => context.commandChannel.sendControlMessage('list-saved'), 30_000);
    return () => clearInterval(id);
  }, []);

  const RecordingRow = (props) => {
    const [reportLoaded, setReportLoaded] = React.useState(false);

    const expandedRowId =`archived-table-row-${props.index}-exp`;
    const handleToggle = () => {
      setReportLoaded(false);
      toggleExpanded(expandedRowId);
    };

    return (<>
      <DataListItem aria-labelledby={`table-row-${props.index}-1`} isExpanded={expandedRows.includes(expandedRowId)} >
        <DataListItemRow>
          <DataListCheck aria-labelledby="table-row-1-1" name={`row-${props.index}-check`} onChange={(checked) => handleRowCheck(checked, props.index)} isChecked={checkedIndices.includes(props.index)} />
          <DataListToggle onClick={handleToggle} isExpanded={expandedRows.includes(expandedRowId)} id={`ex-toggle-${props.index}`} aria-controls={`ex-expand-${props.index}`} />
          <DataListItemCells
            dataListCells={[
              <DataListCell key={`table-row-${props.index}-1`}>
                {props.recording.name}
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
    </>);
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
