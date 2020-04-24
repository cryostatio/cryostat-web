import * as React from 'react';
import { filter, map } from 'rxjs/operators';
import { TextInput, Toolbar, ToolbarGroup, ToolbarItem } from '@patternfly/react-core';
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
  const [filterText, setFilterText] = React.useState('');

  const tableColumns = [
    'Name',
    'Description',
    'Provider',
  ];

  const getTemplates = () => {
    let filtered;
    if (!filter) {
      filtered = templates;
    } else {
      filtered = templates.filter((t: EventTemplate) => t.name.toLowerCase().includes(filterText) || t.description.toLowerCase().includes(filterText) || t.provider.toLowerCase().includes(filterText));
    }
    return filtered.map((t: EventTemplate) =>
      [ t.name, t.description, t.provider ]
    );
  };

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

  return(<>
    <Toolbar>
      <ToolbarGroup>
        <ToolbarItem>
          <TextInput name="templateFilter" id="templateFilter" type="search" placeholder="Filter..." aria-label="Event template filter" onChange={setFilterText}/>
        </ToolbarItem>
      </ToolbarGroup>
    </Toolbar>
    <Table aria-label="Event Templates table" cells={tableColumns} rows={getTemplates()}>
      <TableHeader />
      <TableBody />
    </Table>
  </>);

}
