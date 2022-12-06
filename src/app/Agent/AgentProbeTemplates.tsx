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
  StackItem,
  Stack,
  Dropdown,
  DropdownItem,
  KebabToggle,
  DropdownPosition,
  EmptyState,
  EmptyStateIcon,
  Title,
} from '@patternfly/react-core';
import { SearchIcon, UploadIcon } from '@patternfly/react-icons';
import {
  TableVariant,
  ISortBy,
  SortByDirection,
  Tr,
  Td,
  ThProps,
  TableComposable,
  Tbody,
  Th,
  Thead,
} from '@patternfly/react-table';
import { first } from 'rxjs/operators';
import { LoadingView } from '@app/LoadingView/LoadingView';
import { ErrorView } from '@app/ErrorView/ErrorView';
import { ProbeTemplate } from '@app/Shared/Services/Api.service';
import { DeleteWarningType } from '@app/Modal/DeleteWarningUtils';
import { DeleteWarningModal } from '@app/Modal/DeleteWarningModal';
import { AboutAgentCard } from './AboutAgentCard';
import { NotificationsContext } from '@app/Notifications/Notifications';
import { LoadingPropsType } from '@app/Shared/ProgressIndicator';

export interface AgentProbeTemplatesProps {
  agentDetected: boolean;
}

