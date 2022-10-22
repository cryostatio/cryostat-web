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
  Button,
  Card,
  CardBody,
  CardHeaderMain,
  CardHeader,
  Toolbar,
  ToolbarContent,
  ToolbarGroup,
  ToolbarItem,
  TextInput,
  Text,
  TextVariants,
  Stack,
  StackItem,
} from '@patternfly/react-core';
import {
  Table,
  TableBody,
  TableHeader,
  TableVariant,
  ISortBy,
  SortByDirection,
  sortable,
} from '@patternfly/react-table';
import { first } from 'rxjs/operators';
import { LoadingView } from '@app/LoadingView/LoadingView';
import { authFailMessage, ErrorView, isAuthFail } from '@app/ErrorView/ErrorView';
import { EventProbe } from '@app/Shared/Services/Api.service';
import { DeleteWarningModal } from '@app/Modal/DeleteWarningModal';
import { DeleteWarningType } from '@app/Modal/DeleteWarningUtils';

export const AgentLiveProbes = () => {
  const context = React.useContext(ServiceContext);
  const addSubscription = useSubscriptions();

  const [templates, setTemplates] = React.useState([] as EventProbe[]);
  const [filteredTemplates, setFilteredTemplates] = React.useState([] as EventProbe[]);
  const [filterText, setFilterText] = React.useState('');
  const [sortBy, setSortBy] = React.useState({} as ISortBy);
  const [isLoading, setIsLoading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState('');
  const [warningModalOpen, setWarningModalOpen] = React.useState(false);
  
  const tableColumns = [
    { title: 'ID', transforms: [sortable] },
    { title: 'Name', transforms: [sortable] },
    { title: 'Class', transforms: [sortable] },
    { title: 'Description' },
    { title: 'Method', transforms: [sortable] },
  ];

  const handleTemplates = React.useCallback(
    (templates) => {
      setTemplates(templates);
      setErrorMessage('');
      setIsLoading(false);
    },
    [setTemplates, setIsLoading, setErrorMessage]
  );

  const handleError = React.useCallback(
    (error) => {
      setErrorMessage(error.message);
      setIsLoading(false);
    },
    [setIsLoading, setErrorMessage]
  );

  const refreshTemplates = React.useCallback(() => {
    setIsLoading(true);
    addSubscription(
      context.api.getActiveProbes().subscribe({
        next: (value) => handleTemplates(value),
        error: (err) => handleError(err),
      })
    );
  }, [addSubscription, context.api, setIsLoading, handleTemplates, handleError]);

  const handleSort = React.useCallback(
    (evt, index, direction) => {
      setSortBy({ index, direction });
    },
    [setSortBy]
  );

  const authRetry = React.useCallback(() => {
    context.target.setAuthRetry();
  }, [context.target, context.target.setAuthRetry]);

  const handleDeleteAllProbes = React.useCallback(() => {
    addSubscription(
      context.api
        .removeProbes()
        .pipe(first())
        .subscribe(() => {
          refreshTemplates();
        })
    );
  }, [addSubscription, context.api, refreshTemplates]);

  const handleWarningModalAccept = React.useCallback(() => handleDeleteAllProbes(), [handleDeleteAllProbes]);

  const handleWarningModalClose = React.useCallback(() => {
    setWarningModalOpen(false);
  }, [setWarningModalOpen]);

  const handleDeleteButton = React.useCallback(() => {
    if (context.settings.deletionDialogsEnabledFor(DeleteWarningType.DeleteActiveProbes)) {
      setWarningModalOpen(true);
    } else {
      handleDeleteAllProbes();
    }
  }, [context.settings, setWarningModalOpen, handleDeleteAllProbes]);

  React.useEffect(() => {
    let filtered;
    if (!filterText) {
      filtered = templates;
    } else {
      const ft = filterText.trim().toLowerCase();
      filtered = templates.filter(
        (t: EventProbe) =>
          t.name.toLowerCase().includes(ft) ||
          t.description.toLowerCase().includes(ft) ||
          t.clazz.toLowerCase().includes(ft) ||
          t.methodDescriptor.toLowerCase().includes(ft) ||
          t.methodName.toLowerCase().includes(ft)
      );
    }
    const { index, direction } = sortBy;
    if (typeof index === 'number') {
      const keys = ['id', 'name', 'description', 'clazz', 'methodName'];
      const key = keys[index];
      const sorted = filtered.sort((a, b) => (a[key] < b[key] ? -1 : a[key] > b[key] ? 1 : 0));
      filtered = direction === SortByDirection.asc ? sorted : sorted.reverse();
    }
    setFilteredTemplates([...filtered]);
  }, [filterText, templates, sortBy, setFilteredTemplates]);

  React.useEffect(() => {
    addSubscription(
      context.target.target().subscribe(() => {
        setFilterText('');
        refreshTemplates();
      })
    );
  }, [context, context.target, addSubscription, setFilterText, refreshTemplates]);

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
      context.target.authFailure().subscribe(() => {
        setErrorMessage(authFailMessage);
      })
    );
  }, [addSubscription, context.target, setErrorMessage]);

  React.useEffect(() => {
    addSubscription(
      context.notificationChannel
        .messages(NotificationCategory.ProbeTemplateApplied)
        .subscribe((v) => refreshTemplates())
    );
  }, [addSubscription, context, context.notificationChannel, setTemplates]);

  const displayTemplates = React.useMemo(
    () => filteredTemplates.map((t: EventProbe) => [t.id, t.name, t.clazz, t.description, t.methodName]),
    [filteredTemplates]
  );

  if (errorMessage != '') {
    return (
      <ErrorView
        title={'Error retrieving active probes'}
        message={`${errorMessage}. Note: This is commonly caused by the agent not being loaded/active, check that the target was started with the agent (-javaagent:/path/to/agent.jar).`}
        retry={isAuthFail(errorMessage) ? authRetry : undefined}
      />
    );
  } else if (isLoading) {
    return <LoadingView />;
  } else {
    return (
      <>
        <Stack hasGutter>
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
                    <Button key="delete" variant="danger" onClick={handleDeleteButton}>
                      Remove All Probes
                    </Button>
                  </ToolbarItem>
                </ToolbarGroup>
              </ToolbarContent>
              <DeleteWarningModal
              warningType={DeleteWarningType.DeleteActiveProbes}
              visible={warningModalOpen}
              onAccept={handleWarningModalAccept}
              onClose={handleWarningModalClose}
            />
            </Toolbar>
            <Table
              aria-label="Active Probes"
              variant={TableVariant.compact}
              cells={tableColumns}
              rows={displayTemplates}
              onSort={handleSort}
            >
              <TableHeader />
              <TableBody />
            </Table>
          </StackItem>
        </Stack>
      </>
    );
  }
};
