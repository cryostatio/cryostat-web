import * as React from 'react';
import { ServiceContext } from '@app/Shared/Services/Services';
import { DataToolbar, DataToolbarContent, DataToolbarItem, TextInput } from '@patternfly/react-core';
import { Table, TableBody, TableHeader, TableVariant } from '@patternfly/react-table';
import { useHistory } from 'react-router-dom';
import { filter, map } from 'rxjs/operators';

export interface EventTemplate {
  name: string;
  description: string;
  provider: string;
}

export const EventTemplates = (props) => {
  const context = React.useContext(ServiceContext);
  const history = useHistory();

  const [templates, setTemplates] = React.useState([]);
  const [filterText, setFilterText] = React.useState('');

  const tableColumns = [
    'Name',
    'Description',
    'Provider',
  ];

  const getTemplates = () => {
    let filtered;
    if (!filterText) {
      filtered = templates;
    } else {
      const ft = filterText.trim().toLowerCase();
      filtered = templates.filter((t: EventTemplate) => t.name.toLowerCase().includes(ft) || t.description.toLowerCase().includes(ft) || t.provider.toLowerCase().includes(ft));
    }
    return filtered.map((t: EventTemplate) =>
      [ t.name, t.description, t.provider ]
    );
  };

  const actions = [
    {
      title: 'Create Recording from Template',
      onClick: (event, rowId, rowData, extra) => history.push({ pathname: '/recordings/create', state: { template: rowData[0] } })
    }
  ];

  React.useEffect(() => {
    const sub = context.commandChannel.onResponse('list-event-templates')
      .pipe(
        filter(m => m.status === 0),
        map(m => m.payload),
      )
      .subscribe(templates => setTemplates(templates));
    return () => sub.unsubscribe();
  }, [context.commandChannel]);

  React.useEffect(() => {
    context.commandChannel.sendMessage('list-event-templates');
  }, [context.commandChannel]);

  return (<>
    <DataToolbar id="event-templates-toolbar">
      <DataToolbarContent>
        <DataToolbarItem>
          <TextInput name="templateFilter" id="templateFilter" type="search" placeholder="Filter..." aria-label="Event template filter" onChange={setFilterText}/>
        </DataToolbarItem>
      </DataToolbarContent>
    </DataToolbar>
    <Table aria-label="Event Templates table" cells={tableColumns} rows={getTemplates()} actions={actions} variant={TableVariant.compact}>
      <TableHeader />
      <TableBody />
    </Table>
  </>);

}
