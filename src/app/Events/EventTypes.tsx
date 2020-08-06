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
import { Toolbar, ToolbarContent, ToolbarItem, ToolbarItemVariant, Pagination, TextInput } from '@patternfly/react-core';
import { expandable, Table, TableBody, TableHeader, TableVariant } from '@patternfly/react-table';
import { concatMap, filter, map } from 'rxjs/operators';

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

type Row = {
  cells: string[];
  parent?: number;
  isOpen?: boolean;
  fullWidth?: boolean;
}

export const EventTypes = () => {
  const context = React.useContext(ServiceContext);

  const [types, setTypes] = React.useState([] as EventType[]);
  const [displayedTypes, setDisplayedTypes] = React.useState([] as Row[]);
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
    context.target.target().pipe(concatMap(target => context.api.doGet<EventType[]>(`targets/${encodeURIComponent(target)}/events`))).subscribe(setTypes)
  }, [context.commandChannel]);

  const getCategoryString = (eventType: EventType): string => {
    return eventType.category.join(', ').trim();
  };

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

    const rows: Row[] = [];
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
    <Toolbar id="event-types-toolbar">
      <ToolbarContent>
        <ToolbarItem>
          <TextInput name="eventFilter" id="eventFilter" type="search" placeholder="Filter..." aria-label="Event filter" onChange={setFilterText}/>
        </ToolbarItem>
        <ToolbarItem variant={ToolbarItemVariant.pagination}>
          <Pagination
            itemCount={filterText ? filterTypesByText().length : types.length}
            page={currentPage}
            perPage={perPage}
            onSetPage={onCurrentPage}
            widgetId="event-types-pagination"
            onPerPageSelect={onPerPage}
            isCompact
          />
        </ToolbarItem>
      </ToolbarContent>
    </Toolbar>
    <Table aria-label="Event Types table" cells={tableColumns} rows={displayedTypes} onCollapse={onCollapse} variant={TableVariant.compact}>
      <TableHeader />
      <TableBody />
    </Table>
  </>);

}
