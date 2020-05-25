import * as React from 'react';
import { ServiceContext } from '@app/Shared/Services/Services';
import { DataToolbar, DataToolbarContent, DataToolbarItem, DataToolbarItemVariant, Pagination, TextInput } from '@patternfly/react-core';
import { expandable, Table, TableBody, TableHeader, TableVariant } from '@patternfly/react-table';
import { filter, map } from 'rxjs/operators';

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

  const [types, setTypes] = React.useState([] as EventType[]);
  const [displayedTypes, setDisplayedTypes] = React.useState([] as any[]);
  const [currentPage, setCurrentPage] = React.useState(1);
  const [perPage, setPerPage] = React.useState(10);
  const prevPerPage = React.useRef(10);
  const [openRow, setOpenRow] = React.useState(-1);
  const [filterText, setFilterText] = React.useState('');

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
  }, [context.commandChannel]);

  React.useEffect(() => {
    context.commandChannel.sendMessage('list-event-types');
  }, [context.commandChannel]);

  const filterTypesByText = React.useCallback(() => {
    if (!filterText) {
      return types;
    }
    const includesSubstr = (a, b) => !!a && !!b && a.toLowerCase().includes(b.trim().toLowerCase());
    return types.filter(t => {
      if (includesSubstr(t.name, filterText)) {
        return true;
      }
      if (includesSubstr(t.typeId, filterText)) {
        return true;
      }
      if (includesSubstr(t.description, filterText)) {
        return true;
      }
      if (includesSubstr(getCategoryString(t), filterText)) {
        return true;
      }
      return false
    });
  }, [types, filterText]);

  React.useEffect(() => {
    const offset = (currentPage - 1) * perPage;
    const page = filterTypesByText().slice(offset, offset + perPage);

    const rows: any[] = [];
    page.forEach((t: EventType, idx: number) => {
      rows.push({ cells: [ t.name, t.typeId, t.description, getCategoryString(t) ], isOpen: (idx === openRow) });
      if (idx === openRow) {
        let child = '';
        for (const opt in t.options) {
          child += `${opt}=[${t.options[opt].defaultValue}]\t`;
        }
        rows.push({ parent: idx, fullWidth: true, cells: [ child ] });
      }
    });

    setDisplayedTypes(rows);
  }, [context.commandChannel, currentPage, perPage, filterTypesByText, openRow]);

  const getCategoryString = (eventType: EventType): string => {
    return eventType.category.join(', ').trim();
  };

  const onCurrentPage = (evt, currentPage) => {
    setOpenRow(-1);
    setCurrentPage(currentPage);
  };

  const onPerPage = (evt, perPage) => {
    const offset = (currentPage - 1) * prevPerPage.current;
    prevPerPage.current = perPage;
    setOpenRow(-1);
    setPerPage(perPage);
    setCurrentPage(1 + Math.floor(offset/perPage));
  };

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
  return (<>
    <DataToolbar id="event-types-toolbar">
      <DataToolbarContent>
        <DataToolbarItem>
          <TextInput name="eventFilter" id="eventFilter" type="search" placeholder="Filter..." aria-label="Event filter" onChange={setFilterText}/>
        </DataToolbarItem>
        <DataToolbarItem variant={DataToolbarItemVariant.pagination}>
          <Pagination
            itemCount={!!filterText ? filterTypesByText().length : types.length}
            page={currentPage}
            perPage={perPage}
            onSetPage={onCurrentPage}
            widgetId="event-types-pagination"
            onPerPageSelect={onPerPage}
            isCompact
          />
        </DataToolbarItem>
      </DataToolbarContent>
    </DataToolbar>
    <Table aria-label="Event Types table" cells={tableColumns} rows={displayedTypes} onCollapse={onCollapse} variant={TableVariant.compact}>
      <TableHeader />
      <TableBody />
    </Table>
  </>);

}
