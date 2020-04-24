import * as React from 'react';
import { filter, map } from 'rxjs/operators';
import { Table, TableBody, TableHeader } from '@patternfly/react-table';
import { ServiceContext } from '@app/Shared/Services/Services';

export interface EventTemplate {
  name: string;
  description: string;
  provider: string;
}

export const EventTemplates = (props) => {
  const context = React.useContext(ServiceContext);

  const [templates, setTemplates] = React.useState([]);

  const tableColumns = [
    'Name',
    'Description',
    'Provider',
  ];

  const getTemplates = () => {
    return templates.map((t: EventTemplate) => {
      return [ t.name, t.description, t.provider ];
    })
  }

  React.useEffect(() => {
    const sub = context.commandChannel.onResponse('list-event-templates')
      .pipe(
        filter(m => m.status === 0),
        map(m => m.payload),
      )
      .subscribe(templates => setTemplates(templates));
    return () => sub.unsubscribe();
  }, []);

  React.useEffect(() => {
    context.commandChannel.sendMessage('list-event-templates');
  }, []);

  return(
    <Table aria-label="Event Templates table" cells={tableColumns} rows={getTemplates()}>
      <TableHeader />
      <TableBody />
    </Table>
  );

}
