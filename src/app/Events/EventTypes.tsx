import * as React from 'react';
import { filter, map } from 'rxjs/operators';
import { Pagination } from '@patternfly/react-core';
import { Table, TableBody, TableHeader, TableVariant, expandable } from '@patternfly/react-table';
import { ServiceContext } from '@app/Shared/Services/Services';

export interface EventType {
  name: string;
  typeId: string;
  description: string;
  category: string[];
  options: { [key: string]: OptionDescriptor }[];
}

export interface OptionDescriptor {
  name: string;
  description: string;
  defaultValue: string;
}

export const EventTypes = (props) => {
  const context = React.useContext(ServiceContext);

  const [types, setTypes] = React.useState([]);
  const [displayedTypes, setDisplayedTypes] = React.useState([] as any[]);
  const [currentPage, setCurrentPage] = React.useState(1);
  const [perPage, setPerPage] = React.useState(10);
  const [openRow, setOpenRow] = React.useState(-1);

  const tableColumns = [
    {
      title: 'Name',
      cellFormatters: [expandable]
    },
    'Type ID',
    'Description',
    'Categories'
  ];

  React.useEffect(() => {
    const sub = context.commandChannel.onResponse('list-event-types')
      .pipe(
        filter(m => m.status === 0),
        map(m => m.payload),
      )
      .subscribe(types => setTypes(types));
    return () => sub.unsubscribe();
  }, []);

  React.useEffect(() => {
    context.commandChannel.sendMessage('list-event-types');
  }, []);

  React.useEffect(() => {
    const offset = (currentPage - 1) * perPage;
    const page = types.slice(offset, offset + perPage);

    const rows: any[] = [];
    page.forEach((t: EventType, idx: number) => {
      rows.push({ cells: [ t.name, t.typeId, t.description, t.category.join(', ').trim() ], isOpen: (idx === openRow) });
      if (idx === openRow) {
        let child = '';
        for (const opt in t.options) {
          child += `${opt}=[${t.options[opt].defaultValue}]\t`;
        }
        rows.push({ parent: idx, fullWidth: true, cells: [ child ] });
      }
    });

    setDisplayedTypes(rows);
  }, [currentPage, perPage, types, openRow]);

  const onCurrentPage = (evt, currentPage) => {
    setOpenRow(-1);
    setCurrentPage(currentPage);
  };

  const onPerPage = (evt, perPage) => setPerPage(perPage);

  const onCollapse = (event, rowKey, isOpen) => {
    if (isOpen) {
      if (openRow === -1) {
        setOpenRow(rowKey);
      } else {
        setOpenRow(rowKey > openRow ? rowKey - 1 : rowKey);
      }
    } else {
      setOpenRow(-1);
    }
  };

  // TODO replace table with data list so collapsed event options can be custom formatted
  return(<>
    <Pagination
      itemCount={types.length}
      page={currentPage}
      perPage={perPage}
      onSetPage={onCurrentPage}
      widgetId="event-types-pagination"
      onPerPageSelect={onPerPage}
      isCompact
    />
    <Table aria-label="Event Types table" cells={tableColumns} rows={displayedTypes} onCollapse={onCollapse} variant={TableVariant.compact}>
      <TableHeader />
      <TableBody />
    </Table>
  </>);

}
