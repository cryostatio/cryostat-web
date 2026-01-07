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
import { isAuthFail } from '@app/ErrorView/types';
import { DeleteWarningModal } from '@app/Modal/DeleteWarningModal';
import { DeleteOrDisableWarningType } from '@app/Modal/types';
import { RowAction } from '@app/Recordings/RecordingActions';
import { LoadingView } from '@app/Shared/Components/LoadingView';
import { LoadingProps } from '@app/Shared/Components/types';
import {
  AsyncProfile,
  AsyncProfilerSession,
  NotificationCategory,
  NullableTarget,
  Target,
} from '@app/Shared/Services/api.types';
import { ServiceContext } from '@app/Shared/Services/Services';
import { TargetView } from '@app/TargetView/TargetView';
import useDayjs from '@app/utils/hooks/useDayjs';
import { useSubscriptions } from '@app/utils/hooks/useSubscriptions';
import { formatBytes, formatDuration, hashCode, portalRoot, TableColumn, toPath } from '@app/utils/utils';
import { useCryostatTranslation } from '@i18n/i18nextUtil';
import {
  Bullseye,
  Button,
  Card,
  CardBody,
  Checkbox,
  Divider,
  Dropdown,
  DropdownItem,
  DropdownList,
  EmptyState,
  EmptyStateHeader,
  EmptyStateIcon,
  MenuToggle,
  MenuToggleElement,
  OverflowMenu,
  OverflowMenuContent,
  OverflowMenuControl,
  OverflowMenuDropdownItem,
  OverflowMenuGroup,
  OverflowMenuItem,
  Timestamp,
  TimestampTooltipVariant,
  Toolbar,
  ToolbarContent,
  ToolbarGroup,
  ToolbarItem,
} from '@patternfly/react-core';
import { EllipsisVIcon, SearchIcon } from '@patternfly/react-icons';
import { InnerScrollContainer, OuterScrollContainer, Table, Tbody, Td, Th, Thead, Tr } from '@patternfly/react-table';
import * as React from 'react';
import { useNavigate } from 'react-router-dom-v5-compat';
import { concatMap, filter, first, forkJoin, merge, Observable, of } from 'rxjs';
import { MILLIS } from './CreateAsyncProfilerSession';

const tableColumns: TableColumn[] = [
  {
    title: 'ID',
    keyPaths: ['id'],
  },
  {
    title: 'Start Time',
    keyPaths: ['startTime'],
  },
  {
    title: 'Duration',
    keyPaths: ['duration'],
  },
  {
    title: 'State',
    keyPaths: ['state'],
  },
  {
    title: 'Size',
    keyPaths: ['size'],
  },
];

export interface ColumnConfig {
  columns: {
    title: string;
  }[];
}

export type ProfileActions = 'DELETE';

