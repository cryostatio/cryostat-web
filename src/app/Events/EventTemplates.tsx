/*
 * Copyright (c) 2020 Red Hat, Inc.
 * 
 * The Universal Permissive License (UPL), Version 1.0
 * 
 * Subject to the condition set forth below, permission is hereby granted to any
 * person obtaining a copy of this software, associated documentation and/or data
 * (collectively the "Software"), free of charge and under any and all copyright
 * rights in the Software, and any and all patent rights owned or freely
 * licensable by each licensor hereunder covering either (i) the unmodified
 * Software as contributed to or provided by such licensor, or (ii) the Larger
 * Works (as defined below), to deal in both
 * 
 * (a) the Software, and
 * (b) any piece of software and/or hardware listed in the lrgrwrks.txt file if
 * one is included with the Software (each a "Larger Work" to which the Software
 * is contributed by such licensors),
 * 
 * without restriction, including without limitation the rights to copy, create
 * derivative works of, display, perform, and distribute the Software and make,
 * use, sell, offer for sale, import, export, have made, and have sold the
 * Software and the Larger Work(s), and to sublicense the foregoing rights on
 * either these or other terms.
 * 
 * This license is subject to the following condition:
 * The above copyright notice and either this complete permission notice or at
 * a minimum a reference to the UPL must be included in all copies or
 * substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */
import * as React from 'react';
import { ServiceContext } from '@app/Shared/Services/Services';
import { Toolbar, ToolbarContent, ToolbarItem, TextInput } from '@patternfly/react-core';
import { Table, TableBody, TableHeader, TableVariant, IAction, IRowData, IExtraData } from '@patternfly/react-table';
import { useHistory } from 'react-router-dom';
import { filter, map } from 'rxjs/operators';

export interface EventTemplate {
  name: string;
  description: string;
  provider: string;
  type: 'CUSTOM' | 'TARGET';
}

export const EventTemplates = () => {
  const context = React.useContext(ServiceContext);
  const history = useHistory();

  const [templates, setTemplates] = React.useState([]);
  const [filteredTemplates, setFilteredTemplates] = React.useState([]);
  const [filterText, setFilterText] = React.useState('');

  const tableColumns = [
    'Name',
    'Description',
    'Provider',
  ];

  React.useEffect(() => {
    let filtered;
    if (!filterText) {
      filtered = templates;
    } else {
      const ft = filterText.trim().toLowerCase();
      filtered = templates.filter((t: EventTemplate) => t.name.toLowerCase().includes(ft) || t.description.toLowerCase().includes(ft) || t.provider.toLowerCase().includes(ft));
    }
    setFilteredTemplates(filtered);
  }, [filterText, templates]);

  React.useEffect(() => {
    const sub = context.commandChannel.onResponse('list-event-templates')
      .pipe(
        filter(m => m.status === 0),
        map(m => m.payload),
      )
      .subscribe(templates => {
        setTemplates(templates);
        setFilteredTemplates(templates);
      });
    return () => sub.unsubscribe();
  }, [context.commandChannel]);

  React.useEffect(() => {
    refreshTemplates();
  }, [context.commandChannel]);

  const refreshTemplates = () => {
    context.commandChannel.sendMessage('list-event-templates');
  };

  const displayTemplates = React.useMemo(() => {
    return filteredTemplates.map((t: EventTemplate) => ([ t.name, t.description, t.provider ]));
  }, [filteredTemplates]);

  const actionResolver = (rowData: IRowData, extraData: IExtraData) => {
    if (typeof extraData.rowIndex == 'undefined') {
      return [];
    }
    let actions = [
      {
        title: 'Create Recording from Template',
        onClick: (event, rowId, rowData) => history.push({ pathname: '/recordings/create', state: { template: rowData[0] } })
      }
    ] as IAction[];

    const template: EventTemplate = filteredTemplates[extraData.rowIndex];
    if (template.type === 'CUSTOM') {
      actions = actions.concat([
          {
            isSeparator: true,
          },
          {
            title: 'Delete Custom Template',
            onClick: (event, rowId, rowData) => handleDelete(rowData)
          }
      ]);
    }

    return actions;
  };

  const handleDelete = (rowData) => {
    context.api.deleteCustomEventTemplate(rowData[0]).subscribe(refreshTemplates);
  };

  return (<>
    <Toolbar id="event-templates-toolbar">
      <ToolbarContent>
        <ToolbarItem>
          <TextInput name="templateFilter" id="templateFilter" type="search" placeholder="Filter..." aria-label="Event template filter" onChange={setFilterText}/>
        </ToolbarItem>
      </ToolbarContent>
    </Toolbar>
    <Table aria-label="Event Templates table" cells={tableColumns} rows={displayTemplates} actionResolver={actionResolver} variant={TableVariant.compact}>
      <TableHeader />
      <TableBody />
    </Table>
  </>);

}
