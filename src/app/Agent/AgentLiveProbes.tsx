/*
 * Copyright The Cryostat Authors
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
import { NotificationCategory } from '@app/Shared/Services/NotificationChannel.service';
import { NO_TARGET } from '@app/Shared/Services/Target.service';
import { useSubscriptions } from '@app/utils/useSubscriptions';
import { ActionGroup, Button, FileUpload, Form, FormGroup, Modal, ModalVariant, Toolbar, ToolbarContent, ToolbarGroup, ToolbarItem, TextInput } from '@patternfly/react-core';
import { PlusIcon } from '@patternfly/react-icons';
import { Table, TableBody, TableHeader, TableVariant, IAction, IRowData, IExtraData, ISortBy, SortByDirection, sortable } from '@patternfly/react-table';
import { useHistory } from 'react-router-dom';
import { concatMap, filter, first } from 'rxjs/operators';
import { LoadingView } from '@app/LoadingView/LoadingView';
import { ErrorView } from '@app/ErrorView/ErrorView';
import { EventProbe } from '@app/Shared/Services/Api.service';

export const AgentLiveProbes = () => {

  const context = React.useContext(ServiceContext);
  const history = useHistory();

  const [templates, setTemplates] = React.useState([] as EventProbe[]);
  const [filteredTemplates, setFilteredTemplates] = React.useState([] as EventProbe[]);
  const [filterText, setFilterText] = React.useState('');
  const [sortBy, setSortBy] = React.useState({} as ISortBy);
  const [isLoading, setIsLoading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState('');
  const addSubscription = useSubscriptions();

  const tableColumns = [
    { title: 'Label', transforms: [ sortable ] },
    { title: 'Description' , transforms: [ sortable ] },
    { title: 'Class' , transforms: [ sortable ] },
    { title: 'Stacktrace' , transforms: [ sortable ] },
    { title: 'Rethrow' , transforms: [ sortable ] },
    { title: 'Method' , transforms: [ sortable ] }
  ];

  React.useEffect(() => {
    let filtered;
    if (!filterText) {
      filtered = templates;
    } else {
      console.log("did we get here?");
      const ft = filterText.trim().toLowerCase();
      filtered = templates.filter((t: EventProbe) => t.label.toLowerCase().includes(ft) || t.description.toLowerCase().includes(ft)
        || t.class.toLowerCase().includes(ft) || t.stacktrace.toLowerCase().includes(ft) ||
        t.rethrow.toLowerCase().includes(ft) || t.methodname.toLowerCase().includes(ft));
    }
    const { index, direction } = sortBy;
    if (typeof index === 'number') {
      const keys = ['Label', 'Description', 'Class', 'Stacktrace', 'Rethrow', 'Method'];
      const key = keys[index];
      const sorted = filtered.sort((a, b) => (a[key] < b[key] ? -1 : a[key] > b[key] ? 1 : 0));
      filtered = direction === SortByDirection.asc ? sorted : sorted.reverse();
    }
    setFilteredTemplates([...filtered]);
  }, [filterText, templates, sortBy]);

  const handleTemplates = React.useCallback((templates) => {
    console.log(templates);
    templates = JSON.parse(templates);
    setTemplates(templates);
    setIsLoading(false);
    setErrorMessage('');
  }, [setTemplates, setIsLoading, setErrorMessage]);

  const handleError = React.useCallback((error) => {
    setIsLoading(false);
    setErrorMessage(error.message);
  }, [setIsLoading, setErrorMessage]);

  const refreshTemplates = React.useCallback(() => {
    setIsLoading(true)
    addSubscription(
      context.target.target()
      .pipe(
        concatMap(target => context.api.getActiveProbes()),
        first()
      ).subscribe(value => handleTemplates(value), err => handleError(err))
    );
  }, [addSubscription, context, context.target, context.api, setIsLoading, handleTemplates, handleError]);

  React.useEffect(() => {
    addSubscription(
      context.target.target().subscribe(() => {
        setFilterText('');
        refreshTemplates();
      }));
  }, [context, context.target, addSubscription, refreshTemplates]);

  React.useEffect(() => {
    if (!context.settings.autoRefreshEnabled()) {
      return;
    }
    const id = window.setInterval(() => refreshTemplates(), context.settings.autoRefreshPeriod() * context.settings.autoRefreshUnits());
    return () => window.clearInterval(id);
  }, []);

  React.useEffect(() => {
    const sub = context.target.authFailure().subscribe(() => {
      setErrorMessage("Auth failure");
    });
    return () => sub.unsubscribe();
  }, [context.target]);

  const displayTemplates = React.useMemo(
    () => templates.map((t: EventProbe) => ([ t.label , t.description , t.class , t.rethrow , t.stacktrace , t.methodname ])),
    [templates]
  );

  const handleModalToggle = () => {
    addSubscription(
      context.api.removeProbes()
      .pipe(first())
      .subscribe(() => {})
      );
  };

  if (errorMessage != '') {
    return (<ErrorView message={errorMessage}/>)
  } else if (isLoading) {
    return (<LoadingView/>)
  } else {
    return (<>
      <Toolbar id="event-templates-toolbar">
        <ToolbarContent>
          <ToolbarGroup variant="icon-button-group">
            <ToolbarItem>
              <Button key="create" variant="primary" onClick={handleModalToggle}>Remove Probes</Button>
            </ToolbarItem>
          </ToolbarGroup>
        </ToolbarContent>
      </Toolbar>
      <Table aria-label="Active Events"
        variant={TableVariant.compact}
        cells={tableColumns}
        rows={displayTemplates}
      >
        <TableHeader />
        <TableBody />
      </Table>
    </>);
  }

}
