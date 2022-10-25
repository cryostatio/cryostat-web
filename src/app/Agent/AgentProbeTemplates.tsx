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
  Card,
  CardBody,
  CardHeaderMain,
  CardHeader,
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
  Text,
  TextVariants,
  StackItem,
  Stack,
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
import { first } from 'rxjs/operators';
import { LoadingView } from '@app/LoadingView/LoadingView';
import { ErrorView } from '@app/ErrorView/ErrorView';
import { ProbeTemplate } from '@app/Shared/Services/Api.service';
import { DeleteWarningType } from '@app/Modal/DeleteWarningUtils';
import { DeleteWarningModal } from '@app/Modal/DeleteWarningModal';

export interface AgentProbeTemplatesProps {
  agentDetected: boolean;
}

export const AgentProbeTemplates: React.FunctionComponent<AgentProbeTemplatesProps> = (props) => {
  const context = React.useContext(ServiceContext);
  const addSubscription = useSubscriptions();

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
  const [rowDeleteData, setRowDeleteData] = React.useState({} as IRowData);
  const [warningModalOpen, setWarningModalOpen] = React.useState(false);

  const tableColumns = React.useMemo(() => [{ title: 'Name', transforms: [sortable] }, { title: 'XML' }], [sortable]);

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
    (rowData) => {
      addSubscription(
        context.api
          .deleteCustomProbeTemplate(rowData[0])
          .pipe(first())
          .subscribe(() => {
            /** Do nothing. Notifications hook will handle */
          })
      );
    },
    [addSubscription, context.api]
  );

  const handleUploadCancel = React.useCallback(() => {
    setUploadFile(undefined);
    setUploadFilename('');
    setModalOpen(false);
  }, [setUploadFile, setUploadFilename, setModalOpen]);

  const handleDeleteButton = React.useCallback(
    (rowData) => {
      if (context.settings.deletionDialogsEnabledFor(DeleteWarningType.DeleteEventTemplates)) {
        setRowDeleteData(rowData);
        setWarningModalOpen(true);
      } else {
        handleDelete(rowData);
      }
    },
    [context.settings, setWarningModalOpen, setRowDeleteData, handleDelete]
  );

  const handleWarningModalAccept = React.useCallback(() => {
    handleDelete(rowDeleteData);
  }, [handleDelete, rowDeleteData]);

  const handleWarningModalClose = React.useCallback(() => {
    setWarningModalOpen(false);
  }, [setWarningModalOpen]);

  const handleFileRejected = React.useCallback(() => {
    setFileRejected(true);
  }, [setFileRejected]);

  const handleSort = React.useCallback(
    (event, index, direction) => {
      setSortBy({ index, direction });
    },
    [setSortBy]
  );

  const handleInsert = React.useCallback(
    (rowData) => {
      addSubscription(
        context.api
          .insertProbes(rowData[0])
          .pipe(first())
          .subscribe(() => {})
      );
    },
    [addSubscription, context.api]
  );

  const actionResolver = React.useCallback(
    (rowData: IRowData, extraData: IExtraData) => {
      if (typeof extraData.rowIndex == 'undefined') {
        return [];
      }
      return [
        {
          title: 'Insert Probes...',
          onClick: (event, rowId, rowData) => handleInsert(rowData),
          isDisabled: !props.agentDetected,
        },
        {
          isSeparator: true,
        },
        {
          title: 'Delete',
          onClick: (event, rowId, rowData) => handleDeleteButton(rowData),
        },
      ] as IAction[];
    },
    [handleInsert, handleDeleteButton, props.agentDetected]
  );

  const handleTemplateUpload = React.useCallback(() => {
    setModalOpen(true);
  }, [setModalOpen]);

  const handleUploadModalClose = React.useCallback(() => {
    setModalOpen(false);
  }, [setModalOpen]);

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
      window.console.error('Attempted to submit probe template upload without a file selected');
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
            setUploadFile(undefined);
            setUploadFilename('');
            setModalOpen(false);
          }
        })
    );
  }, [uploadFile, setUploading, addSubscription, context.api, setUploadFile, setUploadFilename, setModalOpen]);

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
      context.notificationChannel
        .messages(NotificationCategory.ProbeTemplateUploaded)
        .subscribe((v) => refreshTemplates())
    );
  }, [addSubscription, context.notificationChannel, refreshTemplates]);

  React.useEffect(() => {
    addSubscription(
      context.notificationChannel
        .messages(NotificationCategory.ProbeTemplateDeleted)
        .subscribe((v) => refreshTemplates())
    );
  }, [addSubscription, context.notificationChannel, refreshTemplates]);

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

  const displayTemplates = React.useMemo(
    () => filteredTemplates.map((t: ProbeTemplate) => [t.name, t.xml]),
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
        <Stack hasGutter style={{ marginTop: '1em' }}>
          <StackItem>
            <Card>
              <CardHeader>
                <CardHeaderMain>
                  <Text component={TextVariants.h4}>About the JMC Agent</Text>
                </CardHeaderMain>
              </CardHeader>
              <CardBody>
                The JMC Agent allows users to dynamically inject custom JFR events into running JVMs. In order to make
                use of the JMC Agent, the agent jar must be present in the same container as the target, and the target
                must be started with the agent (-javaagent:/path/to/agent.jar). Once these pre-requisites are met, the
                user can upload probe templates to Cryostat and insert them to the target, as well as view or remove
                currently active probes.
              </CardBody>
            </Card>
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
            <Table
              aria-label="Probe Templates Table"
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
              onClose={handleUploadModalClose}
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
          </StackItem>
        </Stack>
      </>
    );
  }
};
