import * as React from 'react';
import { filter, map } from 'rxjs/operators';
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

  const tableColumns = [
    'Name',
    'Type ID',
    'Description',
    'Categories',
    'Options',
  ];

  const getEventTypes = () => {
    return types.map((t: EventType) => {
      return [ t.name, t.typeId, t.description, t.category.join(', ').trim(), JSON.stringify(t.options) ];
    })
  }

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

  // TODO paginate or make scrollable, and put Options into collapsible rows
  return(
    <Table aria-label="Event Types table" cells={tableColumns} rows={getEventTypes()}>
      <TableHeader />
      <TableBody />
    </Table>
  );

}
