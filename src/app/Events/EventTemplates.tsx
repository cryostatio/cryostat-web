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
import { EventTemplate } from '@app/Shared/Services/Api.service';
import { NotificationCategory } from '@app/Shared/Services/NotificationChannel.service';
import { NO_TARGET } from '@app/Shared/Services/Target.service';
import { useSubscriptions } from '@app/utils/useSubscriptions';
import {
  ActionGroup,
  Button,
  FileUpload,
  Form,
  FormGroup,
  Modal,
  ModalVariant,
  Toolbar,
  ToolbarContent,
  ToolbarGroup,
  ToolbarItem,
  TextInput,
} from '@patternfly/react-core';
import { UploadIcon } from '@patternfly/react-icons';
import {
  Table,
  TableBody,
  TableHeader,
  TableVariant,
  IAction,
  IRowData,
  IExtraData,
  ISortBy,
  SortByDirection,
  sortable,
} from '@patternfly/react-table';
import { useHistory } from 'react-router-dom';
import { concatMap, filter, first } from 'rxjs/operators';
import { LoadingView } from '@app/LoadingView/LoadingView';
import { authFailMessage, ErrorView, isAuthFail } from '@app/ErrorView/ErrorView';
import { DeleteWarningType } from '@app/Modal/DeleteWarningUtils';
import { DeleteWarningModal } from '@app/Modal/DeleteWarningModal';

