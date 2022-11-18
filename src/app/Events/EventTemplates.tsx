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
  EmptyState,
  EmptyStateIcon,
  Title,
} from '@patternfly/react-core';
import { SearchIcon, UploadIcon } from '@patternfly/react-icons';
import {
  TableVariant,
  IAction,
  ISortBy,
  SortByDirection,
  TableComposable,
  Thead,
  Tbody,
  Tr,
  Th,
  ThProps,
  Td,
  ActionsColumn,
} from '@patternfly/react-table';
import { useHistory } from 'react-router-dom';
import { concatMap, filter, first } from 'rxjs/operators';
import { LoadingView } from '@app/LoadingView/LoadingView';
import { authFailMessage, ErrorView, isAuthFail } from '@app/ErrorView/ErrorView';
import { DeleteWarningType } from '@app/Modal/DeleteWarningUtils';
import { DeleteWarningModal } from '@app/Modal/DeleteWarningModal';
import { NotificationsContext } from '@app/Notifications/Notifications';
import { LoadingPropsType } from '@app/Shared/ProgressIndicator';

export interface EventTemplatesProps {}

export const EventTemplates: React.FunctionComponent<EventTemplatesProps> = (props) => {
  const context = React.useContext(ServiceContext);
  const history = useHistory();

  const [templates, setTemplates] = React.useState([] as EventTemplate[]);
  const [filteredTemplates, setFilteredTemplates] = React.useState([] as EventTemplate[]);
  const [filterText, setFilterText] = React.useState('');
  const [warningModalOpen, setWarningModalOpen] = React.useState(false);
  const [uploadModalOpen, setUploadModalOpen] = React.useState(false);
  const [sortBy, setSortBy] = React.useState({} as ISortBy);
  const [isLoading, setIsLoading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState('');
  const [templateToDelete, setTemplateToDelete] = React.useState<EventTemplate | undefined>(undefined);
  const addSubscription = useSubscriptions();

  const tableColumns = ['Name', 'Description', 'Provider', 'Type'];

  const getSortParams = React.useCallback(
    (columnIndex: number): ThProps['sort'] => ({
      sortBy: sortBy,
      onSort: (_event, index, direction) => {
        setSortBy({
          index: index,
          direction: direction,
        });
      },
      columnIndex,
    }),
    [sortBy, setSortBy]
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
      setTemplates(templates);
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
    addSubscription(
      context.target.authFailure().subscribe(() => {
        setErrorMessage(authFailMessage);
      })
    );
  }, [addSubscription, context.target, setErrorMessage]);

  const handleDelete = React.useCallback(
    (t: EventTemplate) => {
      addSubscription(
        context.api
          .deleteCustomEventTemplate(t.name)
          .pipe(first())
          .subscribe(() => {} /* do nothing - notification will handle updating state */)
      );
    },
    [addSubscription, context.api]
  );

  const handleDeleteButton = React.useCallback(
    (t: EventTemplate) => {
      if (context.settings.deletionDialogsEnabledFor(DeleteWarningType.DeleteEventTemplates)) {
        setTemplateToDelete(t);
        setWarningModalOpen(true);
      } else {
        handleDelete(t);
      }
    },
    [context, context.settings, setWarningModalOpen, setTemplateToDelete, handleDelete]
  );

  const actionsResolver = React.useCallback(
    (t: EventTemplate) => {
      let actions = [
        {
          title: 'Create Recording...',
          onClick: () =>
            history.push({
              pathname: '/recordings/create',
              state: { template: t.name, templateType: t.type },
            }),
        },
      ] as IAction[];

      if (t.name !== 'ALL' || t.type !== 'TARGET') {
        actions = actions.concat([
          {
            title: 'Download',
            onClick: () => context.api.downloadTemplate(t),
          },
        ]);
      }
      if (t.type === 'CUSTOM') {
        actions = actions.concat([
          {
            isSeparator: true,
          },
          {
            title: 'Delete',
            onClick: () => handleDeleteButton(t),
          },
        ]);
      }
      return actions;
    },
    [context.api, history]
  );

  const handleUploadModalClose = React.useCallback(() => {
    setUploadModalOpen(false);
  }, [setUploadModalOpen]);

  const handleUploadModalOpen = React.useCallback(() => {
    setUploadModalOpen(true);
  }, [setUploadModalOpen]);

  const templateRows = React.useMemo(
    () =>
      filteredTemplates.map((t: EventTemplate, index) => (
        <Tr key={`event-template-${index}`}>
          <Td key={`event-template-name-${index}`} dataLabel={tableColumns[0]}>
            {t.name}
          </Td>
          <Td key={`event-template-description-${index}`} dataLabel={tableColumns[1]}>
            {t.description}
          </Td>
          <Td key={`event-template-provider-${index}`} dataLabel={tableColumns[2]}>
            {t.provider}
          </Td>
          <Td key={`event-template-type-${index}`} dataLabel={tableColumns[3]}>
            {t.type.charAt(0).toUpperCase() + t.type.slice(1).toLowerCase()}
          </Td>
          <Td key={`event-template-action-${index}`} isActionCell style={{ paddingRight: '0' }}>
            <ActionsColumn items={actionsResolver(t)} />
          </Td>
        </Tr>
      )),
    [filteredTemplates]
  );

  const handleWarningModalAccept = React.useCallback(() => {
    handleDelete(templateToDelete!);
  }, [handleDelete, templateToDelete]);

  const handleWarningModalClose = React.useCallback(() => {
    setWarningModalOpen(false);
  }, [setWarningModalOpen]);

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
    return <LoadingView />;
  } else {
    return (
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
                  value={filterText}
                  isDisabled={errorMessage != ''}
                />
              </ToolbarItem>
            </ToolbarGroup>
            <ToolbarGroup variant="icon-button-group">
              <ToolbarItem>
                <Button
                  key="upload"
                  variant="secondary"
                  onClick={handleUploadModalOpen}
                  isDisabled={errorMessage != ''}
                >
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
        {templateRows.length ? (
          <TableComposable aria-label="Event Templates Table" variant={TableVariant.compact}>
            <Thead>
              <Tr>
                {tableColumns.map((column, index) => (
                  <Th key={`event-template-header-${column}`} sort={getSortParams(index)}>
                    {column}
                  </Th>
                ))}
              </Tr>
            </Thead>
            <Tbody>{templateRows}</Tbody>
          </TableComposable>
        ) : (
          <EmptyState>
            <EmptyStateIcon icon={SearchIcon} />
            <Title headingLevel="h4" size="lg">
              No Event Templates
            </Title>
          </EmptyState>
        )}
        <EventTemplatesUploadModal isOpen={uploadModalOpen} onClose={handleUploadModalClose} />
      </>
    );
  }
};

