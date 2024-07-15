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
import { ErrorView } from '@app/ErrorView/ErrorView';
import { DeleteWarningModal } from '@app/Modal/DeleteWarningModal';
import { DeleteOrDisableWarningType } from '@app/Modal/types';
import { FUpload, MultiFileUpload, UploadCallbacks } from '@app/Shared/Components/FileUploads';
import { LoadingView } from '@app/Shared/Components/LoadingView';
import { LoadingProps } from '@app/Shared/Components/types';
import { ProbeTemplate, NotificationCategory } from '@app/Shared/Services/api.types';
import { ServiceContext } from '@app/Shared/Services/Services';
import { useSubscriptions } from '@app/utils/hooks/useSubscriptions';
import { TableColumn, portalRoot, sortResources } from '@app/utils/utils';
import {
  ActionGroup,
  Button,
  EmptyState,
  EmptyStateIcon,
  Form,
  FormGroup,
  Modal,
  ModalVariant,
  Stack,
  StackItem,
  TextInput,
  Toolbar,
  ToolbarContent,
  ToolbarGroup,
  ToolbarItem,
  EmptyStateHeader,
  Dropdown,
  DropdownItem,
  DropdownList,
  MenuToggleElement,
  MenuToggle,
} from '@patternfly/react-core';
import { SearchIcon, EllipsisVIcon, UploadIcon } from '@patternfly/react-icons';
import {
  ISortBy,
  SortByDirection,
  Table,
  TableVariant,
  Tbody,
  Td,
  Th,
  Thead,
  ThProps,
  Tr,
} from '@patternfly/react-table';
import * as React from 'react';
import { forkJoin, Observable, of } from 'rxjs';
import { catchError, defaultIfEmpty, first, tap } from 'rxjs/operators';
import { AboutAgentCard } from './AboutAgentCard';

const tableColumns: TableColumn[] = [
  {
    title: 'Name',
    keyPaths: ['name'],
    sortable: true,
  },
  {
    title: 'XML',
    keyPaths: ['xml'],
    sortable: true,
  },
];

export interface AgentProbeTemplatesProps {
  agentDetected: boolean;
}