export const AgentProbeTemplates: React.FunctionComponent<AgentProbeTemplatesProps> = (props) => {
  const context = React.useContext(ServiceContext);
  const addSubscription = useSubscriptions();

  const [templates, setTemplates] = React.useState([] as ProbeTemplate[]);
  const [filteredTemplates, setFilteredTemplates] = React.useState([] as ProbeTemplate[]);
  const [filterText, setFilterText] = React.useState('');
  const [uploadModalOpen, setUploadModalOpen] = React.useState(false);
  const [sortBy, setSortBy] = React.useState({} as ISortBy);
  const [isLoading, setIsLoading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState('');
  const [templateToDelete, setTemplateToDelete] = React.useState(undefined as ProbeTemplate | undefined);
  const [warningModalOpen, setWarningModalOpen] = React.useState(false);

  const tableColumns: string[] = ['Name', 'XML'];

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
      context.api.getProbeTemplates().subscribe({
        next: (value) => handleTemplates(value),
        error: (err) => handleError(err),
      })
    );
  }, [addSubscription, context.api, setIsLoading, handleTemplates, handleError]);

  const handleDelete = React.useCallback(
    (template: ProbeTemplate) => {
      addSubscription(
        context.api
          .deleteCustomProbeTemplate(template.name)
          .pipe(first())
          .subscribe(() => {
            /** Do nothing. Notifications hook will handle */
          })
      );
    },
    [addSubscription, context.api]
  );

  const handleWarningModalAccept = React.useCallback(() => {
    handleDelete(templateToDelete!);
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

  React.useEffect(() => {
    refreshTemplates();
  }, [refreshTemplates]);

  React.useEffect(() => {
    if (!context.settings.autoRefreshEnabled()) {
      return;
    }
    const id = window.setInterval(
      () => refreshTemplates(),
      context.settings.autoRefreshPeriod() * context.settings.autoRefreshUnits()
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
              name: event.message.templateName,
              xml: event.message.templateContent,
            } as ProbeTemplate,
          ];
        });
      })
    );
  }, [addSubscription, context.notificationChannel, setTemplates]);

  React.useEffect(() => {
    addSubscription(
      context.notificationChannel.messages(NotificationCategory.ProbeTemplateDeleted).subscribe((event) => {
        setTemplates((old) => old.filter((t) => t.name !== event.message.probeTemplate));
      })
    );
  }, [addSubscription, context.notificationChannel, setTemplates]);

  React.useEffect(() => {
    let filtered: ProbeTemplate[];
    if (!filterText) {
      filtered = templates;
    } else {
      const ft = filterText.trim().toLowerCase();
      filtered = templates.filter(
        (t: ProbeTemplate) => t.name.toLowerCase().includes(ft) || t.xml.toLowerCase().includes(ft)
      );
    }
    const { index, direction } = sortBy;
    if (typeof index === 'number') {
      const keys = ['name', 'xml'];
      const key = keys[index];
      const sorted = filtered.sort((a, b) => (a[key] < b[key] ? -1 : a[key] > b[key] ? 1 : 0));
      filtered = direction === SortByDirection.asc ? sorted : sorted.reverse();
    }
    setFilteredTemplates([...filtered]);
  }, [filterText, templates, sortBy, setFilteredTemplates]);

  const handleDeleteAction = React.useCallback(
    (template: ProbeTemplate) => {
      if (context.settings.deletionDialogsEnabledFor(DeleteWarningType.DeleteEventTemplates)) {
        setTemplateToDelete(template);
        setWarningModalOpen(true);
      } else {
        handleDelete(template);
      }
    },
    [context.settings, setWarningModalOpen, setTemplateToDelete, handleDelete]
  );

  const handleInsertAction = React.useCallback(
    (template: ProbeTemplate) => {
      addSubscription(
        context.api
          .insertProbes(template.name)
          .pipe(first())
          .subscribe(() => {})
      );
    },
    [addSubscription, context.api]
  );

  const templateRows = React.useMemo(
    () =>
      filteredTemplates.map((t: ProbeTemplate, index) => {
        return (
          <Tr key={`probe-template-${index}`}>
            <Td key={`probe-template-name-${index}`} dataLabel={tableColumns[0]}>
              {t.name}
            </Td>
            <Td key={`probe-template-xml-${index}`} dataLabel={tableColumns[1]}>
              {t.xml}
            </Td>
            <Td key={`probe-template-action-${index}`} isActionCell style={{ paddingRight: '0' }}>
              <AgentTemplateAction
                template={t}
                onDelete={handleDeleteAction}
                onInsert={props.agentDetected ? handleInsertAction : undefined}
              />
            </Td>
          </Tr>
        );
      }),
    [filteredTemplates]
  );

  if (errorMessage != '') {
    return (
      <ErrorView
        title={'Error retrieving probe templates'}
        message={`${errorMessage}. Note: This is commonly caused by the agent not being loaded/active. Check that the target was started with the agent (-javaagent:/path/to/agent.jar).`}
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
                      aria-label="Probe template filter"
                      onChange={setFilterText}
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
                  warningType={DeleteWarningType.DeleteProbeTemplates}
                  visible={warningModalOpen}
                  onAccept={handleWarningModalAccept}
                  onClose={handleWarningModalClose}
                />
              </ToolbarContent>
            </Toolbar>
            {templateRows.length ? (
              <TableComposable aria-label="Probe Templates Table" variant={TableVariant.compact}>
                <Thead>
                  <Tr>
                    {tableColumns.map((column, index) => (
                      <Th key={`probe-template-header-${column}`} sort={getSortParams(index)}>
                        {column}
                      </Th>
                    ))}
                  </Tr>
                </Thead>
                <Tbody>{...templateRows}</Tbody>
              </TableComposable>
            ) : (
              <EmptyState>
                <EmptyStateIcon icon={SearchIcon} />
                <Title headingLevel="h4" size="lg">
                  No Probe Templates
                </Title>
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

export const AgentProbeTemplateUploadModal: React.FunctionComponent<AgentProbeTemplateUploadModalProps> = (props) => {
  const [uploadFile, setUploadFile] = React.useState(undefined as File | undefined);
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

  const handleFileChange = React.useCallback(
    (file, filename) => {
      setFileRejected(false);
      setUploadFile(file);
      setUploadFilename(filename);
    },
    [setFileRejected, setUploadFile, setUploadFilename]
  );

  const handleFileRejected = React.useCallback(() => {
    setFileRejected(true);
  }, [setFileRejected]);

  const handleClose = React.useCallback(() => {
    reset();
    props.onClose();
  }, [reset, props.onClose]);

  const handleUploadSubmit = React.useCallback(() => {
    if (fileRejected) {
      notifications.warning('File format is not compatible');
      return;
    }
    if (!uploadFile) {
      notifications.warning('Attempted to submit probe template upload without a file selected');
      return;
    }
    setUploading(true);
    addSubscription(
      context.api
        .addCustomProbeTemplate(uploadFile)
        .pipe(first())
        .subscribe((success) => {
          setUploading(false);
          if (success) {
            handleClose();
          }
        })
    );
  }, [fileRejected, uploadFile, setUploading, addSubscription, context.api, handleClose]);

  const submitButtonLoadingProps = React.useMemo(
    () =>
      ({
        spinnerAriaValueText: 'Submitting',
        spinnerAriaLabel: 'submitting-probe-template',
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
      title="Create Custom Probe Template"
      description="Create a customized probe template. This is a specialized XML file typically created using JDK Mission Control, which defines a set of events to inject and their options to configure."
    >
      <Form>
        <FormGroup label="Template XML" isRequired fieldId="template" validated={fileRejected ? 'error' : 'default'}>
          <FileUpload
            id="probetemplateName"
            value={uploadFile}
            filename={uploadFilename}
            onChange={handleFileChange}
            isDisabled={uploading}
            isLoading={uploading}
            validated={fileRejected ? 'error' : 'default'}
            dropzoneProps={{
              accept: '.xml',
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
            Submit
          </Button>
          <Button variant="link" onClick={handleClose} isDisabled={uploading}>
            Cancel
          </Button>
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

export const AgentTemplateAction: React.FunctionComponent<AgentTemplateActionProps> = (props) => {
  const [isOpen, setIsOpen] = React.useState(false);

  const actionItems = React.useMemo(() => {
    return [
      {
        key: 'insert-template',
        title: 'Insert Probes...',
        onClick: () => props.onInsert && props.onInsert(props.template),
        isDisabled: !props.onInsert,
      },
      {
        key: 'delete-template',
        title: 'Delete',
        onClick: () => props.onDelete(props.template),
      },
    ];
  }, [props.onInsert, props.onDelete, props.template]);

  return (
    <Dropdown
      isPlain
      isOpen={isOpen}
      toggle={<KebabToggle id="probe-template-toggle-kebab" onToggle={setIsOpen} />}
      menuAppendTo={document.body}
      position={DropdownPosition.right}
      isFlipEnabled
      dropdownItems={actionItems.map((action) => (
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
      ))}
    />
  );
};
