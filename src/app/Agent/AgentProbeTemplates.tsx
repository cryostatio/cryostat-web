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
import { ProbeTemplate } from '@app/Shared/Services/Api.service';

export const AgentProbeTemplates = () => {

  const context = React.useContext(ServiceContext);
  const history = useHistory();

  const [templates, setTemplates] = React.useState([] as ProbeTemplate[]);
  const [filteredTemplates, setFilteredTemplates] = React.useState([] as ProbeTemplate[]);
  const [filterText, setFilterText] = React.useState('');
  const [modalOpen, setModalOpen] = React.useState(false);
  const [uploadFile, setUploadFile] = React.useState(undefined as File | undefined);
  const [uploadFilename, setUploadFilename] = React.useState('');
  const [uploading, setUploading] = React.useState(false);
  const [fileRejected, setFileRejected] = React.useState(false);
  const [sortBy, setSortBy] = React.useState({} as ISortBy);
  const [isLoading, setIsLoading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState('');
  const addSubscription = useSubscriptions();

  const tableColumns = [
    { title: 'name', transforms: [ sortable ] },
    { title: 'xml' , transforms: [ sortable ] }
  ];

  React.useEffect(() => {
    let filtered;
    if (!filterText) {
      filtered = templates;
    } else {
      console.log("did we get here?");
      const ft = filterText.trim().toLowerCase();
      filtered = templates.filter((t: ProbeTemplate) => t.name.toLowerCase().includes(ft) || t.xml.toLowerCase().includes(ft));
    }
    const { index, direction } = sortBy;
    if (typeof index === 'number') {
      const keys = ['name', 'xml'];
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
        concatMap(target => context.api.getProbeTemplates()),
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
    () => templates.map((t: ProbeTemplate) => ([ t.name , t.xml])),
    [templates]
  );

  const handleDelete = (rowData) => {
    addSubscription(
      context.api.deleteCustomProbeTemplate(rowData[0])
      .pipe(first())
      .subscribe(() => {} /* do nothing - notification will handle updating state */)
    );
  };

  const handleInsert = (rowData) => {
      addSubscription(
          context.api.insertProbes(rowData[0])
          .pipe(first())
          .subscribe(() => {})
      );
  };

  const actionResolver = (rowData: IRowData, extraData: IExtraData) => {
    if (typeof extraData.rowIndex == 'undefined') {
      return [];
    }
    let actions = [
      {
        title: 'Insert Probes...',
        onClick: (event, rowId, rowData) => handleInsert(rowData)
      },
    ] as IAction[];
    actions = actions.concat([
        {
          isSeparator: true,
        },
        {
          title: 'Delete',
          onClick: (event, rowId, rowData) => handleDelete(rowData)
        }
    ]);
    return actions;
  };

  const handleModalToggle = () => {
    setModalOpen(v => {
      if (v) {
        setUploadFile(undefined);
        setUploadFilename('');
        setUploading(false);
      }
      return !v;
    });
  };

  const handleFileChange = (value, filename) => {
    setFileRejected(false);
    setUploadFile(value);
    setUploadFilename(filename);
  };

  const handleUploadSubmit = () => {
    if (!uploadFile) {
      window.console.error('Attempted to submit template upload without a file selected');
      return;
    }
    setUploading(true);
    addSubscription(
      context.api.addCustomProbeTemplate(uploadFile)
      .pipe(first())
      .subscribe(success => {
        setUploading(false);
        if (success) {
          setUploadFile(undefined);
          setUploadFilename('');
          setModalOpen(false);
        }
      })
    );
  };

  const handleUploadCancel = () => {
    setUploadFile(undefined);
    setUploadFilename('');
    setModalOpen(false);
  };

  const handleFileRejected = () => {
    setFileRejected(true);
  };

  const handleSort = (event, index, direction) => {
    setSortBy({ index, direction });
  };

  if (errorMessage != '') {
    return (<ErrorView message={errorMessage}/>)
  } else if (isLoading) {
    return (<LoadingView/>)
  } else {
    return (<>
      <Toolbar id="event-templates-toolbar">
        <ToolbarContent>
        <ToolbarGroup variant="filter-group">
            <ToolbarItem>
              <TextInput name="templateFilter" id="templateFilter" type="search" placeholder="Filter..." aria-label="Probe template filter" onChange={setFilterText}/>
            </ToolbarItem>
          </ToolbarGroup>
          <ToolbarGroup variant="icon-button-group">
            <ToolbarItem>
              <Button key="create" variant="primary" onClick={handleModalToggle}>Upload</Button>
            </ToolbarItem>
          </ToolbarGroup>
        </ToolbarContent>
      </Toolbar>
      <Table aria-label="Probe Templates Table"
        variant={TableVariant.compact}
        cells={tableColumns}
        rows={displayTemplates}
        actionResolver={actionResolver}
        sortBy={sortBy}
        onSort={handleSort}
      >
        <TableHeader />
        <TableBody />
      </Table>

      <Modal
        isOpen={modalOpen}
        variant={ModalVariant.large}
        showClose={true}
        onClose={handleModalToggle}
        title="Create Custom Probe Template"
        description="Create a customized probe template. This is a specialized XML file typically created using JDK Mission Control, which defines a set of events to inject and their options to configure."
        >
        <Form>
          <FormGroup
            label="Template XML"
            isRequired
            fieldId="template"
            validated={fileRejected ? 'error' : 'default'}
          >
            <FileUpload
              id="probetemplateName"
              value={uploadFile}
              filename={uploadFilename}
              onChange={handleFileChange}
              isLoading={uploading}
              validated={fileRejected ? 'error' : 'default'}
              dropzoneProps={{
                accept: '.xml',
                onDropRejected: handleFileRejected
              }}
            />
          </FormGroup>
          <ActionGroup>
            <Button variant="primary" onClick={handleUploadSubmit} isDisabled={!uploadFilename}>Submit</Button>
            <Button variant="link" onClick={handleUploadCancel}>Cancel</Button>
          </ActionGroup>
        </Form>
      </Modal>
    </>);
  }

}
