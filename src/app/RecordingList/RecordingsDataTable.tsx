import * as React from 'react';
import { DataList, DataListCell, DataListCheck, DataListItem, DataListItemCells, DataListItemRow } from '@patternfly/react-core';

export interface RecordingsDataTableProps {
  toolbar: React.ReactElement;
  tableColumns: string[];
  listTitle: string;
  isHeaderChecked: boolean;
  onHeaderCheck: (checked: boolean) => void;
}

export const RecordingsDataTable: React.FunctionComponent<RecordingsDataTableProps> = (props) => {
  return (<>
    { props.toolbar }
    <DataList aria-label={props.listTitle}>
      <DataListItem aria-labelledby="table-header-1">
        <DataListItemRow>
          <DataListCheck aria-labelledby="table-header-1" name="header-check" onChange={props.onHeaderCheck} isChecked={props.isHeaderChecked} />
          <DataListItemCells
            dataListCells={props.tableColumns.map((key , idx) => (
              <DataListCell key={key}>
                <span id={`table-header-${idx}`}>{key}</span>
              </DataListCell>
            ))}
          />
        </DataListItemRow>
      </DataListItem>
      { props.children }
    </DataList>
  </>);
};
