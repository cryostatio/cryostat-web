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
import { NotificationCategory, HeapDump } from '@app/Shared/Services/api.types';
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

export interface HeapDumpsProps {}

export const HeapDumpsTable: React.FC<HeapDumpsProps> = ({}) => {
  const context = React.useContext(ServiceContext);
  const { t } = useCryostatTranslation();
  const addSubscription = useSubscriptions();
  const notificationsContext = React.useContext(NotificationsContext);

  const [heapDumps, setHeapDumps] = React.useState<HeapDump[]>([]);
  const [filteredHeapDumps, setFilteredHeapDumps] = React.useState<HeapDump[]>([]);
  const [filterText, setFilterText] = React.useState('');
  const [sortBy, setSortBy] = React.useState<ISortBy>({});
  const [isLoading, setIsLoading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState('');
  const [heapDumpToDelete, setHeapDumpToDelete] = React.useState<HeapDump | undefined>(undefined);
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

  const handleHeapDumps = React.useCallback(
    (heapDumps: HeapDump[]) => {
      setHeapDumps(heapDumps);
      setIsLoading(false);
      setErrorMessage('');
    },
    [setHeapDumps, setIsLoading, setErrorMessage],
  );

  const handleError = React.useCallback(
    (error) => {
      setIsLoading(false);
      setErrorMessage(error.message);
    },
    [setIsLoading, setErrorMessage],
  );

  const refreshHeapDumps = React.useCallback(() => {
    setIsLoading(true);
    addSubscription(
      context.api.getHeapDumps().subscribe({
        next: (value) => handleHeapDumps(value),
        error: (err) => handleError(err),
      }),
    );
  }, [addSubscription, context.api, setIsLoading, handleHeapDumps, handleError]);

  const handleDelete = React.useCallback(
    (heapDump: HeapDump) => {
      addSubscription(
        context.api.deleteHeapDump(heapDump.uuid).subscribe(() => {
          setHeapDumps((old) => old.filter((t) => t.uuid !== heapDump.uuid));
        }),
      );
    },
    [addSubscription, context.api],
  );

  const handleWarningModalAccept = React.useCallback(() => {
    if (heapDumpToDelete) {
      handleDelete(heapDumpToDelete);
    } else {
      notificationsContext.warning(t('HeapDumps.DELETION_FAILURE_CATEGORY'), t('HeapDumps.DELETION_FAILURE_MESSAGE'));
    }
  }, [handleDelete, notificationsContext, t, heapDumpToDelete]);

  const handleWarningModalClose = React.useCallback(() => {
    setWarningModalOpen(false);
  }, [setWarningModalOpen]);

  const handleHeapDump = React.useCallback(() => {
    addSubscription(
      context.api
        .runHeapDump(true)
        .pipe(first())
        .subscribe({
          next: (jobId) => {
            addSubscription(
              context.notificationChannel.messages(NotificationCategory.HeapDumpSuccess).subscribe((notification) => {
                if (jobId == notification.message.jobId) {
                  refreshHeapDumps();
                }
              }),
            );
          },
          error: () => refreshHeapDumps(),
        }),
    );
  }, [addSubscription, context.api, context.notificationChannel, refreshHeapDumps]);

  const handleFilterTextChange = React.useCallback((_, value: string) => setFilterText(value), [setFilterText]);

  React.useEffect(() => {
    addSubscription(
      context.notificationChannel.messages(NotificationCategory.ThreadDumpSuccess).subscribe(() => {
        refreshHeapDumps();
      }),
    );
  }, [addSubscription, context.notificationChannel, refreshHeapDumps]);

  React.useEffect(() => {
    addSubscription(
      context.target.target().subscribe(() => {
        setFilterText('');
        refreshHeapDumps();
      }),
    );
  }, [context.target, addSubscription, refreshHeapDumps]);

  React.useEffect(() => {
    if (!context.settings.autoRefreshEnabled()) {
      return;
    }
    const id = window.setInterval(
      () => refreshHeapDumps(),
      context.settings.autoRefreshPeriod() * context.settings.autoRefreshUnits(),
    );
    return () => window.clearInterval(id);
  }, [context.settings, refreshHeapDumps]);

  React.useEffect(() => {
    let filtered: HeapDump[];
    if (!filterText) {
      filtered = heapDumps;
    } else {
      const reg = new RegExp(_.escapeRegExp(filterText), 'i');
      filtered = heapDumps.filter((t: HeapDump) => reg.test(t.uuid));
    }

    setFilteredHeapDumps(
      sortResources(
        {
          index: sortBy.index ?? 0,
          direction: sortBy.direction ?? SortByDirection.asc,
        },
        filtered,
        tableColumns,
      ),
    );
  }, [filterText, heapDumps, sortBy, setFilteredHeapDumps]);

  const handleDeleteAction = React.useCallback(
    (heapDump: HeapDump) => {
      if (context.settings.deletionDialogsEnabledFor(DeleteOrDisableWarningType.DeleteHeapDump)) {
        setHeapDumpToDelete(heapDump);
        setWarningModalOpen(true);
      } else {
        handleDelete(heapDump);
      }
    },
    [context.settings, setWarningModalOpen, setHeapDumpToDelete, handleDelete],
  );

  const handleDownloadHeapDump = React.useCallback(
    (heapDump) => {
      context.api.downloadHeapDump(heapDump);
    },
    [context.api],
  );

  const deleteHeapDumpModal = React.useMemo(() => {
    return (
      <DeleteWarningModal
        warningType={DeleteOrDisableWarningType.DeleteHeapDump}
        visible={warningModalOpen}
        onAccept={handleWarningModalAccept}
        onClose={handleWarningModalClose}
      />
    );
  }, [warningModalOpen, handleWarningModalAccept, handleWarningModalClose]);

  const heapDumpRows = React.useMemo(
    () =>
      filteredHeapDumps.map((t: HeapDump, index) => {
        return (
          <Tr key={`heap-dump-${index}`}>
            <Td key={`heap-dump-id-${index}`} dataLabel={tableColumns[0].title}>
              {t.uuid}
            </Td>
            <Td key={`heap-dump-lastModified-${index}`} dataLabel={tableColumns[1].title}>
              <Timestamp
                className="heap-dump-table__timestamp"
                tooltip={{ variant: TimestampTooltipVariant.custom, content: dayjs(t.lastModified).toISOString() }}
              >
                {dayjs(t.lastModified).tz(datetimeContext.timeZone.full).format('L LTS z')}
              </Timestamp>
            </Td>
            <Td key={`heap-dump-action-${index}`} isActionCell style={{ paddingRight: '0' }}>
              <HeapDumpAction heapDump={t} onDelete={handleDeleteAction} onDownload={handleDownloadHeapDump} />
            </Td>
          </Tr>
        );
      }),
    [datetimeContext.timeZone.full, dayjs, filteredHeapDumps, handleDeleteAction, handleDownloadHeapDump],
  );

  if (errorMessage != '') {
    return <ErrorView title={'Error retrieving heap dumps'} message={`${errorMessage}`} />;
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
                      name="heapDumpsFilter"
                      id="heapDumpsFilter"
                      type="search"
                      placeholder={t('HeapDumps.SEARCH_PLACEHOLDER')}
                      aria-label={t('HeapDumps.ARIA_LABELS.SEARCH_INPUT')}
                      onChange={handleFilterTextChange}
                      value={filterText}
                    />
                  </ToolbarItem>
                </ToolbarGroup>
                <ToolbarItem variant="separator" />
                <ToolbarGroup variant="icon-button-group">
                  <ToolbarItem>
                    <Button
                      key="dump-heap"
                      name="Dump Heap"
                      variant="secondary"
                      aria-label="dump-heap"
                      onClick={handleHeapDump}
                    >
                      <Tooltip content="Start Heap Dump" />
                      <UploadIcon />
                    </Button>
                  </ToolbarItem>
                </ToolbarGroup>
                {deleteHeapDumpModal}
              </ToolbarContent>
            </Toolbar>
            {heapDumpRows.length ? (
              <Table aria-label="Heap Dumps table" variant={TableVariant.compact}>
                <Thead>
                  <Tr>
                    {tableColumns.map(({ title, sortable }, index) => (
                      <Th key={`heap-dump-header-${title}`} sort={sortable ? getSortParams(index) : undefined}>
                        {title}
                      </Th>
                    ))}
                  </Tr>
                </Thead>
                <Tbody>{heapDumpRows}</Tbody>
              </Table>
            ) : (
              <EmptyState>
                <EmptyStateHeader
                  titleText="No Heap Dumps"
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

export interface HeapDumpActionProps {
  heapDump: HeapDump;
  onDownload: (heapDump: HeapDump) => void;
  onDelete: (heapDump: HeapDump) => void;
}

export const HeapDumpAction: React.FC<HeapDumpActionProps> = ({ heapDump, onDelete, onDownload }) => {
  const { t } = useCryostatTranslation();
  const [isOpen, setIsOpen] = React.useState(false);

  const actionItems = React.useMemo(() => {
    return [
      {
        title: 'Download Heap Dump',
        key: 'download-heapdump',
        onClick: () => onDownload(heapDump),
      },
      {
        isSeparator: true,
      },
      {
        key: 'delete-heapdump',
        title: 'Delete',
        isDanger: true,
        onClick: () => onDelete(heapDump),
      },
    ];
  }, [onDelete, onDownload, heapDump]);

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
          aria-label={t('HeapDumps.ARIA_LABELS.ROW_ACTION')}
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