export const EventTemplates = () => {
  const context = React.useContext(ServiceContext);
  const history = useHistory();

  const [templates, setTemplates] = React.useState([] as EventTemplate[]);
  const [filteredTemplates, setFilteredTemplates] = React.useState([] as EventTemplate[]);
  const [filterText, setFilterText] = React.useState('');
  const [warningModalOpen, setWarningModalOpen] = React.useState(false);
  const [modalOpen, setModalOpen] = React.useState(false);
  const [uploadFile, setUploadFile] = React.useState(undefined as File | undefined);
  const [uploadFilename, setUploadFilename] = React.useState('');
  const [uploading, setUploading] = React.useState(false);
  const [fileRejected, setFileRejected] = React.useState(false);
  const [sortBy, setSortBy] = React.useState({} as ISortBy);
  const [isLoading, setIsLoading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState('');
  const [rowDeleteData, setRowDeleteData] = React.useState({} as IRowData);
  const addSubscription = useSubscriptions();

  const tableColumns = React.useMemo(
    () => [
      { title: 'Name', transforms: [sortable] },
      'Description',
      { title: 'Provider', transforms: [sortable] },
      { title: 'Type', transforms: [sortable] },
    ],
    [sortable]
  );

  React.useEffect(() => {
    let filtered;
    if (!filterText) {
      filtered = templates;
    } else {
      const ft = filterText.trim().toLowerCase();
      filtered = templates.filter(
        (t: EventTemplate) =>
          t.name.toLowerCase().includes(ft) ||
          t.description.toLowerCase().includes(ft) ||
          t.provider.toLowerCase().includes(ft)
      );
    }
    const { index, direction } = sortBy;
    if (typeof index === 'number') {
      const keys = ['name', 'description', 'provider', 'type'];
      const key = keys[index];
      const sorted = filtered.sort((a, b) => (a[key] < b[key] ? -1 : a[key] > b[key] ? 1 : 0));
      filtered = direction === SortByDirection.asc ? sorted : sorted.reverse();
    }
    setFilteredTemplates([...filtered]);
  }, [filterText, templates, sortBy]);

  const handleTemplates = React.useCallback(
    (templates) => {
      console.log(templates);
      setTemplates([]);
      setIsLoading(false);
      setErrorMessage('');
    },
    [setTemplates, setIsLoading, setErrorMessage]
  );

  const handleError = React.useCallback(
    (error) => {
      setIsLoading(false);
      setErrorMessage(error.message);
    },
    [setIsLoading, setErrorMessage]
  );

  const refreshTemplates = React.useCallback(() => {
    setIsLoading(true);
    addSubscription(
      context.target
        .target()
        .pipe(
          filter((target) => target !== NO_TARGET),
          first(),
          concatMap((target) =>
            context.api.doGet<EventTemplate[]>(`targets/${encodeURIComponent(target.connectUrl)}/templates`)
          )
        )
        .subscribe(
          (value) => handleTemplates(value),
          (err) => handleError(err)
        )
    );
  }, [addSubscription, context, context.target, context.api, setIsLoading, handleTemplates, handleError]);

  React.useEffect(() => {
    addSubscription(
      context.target.target().subscribe(() => {
        setFilterText('');
        refreshTemplates();
      })
    );
  }, [context, context.target, addSubscription, refreshTemplates]);

  React.useEffect(() => {
    addSubscription(
      context.notificationChannel
        .messages(NotificationCategory.TemplateUploaded)
        .subscribe((v) => setTemplates((old) => old.concat(v.message.template)))
    );
  }, [addSubscription, context, context.notificationChannel, setTemplates]);

  React.useEffect(() => {
    addSubscription(
      context.notificationChannel
        .messages(NotificationCategory.TemplateDeleted)
        .subscribe((v) =>
          setTemplates((old) =>
            old.filter((o) => o.name != v.message.template.name || o.type != v.message.template.type)
          )
        )
    );
  }, [addSubscription, context, context.notificationChannel, setTemplates]);

  React.useEffect(() => {
    if (!context.settings.autoRefreshEnabled()) {
      return;
    }
    const id = window.setInterval(
      () => refreshTemplates(),
      context.settings.autoRefreshPeriod() * context.settings.autoRefreshUnits()
    );
    return () => window.clearInterval(id);
  }, []);

  React.useEffect(() => {
    const sub = context.target.authFailure().subscribe(() => {
      setErrorMessage(authFailMessage);
    });
    return () => sub.unsubscribe();
  }, [context.target]);

  const displayTemplates = React.useMemo(
    () =>
      filteredTemplates.map((t: EventTemplate) => [
        t.name,
        t.description,
        t.provider,
        t.type.charAt(0).toUpperCase() + t.type.slice(1).toLowerCase(),
      ]),
    [filteredTemplates]
  );

  const handleDelete = React.useCallback(
    (rowData) => {
      addSubscription(
        context.api
          .deleteCustomEventTemplate(rowData[0])
          .pipe(first())
          .subscribe(() => {} /* do nothing - notification will handle updating state */)
      );
    },
    [addSubscription, context.api]
  );

  const actionResolver = (rowData: IRowData, extraData: IExtraData) => {
    if (typeof extraData.rowIndex == 'undefined') {
      return [];
    }
    let actions = [
      {
        title: 'Create Recording...',
        onClick: (event, rowId, rowData) =>
          history.push({
            pathname: '/recordings/create',
            state: { template: rowData[0], templateType: String(rowData[3]).toUpperCase() },
          }),
      },
    ] as IAction[];

    const template: EventTemplate = filteredTemplates[extraData.rowIndex];
    if (template.name !== 'ALL' || template.type !== 'TARGET') {
      actions = actions.concat([
        {
          title: 'Download',
          onClick: (event, rowId) => context.api.downloadTemplate(filteredTemplates[rowId]),
        },
      ]);
    }
    if (template.type === 'CUSTOM') {
      actions = actions.concat([
        {
          isSeparator: true,
        },
        {
          title: 'Delete',
          onClick: (event, rowId, rowData) => {
            handleDeleteButton(rowData);
          },
        },
      ]);
    }
    return actions;
  };

  const handleModalToggle = React.useCallback(() => {
    setModalOpen((v) => {
      if (v) {
        setUploadFile(undefined);
        setUploadFilename('');
        setUploading(false);
      }
      return !v;
    });
  }, [setModalOpen, setUploadFile, setUploadFilename, setUploading]);

  const handleFileChange = React.useCallback(
    (value, filename) => {
      setFileRejected(false);
      setUploadFile(value);
      setUploadFilename(filename);
    },
    [setFileRejected, setUploadFile, setUploadFilename]
  );

  const handleUploadSubmit = React.useCallback(() => {
    if (!uploadFile) {
      window.console.error('Attempted to submit template upload without a file selected');
      return;
    }
    setUploading(true);
    addSubscription(
      context.api
        .addCustomEventTemplate(uploadFile)
        .pipe(first())
        .subscribe((success) => {
          setUploading(false);
          if (success) {
            setUploadFile(undefined);
            setUploadFilename('');
            setModalOpen(false);
          }
        })
    );
  }, [
    uploadFile,
    window.console,
    setUploading,
    addSubscription,
    context.api,
    setUploadFile,
    setUploadFilename,
    setModalOpen,
  ]);

  const handleUploadCancel = React.useCallback(() => {
    setUploadFile(undefined);
    setUploadFilename('');
    setModalOpen(false);
  }, [setUploadFile, setUploadFilename, setModalOpen]);

  const handleFileRejected = React.useCallback(() => {
    setFileRejected(true);
  }, [setFileRejected]);

  const handleSort = React.useCallback(
    (event, index, direction) => {
      setSortBy({ index, direction });
    },
    [setSortBy]
  );

  const handleDeleteButton = React.useCallback(
    (rowData) => {
      if (context.settings.deletionDialogsEnabledFor(DeleteWarningType.DeleteEventTemplates)) {
        setRowDeleteData(rowData);
        setWarningModalOpen(true);
      } else {
        handleDelete(rowData);
      }
    },
    [context, context.settings, setWarningModalOpen, setRowDeleteData, handleDelete]
  );

  const handleWarningModalAccept = React.useCallback(() => {
    handleDelete(rowDeleteData);
  }, [handleDelete, rowDeleteData]);

  const handleWarningModalClose = React.useCallback(() => {
    setWarningModalOpen(false);
  }, [setWarningModalOpen]);

  const toolbar: JSX.Element = (
    <>
      <Toolbar id="event-templates-toolbar">
        <ToolbarContent>
          <ToolbarGroup variant="filter-group">
            <ToolbarItem>
              <TextInput
                name="templateFilter"
                id="templateFilter"
                type="search"
                placeholder="Filter..."
                aria-label="Event template filter"
                onChange={setFilterText}
              />
            </ToolbarItem>
          </ToolbarGroup>
          <ToolbarGroup variant="icon-button-group">
            <ToolbarItem>
              <Button key="upload" variant="secondary" onClick={handleModalToggle}>
                <UploadIcon />
              </Button>
            </ToolbarItem>
          </ToolbarGroup>
          <DeleteWarningModal
            warningType={DeleteWarningType.DeleteEventTemplates}
            visible={warningModalOpen}
            onAccept={handleWarningModalAccept}
            onClose={handleWarningModalClose}
          />
        </ToolbarContent>
      </Toolbar>
    </>
  );

  const authRetry = React.useCallback(() => {
    context.target.setAuthRetry();
  }, [context.target, context.target.setAuthRetry]);

  if (errorMessage != '') {
    return (
      <ErrorView
        title={'Error retrieving event templates'}
        message={errorMessage}
        retry={isAuthFail(errorMessage) ? authRetry : undefined}
      />
    );
  } else if (isLoading) {
    return (
      <>
        {toolbar}
        <LoadingView />
      </>
    );
  } else {
    return (
      <>
        {toolbar}
        <Table
          aria-label="Event Templates table"
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
          title="Create Custom Event Template"
          description="Create a customized event template. This is a specialized XML file with the extension .jfc, typically created using JDK Mission Control, which defines a set of events and their options to configure. Not all customized templates are applicable to all targets -- a template may specify a custom application event type, which is only available in targets running the associated application."
        >
          <Form>
            <FormGroup
              label="Template XML"
              isRequired
              fieldId="template"
              validated={fileRejected ? 'error' : 'default'}
            >
              <FileUpload
                id="template-file-upload"
                value={uploadFile}
                filename={uploadFilename}
                onChange={handleFileChange}
                isLoading={uploading}
                validated={fileRejected ? 'error' : 'default'}
                dropzoneProps={{
                  accept: '.xml,.jfc',
                  onDropRejected: handleFileRejected,
                }}
              />
            </FormGroup>
            <ActionGroup>
              <Button variant="primary" onClick={handleUploadSubmit} isDisabled={!uploadFilename}>
                Submit
              </Button>
              <Button variant="link" onClick={handleUploadCancel}>
                Cancel
              </Button>
            </ActionGroup>
          </Form>
        </Modal>
      </>
    );
  }
};
