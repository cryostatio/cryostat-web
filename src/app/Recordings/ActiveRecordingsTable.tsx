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

import {
  ClickableAutomatedAnalysisLabel,
  clickableAutomatedAnalysisKey,
} from '@app/Dashboard/AutomatedAnalysis/ClickableAutomatedAnalysisLabel';
import { authFailMessage } from '@app/ErrorView/types';
import { DeleteOrDisableWarningType } from '@app/Modal/types';
import { parseLabels } from '@app/RecordingMetadata/utils';
import { LoadingProps } from '@app/Shared/Components/types';
import { UpdateFilterOptions } from '@app/Shared/Redux/Filters/Common';
import { emptyActiveRecordingFilters, TargetRecordingFilters } from '@app/Shared/Redux/Filters/RecordingFilterSlice';
import {
  recordingAddFilterIntent,
  recordingAddTargetIntent,
  recordingDeleteAllFiltersIntent,
  recordingDeleteCategoryFiltersIntent,
  recordingDeleteFilterIntent,
  RootState,
  StateDispatch,
} from '@app/Shared/Redux/ReduxStore';
import {
  ActiveRecording,
  AnalysisResult,
  CategorizedRuleEvaluations,
  NotificationCategory,
  RecordingState,
  Target,
} from '@app/Shared/Services/api.types';
import { ServiceContext } from '@app/Shared/Services/Services';
import { useDayjs } from '@app/utils/hooks/useDayjs';
import { useSort } from '@app/utils/hooks/useSort';
import { useSubscriptions } from '@app/utils/hooks/useSubscriptions';
import { formatBytes, sortResources, TableColumn } from '@app/utils/utils';
import {
  Bullseye,
  Button,
  Checkbox,
  Drawer,
  DrawerContent,
  DrawerContentBody,
  Dropdown,
  Grid,
  GridItem,
  KebabToggle,
  Label,
  LabelGroup,
  OverflowMenu,
  OverflowMenuContent,
  OverflowMenuControl,
  OverflowMenuDropdownItem,
  OverflowMenuGroup,
  OverflowMenuItem,
  Spinner,
  Timestamp,
  TimestampTooltipVariant,
  Title,
  Toolbar,
  ToolbarContent,
  ToolbarGroup,
  ToolbarItem,
} from '@patternfly/react-core';
import { RedoIcon } from '@patternfly/react-icons';
import { ExpandableRowContent, SortByDirection, Tbody, Td, Tr } from '@patternfly/react-table';
import * as React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useHistory, useRouteMatch } from 'react-router-dom';
import { combineLatest, forkJoin, merge, Observable } from 'rxjs';
import { concatMap, filter, first } from 'rxjs/operators';
import { DeleteWarningModal } from '../Modal/DeleteWarningModal';
import { LabelCell } from '../RecordingMetadata/LabelCell';
import { RecordingActions } from './RecordingActions';
import { filterRecordings, RecordingFilters, RecordingFiltersCategories } from './RecordingFilters';
import { RecordingLabelsPanel } from './RecordingLabelsPanel';
import { ColumnConfig, RecordingsTable } from './RecordingsTable';

export enum PanelContent {
  LABELS,
}

const tableColumns: TableColumn[] = [
  {
    title: 'Name',
    keyPaths: ['name'],
    sortable: true,
  },
  {
    title: 'Start Time',
    keyPaths: ['startTime'],
    sortable: true,
  },
  {
    title: 'Duration',
    keyPaths: ['duration'],
    transform: (duration: number, _rec: ActiveRecording) => {
      if (duration === 0) {
        return Number.MAX_VALUE;
      }
      return duration;
    },
    sortable: true,
  },
  {
    title: 'State',
    keyPaths: ['state'],
    sortable: true,
  },
  {
    title: 'Options',
    keyPaths: ['options'],
  },
  {
    title: 'Labels',
    keyPaths: ['metadata', 'labels'],
  },
];

export interface ActiveRecordingsTableProps {
  archiveEnabled: boolean;
  toolbarBreakReference?: HTMLElement | (() => HTMLElement);
}