export const AgentProbeTemplates: React.FC<AgentProbeTemplatesProps> = ({ agentDetected }) => {
  const context = React.useContext(ServiceContext);
  const addSubscription = useSubscriptions();

  const [templates, setTemplates] = React.useState<ProbeTemplate[]>([]);
  const [filteredTemplates, setFilteredTemplates] = React.useState<ProbeTemplate[]>([]);
  const [filterText, setFilterText] = React.useState('');
  const [uploadModalOpen, setUploadModalOpen] = React.useState(false);
  const [sortBy, setSortBy] = React.useState<ISortBy>({});
  const [isLoading, setIsLoading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState('');
  const [templateToDelete, setTemplateToDelete] = React.useState<ProbeTemplate | undefined>(undefined);
  const [warningModalOpen, setWarningModalOpen] = React.useState(false);

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

  const handleTemplates = React.useCallback(
    (templates: ProbeTemplate[]) => {
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
      context.api.getProbeTemplates().subscribe({
        next: (value) => handleTemplates(value),
        error: (err) => handleError(err),
      }),
    );
  }, [addSubscription, context.api, setIsLoading, handleTemplates, handleError]);

  const handleDelete = React.useCallback(
    (template: ProbeTemplate) => {
      addSubscription(
        context.api.deleteCustomProbeTemplate(template.name).subscribe(() => {
          /** Do nothing. Notifications hook will handle */
        }),
      );
    },
    [addSubscription, context.api],
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

  const handleTemplateUpload = React.useCallback(() => {
    setUploadModalOpen(true);
  }, [setUploadModalOpen]);

  const handleUploadModalClose = React.useCallback(() => {
    setUploadModalOpen(false);
  }, [setUploadModalOpen]);

  const handleFilterTextChange = React.useCallback((_, value: string) => setFilterText(value), [setFilterText]);

  React.useEffect(() => {
    refreshTemplates();
  }, [refreshTemplates]);

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
      context.notificationChannel.messages(NotificationCategory.ProbeTemplateUploaded).subscribe((event) => {
        setTemplates((old) => {
          return [
            ...old,
            {
              name: event.message.probeTemplate,
              xml: event.message.templateContent,
            } as ProbeTemplate,
          ];
        });
      }),
    );
  }, [addSubscription, context.notificationChannel, setTemplates]);

  React.useEffect(() => {
    addSubscription(
      context.notificationChannel.messages(NotificationCategory.ProbeTemplateDeleted).subscribe((event) => {
        setTemplates((old) => old.filter((t) => t.name !== event.message.probeTemplate));
      }),
    );
  }, [addSubscription, context.notificationChannel, setTemplates]);

  React.useEffect(() => {
    let filtered: ProbeTemplate[];
    if (!filterText) {
      filtered = templates;
    } else {
      const ft = filterText.trim().toLowerCase();
      filtered = templates.filter(
        (t: ProbeTemplate) => t.name.toLowerCase().includes(ft) || t.xml.toLowerCase().includes(ft),
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
  }, [filterText, templates, sortBy, setFilteredTemplates]);

  const handleDeleteAction = React.useCallback(
    (template: ProbeTemplate) => {
      if (context.settings.deletionDialogsEnabledFor(DeleteOrDisableWarningType.DeleteEventTemplates)) {
        setTemplateToDelete(template);
        setWarningModalOpen(true);
      } else {
        handleDelete(template);
      }
    },
    [context.settings, setWarningModalOpen, setTemplateToDelete, handleDelete],
  );

  const handleInsertAction = React.useCallback(
    (template: ProbeTemplate) => {
      addSubscription(
        context.api
          .insertProbes(template.name)
          .pipe(first())
          .subscribe(() => undefined),
      );
    },
    [addSubscription, context.api],
  );

  const templateRows = React.useMemo(
    () =>
      filteredTemplates.map((t: ProbeTemplate, index) => {
        return (
          <Tr key={`probe-template-${index}`}>
            <Td key={`probe-template-name-${index}`} dataLabel={tableColumns[0].title}>
              {t.name}
            </Td>
            <Td key={`probe-template-xml-${index}`} dataLabel={tableColumns[1].title}>
              {t.xml}
            </Td>
            <Td key={`probe-template-action-${index}`} isActionCell style={{ paddingRight: '0' }}>
              <AgentTemplateAction
                template={t}
                onDelete={handleDeleteAction}
                onInsert={agentDetected ? handleInsertAction : undefined}
              />
            </Td>
          </Tr>
        );
      }),
    [filteredTemplates, agentDetected, handleInsertAction, handleDeleteAction],
  );

  if (errorMessage != '') {
    return (
      <ErrorView
        title={'Error retrieving probe templates'}
        message={`${errorMessage}. Note: This error is generally caused when the agent is not loaded or is not active. Check that the target was started with the agent (-javaagent:/path/to/agent.jar).`}
      />
    );
  } else if (isLoading) {
    return <LoadingView />;
  } else {
    return (
      <>
        <Stack hasGutter style={{ marginTop: '1em', marginBottom: '1.5em' }}>
          <StackItem>
            <AboutAgentCard />
          </StackItem>
          <StackItem>
            <Toolbar id="probe-templates-toolbar">
              <ToolbarContent>
                <ToolbarGroup variant="filter-group">
                  <ToolbarItem>
                    <TextInput
                      name="templateFilter"
                      id="templateFilter"
                      type="search"
                      placeholder="Filter..."
                      aria-label="Probe Template filter"
                      onChange={handleFilterTextChange}
                      value={filterText}
                    />
                  </ToolbarItem>
                </ToolbarGroup>
                <ToolbarGroup variant="icon-button-group">
                  <ToolbarItem>
                    <Button key="upload" variant="secondary" aria-label="Upload" onClick={handleTemplateUpload}>
                      <UploadIcon />
                    </Button>
                  </ToolbarItem>
                </ToolbarGroup>
                <DeleteWarningModal
                  warningType={DeleteOrDisableWarningType.DeleteProbeTemplates}
                  visible={warningModalOpen}
                  onAccept={handleWarningModalAccept}
                  onClose={handleWarningModalClose}
                />
              </ToolbarContent>
            </Toolbar>
            {templateRows.length ? (
              <Table aria-label="Probe Templates table" variant={TableVariant.compact}>
                <Thead>
                  <Tr>
                    {tableColumns.map(({ title, sortable }, index) => (
                      <Th key={`probe-template-header-${title}`} sort={sortable ? getSortParams(index) : undefined}>
                        {title}
                      </Th>
                    ))}
                  </Tr>
                </Thead>
                <Tbody>{...templateRows}</Tbody>
              </Table>
            ) : (
              <EmptyState>
                <EmptyStateHeader
                  titleText="No Probe Templates"
                  icon={<EmptyStateIcon icon={SearchIcon} />}
                  headingLevel="h4"
                />
              </EmptyState>
            )}
            <AgentProbeTemplateUploadModal isOpen={uploadModalOpen} onClose={handleUploadModalClose} />
          </StackItem>
        </Stack>
      </>
    );
  }
};

export interface AgentProbeTemplateUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AgentProbeTemplateUploadModal: React.FC<AgentProbeTemplateUploadModalProps> = ({ onClose, isOpen }) => {
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
            .addCustomProbeTemplate(
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
    [addSubscription, context.api, setAllOks, setUploading],
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
        spinnerAriaLabel: 'submitting-probe-template',
        isLoading: uploading,
      }) as LoadingProps,
    [uploading],
  );

  return (
    <Modal
      appendTo={portalRoot}
      isOpen={isOpen}
      variant={ModalVariant.large}
      showClose={true}
      onClose={handleClose}
      title="Create custom Probe Template"
      description="Create a customized Probe Template. This is a specialized XML file typically created using JDK Mission Control, which defines a set of events to inject and their options to configure."
    >
      <Form>
        <FormGroup label="Template XML" isRequired fieldId="template">
          <MultiFileUpload
            submitRef={submitRef}
            abortRef={abortRef}
            uploading={uploading}
            dropZoneAccepts={{
              'application/xml': ['.xml'],
            }}
            displayAccepts={['XML']}
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
                Submit
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

export interface AgentTemplateActionProps {
  template: ProbeTemplate;
  onInsert?: (template: ProbeTemplate) => void;
  onDelete: (template: ProbeTemplate) => void;
}

export const AgentTemplateAction: React.FC<AgentTemplateActionProps> = ({ onInsert, onDelete, template }) => {
  const [isOpen, setIsOpen] = React.useState(false);

  const actionItems = React.useMemo(() => {
    return [
      {
        key: 'insert-template',
        title: 'Insert probes...',
        onClick: () => onInsert && onInsert(template),
        isDisabled: !onInsert,
      },
      {
        key: 'delete-template',
        title: 'Delete',
        onClick: () => onDelete(template),
      },
    ];
  }, [onInsert, onDelete, template]);

  const handleToggle = React.useCallback((_, opened: boolean) => setIsOpen(opened), [setIsOpen]);

  const dropdownItems = React.useMemo(
    () =>
      actionItems.map((action) => (
        <DropdownItem
          key={action.key}
          onClick={() => {
            setIsOpen(false);
            action.onClick();
          }}
          isDisabled={action.isDisabled}
        >
          {action.title}
        </DropdownItem>
      )),
    [actionItems, setIsOpen],
  );

  return (
    <Dropdown
      isPlain
      toggle={(toggleRef: React.Ref<MenuToggleElement>) => (
        <MenuToggle ref={toggleRef} onClick={(event) => handleToggle(event, !isOpen)}>
          <EllipsisVIcon />
        </MenuToggle>
      )}
      isOpen={isOpen}
      popperProps={{
        appendTo: document.body,
        position: 'right',
        enableFlip: true,
      }}
    >
      <DropdownList>{dropdownItems}</DropdownList>
    </Dropdown>
  );
};
