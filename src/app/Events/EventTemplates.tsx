/*
 * Copyright The Cryostat Authors.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { CustomRecordingFormData } from '@app/CreateRecording/types';
import { ErrorView } from '@app/ErrorView/ErrorView';
import { authFailMessage, isAuthFail } from '@app/ErrorView/types';
import { DeleteWarningModal } from '@app/Modal/DeleteWarningModal';
import { DeleteOrDisableWarningType } from '@app/Modal/types';
import { FUpload, MultiFileUpload, UploadCallbacks } from '@app/Shared/Components/FileUploads';
import { LoadingView } from '@app/Shared/Components/LoadingView';
import { LoadingProps } from '@app/Shared/Components/types';
import { EventTemplate, NotificationCategory, Target } from '@app/Shared/Services/api.types';
import { ServiceContext } from '@app/Shared/Services/Services';
import { useSubscriptions } from '@app/utils/hooks/useSubscriptions';
import { portalRoot, sortResources, TableColumn } from '@app/utils/utils';
import {
  ActionGroup,
  Button,
  EmptyState,
  EmptyStateIcon,
  Form,
  FormGroup,
  Modal,
  ModalVariant,
  TextInput,
  Title,
  Toolbar,
  ToolbarContent,
  ToolbarGroup,
  ToolbarItem,
} from '@patternfly/react-core';
import { SearchIcon, UploadIcon } from '@patternfly/react-icons';
import {
  ActionsColumn,
  IAction,
  ISortBy,
  SortByDirection,
  TableComposable,
  TableVariant,
  Tbody,
  Td,
  Th,
  Thead,
  ThProps,
  Tr,
} from '@patternfly/react-table';
import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { forkJoin, Observable, of } from 'rxjs';
import { catchError, concatMap, defaultIfEmpty, filter, first, tap } from 'rxjs/operators';

const tableColumns: TableColumn[] = [
  {
    title: 'Name',
    keyPaths: ['name'],
    sortable: true,
  },
  {
    title: 'Description',
    keyPaths: ['description'],
    sortable: true,
  },
  {
    title: 'Provider',
    keyPaths: ['provider'],
    sortable: true,
  },
  {
    title: 'Type',
    keyPaths: ['type'],
    sortable: true,
  },
];

export interface EventTemplatesProps {}

export const EventTemplates: React.FC<EventTemplatesProps> = (_) => {
  const context = React.useContext(ServiceContext);
  const navigate = useNavigate();

  const [templates, setTemplates] = React.useState<EventTemplate[]>([]);
  const [filteredTemplates, setFilteredTemplates] = React.useState<EventTemplate[]>([]);
  const [filterText, setFilterText] = React.useState('');
  const [warningModalOpen, setWarningModalOpen] = React.useState(false);
  const [uploadModalOpen, setUploadModalOpen] = React.useState(false);
  const [sortBy, setSortBy] = React.useState<ISortBy>({});
  const [isLoading, setIsLoading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState('');
  const [templateToDelete, setTemplateToDelete] = React.useState<EventTemplate | undefined>(undefined);
  const addSubscription = useSubscriptions();

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
    [sortBy, setSortBy],
  );

  React.useEffect(() => {
    let filtered: EventTemplate[];
    if (!filterText) {
      filtered = templates;
    } else {
      const ft = filterText.trim().toLowerCase();
      filtered = templates.filter(
        (t: EventTemplate) =>
          t.name.toLowerCase().includes(ft) ||
          t.description.toLowerCase().includes(ft) ||
          t.provider.toLowerCase().includes(ft),
      );
    }

    setFilteredTemplates(
      sortResources(
        {
          index: sortBy.index ?? 0,
          direction: sortBy.direction ?? SortByDirection.asc,
        },
        filtered,
        tableColumns,
      ),
    );
  }, [filterText, templates, sortBy]);

  const handleTemplates = React.useCallback(
    (templates) => {
      setTemplates(templates);
      setIsLoading(false);
      setErrorMessage('');
    },
    [setTemplates, setIsLoading, setErrorMessage],
  );

  const handleError = React.useCallback(
    (error) => {
      setIsLoading(false);
      setErrorMessage(error.message);
    },
    [setIsLoading, setErrorMessage],
  );

  const refreshTemplates = React.useCallback(() => {
    setIsLoading(true);
    addSubscription(
      context.target
        .target()
        .pipe(
          filter((target) => !!target),
          first(),
          concatMap((target: Target) =>
            context.api.doGet<EventTemplate[]>(`targets/${encodeURIComponent(target.connectUrl)}/templates`),
          ),
        )
        .subscribe({
          next: handleTemplates,
          error: handleError,
        }),
    );
  }, [addSubscription, context.api, context.target, setIsLoading, handleTemplates, handleError]);

  React.useEffect(() => {
    addSubscription(
      context.target.target().subscribe(() => {
        setFilterText('');
        refreshTemplates();
      }),
    );
  }, [context.target, addSubscription, refreshTemplates]);

  React.useEffect(() => {
    addSubscription(
      context.notificationChannel
        .messages(NotificationCategory.TemplateUploaded)
        .subscribe((v) => setTemplates((old) => old.concat(v.message.template))),
    );
  }, [addSubscription, context, context.notificationChannel, setTemplates]);

  React.useEffect(() => {
    addSubscription(
      context.notificationChannel
        .messages(NotificationCategory.TemplateDeleted)
        .subscribe((v) =>
          setTemplates((old) =>
            old.filter((o) => o.name != v.message.template.name || o.type != v.message.template.type),
          ),
        ),
    );
  }, [addSubscription, context, context.notificationChannel, setTemplates]);

  React.useEffect(() => {
    if (!context.settings.autoRefreshEnabled()) {
      return;
    }
    const id = window.setInterval(
      () => refreshTemplates(),
      context.settings.autoRefreshPeriod() * context.settings.autoRefreshUnits(),
    );
    return () => window.clearInterval(id);
  }, [context.settings, refreshTemplates]);

  React.useEffect(() => {
    addSubscription(
      context.target.authFailure().subscribe(() => {
        setErrorMessage(authFailMessage);
      }),
    );
  }, [addSubscription, context.target, setErrorMessage]);

  const handleDelete = React.useCallback(
    (t: EventTemplate) => {
      addSubscription(
        context.api
          .deleteCustomEventTemplate(t.name)
          .pipe(first())
          .subscribe(() => undefined /* do nothing - notification will handle updating state */),
      );
    },
    [addSubscription, context.api],
  );

  const handleDeleteButton = React.useCallback(
    (t: EventTemplate) => {
      if (context.settings.deletionDialogsEnabledFor(DeleteOrDisableWarningType.DeleteEventTemplates)) {
        setTemplateToDelete(t);
        setWarningModalOpen(true);
      } else {
        handleDelete(t);
      }
    },
    [context.settings, setWarningModalOpen, setTemplateToDelete, handleDelete],
  );

  const actionsResolver = React.useCallback(
    (t: EventTemplate) => {
      let actions = [
        {
          title: 'Create recording...',
          onClick: () =>
            navigate('/recordings/create', {
              state: { template: { name: t.name, type: t.type } } as Partial<CustomRecordingFormData>,
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
    [context.api, navigate, handleDeleteButton],
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
          <Td key={`event-template-name-${index}`} dataLabel={tableColumns[0].title}>
            {t.name}
          </Td>
          <Td key={`event-template-description-${index}`} dataLabel={tableColumns[1].title}>
            {t.description}
          </Td>
          <Td key={`event-template-provider-${index}`} dataLabel={tableColumns[2].title}>
            {t.provider}
          </Td>
          <Td key={`event-template-type-${index}`} dataLabel={tableColumns[3].title}>
            {t.type.charAt(0).toUpperCase() + t.type.slice(1).toLowerCase()}
          </Td>
          <Td key={`event-template-action-${index}`} isActionCell style={{ paddingRight: '0' }}>
            <ActionsColumn items={actionsResolver(t)} />
          </Td>
        </Tr>
      )),
    [actionsResolver, filteredTemplates],
  );

  const handleWarningModalAccept = React.useCallback(() => {
    if (templateToDelete) {
      handleDelete(templateToDelete);
    } else {
      console.error('No template to delete');
    }
  }, [handleDelete, templateToDelete]);

  const handleWarningModalClose = React.useCallback(() => {
    setWarningModalOpen(false);
  }, [setWarningModalOpen]);

  const authRetry = React.useCallback(() => {
    context.target.setAuthRetry();
  }, [context.target]);

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
                  aria-label="Upload"
                  variant="secondary"
                  onClick={handleUploadModalOpen}
                  isDisabled={errorMessage != ''}
                >
                  <UploadIcon />
                </Button>
              </ToolbarItem>
            </ToolbarGroup>
            <DeleteWarningModal
              warningType={DeleteOrDisableWarningType.DeleteEventTemplates}
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
                {tableColumns.map(({ title, sortable }, index) => (
                  <Th key={`event-template-header-${title}`} sort={sortable ? getSortParams(index) : undefined}>
                    {title}
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

export const EventTemplatesUploadModal: React.FC<EventTemplatesUploadModalProps> = ({ onClose, ...props }) => {
  const addSubscription = useSubscriptions();
  const context = React.useContext(ServiceContext);
  const submitRef = React.useRef<HTMLDivElement>(null); // Use ref to refer to submit trigger div
  const abortRef = React.useRef<HTMLDivElement>(null); // Use ref to refer to abort trigger div

  const [numOfFiles, setNumOfFiles] = React.useState(0);
  const [allOks, setAllOks] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);

  const reset = React.useCallback(() => {
    setNumOfFiles(0);
    setUploading(false);
  }, [setNumOfFiles, setUploading]);

  const handleClose = React.useCallback(() => {
    if (uploading) {
      abortRef.current && abortRef.current.click();
    } else {
      reset();
      onClose();
    }
  }, [uploading, abortRef, reset, onClose]);

  const onFileSubmit = React.useCallback(
    (fileUploads: FUpload[], { getProgressUpdateCallback, onSingleSuccess, onSingleFailure }: UploadCallbacks) => {
      setUploading(true);

      const tasks: Observable<boolean>[] = [];

      fileUploads.forEach((fileUpload) => {
        tasks.push(
          context.api
            .addCustomEventTemplate(
              fileUpload.file,
              getProgressUpdateCallback(fileUpload.file.name),
              fileUpload.abortSignal,
            )
            .pipe(
              tap({
                next: (_) => {
                  onSingleSuccess(fileUpload.file.name);
                },
                error: (err) => {
                  onSingleFailure(fileUpload.file.name, err);
                },
              }),
              catchError((_) => of(false)),
            ),
        );
      });

      addSubscription(
        forkJoin(tasks)
          .pipe(defaultIfEmpty([true]))
          .subscribe((oks) => {
            setUploading(false);
            setAllOks(oks.reduce((prev, curr, _) => prev && curr, true));
          }),
      );
    },
    [addSubscription, context.api, setUploading, setAllOks],
  );

  const handleSubmit = React.useCallback(() => {
    submitRef.current && submitRef.current.click();
  }, [submitRef]);

  const onFilesChange = React.useCallback(
    (fileUploads: FUpload[]) => {
      setAllOks(!fileUploads.some((f) => !f.progress || f.progress.progressVariant !== 'success'));
      setNumOfFiles(fileUploads.length);
    },
    [setNumOfFiles, setAllOks],
  );

  const submitButtonLoadingProps = React.useMemo(
    () =>
      ({
        spinnerAriaValueText: 'Submitting',
        spinnerAriaLabel: 'submitting-custom-event-template',
        isLoading: uploading,
      }) as LoadingProps,
    [uploading],
  );

  return (
    <Modal
      appendTo={portalRoot}
      isOpen={props.isOpen}
      variant={ModalVariant.large}
      showClose={true}
      onClose={handleClose}
      title="Create Custom Event Template"
      description="Create a customized event template. This is a specialized XML file with the extension .jfc, typically created using JDK Mission Control, which defines a set of events and their options to configure. Not all customized templates are applicable to all targets -- a template may specify a custom application event type, which is only available in targets running the associated application."
    >
      <Form>
        <FormGroup label="Template XML" isRequired fieldId="template">
          <MultiFileUpload
            submitRef={submitRef}
            abortRef={abortRef}
            uploading={uploading}
            displayAccepts={['XML', 'JFC']}
            onFileSubmit={onFileSubmit}
            onFilesChange={onFilesChange}
          />
        </FormGroup>
        <ActionGroup>
          {allOks && numOfFiles ? (
            <Button variant="primary" onClick={handleClose}>
              Close
            </Button>
          ) : (
            <>
              <Button
                variant="primary"
                onClick={handleSubmit}
                isDisabled={!numOfFiles || uploading}
                {...submitButtonLoadingProps}
              >
                {uploading ? 'Submitting' : 'Submit'}
              </Button>
              <Button variant="link" onClick={handleClose}>
                Cancel
              </Button>
            </>
          )}
        </ActionGroup>
      </Form>
    </Modal>
  );
};