export const ActiveRecordingsTable: React.FC<ActiveRecordingsTableProps> = (props) => {
  const context = React.useContext(ServiceContext);

  const routerHistory = useHistory();
  const { url } = useRouteMatch();
  const addSubscription = useSubscriptions();
  const dispatch = useDispatch<StateDispatch>();

  const [targetConnectURL, setTargetConnectURL] = React.useState('');
  const [recordings, setRecordings] = React.useState([] as ActiveRecording[]);
  const [filteredRecordings, setFilteredRecordings] = React.useState([] as ActiveRecording[]);
  const [headerChecked, setHeaderChecked] = React.useState(false);
  const [checkedIndices, setCheckedIndices] = React.useState([] as number[]);
  const [expandedRows, setExpandedRows] = React.useState([] as string[]);
  const [showDetailsPanel, setShowDetailsPanel] = React.useState(false);
  const [panelContent, setPanelContent] = React.useState(PanelContent.LABELS);
  const [isLoading, setIsLoading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState('');
  const [actionLoadings, setActionLoadings] = React.useState<Record<ActiveActions, boolean>>({
    ARCHIVE: false,
    DELETE: false,
    STOP: false,
  });
  const [sortBy, getSortParams] = useSort();

  const targetRecordingFilters = useSelector((state: RootState) => {
    const filters = state.recordingFilters.list.filter(
      (targetFilter: TargetRecordingFilters) => targetFilter.target === targetConnectURL,
    );
    return filters.length > 0 ? filters[0].active.filters : emptyActiveRecordingFilters;
  }) as RecordingFiltersCategories;

  const handleRowCheck = React.useCallback(
    (checked: boolean, index: number) => {
      if (checked) {
        setCheckedIndices((ci) => [...ci, index]);
      } else {
        setHeaderChecked(false);
        setCheckedIndices((ci) => ci.filter((v) => v !== index));
      }
    },
    [setCheckedIndices, setHeaderChecked],
  );

  const handleHeaderCheck = React.useCallback(
    (_, checked: boolean | ((prevState: boolean) => boolean)) => {
      setHeaderChecked(checked);
      setCheckedIndices(checked ? filteredRecordings.map((r) => r.id) : []);
    },
    [setHeaderChecked, setCheckedIndices, filteredRecordings],
  );

  const handleCreateRecording = React.useCallback(() => {
    routerHistory.push(`${url}/create`);
  }, [routerHistory, url]);

  const handleEditLabels = React.useCallback(() => {
    setShowDetailsPanel(true);
    setPanelContent(PanelContent.LABELS);
  }, [setShowDetailsPanel, setPanelContent]);

  const handleRecordings = React.useCallback(
    (recordings: React.SetStateAction<ActiveRecording[]>) => {
      setRecordings(recordings);
      setIsLoading(false);
      setErrorMessage('');
    },
    [setRecordings, setIsLoading, setErrorMessage],
  );

  const handleError = React.useCallback(
    (error: { message: React.SetStateAction<string> }) => {
      setIsLoading(false);
      setErrorMessage(error.message);
      setRecordings([]);
    },
    [setIsLoading, setErrorMessage, setRecordings],
  );

  const refreshRecordingList = React.useCallback(() => {
    setIsLoading(true);
    addSubscription(
      context.target
        .target()
        .pipe(
          filter((target) => !!target),
          concatMap((target: Target) =>
            context.api.doGet<ActiveRecording[]>(`targets/${encodeURIComponent(target.connectUrl)}/recordings`),
          ),
          first(),
        )
        .subscribe({
          next: handleRecordings,
          error: handleError,
        }),
    );
  }, [addSubscription, context.target, context.api, setIsLoading, handleRecordings, handleError]);

  React.useEffect(() => {
    addSubscription(
      context.target.target().subscribe((target) => {
        setTargetConnectURL(target?.connectUrl || '');
        dispatch(recordingAddTargetIntent(target?.connectUrl || ''));
        refreshRecordingList();
      }),
    );
  }, [addSubscription, context, context.target, refreshRecordingList, setTargetConnectURL, dispatch]);

  React.useEffect(() => {
    addSubscription(
      combineLatest([
        context.target.target(),
        merge(
          context.notificationChannel.messages(NotificationCategory.ActiveRecordingCreated),
          context.notificationChannel.messages(NotificationCategory.SnapshotCreated),
        ),
      ]).subscribe(([currentTarget, event]) => {
        if (currentTarget?.connectUrl != event.message.target) {
          return;
        }
        setRecordings((old) => old.concat([event.message.recording]));
      }),
    );
  }, [addSubscription, context, context.notificationChannel, setRecordings]);

  React.useEffect(() => {
    addSubscription(
      combineLatest([
        context.target.target(),
        merge(
          context.notificationChannel.messages(NotificationCategory.ActiveRecordingDeleted),
          context.notificationChannel.messages(NotificationCategory.SnapshotDeleted),
        ),
      ]).subscribe(([currentTarget, event]) => {
        if (currentTarget?.connectUrl != event.message.target) {
          return;
        }

        setRecordings((old) => old.filter((r) => r.name !== event.message.recording.name));
        setCheckedIndices((old) => old.filter((idx) => idx !== event.message.recording.id));
      }),
    );
  }, [addSubscription, context, context.notificationChannel, setRecordings, setCheckedIndices]);

  React.useEffect(() => {
    addSubscription(
      combineLatest([
        context.target.target(),
        context.notificationChannel.messages(NotificationCategory.ActiveRecordingStopped),
      ]).subscribe(([currentTarget, event]) => {
        if (currentTarget?.connectUrl != event.message.target) {
          return;
        }
        setRecordings((old) => {
          const updated = [...old];
          for (const r of updated) {
            if (r.name === event.message.recording.name) {
              r.state = RecordingState.STOPPED;
            }
          }
          return updated;
        });
      }),
    );
  }, [addSubscription, context, context.notificationChannel, setRecordings]);

  React.useEffect(() => {
    addSubscription(
      context.target.authFailure().subscribe(() => {
        setErrorMessage(authFailMessage);
        setRecordings([]);
      }),
    );
  }, [context, context.target, setErrorMessage, addSubscription, setRecordings]);

  React.useEffect(() => {
    addSubscription(
      combineLatest([
        context.target.target(),
        context.notificationChannel.messages(NotificationCategory.RecordingMetadataUpdated),
      ]).subscribe(([currentTarget, event]) => {
        if (currentTarget?.connectUrl != event.message.target) {
          return;
        }
        setRecordings((old) =>
          old.map((o) =>
            o.name == event.message.recordingName ? { ...o, metadata: { labels: event.message.metadata.labels } } : o,
          ),
        );
      }),
    );
  }, [addSubscription, context, context.notificationChannel, setRecordings]);

  React.useEffect(() => {
    setFilteredRecordings(
      sortResources(
        {
          index: sortBy.index ?? 0,
          direction: sortBy.direction ?? SortByDirection.asc,
        },
        filterRecordings(recordings, targetRecordingFilters),
        tableColumns,
      ),
    );
  }, [sortBy, recordings, targetRecordingFilters, setFilteredRecordings]);

  React.useEffect(() => {
    setCheckedIndices((ci) => {
      const filteredRecordingIdx = new Set(filteredRecordings.map((r) => r.id));
      return ci.filter((idx) => filteredRecordingIdx.has(idx));
    });
  }, [filteredRecordings, setCheckedIndices]);

  React.useEffect(() => {
    setHeaderChecked(checkedIndices.length === filteredRecordings.length);
  }, [setHeaderChecked, checkedIndices, filteredRecordings.length]);

  React.useEffect(() => {
    if (!context.settings.autoRefreshEnabled()) {
      return;
    }
    const id = window.setInterval(
      () => refreshRecordingList(),
      context.settings.autoRefreshPeriod() * context.settings.autoRefreshUnits(),
    );
    return () => window.clearInterval(id);
  }, [refreshRecordingList, context, context.settings]);

  const handlePostActions = React.useCallback(
    (action: ActiveActions) => {
      setActionLoadings((old) => {
        const newActionLoadings = { ...old };
        newActionLoadings[action] = false;
        return newActionLoadings;
      });
    },
    [setActionLoadings],
  );

  const handleArchiveRecordings = React.useCallback(() => {
    setActionLoadings((old) => ({ ...old, ARCHIVE: true }));
    const tasks: Observable<boolean>[] = [];
    filteredRecordings.forEach((r: ActiveRecording) => {
      if (checkedIndices.includes(r.id)) {
        handleRowCheck(false, r.id);
        tasks.push(context.api.archiveRecording(r.name).pipe(first()));
      }
    });
    addSubscription(
      forkJoin(tasks).subscribe({
        next: () => handlePostActions('ARCHIVE'),
        error: () => handlePostActions('ARCHIVE'),
      }),
    );
  }, [
    filteredRecordings,
    checkedIndices,
    handleRowCheck,
    context.api,
    addSubscription,
    setActionLoadings,
    handlePostActions,
  ]);

  const handleStopRecordings = React.useCallback(() => {
    setActionLoadings((old) => ({ ...old, STOP: true }));
    const tasks: Observable<boolean>[] = [];
    filteredRecordings.forEach((r: ActiveRecording) => {
      if (checkedIndices.includes(r.id)) {
        handleRowCheck(false, r.id);
        if (r.state === RecordingState.RUNNING || r.state === RecordingState.STARTING) {
          tasks.push(context.api.stopRecording(r.name).pipe(first()));
        }
      }
    });
    addSubscription(
      forkJoin(tasks).subscribe({
        next: () => handlePostActions('STOP'),
        error: () => handlePostActions('STOP'),
      }),
    );
  }, [
    filteredRecordings,
    checkedIndices,
    handleRowCheck,
    context.api,
    addSubscription,
    setActionLoadings,
    handlePostActions,
  ]);

  const handleDeleteRecordings = React.useCallback(() => {
    setActionLoadings((old) => ({ ...old, DELETE: true }));
    const tasks: Observable<boolean>[] = [];
    filteredRecordings.forEach((r: ActiveRecording) => {
      if (checkedIndices.includes(r.id)) {
        context.reports.delete(r);
        tasks.push(context.api.deleteRecording(r.name).pipe(first()));
      }
    });
    addSubscription(
      forkJoin(tasks).subscribe({
        next: () => handlePostActions('DELETE'),
        error: () => handlePostActions('DELETE'),
      }),
    );
  }, [
    filteredRecordings,
    checkedIndices,
    context.reports,
    context.api,
    addSubscription,
    setActionLoadings,
    handlePostActions,
  ]);

  const handleClearFilters = React.useCallback(() => {
    dispatch(recordingDeleteAllFiltersIntent(targetConnectURL, false));
  }, [dispatch, targetConnectURL]);

  const updateFilters = React.useCallback(
    (target: string, { filterValue, filterKey, deleted = false, deleteOptions }: UpdateFilterOptions) => {
      if (deleted) {
        if (deleteOptions && deleteOptions.all) {
          dispatch(recordingDeleteCategoryFiltersIntent(target, filterKey, false));
        } else {
          dispatch(recordingDeleteFilterIntent(target, filterKey, filterValue, false));
        }
      } else {
        dispatch(recordingAddFilterIntent(target, filterKey, filterValue, false));
      }
    },
    [dispatch],
  );

  const toggleExpanded = React.useCallback(
    (id: string) => {
      setExpandedRows((expandedRows) => {
        const idx = expandedRows.indexOf(id);
        return idx >= 0
          ? [...expandedRows.slice(0, idx), ...expandedRows.slice(idx + 1, expandedRows.length)]
          : [...expandedRows, id];
      });
    },
    [setExpandedRows],
  );

  const RecordingsToolbar = React.useMemo(
    () => (
      <ActiveRecordingsToolbar
        target={targetConnectURL}
        checkedIndices={checkedIndices}
        targetRecordingFilters={targetRecordingFilters}
        recordings={recordings}
        filteredRecordings={filteredRecordings}
        updateFilters={updateFilters}
        handleClearFilters={handleClearFilters}
        archiveEnabled={props.archiveEnabled}
        handleCreateRecording={handleCreateRecording}
        handleArchiveRecordings={handleArchiveRecordings}
        handleEditLabels={handleEditLabels}
        handleStopRecordings={handleStopRecordings}
        handleDeleteRecordings={handleDeleteRecordings}
        actionLoadings={actionLoadings}
        toolbarBreakReference={props.toolbarBreakReference}
      />
    ),
    [
      targetConnectURL,
      checkedIndices,
      targetRecordingFilters,
      recordings,
      filteredRecordings,
      updateFilters,
      handleClearFilters,
      props.archiveEnabled,
      handleCreateRecording,
      handleArchiveRecordings,
      handleEditLabels,
      handleStopRecordings,
      handleDeleteRecordings,
      actionLoadings,
      props.toolbarBreakReference,
    ],
  );

  const LabelsPanel = React.useMemo(
    () => (
      <RecordingLabelsPanel
        setShowPanel={setShowDetailsPanel}
        isTargetRecording={true}
        checkedIndices={checkedIndices}
      />
    ),
    [checkedIndices, setShowDetailsPanel],
  );

  const columnConfig: ColumnConfig = React.useMemo(
    () => ({
      columns: tableColumns,
      onSort: getSortParams,
    }),
    [getSortParams],
  );

  return (
    <Drawer isExpanded={showDetailsPanel} isInline id={'active-recording-drawer'}>
      <DrawerContent
        panelContent={{ [PanelContent.LABELS]: LabelsPanel }[panelContent]}
        className="recordings-table-drawer-content"
      >
        <DrawerContentBody hasPadding>
          <RecordingsTable
            tableTitle="Active Flight Recordings"
            toolbar={RecordingsToolbar}
            tableColumns={columnConfig}
            isHeaderChecked={headerChecked}
            onHeaderCheck={handleHeaderCheck}
            isEmpty={!recordings.length}
            isEmptyFilterResult={!filteredRecordings.length}
            clearFilters={handleClearFilters}
            isLoading={isLoading}
            isNestedTable={false}
            errorMessage={errorMessage}
          >
            {filteredRecordings.map((r) => (
              <ActiveRecordingRow
                key={r.name}
                targetConnectUrl={targetConnectURL}
                recording={r}
                labelFilters={targetRecordingFilters.Label}
                index={r.id}
                currentSelectedTargetURL={targetConnectURL}
                expandedRows={expandedRows}
                checkedIndices={checkedIndices}
                toggleExpanded={toggleExpanded}
                handleRowCheck={handleRowCheck}
                updateFilters={updateFilters}
              />
            ))}
          </RecordingsTable>
        </DrawerContentBody>
      </DrawerContent>
    </Drawer>
  );
};

export type ActiveActions = 'ARCHIVE' | 'STOP' | 'DELETE';

export interface ActiveRecordingsToolbarProps {
  target: string;
  checkedIndices: number[];
  targetRecordingFilters: RecordingFiltersCategories;
  recordings: ActiveRecording[];
  filteredRecordings: ActiveRecording[];
  updateFilters: (target: string, updateFilterOptions: UpdateFilterOptions) => void;
  handleClearFilters: () => void;
  archiveEnabled: boolean;
  handleCreateRecording: () => void;
  handleArchiveRecordings: () => void;
  handleEditLabels: () => void;
  handleStopRecordings: () => void;
  handleDeleteRecordings: () => void;
  actionLoadings: Record<ActiveActions, boolean>;
  toolbarBreakReference?: HTMLElement | (() => HTMLElement);
}

const ActiveRecordingsToolbar: React.FC<ActiveRecordingsToolbarProps> = (props) => {
  const context = React.useContext(ServiceContext);
  const [warningModalOpen, setWarningModalOpen] = React.useState(false);
  const [actionToggleOpen, setActionToggleOpen] = React.useState(false);

  const handleActionToggle = React.useCallback(() => setActionToggleOpen((old) => !old), [setActionToggleOpen]);

  const handleWarningModalClose = React.useCallback(() => {
    setWarningModalOpen(false);
  }, [setWarningModalOpen]);

  const handleDeleteButton = React.useCallback(() => {
    if (context.settings.deletionDialogsEnabledFor(DeleteOrDisableWarningType.DeleteActiveRecordings)) {
      setWarningModalOpen(true);
    } else {
      props.handleDeleteRecordings();
    }
  }, [context.settings, setWarningModalOpen, props]);

  const isStopDisabled = React.useMemo(() => {
    if (!props.checkedIndices.length || props.actionLoadings['STOP']) {
      return true;
    }
    const filtered = props.filteredRecordings.filter((r) => props.checkedIndices.includes(r.id));
    const anyRunning = filtered.some((r) => r.state === RecordingState.RUNNING || r.state == RecordingState.STARTING);
    return !anyRunning;
  }, [props.actionLoadings, props.checkedIndices, props.filteredRecordings]);

  const actionLoadingProps = React.useMemo<Record<ActiveActions, LoadingProps>>(
    () => ({
      ARCHIVE: {
        spinnerAriaValueText: 'Archiving',
        spinnerAriaLabel: 'archive-active-recording',
        isLoading: props.actionLoadings['ARCHIVE'],
      },
      STOP: {
        spinnerAriaValueText: 'Stopping',
        spinnerAriaLabel: 'stop-active-recording',
        isLoading: props.actionLoadings['STOP'],
      },
      DELETE: {
        spinnerAriaValueText: 'Deleting',
        spinnerAriaLabel: 'deleting-active-recording',
        isLoading: props.actionLoadings['DELETE'],
      },
    }),
    [props.actionLoadings],
  );

  const buttons = React.useMemo(() => {
    let arr = [
      {
        default: (
          <Button variant="primary" onClick={props.handleCreateRecording} data-quickstart-id="recordings-create-btn">
            Create
          </Button>
        ),
        collapsed: (
          <OverflowMenuDropdownItem key={'Create'} isShared onClick={props.handleCreateRecording}>
            Create
          </OverflowMenuDropdownItem>
        ),
        key: 'Create',
      },
    ];
    if (props.archiveEnabled) {
      arr.push({
        default: (
          <Button
            variant="secondary"
            onClick={props.handleArchiveRecordings}
            isDisabled={!props.checkedIndices.length || props.actionLoadings['ARCHIVE']}
            data-quickstart-id="recordings-archive-btn"
            {...actionLoadingProps['ARCHIVE']}
          >
            {props.actionLoadings['ARCHIVE'] ? 'Archiving' : 'Archive'}
          </Button>
        ),
        collapsed: (
          <OverflowMenuDropdownItem key={'Archive'} isShared onClick={props.handleArchiveRecordings}>
            {props.actionLoadings['ARCHIVE'] ? 'Archiving' : 'Archive'}
          </OverflowMenuDropdownItem>
        ),
        key: 'Archive',
      });
    }
    arr = [
      ...arr,
      {
        default: (
          <Button
            variant="secondary"
            onClick={props.handleEditLabels}
            isDisabled={!props.checkedIndices.length}
            data-quickstart-id="recordings-labels-btn"
          >
            Edit Labels
          </Button>
        ),
        collapsed: (
          <OverflowMenuDropdownItem key={'Edit Labels'} isShared onClick={props.handleEditLabels}>
            Edit Labels
          </OverflowMenuDropdownItem>
        ),
        key: 'Edit Labels',
      },
      {
        default: (
          <Button
            variant="tertiary"
            onClick={props.handleStopRecordings}
            isDisabled={isStopDisabled}
            data-quickstart-id="recordings-stop-btn"
            {...actionLoadingProps['STOP']}
          >
            {props.actionLoadings['STOP'] ? 'Stopping' : 'Stop'}
          </Button>
        ),
        collapsed: (
          <OverflowMenuDropdownItem key={'Stop'} isShared onClick={props.handleStopRecordings}>
            {props.actionLoadings['STOP'] ? 'Stopping' : 'Stop'}
          </OverflowMenuDropdownItem>
        ),
        key: 'Stop',
      },
      {
        default: (
          <Button
            variant="danger"
            onClick={handleDeleteButton}
            isDisabled={!props.checkedIndices.length || props.actionLoadings['DELETE']}
            data-quickstart-id="recordings-delete-btn"
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
    return arr;
  }, [
    handleDeleteButton,
    isStopDisabled,
    actionLoadingProps,
    props.handleCreateRecording,
    props.handleArchiveRecordings,
    props.handleEditLabels,
    props.handleStopRecordings,
    props.actionLoadings,
    props.archiveEnabled,
    props.checkedIndices,
  ]);

  const deleteActiveWarningModal = React.useMemo(() => {
    return (
      <DeleteWarningModal
        warningType={DeleteOrDisableWarningType.DeleteActiveRecordings}
        visible={warningModalOpen}
        onAccept={props.handleDeleteRecordings}
        onClose={handleWarningModalClose}
      />
    );
  }, [warningModalOpen, props.handleDeleteRecordings, handleWarningModalClose]);

  return (
    <Toolbar
      id="active-recordings-toolbar"
      aria-label="active-recording-toolbar"
      clearAllFilters={props.handleClearFilters}
      isSticky
    >
      <ToolbarContent>
        <RecordingFilters
          target={props.target}
          isArchived={false}
          recordings={props.recordings}
          filters={props.targetRecordingFilters}
          updateFilters={props.updateFilters}
          breakpoint={'xl'}
        />
        <ToolbarGroup style={{ alignSelf: 'start' }} variant="button-group">
          <ToolbarItem variant="overflow-menu">
            <OverflowMenu
              breakpoint="lg"
              breakpointReference={
                props.toolbarBreakReference ||
                (() => document.getElementById('active-recordings-toolbar') || document.body)
              }
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
                  aria-label={'active-recording-actions'}
                  isPlain
                  isFlipEnabled
                  onSelect={() => setActionToggleOpen(false)}
                  menuAppendTo={document.body}
                  isOpen={actionToggleOpen}
                  toggle={<KebabToggle id="active-recording-actions-toggle-kebab" onToggle={handleActionToggle} />}
                  dropdownItems={buttons.map((b) => b.collapsed)}
                />
              </OverflowMenuControl>
            </OverflowMenu>
          </ToolbarItem>
        </ToolbarGroup>
        {deleteActiveWarningModal}
      </ToolbarContent>
    </Toolbar>
  );
};

export interface ActiveRecordingRowProps {
  targetConnectUrl: string;
  recording: ActiveRecording;
  index: number;
  currentSelectedTargetURL: string;
  expandedRows: string[];
  checkedIndices: number[];
  labelFilters: string[];
  toggleExpanded: (rowId: string) => void;
  handleRowCheck: (checked: boolean, rowIdx: number) => void;
  updateFilters: (target: string, updateFilterOptions: UpdateFilterOptions) => void;
}

export const ActiveRecordingRow: React.FC<ActiveRecordingRowProps> = ({
  targetConnectUrl,
  recording,
  index,
  currentSelectedTargetURL,
  expandedRows,
  checkedIndices,
  labelFilters,
  toggleExpanded,
  handleRowCheck,
  updateFilters,
}) => {
  const [dayjs, datetimeContext] = useDayjs();
  const context = React.useContext(ServiceContext);
  const [loadingAnalysis, setLoadingAnalysis] = React.useState(false);
  const [analyses, setAnalyses] = React.useState<CategorizedRuleEvaluations[]>([]);

  const expandedRowId = React.useMemo(
    () => `active-table-row-${recording.name}-${recording.startTime}-exp`,
    [recording],
  );

  const isExpanded = React.useMemo(() => {
    return expandedRows.includes(expandedRowId);
  }, [expandedRowId, expandedRows]);

  const parsedLabels = React.useMemo(() => {
    return parseLabels(recording.metadata.labels);
  }, [recording]);

  const handleToggle = React.useCallback(() => toggleExpanded(expandedRowId), [expandedRowId, toggleExpanded]);

  const handleCheck = React.useCallback(
    (checked: boolean) => {
      handleRowCheck(checked, index);
    },
    [index, handleRowCheck],
  );

  const handleLoadAnalysis = React.useCallback(() => {
    setLoadingAnalysis(true);
    context.reports
      .reportJson(recording, targetConnectUrl)
      .pipe(first())
      .subscribe((report) => {
        const map = new Map<string, AnalysisResult[]>();
        report.forEach((evaluation) => {
          const topicValue = map.get(evaluation.topic);
          if (topicValue === undefined) {
            map.set(evaluation.topic, [evaluation]);
          } else {
            topicValue.push(evaluation);
            topicValue.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
          }
        });
        const sorted = (Array.from(map) as CategorizedRuleEvaluations[]).sort();
        setAnalyses(sorted);
        setLoadingAnalysis(false);
      });
  }, [setLoadingAnalysis, context.reports, recording, targetConnectUrl, setAnalyses]);

  React.useEffect(() => {
    if (!isExpanded) {
      return;
    }
    handleLoadAnalysis();
  }, [isExpanded, handleLoadAnalysis]);

  const parentRow = React.useMemo(() => {
    const RecordingDuration = (props: { duration: number }) => {
      const str = React.useMemo(
        () => (props.duration === 0 ? 'Continuous' : `${props.duration / 1000}s`),
        [props.duration],
      );
      return <span>{str}</span>;
    };

    return (
      <Tr key={`${index}_parent`}>
        <Td key={`active-table-row-${index}_0`}>
          <Checkbox
            name={`active-table-row-${index}-check`}
            onChange={handleCheck}
            isChecked={checkedIndices.includes(index)}
            id={`active-table-row-${index}-check`}
            data-quickstart-id="active-recordings-checkbox"
          />
        </Td>
        <Td
          key={`active-table-row-${index}_1`}
          id={`active-ex-toggle-${index}`}
          aria-controls={`active-ex-expand-${index}`}
          expand={{
            rowIndex: index,
            isExpanded: isExpanded,
            onToggle: handleToggle,
          }}
        />
        <Td key={`active-table-row-${index}_2`} dataLabel={tableColumns[0].title}>
          {recording.name}
        </Td>
        <Td key={`active-table-row-${index}_3`} dataLabel={tableColumns[1].title}>
          <Timestamp
            className="recording-table__timestamp"
            tooltip={{ variant: TimestampTooltipVariant.custom, content: dayjs(recording.startTime).toISOString() }}
          >
            {dayjs(recording.startTime).tz(datetimeContext.timeZone.full).format('L LTS z')}
          </Timestamp>
        </Td>
        <Td key={`active-table-row-${index}_4`} dataLabel={tableColumns[2].title}>
          <RecordingDuration duration={recording.duration} />
        </Td>
        <Td key={`active-table-row-${index}_5`} dataLabel={tableColumns[3].title}>
          {recording.state}
        </Td>
        <Td key={`active-table-row-${index}_6`} dataLabel={tableColumns[4].title}>
          <LabelGroup isVertical style={{ padding: '0.2em' }}>
            <Label color="blue" key="toDisk">
              toDisk: {String(recording.toDisk)}
            </Label>
            {recording.maxAge ? (
              <Label color="blue" key="maxAge">
                maxAge: {recording.maxAge / 1000}s
              </Label>
            ) : undefined}
            {recording.maxSize ? (
              <Label color="blue" key="maxSize">
                maxSize: {formatBytes(recording.maxSize)}
              </Label>
            ) : undefined}
          </LabelGroup>
        </Td>
        <Td key={`active-table-row-${index}_7`} dataLabel={tableColumns[5].title}>
          <LabelCell
            target={currentSelectedTargetURL}
            clickableOptions={{
              updateFilters: updateFilters,
              labelFilters: labelFilters,
            }}
            labels={parsedLabels}
          />
        </Td>
        <RecordingActions
          index={index}
          recording={recording}
          uploadFn={() => context.api.uploadActiveRecordingToGrafana(recording.name)}
        />
      </Tr>
    );
  }, [
    index,
    dayjs,
    datetimeContext.timeZone.full,
    checkedIndices,
    isExpanded,
    recording,
    labelFilters,
    currentSelectedTargetURL,
    parsedLabels,
    context.api,
    handleCheck,
    handleToggle,
    updateFilters,
  ]);

  const childRow = React.useMemo(() => {
    return (
      <Tr key={`${index}_child`} isExpanded={isExpanded}>
        <Td key={`active-ex-expand-${index}`} dataLabel={'Content Details'} colSpan={tableColumns.length + 3}>
          <ExpandableRowContent>
            <Title headingLevel={'h5'}>
              <Button
                variant="plain"
                isSmall
                isDisabled={loadingAnalysis}
                onClick={handleLoadAnalysis}
                icon={<RedoIcon />}
              />
              Automated Analysis
            </Title>
            <Grid>
              {loadingAnalysis ? (
                <Bullseye>
                  <Spinner />
                </Bullseye>
              ) : (
                analyses.map(([topic, evaluations]) => {
                  return (
                    <GridItem className="automated-analysis-grid-item" span={2} key={`gridItem-${topic}`}>
                      <LabelGroup
                        className="automated-analysis-topic-label-groups"
                        categoryName={topic}
                        isVertical
                        numLabels={2}
                        isCompact
                        key={topic}
                      >
                        {evaluations.map((evaluation) => {
                          return (
                            <ClickableAutomatedAnalysisLabel result={evaluation} key={clickableAutomatedAnalysisKey} />
                          );
                        })}
                      </LabelGroup>
                    </GridItem>
                  );
                })
              )}
            </Grid>
          </ExpandableRowContent>
        </Td>
      </Tr>
    );
  }, [index, isExpanded, handleLoadAnalysis, loadingAnalysis, analyses]);

  return (
    <Tbody key={index} isExpanded={isExpanded}>
      {parentRow}
      {childRow}
    </Tbody>
  );
};
