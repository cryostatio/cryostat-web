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
import { authFailMessage, isAuthFail } from '@app/ErrorView/types';
import { DeleteWarningModal } from '@app/Modal/DeleteWarningModal';
import { DeleteOrDisableWarningType } from '@app/Modal/types';
import { LoadingView } from '@app/Shared/Components/LoadingView';
import { LoadingProps } from '@app/Shared/Components/types';
import { EventProbe, NotificationCategory } from '@app/Shared/Services/api.types';
import { ServiceContext } from '@app/Shared/Services/Services';
import { useSubscriptions } from '@app/utils/hooks/useSubscriptions';
import { sortResources, TableColumn } from '@app/utils/utils';
import {
  Button,
  Toolbar,
  ToolbarContent,
  ToolbarGroup,
  ToolbarItem,
  TextInput,
  Stack,
  StackItem,
  EmptyState,
  EmptyStateIcon,
  EmptyStateHeader,
} from '@patternfly/react-core';
import { SearchIcon } from '@patternfly/react-icons';
import {
  TableVariant,
  ISortBy,
  SortByDirection,
  ThProps,
  Table,
  Tbody,
  Th,
  Thead,
  Tr,
  Td,
} from '@patternfly/react-table';
import _ from 'lodash';
import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { combineLatest } from 'rxjs';
import { AboutAgentCard } from './AboutAgentCard';

export type LiveProbeActions = 'REMOVE';

const tableColumns: TableColumn[] = [
  {
    title: 'ID',
    keyPaths: ['id'],
    sortable: true,
  },
  {
    title: 'Name',
    keyPaths: ['name'],
    sortable: true,
  },
  {
    title: 'Class',
    keyPaths: ['clazz'],
    sortable: true,
  },
  {
    title: 'Description',
    keyPaths: ['description'],
    sortable: true,
  },
  {
    title: 'Method',
    keyPaths: ['methodName'],
    sortable: true,
  },
];

export interface AgentLiveProbesProps {}