export interface EventTemplatesUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const EventTemplatesUploadModal: React.FunctionComponent<EventTemplatesUploadModalProps> = (props) => {
  const [uploadFile, setUploadFile] = React.useState<File | undefined>(undefined);
  const [uploadFilename, setUploadFilename] = React.useState('');
  const [uploading, setUploading] = React.useState(false);
  const [fileRejected, setFileRejected] = React.useState(false);
  const addSubscription = useSubscriptions();
  const context = React.useContext(ServiceContext);
  const notifications = React.useContext(NotificationsContext);

  const reset = React.useCallback(() => {
    setUploadFile(undefined);
    setUploadFilename('');
    setUploading(false);
    setFileRejected(false);
  }, [setUploadFile, setUploadFilename, setUploading, setFileRejected]);

  const handleClose = React.useCallback(() => {
    reset();
    props.onClose();
  }, [reset, props.onClose]);

  const handleFileRejected = React.useCallback(() => {
    setFileRejected(true);
  }, [setFileRejected]);

  const handleFileChange = React.useCallback(
    (file, filename) => {
      setFileRejected(false);
      setUploadFile(file);
      setUploadFilename(filename);
    },
    [setFileRejected, setUploadFile, setUploadFilename]
  );

  const handleUploadSubmit = React.useCallback(() => {
    if (fileRejected) {
      notifications.warning('File format is not compatible');
      return;
    }
    if (!uploadFile) {
      notifications.warning('Attempted to submit template upload without a file selected');
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
            handleClose();
          }
        })
    );
  }, [fileRejected, uploadFile, window.console, setUploading, addSubscription, context.api, handleClose]);

  const submitButtonLoadingProps = React.useMemo(
    () =>
      ({
        spinnerAriaValueText: 'Submitting',
        spinnerAriaLabel: 'submitting-custom-event-template',
        isLoading: uploading,
      } as LoadingPropsType),
    [uploading]
  );

  return (
    <Modal
      isOpen={props.isOpen}
      variant={ModalVariant.large}
      showClose={!uploading}
      onClose={handleClose}
      title="Create Custom Event Template"
      description="Create a customized event template. This is a specialized XML file with the extension .jfc, typically created using JDK Mission Control, which defines a set of events and their options to configure. Not all customized templates are applicable to all targets -- a template may specify a custom application event type, which is only available in targets running the associated application."
    >
      <Form>
        <FormGroup label="Template XML" isRequired fieldId="template" validated={fileRejected ? 'error' : 'default'}>
          <FileUpload
            id="template-file-upload"
            value={uploadFile}
            filename={uploadFilename}
            onChange={handleFileChange}
            isDisabled={uploading}
            isLoading={uploading}
            validated={fileRejected ? 'error' : 'default'}
            dropzoneProps={{
              accept: '.xml,.jfc',
              onDropRejected: handleFileRejected,
            }}
          />
        </FormGroup>
        <ActionGroup>
          <Button
            variant="primary"
            onClick={handleUploadSubmit}
            isDisabled={!uploadFilename || uploading}
            {...submitButtonLoadingProps}
          >
            {uploading ? 'Submitting' : 'Submit'}
          </Button>
          <Button variant="link" onClick={handleClose} isDisabled={uploading}>
            Cancel
          </Button>
        </ActionGroup>
      </Form>
    </Modal>
  );
};
