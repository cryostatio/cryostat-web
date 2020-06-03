import * as React from 'react';
import * as _ from 'lodash';
import { Recording } from '@app/Shared/Services/Api.service';
import { ServiceContext } from '@app/Shared/Services/Services';
import { Button, DataListCell, DataListCheck, DataListContent, DataListItem, DataListItemCells, DataListItemRow, DataListToggle, Spinner, Toolbar, ToolbarContent, ToolbarItem } from '@patternfly/react-core';
import { filter, map } from 'rxjs/operators';
import { RecordingActions } from './ActiveRecordingsList';
import { RecordingsDataTable } from './RecordingsDataTable';
import { ReportFrame } from './ReportFrame';

export const ArchivedRecordingsList = () => {
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
  }, [context.commandChannel]);

  React.useEffect(() => {
    const sub = context.commandChannel.onResponse('list-saved')
      .pipe(
        filter(m => m.status === 0),
        map(m => m.payload),
      )
      .subscribe(newRecordings => {
        console.log({ newRecordings, recordings });
        if (!_.isEqual(newRecordings, recordings)) {
          setRecordings(newRecordings);
        }
      });
    return () => sub.unsubscribe();
  }, [context.commandChannel, recordings]);

  React.useEffect(() => {
    context.commandChannel.sendControlMessage('list-saved');
    const id = setInterval(() => context.commandChannel.sendControlMessage('list-saved'), 30_000);
    return () => clearInterval(id);
  }, [context.commandChannel]);

  const RecordingRow = (props) => {
    const [reportLoaded, setReportLoaded] = React.useState(false);

    const expandedRowId =`archived-table-row-${props.index}-exp`;
    const handleToggle = () => {
      setReportLoaded(false);
      toggleExpanded(expandedRowId);
    };

    const isExpanded = expandedRows.includes(expandedRowId);

    const onLoad = () => {
      setReportLoaded(true);
    };

    const showReport = React.useMemo(() => {
      return <ReportFrame reportUrl={props.recording.reportUrl} width="100%" height="640" onLoad={onLoad} hidden={!reportLoaded} />;
    }, [props.recording.reportUrl, reportLoaded, onLoad]);

    const handleCheck = (checked) => {
      handleRowCheck(checked, props.index);
    };

    return (<>
      <DataListItem aria-labelledby={`table-row-${props.index}-1`} name={`row-${props.index}-check`} isExpanded={isExpanded} >
        <DataListItemRow>
          <DataListCheck aria-labelledby="table-row-1-1" name={`row-${props.index}-check`} onChange={handleCheck} isChecked={checkedIndices.includes(props.index)} />
          <DataListToggle onClick={handleToggle} isExpanded={isExpanded} id={`archived-ex-toggle-${props.index}`} aria-controls={`ex-expand-${props.index}`} />
          <DataListItemCells
            dataListCells={[
              <DataListCell key={`table-row-${props.index}-1`}>
                {props.recording.name}
              </DataListCell>
            ]}
          />
          <RecordingActions recording={props.recording} index={props.index} />
        </DataListItemRow>
        <DataListContent
          aria-label="Content Details"
          id={`archived-ex-expand-${props.index}`}
          isHidden={!isExpanded}
        >
          <div>{
            isExpanded ? (reportLoaded ? null : <Spinner />) : null
          }</div>
          <div>{
            isExpanded ? showReport : null
          }</div>
        </DataListContent>
      </DataListItem>
    </>);
  };

  const RecordingsToolbar = () => {
    return (
      <Toolbar id="archived-recordings-toolbar">
        <ToolbarContent>
          <ToolbarItem>
            <Button variant="danger" onClick={handleDeleteRecordings} isDisabled={!checkedIndices.length}>Delete</Button>
          </ToolbarItem>
        </ToolbarContent>
      </Toolbar>
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