export const AsyncProfiler: React.FC = () => {
  const context = React.useContext(ServiceContext);
  const addSubscription = useSubscriptions();
  const navigate = useNavigate();
  const [target, setTarget] = React.useState<NullableTarget>(undefined);
  const [isProfilerDetected, setProfilerDetected] = React.useState(false);
  const [isProfilerRunning, setProfilerRunning] = React.useState(false);
  const [currentProfile, setCurrentProfile] = React.useState<AsyncProfilerSession | undefined>(undefined);
  const [profiles, setProfiles] = React.useState<AsyncProfile[]>([]);
  const [checkedIndices, setCheckedIndices] = React.useState([] as number[]);
  const [headerChecked, setHeaderChecked] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState('');
  const [actionLoadings, setActionLoadings] = React.useState<Record<ProfileActions, boolean>>({ DELETE: false });

  React.useEffect(() => {
    addSubscription(context.target.target().subscribe((t) => setTarget(t)));
  }, [addSubscription, context, context.target, setTarget]);

  React.useEffect(() => {
    if (!target) {
      return;
    }
    addSubscription(context.api.isAsyncProfilerSupported(target).subscribe((v) => setProfilerDetected(v)));
  }, [addSubscription, context, context.api, target, setProfilerDetected]);

  const allProfiles = React.useMemo(() => [currentProfile, ...profiles].filter((p) => !!p), [currentProfile, profiles]);

  const handleProfiles = React.useCallback(
    (profiles: AsyncProfile[]) => {
      setProfiles(profiles);
      setIsLoading(false);
      setErrorMessage('');
    },
    [setProfiles, setIsLoading, setErrorMessage],
  );

  const handleError = React.useCallback(
    (error) => {
      setIsLoading(false);
      setErrorMessage(error.message);
    },
    [setIsLoading, setErrorMessage],
  );

  const queryTargetAsyncProfiles = React.useCallback(
    (target: Target) => context.api.getAsyncProfiles(target),
    [context.api],
  );

  const refreshProfiles = React.useCallback(() => {
    if (!isProfilerDetected) {
      return;
    }
    setIsLoading(true);
    addSubscription(
      context.target
        .target()
        .pipe(
          filter((t) => !!t),
          first(),
          concatMap((target: Target | undefined) => {
            if (target) {
              return queryTargetAsyncProfiles(target);
            } else {
              setIsLoading(false);
              return of([]);
            }
          }),
        )
        .subscribe({
          next: handleProfiles,
          error: handleError,
        }),
    );
  }, [
    isProfilerDetected,
    addSubscription,
    context.target,
    setIsLoading,
    handleProfiles,
    handleError,
    queryTargetAsyncProfiles,
  ]);

  const handleStatus = React.useCallback(() => {
    if (!isProfilerDetected) {
      return;
    }
    addSubscription(
      context.target
        .target()
        .pipe(
          filter((t) => !!t),
          concatMap((t) => context.api.getAsyncProfilerStatus(t)),
        )
        .subscribe((s) => {
          setProfilerRunning(s.status);
          setCurrentProfile(s.currentProfile);
          refreshProfiles();
        }),
    );
  }, [
    isProfilerDetected,
    addSubscription,
    context.target,
    context.api,
    setProfilerRunning,
    setCurrentProfile,
    refreshProfiles,
  ]);

  React.useEffect(() => {
    handleStatus();
  }, [handleStatus]);

  const handleHeaderCheck = React.useCallback(
    (event, checked) => {
      setHeaderChecked(checked);
      setCheckedIndices(checked ? allProfiles.map((r) => hashCode(r.id)) : []);
    },
    [setHeaderChecked, setCheckedIndices, allProfiles],
  );

  const handlePostActions = React.useCallback(
    (action: ProfileActions) => {
      setActionLoadings((old) => {
        const newActionLoadings = { ...old };
        newActionLoadings[action] = false;
        return newActionLoadings;
      });
    },
    [setActionLoadings],
  );

  const handleCreate = React.useCallback(() => {
    navigate(toPath('/async-profiler/create'), { relative: 'path' });
  }, [navigate]);

  const handleDeleteProfiles = React.useCallback(() => {
    if (!isProfilerDetected) {
      return;
    }
    setActionLoadings((old) => ({ ...old, DELETE: true }));
    const tasks: Observable<boolean>[] = [];
    addSubscription(
      context.target
        .target()
        .pipe(filter((t) => !!t))
        .subscribe((t) => {
          profiles.forEach((profile: AsyncProfile) => {
            if (checkedIndices.includes(hashCode(profile.id))) {
              tasks.push(context.api.deleteAsyncProfile(t, profile.id).pipe(first()));
            }
          });
          addSubscription(
            forkJoin(tasks).subscribe({
              next: () => handlePostActions('DELETE'),
              error: () => handlePostActions('DELETE'),
            }),
          );
        }),
    );
  }, [
    isProfilerDetected,
    addSubscription,
    profiles,
    checkedIndices,
    context.target,
    context.api,
    setActionLoadings,
    handlePostActions,
  ]);

  const handleRowCheck = React.useCallback(
    (checked, index) => {
      if (checked) {
        setCheckedIndices((ci) => [...ci, index]);
      } else {
        setHeaderChecked(false);
        setCheckedIndices((ci) => ci.filter((v) => v !== index));
      }
    },
    [setCheckedIndices, setHeaderChecked],
  );

  React.useEffect(() => {
    addSubscription(
      context.target
        .target()
        .pipe(filter((t) => !!t))
        .subscribe(() => refreshProfiles()),
    );
  }, [addSubscription, context.target, refreshProfiles]);

  React.useEffect(() => {
    setCheckedIndices((ci) => {
      const filteredIdIdx = new Set(allProfiles.map((profile) => hashCode(profile.id)));
      return ci.filter((idx) => filteredIdIdx.has(idx));
    });
  }, [allProfiles, setCheckedIndices]);

  React.useEffect(() => {
    setHeaderChecked(checkedIndices.length === allProfiles.length);
  }, [setHeaderChecked, checkedIndices, allProfiles]);

  React.useEffect(() => {
    addSubscription(
      context.notificationChannel.messages(NotificationCategory.AsyncProfileDeleted).subscribe((msg) => {
        setProfiles((old) => old.filter((p: AsyncProfile) => p.id !== msg.message.id));
      }),
    );
  }, [addSubscription, context.notificationChannel]);

  React.useEffect(() => {
    addSubscription(
      context.notificationChannel.messages(NotificationCategory.AsyncProfileCreated).subscribe(() => {
        refreshProfiles();
      }),
    );
  }, [addSubscription, context.notificationChannel, refreshProfiles]);

  React.useEffect(() => {
    addSubscription(
      merge(
        context.notificationChannel.messages(NotificationCategory.AsyncProfileCreated),
        context.notificationChannel.messages(NotificationCategory.AsyncProfileStopped),
        context.notificationChannel.messages(NotificationCategory.AsyncProfileDeleted),
      ).subscribe(() => handleStatus()),
    );
  }, [addSubscription, context.notificationChannel, handleStatus]);

  React.useEffect(() => {
    if (!context.settings.autoRefreshEnabled()) {
      return;
    }
    const id = window.setInterval(
      () => refreshProfiles(),
      context.settings.autoRefreshPeriod() * context.settings.autoRefreshUnits(),
    );
    return () => window.clearInterval(id);
  }, [context.settings, refreshProfiles]);

  const handleDownloadProfile = React.useCallback(
    (id) => {
      if (!target) {
        return;
      }
      context.api.downloadAsyncProfile(target, id);
    },
    [context.api, target],
  );

  const asyncProfilesToolbar = React.useMemo(
    () => (
      <AsyncProfilesToolbar
        target={target}
        currentProfile={currentProfile}
        checkedIndices={checkedIndices}
        profilerRunning={isProfilerRunning}
        handleCreate={handleCreate}
        handleDelete={handleDeleteProfiles}
        actionLoadings={actionLoadings}
      />
    ),
    [target, checkedIndices, currentProfile, isProfilerRunning, handleCreate, handleDeleteProfiles, actionLoadings],
  );

  const columnConfig: ColumnConfig = React.useMemo(
    () => ({
      columns: tableColumns,
    }),
    [],
  );

  return (
    <TargetView pageTitle="async-profiler">
      <Card isCompact>
        <CardBody>
          {!isProfilerDetected ? (
            <Bullseye>
              <EmptyState>
                <EmptyStateHeader
                  titleText={<>No async-profiler detected</>}
                  icon={<EmptyStateIcon icon={SearchIcon} />}
                  headingLevel="h4"
                />
              </EmptyState>
            </Bullseye>
          ) : (
            <AsyncProfilerTable
              tableTitle="async-profiles"
              toolbar={asyncProfilesToolbar}
              tableColumns={columnConfig}
              isHeaderChecked={headerChecked}
              onHeaderCheck={handleHeaderCheck}
              isLoading={isLoading}
              isEmpty={!allProfiles.length}
              errorMessage={errorMessage}
            >
              {allProfiles.map((profile) => (
                <AsyncProfileRow
                  key={profile.id}
                  index={hashCode(profile.id)}
                  profile={profile}
                  checkedIndices={checkedIndices}
                  handleRowCheck={handleRowCheck}
                  onDownload={handleDownloadProfile}
                />
              ))}
            </AsyncProfilerTable>
          )}
        </CardBody>
      </Card>
    </TargetView>
  );
};

