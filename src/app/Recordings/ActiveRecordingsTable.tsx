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

import { authFailMessage } from '@app/ErrorView/ErrorView';
import { DeleteOrDisableWarningType } from '@app/Modal/DeleteWarningUtils';
import { parseLabels } from '@app/RecordingMetadata/RecordingLabel';
import { LoadingPropsType } from '@app/Shared/ProgressIndicator';
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
import { ActiveRecording, RecordingState } from '@app/Shared/Services/Api.service';
import { NotificationCategory } from '@app/Shared/Services/NotificationChannel.service';
import { ServiceContext } from '@app/Shared/Services/Services';
import { NO_TARGET } from '@app/Shared/Services/Target.service';
import { useDayjs } from '@app/utils/useDayjs';
import { useSort } from '@app/utils/useSort';
import { useSubscriptions } from '@app/utils/useSubscriptions';
import { sortResouces } from '@app/utils/utils';
import {
  Button,
  Checkbox,
  Drawer,
  DrawerContent,
  DrawerContentBody,
  Dropdown,
  KebabToggle,
  OverflowMenu,
  OverflowMenuContent,
  OverflowMenuControl,
  OverflowMenuDropdownItem,
  OverflowMenuGroup,
  OverflowMenuItem,
  Text,
  Timestamp,
  TimestampTooltipVariant,
  Toolbar,
  ToolbarContent,
  ToolbarGroup,
  ToolbarItem,
} from '@patternfly/react-core';
import { ExpandableRowContent, Tbody, Td, Tr } from '@patternfly/react-table';
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
import { ReportFrame } from './ReportFrame';

export enum PanelContent {
  LABELS,
}

const tableColumns = [
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
    title: 'Labels',
    keyPaths: ['metadata', 'labels'],
  },
];

const mapper = (index?: number) => {
  if (index !== undefined) {
    return tableColumns[index].keyPaths;
  }
  return undefined;
};

const getTransform = (index?: number) => {
  if (index !== undefined) {
    return tableColumns[index].transform;
  }
  return undefined;
};

export interface ActiveRecordingsTableProps {
  archiveEnabled: boolean;
  toolbarBreakReference?: HTMLElement | (() => HTMLElement);
}

