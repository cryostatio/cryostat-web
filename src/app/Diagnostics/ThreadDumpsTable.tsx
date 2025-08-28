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
import { LoadingView } from '@app/Shared/Components/LoadingView';
import { NotificationCategory, ThreadDump } from '@app/Shared/Services/api.types';
import { NotificationsContext } from '@app/Shared/Services/Notifications.service';
import { ServiceContext } from '@app/Shared/Services/Services';
import useDayjs from '@app/utils/hooks/useDayjs';
import { useSubscriptions } from '@app/utils/hooks/useSubscriptions';
import { TableColumn, sortResources } from '@app/utils/utils';
import { useCryostatTranslation } from '@i18n/i18nextUtil';
import {
  Button,
  EmptyState,
  EmptyStateIcon,
  Stack,
  StackItem,
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
  SearchInput,
  Tooltip,
  Timestamp,
  TimestampTooltipVariant,
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
import _ from 'lodash';
import * as React from 'react';
import { first } from 'rxjs/operators';

const tableColumns: TableColumn[] = [
  {
    title: 'ID',
    keyPaths: ['id'],
    sortable: true,
  },
  {
    title: 'Last Modified',
    keyPaths: ['lastModified'],
    sortable: true,
  },
];

export interface ThreadDumpsProps {}

export const ThreadDumpsTable: React.FC<ThreadDumpsProps> = ({}) => {
  const context = React.useContext(ServiceContext);
  const { t } = useCryostatTranslation();
  const addSubscription = useSubscriptions();
  const notificationsContext = React.useContext(NotificationsContext);

  const [threadDumps, setThreadDumps] = React.useState<ThreadDump[]>([]);
  const [filteredThreadDumps, setFilteredThreadDumps] = React.useState<ThreadDump[]>([]);
  const [filterText, setFilterText] = React.useState('');
  const [sortBy, setSortBy] = React.useState<ISortBy>({});
  const [isLoading, setIsLoading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState('');
  const [threadDumpToDelete, setThreadDumpToDelete] = React.useState<ThreadDump | undefined>(undefined);
  const [warningModalOpen, setWarningModalOpen] = React.useState(false);
  const [dayjs, datetimeContext] = useDayjs();

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

  const handleThreadDumps = React.useCallback(
    (threadDumps: ThreadDump[]) => {
      setThreadDumps(threadDumps);
      setIsLoading(false);
      setErrorMessage('');
    },
    [setThreadDumps, setIsLoading, setErrorMessage],
  );

  const handleError = React.useCallback(
    (error) => {
      setIsLoading(false);
      setErrorMessage(error.message);
    },
    [setIsLoading, setErrorMessage],
  );

  const refreshThreadDumps = React.useCallback(() => {
    setIsLoading(true);
    addSubscription(
      context.api.getThreadDumps().subscribe({
        next: (value) => handleThreadDumps(value),
        error: (err) => handleError(err),
      }),
    );
  }, [addSubscription, context.api, setIsLoading, handleThreadDumps, handleError]);

  const handleDelete = React.useCallback(
    (threadDump: ThreadDump) => {
      addSubscription(
        context.api.deleteThreadDump(threadDump.uuid).subscribe(() => {
          setThreadDumps((old) => old.filter((t) => t.uuid !== threadDump.uuid));
        }),
      );
    },
    [addSubscription, context.api],
  );

  const handleWarningModalAccept = React.useCallback(() => {
    if (threadDumpToDelete) {
      handleDelete(threadDumpToDelete);
    } else {
      notificationsContext.warning(
        t('ThreadDumps.DELETION_FAILURE_CATEGORY'),
        t('ThreadDumps.DELETION_FAILURE_MESSAGE'),
      );
    }
  }, [handleDelete, notificationsContext, t, threadDumpToDelete]);

  const handleWarningModalClose = React.useCallback(() => {
    setWarningModalOpen(false);
  }, [setWarningModalOpen]);

  const handleThreadDump = React.useCallback(() => {
    addSubscription(
      context.api
        .runThreadDump(true)
        .pipe(first())
        .subscribe({
          next: (jobId) => {
            addSubscription(
              context.notificationChannel.messages(NotificationCategory.ThreadDumpSuccess).subscribe((notification) => {
                if (jobId == notification.message.jobId) {
                  refreshThreadDumps();
                }
              }),
            );
          },
          error: () => refreshThreadDumps(),
        }),
    );
  }, [addSubscription, context.api, context.notificationChannel, refreshThreadDumps]);

  const handleFilterTextChange = React.useCallback((_, value: string) => setFilterText(value), [setFilterText]);

  React.useEffect(() => {
    addSubscription(
      context.notificationChannel.messages(NotificationCategory.ThreadDumpSuccess).subscribe(() => {
        refreshThreadDumps();
      }),
    );
  }, [addSubscription, context.notificationChannel, refreshThreadDumps]);

  React.useEffect(() => {
    addSubscription(
      context.target.target().subscribe(() => {
        setFilterText('');
        refreshThreadDumps();
      }),
    );
  }, [context.target, addSubscription, refreshThreadDumps]);

  React.useEffect(() => {
    if (!context.settings.autoRefreshEnabled()) {
      return;
    }
    const id = window.setInterval(
      () => refreshThreadDumps(),
      context.settings.autoRefreshPeriod() * context.settings.autoRefreshUnits(),
    );
    return () => window.clearInterval(id);
  }, [context.settings, refreshThreadDumps]);

  React.useEffect(() => {
    let filtered: ThreadDump[];
    if (!filterText) {
      filtered = threadDumps;
    } else {
      const reg = new RegExp(_.escapeRegExp(filterText), 'i');
      filtered = threadDumps.filter((t: ThreadDump) => reg.test(t.uuid));
    }

    setFilteredThreadDumps(
      sortResources(
        {
          index: sortBy.index ?? 0,
          direction: sortBy.direction ?? SortByDirection.asc,
        },
        filtered,
        tableColumns,
      ),
    );
  }, [filterText, threadDumps, sortBy, setFilteredThreadDumps]);

  const handleDeleteAction = React.useCallback(
    (threadDump: ThreadDump) => {
      if (context.settings.deletionDialogsEnabledFor(DeleteOrDisableWarningType.DeleteThreadDump)) {
        setThreadDumpToDelete(threadDump);
        setWarningModalOpen(true);
      } else {
        handleDelete(threadDump);
      }
    },
    [context.settings, setWarningModalOpen, setThreadDumpToDelete, handleDelete],
  );

  const handleDownloadThreadDump = React.useCallback(
    (threadDump) => {
      context.api.downloadThreadDump(threadDump);
    },
    [context.api],
  );

  const deleteThreadDumpModal = React.useMemo(() => {
    return (
      <DeleteWarningModal
        warningType={DeleteOrDisableWarningType.DeleteThreadDump}
        visible={warningModalOpen}
        onAccept={handleWarningModalAccept}
        onClose={handleWarningModalClose}
      />
    );
  }, [warningModalOpen, handleWarningModalAccept, handleWarningModalClose]);

  const threadDumpRows = React.useMemo(
    () =>
      filteredThreadDumps.map((t: ThreadDump, index) => {
        return (
          <Tr key={`thread-dump-${index}`}>
            <Td key={`thread-dump-id-${index}`} dataLabel={tableColumns[0].title}>
              {t.uuid}
            </Td>
            <Td key={`thread-dump-lastModified-${index}`} dataLabel={tableColumns[1].title}>
              <Timestamp
                className="thread-dump-table__timestamp"
                tooltip={{ variant: TimestampTooltipVariant.custom, content: dayjs(t.lastModified).toISOString() }}
              >
                {dayjs(t.lastModified).tz(datetimeContext.timeZone.full).format('L LTS z')}
              </Timestamp>
            </Td>
            <Td key={`thread-dump-action-${index}`} isActionCell style={{ paddingRight: '0' }}>
              <ThreadDumpAction threadDump={t} onDelete={handleDeleteAction} onDownload={handleDownloadThreadDump} />
            </Td>
          </Tr>
        );
      }),
    [datetimeContext.timeZone.full, dayjs, filteredThreadDumps, handleDeleteAction, handleDownloadThreadDump],
  );

  if (errorMessage != '') {
    return <ErrorView title={'Error retrieving thread dumps'} message={`${errorMessage}`} />;
  } else if (isLoading) {
    return <LoadingView />;
  } else {
    return (
      <>
        <Stack hasGutter style={{ marginTop: '1em' }}>
          <StackItem>
            <Toolbar id="thead-dumps-toolbar">
              <ToolbarContent>
                <ToolbarGroup variant="filter-group">
                  <ToolbarItem>
                    <SearchInput
                      style={{ minWidth: '30ch' }}
                      name="threadDumpsFilter"
                      id="threadDumpsFilter"
                      type="search"
                      placeholder={t('ThreadDumps.SEARCH_PLACEHOLDER')}
                      aria-label={t('ThreadDumps.ARIA_LABELS.SEARCH_INPUT')}
                      onChange={handleFilterTextChange}
                      value={filterText}
                    />
                  </ToolbarItem>
                </ToolbarGroup>
                <ToolbarItem variant="separator" />
                <ToolbarGroup variant="icon-button-group">
                  <ToolbarItem>
                    <Button
                      key="dump-threads"
                      name="Dump Threads"
                      variant="secondary"
                      aria-label="dump-threads"
                      onClick={handleThreadDump}
                    >
                      <Tooltip content="Start Thread Dump" />
                      <UploadIcon />
                    </Button>
                  </ToolbarItem>
                </ToolbarGroup>
                {deleteThreadDumpModal}
              </ToolbarContent>
            </Toolbar>
            {threadDumpRows.length ? (
              <Table aria-label="Thread Dumps table" variant={TableVariant.compact}>
                <Thead>
                  <Tr>
                    {tableColumns.map(({ title, sortable }, index) => (
                      <Th key={`thread-dump-header-${title}`} sort={sortable ? getSortParams(index) : undefined}>
                        {title}
                      </Th>
                    ))}
                  </Tr>
                </Thead>
                <Tbody>{threadDumpRows}</Tbody>
              </Table>
            ) : (
              <EmptyState>
                <EmptyStateHeader
                  titleText="No Thread Dumps"
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

export interface ThreadDumpActionProps {
  threadDump: ThreadDump;
  onDownload: (threadDump: ThreadDump) => void;
  onDelete: (threadDump: ThreadDump) => void;
}

export const ThreadDumpAction: React.FC<ThreadDumpActionProps> = ({ threadDump, onDelete, onDownload }) => {
  const { t } = useCryostatTranslation();
  const [isOpen, setIsOpen] = React.useState(false);

  const actionItems = React.useMemo(() => {
    return [
      {
        title: 'Download Thread Dump',
        key: 'download-threaddump',
        onClick: () => onDownload(threadDump),
      },
      {
        isSeparator: true,
      },
      {
        key: 'delete-threaddump',
        title: 'Delete',
        isDanger: true,
        onClick: () => onDelete(threadDump),
      },
    ];
  }, [onDelete, onDownload, threadDump]);

  const handleToggle = React.useCallback((_, opened: boolean) => setIsOpen(opened), [setIsOpen]);

  const dropdownItems = React.useMemo(
    () =>
      actionItems.map((action) => (
        <DropdownItem
          aria-label={action.key}
          key={action.key}
          onClick={() => {
            setIsOpen(false);
            action.onClick && action.onClick();
          }}
          isDanger={action.isDanger}
        >
          {action.title}
        </DropdownItem>
      )),
    [actionItems, setIsOpen],
  );

  return (
    <Dropdown
      toggle={(toggleRef: React.Ref<MenuToggleElement>) => (
        <MenuToggle
          aria-label={t('ThreadDumps.ARIA_LABELS.ROW_ACTION')}
          variant="plain"
          ref={toggleRef}
          onClick={(event) => handleToggle(event, !isOpen)}
        >
          <EllipsisVIcon />
        </MenuToggle>
      )}
      onOpenChange={setIsOpen}
      onOpenChangeKeys={['Escape']}
      isOpen={isOpen}
      popperProps={{
        position: 'right',
        enableFlip: true,
      }}
    >
      <DropdownList>{dropdownItems}</DropdownList>
    </Dropdown>
  );
};