export interface AsyncProfilesTableToolbarProps {
  target: NullableTarget;
  currentProfile?: AsyncProfilerSession;
  checkedIndices: number[];
  profilerRunning: boolean;
  handleCreate: () => void;
  handleDelete: () => void;
  actionLoadings: Record<ProfileActions, boolean>;
}

const AsyncProfilesToolbar: React.FC<AsyncProfilesTableToolbarProps> = (props) => {
  const context = React.useContext(ServiceContext);
  const [warningModalOpen, setWarningModalOpen] = React.useState(false);
  const [actionToggleOpen, setActionToggleOpen] = React.useState(false);

  const handleActionToggle = React.useCallback(() => setActionToggleOpen((old) => !old), [setActionToggleOpen]);

  const handleWarningModalClose = React.useCallback(() => {
    setWarningModalOpen(false);
  }, [setWarningModalOpen]);

  const handleDeleteButton = React.useCallback(() => {
    if (context.settings.deletionDialogsEnabledFor(DeleteOrDisableWarningType.DeleteAsyncProfile)) {
      setWarningModalOpen(true);
    } else {
      props.handleDelete();
    }
  }, [context.settings, setWarningModalOpen, props]);

  const deleteAsyncProfileWarningModal = React.useMemo(() => {
    return (
      <DeleteWarningModal
        warningType={DeleteOrDisableWarningType.DeleteAsyncProfile}
        visible={warningModalOpen}
        onAccept={props.handleDelete}
        onClose={handleWarningModalClose}
      />
    );
  }, [warningModalOpen, props.handleDelete, handleWarningModalClose]);

  const actionLoadingProps = React.useMemo<Record<ProfileActions, LoadingProps>>(
    () => ({
      DELETE: {
        spinnerAriaValueText: 'Deleting',
        spinnerAriaLabel: 'deleting-async-profile',
        isLoading: props.actionLoadings['DELETE'],
      } as LoadingProps,
    }),
    [props],
  );

  const buttons = React.useMemo(() => {
    return [
      {
        default: (
          <Button variant="primary" onClick={props.handleCreate} isDisabled={props.profilerRunning}>
            Create
          </Button>
        ),
        collapsed: (
          <OverflowMenuDropdownItem key={'Delete'} isShared onClick={props.handleCreate}>
            Create
          </OverflowMenuDropdownItem>
        ),
        key: 'Delete',
      },
      {
        // FIXME the Delete button should be disabled if the only checked row item is the currently running profile, which we don't currently have a way to stop/delete until it completes
        default: (
          <Button
            variant="danger"
            onClick={handleDeleteButton}
            isDisabled={!props.checkedIndices.length || props.actionLoadings['DELETE']}
            {...actionLoadingProps['DELETE']}
          >
            {props.actionLoadings['DELETE'] ? 'Deleting' : 'Delete'}
          </Button>
        ),
        collapsed: (
          <OverflowMenuDropdownItem key={'Delete'} isShared onClick={handleDeleteButton}>
            {props.actionLoadings['DELETE'] ? 'Deleting' : 'Delete'}
          </OverflowMenuDropdownItem>
        ),
        key: 'Delete',
      },
    ];
  }, [
    handleDeleteButton,
    props.checkedIndices.length,
    props.handleCreate,
    props.profilerRunning,
    props.actionLoadings,
    actionLoadingProps,
  ]);

  return (
    <Toolbar id="async-profiles-toolbar" aria-label="async-profiles-toolbar">
      <ToolbarContent>
        <ToolbarGroup variant="button-group" style={{ alignSelf: 'start' }}>
          <ToolbarItem variant="overflow-menu">
            <OverflowMenu
              breakpoint="sm"
              breakpointReference={() => document.getElementById('async-profiles-toolbar') || document.body}
            >
              <OverflowMenuContent>
                <OverflowMenuGroup groupType="button">
                  {buttons.map((b) => (
                    <OverflowMenuItem key={b.key}>{b.default}</OverflowMenuItem>
                  ))}
                </OverflowMenuGroup>
              </OverflowMenuContent>
              <OverflowMenuControl>
                <Dropdown
                  onSelect={() => setActionToggleOpen(false)}
                  toggle={(toggleRef: React.Ref<MenuToggleElement>) => (
                    <MenuToggle variant="plain" ref={toggleRef} onClick={() => handleActionToggle()}>
                      <EllipsisVIcon />
                    </MenuToggle>
                  )}
                  onOpenChange={setActionToggleOpen}
                  onOpenChangeKeys={['Escape']}
                  isOpen={actionToggleOpen}
                  popperProps={{
                    appendTo: portalRoot,
                    enableFlip: true,
                  }}
                >
                  <DropdownList>{buttons.map((b) => b.collapsed)}</DropdownList>
                </Dropdown>
              </OverflowMenuControl>
            </OverflowMenu>
          </ToolbarItem>
        </ToolbarGroup>
        {deleteAsyncProfileWarningModal}
      </ToolbarContent>
    </Toolbar>
  );
};