export const ActiveRecordingsTable: React.FunctionComponent<ActiveRecordingsTableProps> = (props) => {
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
      (targetFilter: TargetRecordingFilters) => targetFilter.target === targetConnectURL
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
    [setCheckedIndices, setHeaderChecked]
  );

  const handleHeaderCheck = React.useCallback(
    (_, checked: boolean | ((prevState: boolean) => boolean)) => {
      setHeaderChecked(checked);
      setCheckedIndices(checked ? filteredRecordings.map((r) => r.id) : []);
    },
    [setHeaderChecked, setCheckedIndices, filteredRecordings]
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
    [setRecordings, setIsLoading, setErrorMessage]
  );

  const handleError = React.useCallback(
    (error: { message: React.SetStateAction<string> }) => {
      setIsLoading(false);
      setErrorMessage(error.message);
      setRecordings([]);
    },
    [setIsLoading, setErrorMessage, setRecordings]
  );

  const refreshRecordingList = React.useCallback(() => {
    setIsLoading(true);
    addSubscription(
      context.target
        .target()
        .pipe(
          filter((target) => target !== NO_TARGET),
          concatMap((target) =>
            context.api.doGet<ActiveRecording[]>(`targets/${encodeURIComponent(target.connectUrl)}/recordings`)
          ),
          first()
        )
        .subscribe({
          next: handleRecordings,
          error: handleError,
        })
    );
  }, [addSubscription, context.target, context.api, setIsLoading, handleRecordings, handleError]);

  React.useEffect(() => {
    addSubscription(
      context.target.target().subscribe((target) => {
        setTargetConnectURL(target.connectUrl);
        dispatch(recordingAddTargetIntent(target.connectUrl));
        refreshRecordingList();
      })
    );
  }, [addSubscription, context, context.target, refreshRecordingList, setTargetConnectURL, dispatch]);

  React.useEffect(() => {
    addSubscription(
      combineLatest([
        context.target.target(),
        merge(
          context.notificationChannel.messages(NotificationCategory.ActiveRecordingCreated),
          context.notificationChannel.messages(NotificationCategory.SnapshotCreated)
        ),
      ]).subscribe(([currentTarget, event]) => {
        if (currentTarget.connectUrl != event.message.target) {
          return;
        }
        setRecordings((old) => old.concat([event.message.recording]));
      })
    );
  }, [addSubscription, context, context.notificationChannel, setRecordings]);

  React.useEffect(() => {
    addSubscription(
      combineLatest([
        context.target.target(),
        merge(
          context.notificationChannel.messages(NotificationCategory.ActiveRecordingDeleted),
          context.notificationChannel.messages(NotificationCategory.SnapshotDeleted)
        ),
      ]).subscribe(([currentTarget, event]) => {
        if (currentTarget.connectUrl != event.message.target) {
          return;
        }

        setRecordings((old) => old.filter((r) => r.name !== event.message.recording.name));
        setCheckedIndices((old) => old.filter((idx) => idx !== event.message.recording.id));
      })
    );
  }, [addSubscription, context, context.notificationChannel, setRecordings, setCheckedIndices]);

  React.useEffect(() => {
    addSubscription(
      combineLatest([
        context.target.target(),
        context.notificationChannel.messages(NotificationCategory.ActiveRecordingStopped),
      ]).subscribe(([currentTarget, event]) => {
        if (currentTarget.connectUrl != event.message.target) {
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
      })
    );
  }, [addSubscription, context, context.notificationChannel, setRecordings]);

  React.useEffect(() => {
    addSubscription(
      context.target.authFailure().subscribe(() => {
        setErrorMessage(authFailMessage);
        setRecordings([]);
      })
    );
  }, [context, context.target, setErrorMessage, addSubscription, setRecordings]);

  React.useEffect(() => {
    addSubscription(
      combineLatest([
        context.target.target(),
        context.notificationChannel.messages(NotificationCategory.RecordingMetadataUpdated),
      ]).subscribe(([currentTarget, event]) => {
        if (currentTarget.connectUrl != event.message.target) {
          return;
        }
        setRecordings((old) =>
          old.map((o) =>
            o.name == event.message.recordingName ? { ...o, metadata: { labels: event.message.metadata.labels } } : o
          )
        );
      })
    );
  }, [addSubscription, context, context.notificationChannel, setRecordings]);

  React.useEffect(() => {
    setFilteredRecordings(
      sortResouces(sortBy, filterRecordings(recordings, targetRecordingFilters), mapper, getTransform)
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
      context.settings.autoRefreshPeriod() * context.settings.autoRefreshUnits()
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
    [setActionLoadings]
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
      })
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
      })
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
      })
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
    [dispatch]
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
    [setExpandedRows]
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
    ]
  );

  const LabelsPanel = React.useMemo(
    () => (
      <RecordingLabelsPanel
        setShowPanel={setShowDetailsPanel}
        isTargetRecording={true}
        checkedIndices={checkedIndices}
      />
    ),
    [checkedIndices, setShowDetailsPanel]
  );

  const columnConfig: ColumnConfig = React.useMemo(
    () => ({
      columns: tableColumns,
      onSort: getSortParams,
    }),
    [getSortParams]
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

const ActiveRecordingsToolbar: React.FunctionComponent<ActiveRecordingsToolbarProps> = (props) => {
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

  const actionLoadingProps = React.useMemo<Record<ActiveActions, LoadingPropsType>>(
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
    [props.actionLoadings]
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

  const parsedLabels = React.useMemo(() => {
    return parseLabels(recording.metadata.labels);
  }, [recording]);

  const expandedRowId = React.useMemo(
    () => `active-table-row-${recording.name}-${recording.startTime}-exp`,
    [recording]
  );

  const handleToggle = React.useCallback(() => toggleExpanded(expandedRowId), [expandedRowId, toggleExpanded]);

  const isExpanded = React.useMemo(() => {
    return expandedRows.includes(expandedRowId);
  }, [expandedRowId, expandedRows]);

  const handleCheck = React.useCallback(
    (checked: boolean) => {
      handleRowCheck(checked, index);
    },
    [index, handleRowCheck]
  );

  const parentRow = React.useMemo(() => {
    const RecordingDuration = (props: { duration: number }) => {
      const str = React.useMemo(
        () => (props.duration === 0 ? 'Continuous' : `${props.duration / 1000}s`),
        [props.duration]
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
            <Text>Recording Options:</Text>
            <Text>
              toDisk = {String(recording.toDisk)} &emsp; maxAge = {recording.maxAge / 1000}s &emsp; maxSize ={' '}
              {recording.maxSize}B
            </Text>
            <br></br>
            <hr></hr>
            <br></br>
            <Text>Automated Analysis:</Text>
            <ReportFrame isExpanded={isExpanded} recording={recording} width="100%" height="640" />
          </ExpandableRowContent>
        </Td>
      </Tr>
    );
  }, [recording, index, isExpanded]);

  return (
    <Tbody key={index} isExpanded={isExpanded}>
      {parentRow}
      {childRow}
    </Tbody>
  );
};