export const AgentLiveProbes: React.FC<AgentLiveProbesProps> = () => {
  const context = React.useContext(ServiceContext);
  const { t } = useTranslation();
  const addSubscription = useSubscriptions();

  const [probes, setProbes] = React.useState<EventProbe[]>([]);
  const [filteredProbes, setFilteredProbes] = React.useState<EventProbe[]>([]);
  const [filterText, setFilterText] = React.useState('');
  const [sortBy, setSortBy] = React.useState<ISortBy>({});
  const [isLoading, setIsLoading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState('');
  const [warningModalOpen, setWarningModalOpen] = React.useState(false);
  const [actionLoadings, setActionLoadings] = React.useState<Record<LiveProbeActions, boolean>>({ REMOVE: false });

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

  const handleProbes = React.useCallback(
    (probes) => {
      setProbes(probes);
      setErrorMessage('');
      setIsLoading(false);
    },
    [setProbes, setIsLoading, setErrorMessage],
  );

  const handleError = React.useCallback(
    (error) => {
      setErrorMessage(error.message);
      setIsLoading(false);
    },
    [setIsLoading, setErrorMessage],
  );

  const refreshProbes = React.useCallback(() => {
    setIsLoading(true);
    addSubscription(
      context.api.getActiveProbes(true).subscribe({
        next: (value) => handleProbes(value),
        error: (err) => handleError(err),
      }),
    );
  }, [addSubscription, context.api, setIsLoading, handleProbes, handleError]);

  const authRetry = React.useCallback(() => {
    context.target.setAuthRetry();
  }, [context.target]);

  const handleDeleteAllProbes = React.useCallback(() => {
    setActionLoadings((old) => {
      return {
        ...old,
        REMOVE: true,
      };
    });
    addSubscription(
      context.api.removeProbes().subscribe(() => {
        setActionLoadings((old) => {
          return {
            ...old,
            REMOVE: false,
          };
        });
      }),
    );
  }, [addSubscription, context.api, setActionLoadings]);

  const handleWarningModalAccept = React.useCallback(() => handleDeleteAllProbes(), [handleDeleteAllProbes]);

  const handleWarningModalClose = React.useCallback(() => {
    setWarningModalOpen(false);
  }, [setWarningModalOpen]);

  const handleDeleteButton = React.useCallback(() => {
    if (context.settings.deletionDialogsEnabledFor(DeleteOrDisableWarningType.DeleteActiveProbes)) {
      setWarningModalOpen(true);
    } else {
      handleDeleteAllProbes();
    }
  }, [context.settings, setWarningModalOpen, handleDeleteAllProbes]);

  const handleFilterTextChange = React.useCallback((_, value: string) => setFilterText(value), [setFilterText]);

  React.useEffect(() => {
    addSubscription(
      context.target.target().subscribe(() => {
        setFilterText('');
        refreshProbes();
      }),
    );
  }, [context, context.target, addSubscription, setFilterText, refreshProbes]);

  React.useEffect(() => {
    if (!context.settings.autoRefreshEnabled()) {
      return;
    }
    const id = window.setInterval(
      () => refreshProbes(),
      context.settings.autoRefreshPeriod() * context.settings.autoRefreshUnits(),
    );
    return () => window.clearInterval(id);
  }, [context.settings, refreshProbes]);

  React.useEffect(() => {
    addSubscription(
      context.target.authFailure().subscribe(() => {
        setErrorMessage(authFailMessage);
      }),
    );
  }, [addSubscription, context.target, setErrorMessage]);

  React.useEffect(() => {
    addSubscription(
      combineLatest([
        context.target.target(),
        context.notificationChannel.messages(NotificationCategory.ProbeTemplateApplied),
      ]).subscribe(([currentTarget, e]) => {
        if (currentTarget?.jvmId != e.message.jvmId) {
          return;
        }
        setProbes((old) => {
          const probes = e.message.events as EventProbe[];
          const probeIds = probes.map((p) => p.id);
          if (probes?.length > 0) {
            return [...old.filter((probe) => !probeIds.includes(probe.id)), ...probes];
          }
          return old;
        });
      }),
    );
  }, [addSubscription, context, context.notificationChannel, context.target, setProbes]);

  React.useEffect(() => {
    addSubscription(
      combineLatest([
        context.target.target(),
        context.notificationChannel.messages(NotificationCategory.ProbesRemoved),
      ]).subscribe(([currentTarget, e]) => {
        if (currentTarget?.jvmId == e.message.jvmId) {
          setProbes([]);
        }
      }),
    );
  }, [addSubscription, context, context.notificationChannel, setProbes]);

  React.useEffect(() => {
    let filtered: EventProbe[];
    if (!filterText) {
      filtered = probes;
    } else {
      const reg = new RegExp(_.escapeRegExp(filterText), 'i');
      filtered = probes.filter(
        (t: EventProbe) =>
          reg.test(t.name) ||
          reg.test(t.description) ||
          reg.test(t.clazz) ||
          reg.test(t.methodDescriptor) ||
          reg.test(t.methodName),
      );
    }

    setFilteredProbes(
      sortResources(
        {
          index: sortBy.index ?? 0,
          direction: sortBy.direction ?? SortByDirection.asc,
        },
        filtered,
        tableColumns,
      ),
    );
  }, [filterText, probes, sortBy, setFilteredProbes]);

  const probeRows = React.useMemo(
    () =>
      filteredProbes.map((t: EventProbe, index) => (
        <Tr key={`active-probe-${index}`}>
          <Td key={`active-probe-id-${index}`} dataLabel={tableColumns[0].title}>
            {t.id}
          </Td>
          <Td key={`active-probe-name-${index}`} dataLabel={tableColumns[1].title}>
            {t.name}
          </Td>
          <Td key={`active-probe-clazz-${index}`} dataLabel={tableColumns[2].title}>
            {t.clazz}
          </Td>
          <Td key={`active-probe-description-${index}`} dataLabel={tableColumns[3].title}>
            {t.description}
          </Td>
          <Td key={`active-probe-methodname-${index}`} dataLabel={tableColumns[4].title}>
            {t.methodName}
          </Td>
        </Tr>
      )),
    [filteredProbes],
  );

  const actionLoadingProps = React.useMemo<Record<LiveProbeActions, LoadingProps>>(
    () => ({
      REMOVE: {
        spinnerAriaValueText: 'Removing',
        spinnerAriaLabel: 'removing-all-probes',
        isLoading: actionLoadings['REMOVE'],
      } as LoadingProps,
    }),
    [actionLoadings],
  );

  if (errorMessage != '') {
    return (
      <ErrorView
        title={'Error retrieving active probes'}
        message={`${errorMessage}. Note: This error is generally caused when the agent is not loaded or is not active. Check that the target was started with the agent (-javaagent:/path/to/agent.jar).`}
        retry={isAuthFail(errorMessage) ? authRetry : undefined}
      />
    );
  } else if (isLoading) {
    return <LoadingView />;
  } else {
    return (
      <>
        <Stack hasGutter style={{ marginTop: '1em' }}>
          <StackItem>
            <AboutAgentCard />
          </StackItem>
          <StackItem>
            <Toolbar id="active-probes-toolbar">
              <ToolbarContent>
                <ToolbarGroup variant="filter-group">
                  <ToolbarItem>
                    <TextInput
                      style={{ minWidth: '40ch' }}
                      name="activeProbeFilter"
                      id="activeProbeFilter"
                      type="search"
                      placeholder={t('AgentLiveProbes.SEARCH_PLACEHOLDER')}
                      aria-label="Active probe filter"
                      onChange={handleFilterTextChange}
                    />
                  </ToolbarItem>
                </ToolbarGroup>
                <ToolbarItem variant="separator" />
                <ToolbarGroup variant="icon-button-group">
                  <ToolbarItem>
                    <Button
                      key="delete"
                      variant="danger"
                      onClick={handleDeleteButton}
                      isDisabled={!filteredProbes.length || actionLoadings['REMOVE']}
                      {...actionLoadingProps['REMOVE']}
                    >
                      {actionLoadings['REMOVE'] ? 'Removing' : 'Remove'} all probes
                    </Button>
                  </ToolbarItem>
                </ToolbarGroup>
              </ToolbarContent>
              <DeleteWarningModal
                warningType={DeleteOrDisableWarningType.DeleteActiveProbes}
                visible={warningModalOpen}
                onAccept={handleWarningModalAccept}
                onClose={handleWarningModalClose}
              />
            </Toolbar>
            {probeRows.length ? (
              <Table aria-label="Active probe table" variant={TableVariant.compact}>
                <Thead>
                  <Tr>
                    {tableColumns.map(({ title, sortable }, index) => (
                      <Th key={`active-probe-header-${title}`} sort={sortable ? getSortParams(index) : undefined}>
                        {title}
                      </Th>
                    ))}
                  </Tr>
                </Thead>
                <Tbody>{probeRows}</Tbody>
              </Table>
            ) : (
              <EmptyState>
                <EmptyStateHeader
                  titleText="No active probes"
                  icon={<EmptyStateIcon icon={SearchIcon} />}
                  headingLevel="h4"
                />
              </EmptyState>
            )}
          </StackItem>
        </Stack>
      </>
    );
  }
};