export interface AsyncProfilerTableProps {
  toolbar: React.ReactElement;
  tableColumns: ColumnConfig;
  tableTitle: string;
  isEmpty: boolean;
  isHeaderChecked: boolean;
  isLoading: boolean;
  errorMessage: string;
  onHeaderCheck: (event, checked: boolean) => void;
  outerContainerStyles?: string;
  innerContainerStyles?: string;
  children: React.ReactNode;
}

export const AsyncProfilerTable: React.FC<AsyncProfilerTableProps> = ({
  toolbar,
  tableColumns,
  tableTitle,
  isEmpty,
  isHeaderChecked,
  isLoading,
  errorMessage,
  onHeaderCheck,
  children,
  outerContainerStyles,
  innerContainerStyles,
  ...props
}) => {
  const context = React.useContext(ServiceContext);
  let view: JSX.Element;

  const authRetry = React.useCallback(() => {
    context.target.setAuthRetry();
  }, [context.target]);

  const isError = React.useMemo(() => errorMessage != '', [errorMessage]);

  if (isError) {
    view = (
      <>
        <ErrorView
          title={`Error retrieving ${tableTitle}`}
          message={errorMessage}
          retry={isAuthFail(errorMessage) ? authRetry : undefined}
        />
      </>
    );
  } else if (isLoading) {
    view = <LoadingView />;
  } else if (isEmpty) {
    view = (
      <Bullseye>
        <EmptyState>
          <EmptyStateHeader
            titleText={<>No {tableTitle}</>}
            icon={<EmptyStateIcon icon={SearchIcon} />}
            headingLevel="h4"
          />
        </EmptyState>
      </Bullseye>
    );
  } else {
    view = (
      <>
        <Table {...props} isStickyHeader aria-label={tableTitle}>
          <Thead>
            <Tr>
              <Th
                key="table-header-check-all"
                screenReaderText="select-all header"
                select={{
                  onSelect: onHeaderCheck,
                  isSelected: isHeaderChecked,
                }}
              />
              {tableColumns.columns.map(({ title }) => (
                <Th key={`table-header-${title}`}>{title}</Th>
              ))}
              <Th key="table-header-actions" screenReaderText="actions header" />
            </Tr>
          </Thead>
          {children}
        </Table>
      </>
    );
  }

  return (
    <>
      <OuterScrollContainer className={outerContainerStyles}>
        {isError ? null : toolbar}
        <InnerScrollContainer className={innerContainerStyles}>{view}</InnerScrollContainer>
      </OuterScrollContainer>
    </>
  );
};

