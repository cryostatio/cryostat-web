import * as React from 'react';
import { filter, map } from 'rxjs/operators';
import { Pagination } from '@patternfly/react-core';
import { Table, TableBody, TableHeader } from '@patternfly/react-table';
import { ServiceContext } from '@app/Shared/Services/Services';

export interface EventType {
  name: string;
  typeId: string;
  description: string;
  category: string[];
  options: Map<string, OptionDescriptor>;
}

export interface OptionDescriptor {
  name: string;
  description: string;
  defaultValue: string;
}

export const EventTypes = (props) => {
  const context = React.useContext(ServiceContext);

  const [types, setTypes] = React.useState([]);
  const [displayedTypes, setDisplayedTypes] = React.useState([]);
  const [currentPage, setCurrentPage] = React.useState(1);
  const [perPage, setPerPage] = React.useState(4);

  const tableColumns = [
    'Name',
    'Type ID',
    'Description',
    'Categories',
    'Options',
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
    setDisplayedTypes(page);
  }, [currentPage, perPage, types]);

  const getEventTypes = () => {
    return displayedTypes.map((t: EventType) => {
      return [ t.name, t.typeId, t.description, t.category.join(', ').trim(), JSON.stringify(t.options) ];
    })
  };

  const onCurrentPage = (evt, currentPage) => setCurrentPage(currentPage);

  const onPerPage = (evt, perPage) => setPerPage(perPage);

  // TODO paginate or make scrollable, and put Options into collapsible rows
  return(<>
    <Pagination
      itemCount={types.length}
      page={currentPage}
      perPage={perPage}
      onSetPage={onCurrentPage}
      widgetId="event-types-pagination"
      onPerPageSelect={onPerPage}
      perPageOptions={[ { title: '4', value: 4 }, { title: '10', value: 10 }, { title: '20', value: 20 } ]}
      isCompact
    />
    <Table aria-label="Event Types table" cells={tableColumns} rows={getEventTypes()}>
      <TableHeader />
      <TableBody />
    </Table>
  </>);

}