export interface AsyncProfileRowProps {
  index: number;
  profile: AsyncProfile | AsyncProfilerSession;
  checkedIndices: number[];
  handleRowCheck: (checked: boolean, rowIdx: string | number) => void;
  onDownload: (id: string) => void;
}

export const AsyncProfileRow: React.FC<AsyncProfileRowProps> = ({
  profile,
  index,
  checkedIndices,
  handleRowCheck,
  onDownload,
}) => {
  const [dayjs, dateFormat] = useDayjs();

  const handleCheck = React.useCallback(
    (_, checked: boolean) => {
      handleRowCheck(checked, index);
    },
    [index, handleRowCheck],
  );

  const parentRow = React.useMemo(() => {
    return (
      <Tr key={`${index}_parent`}>
        <Td key={`async-profile-table-row-${index}_0`}>
          <Checkbox
            name={`async-profile-table-row-${index}-check`}
            onChange={handleCheck}
            isChecked={checkedIndices.includes(index)}
            id={`async-profile-table-row-${index}-check`}
            data-quickstart-id={`async-profiles-check-box`}
          />
        </Td>
        <Td key={`async-profile-table-row-${index}_0`} dataLabel={tableColumns[0].title}>
          {profile.id}
        </Td>
        <Td key={`async-profile-table-row-${index}_1`} dataLabel={tableColumns[1].title}>
          <Timestamp
            className="async-profiler-table__timestamp"
            tooltip={{
              variant: TimestampTooltipVariant.custom,
              content: dayjs(profile.startTime * MILLIS).toISOString(),
            }}
          >
            {dayjs(profile.startTime * MILLIS)
              .tz(dateFormat.timeZone.full)
              .format('L LTS z')}
          </Timestamp>
        </Td>
        <Td key={`async-profile-table-row-${index}_2`} dataLabel={tableColumns[2].title}>
          {formatDuration(profile.duration)}
        </Td>
        <Td key={`async-profile-table-row-${index}_3`} dataLabel={tableColumns[3].title}>
          {'size' in profile ? 'STOPPED' : 'RUNNING'}
        </Td>
        <Td key={`async-profile-table-row-${index}_4`} dataLabel={tableColumns[4].title}>
          {'size' in profile ? formatBytes(profile.size) : ''}
        </Td>
        <AsyncProfileAction
          id={profile.id}
          onDownload={'size' in profile ? onDownload : undefined}
          data-quickstart-id="async-profiles-kebab"
        />
      </Tr>
    );
  }, [profile, onDownload, index, checkedIndices, handleCheck, dayjs, dateFormat]);

  return <Tbody key={index}>{parentRow}</Tbody>;
};

export interface AsyncProfileActionProps {
  id: string;
  onDownload?: (id: string) => void;
}

export const AsyncProfileAction: React.FC<AsyncProfileActionProps> = ({ id, onDownload, ...props }) => {
  const { t } = useCryostatTranslation();
  const [isOpen, setIsOpen] = React.useState(false);

  const actionItems = React.useMemo(() => {
    return [
      {
        title: 'Download',
        key: 'download-async-profile',
        onClick: onDownload ? () => onDownload(id) : () => {},
        isDisabled: !onDownload,
      },
    ] as RowAction[];
  }, [onDownload, id]);

  const toggle = React.useCallback(
    (toggleRef: React.Ref<MenuToggleElement>) => (
      <MenuToggle
        ref={toggleRef}
        onClick={() => setIsOpen((isOpen) => !isOpen)}
        isExpanded={isOpen}
        variant="plain"
        data-quickstart-id="async-profile-kebab"
        aria-label={t('AsyncProfileActions.ARIA_LABELS.MENU_TOGGLE')}
      >
        <EllipsisVIcon />
      </MenuToggle>
    ),
    [t, setIsOpen, isOpen],
  );

  return (
    <Td {...props} isActionCell>
      <Dropdown
        toggle={toggle}
        popperProps={{
          enableFlip: true,
          position: 'right',
        }}
        isOpen={isOpen}
        onOpenChange={(isOpen) => setIsOpen(isOpen)}
        onOpenChangeKeys={['Escape']}
      >
        <DropdownList>
          {actionItems.map((action) =>
            action.isSeparator ? (
              <Divider />
            ) : (
              <DropdownItem
                key={action.key}
                isDisabled={action.isDisabled}
                onClick={() => {
                  setIsOpen(false);
                  action.onClick && action.onClick();
                }}
                data-quickstart-id={action.key}
              >
                {action.title}
              </DropdownItem>
            ),
          )}
        </DropdownList>
      </Dropdown>
    </Td>
  );
};

export default AsyncProfiler;
