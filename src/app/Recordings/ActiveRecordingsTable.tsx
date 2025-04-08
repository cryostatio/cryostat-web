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

import { authFailMessage } from '@app/ErrorView/types';
import { DeleteOrDisableWarningType } from '@app/Modal/types';
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
  KeyValue,
  NotificationCategory,
  NullableTarget,
  RecordingState,
  Target,
  keyValueToString,
} from '@app/Shared/Services/api.types';
import { ServiceContext } from '@app/Shared/Services/Services';
import { useDayjs } from '@app/utils/hooks/useDayjs';
import { useSort } from '@app/utils/hooks/useSort';
import { useSubscriptions } from '@app/utils/hooks/useSubscriptions';
import { formatBytes, formatDuration, LABEL_TEXT_MAXWIDTH, sortResources, TableColumn } from '@app/utils/utils';
import { useCryostatTranslation } from '@i18n/i18nextUtil';
import {
  Button,
  Checkbox,
  Drawer,
  DrawerContent,
  DrawerContentBody,
  Label,
  LabelGroup,
  Dropdown,
  DropdownList,
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
  DrawerPanelContent,
  DrawerHead,
  DrawerActions,
  DrawerCloseButton,
  DrawerPanelBody,
} from '@patternfly/react-core';
import { EllipsisVIcon, ProcessAutomationIcon } from '@patternfly/react-icons';
import { SortByDirection, Tbody, Td, Tr } from '@patternfly/react-table';
import * as React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom-v5-compat';
import { combineLatest, forkJoin, Observable, Subject } from 'rxjs';
import { concatMap, filter, first } from 'rxjs/operators';
import { DeleteWarningModal } from '../Modal/DeleteWarningModal';
import { LabelCell } from '../RecordingMetadata/LabelCell';
import { TargetAnalysis } from './AutomatedAnalysisResults';
import { RecordingActions } from './RecordingActions';
import { filterRecordings, RecordingFilters, RecordingFiltersCategories } from './RecordingFilters';
import { RecordingLabelsPanel } from './RecordingLabelsPanel';
import { ColumnConfig, RecordingsTable } from './RecordingsTable';

export enum PanelContent {
  LABELS,
  REPORT,
}

const tableColumns: TableColumn[] = [
  {
    title: 'Name',
    keyPaths: ['name'],
    sortable: true,
  },
  {
    title: 'Start time',
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
  initialPanelContent?: string;
  toolbarBreakReference?: HTMLElement | (() => HTMLElement);
}

export const ActiveRecordingsTable: React.FC<ActiveRecordingsTableProps> = (props) => {
  const context = React.useContext(ServiceContext);
  const navigate = useNavigate();
  const addSubscription = useSubscriptions();
  const dispatch = useDispatch<StateDispatch>();

  const [target, setTarget] = React.useState(undefined as NullableTarget);
  const [recordings, setRecordings] = React.useState([] as ActiveRecording[]);
  const [filteredRecordings, setFilteredRecordings] = React.useState([] as ActiveRecording[]);
  const [headerChecked, setHeaderChecked] = React.useState(false);
  const [checkedIndices, setCheckedIndices] = React.useState([] as number[]);
  const [showPanel, setShowPanel] = React.useState(!!props.initialPanelContent);
  const [panelContent, setPanelContent] = React.useState(
    props.initialPanelContent === 'report' ? PanelContent.REPORT : PanelContent.LABELS,
  );
  const [isLoading, setIsLoading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState('');
  const [actionLoadings, setActionLoadings] = React.useState<Record<ActiveActions, boolean>>({
    ARCHIVE: false,
    DELETE: false,
    STOP: false,
  });
  const [sortBy, getSortParams] = useSort();
  const [reportRefresh] = React.useState(new Subject<void>());
  const handleReportRefresh = React.useCallback(() => reportRefresh.next(), [reportRefresh]);

  const targetRecordingFilters = useSelector((state: RootState) => {
    const filters = state.recordingFilters.list.filter(
      (targetFilter: TargetRecordingFilters) => targetFilter.target === target?.connectUrl,
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
    navigate('create', { relative: 'path' });
  }, [navigate]);

  const handleEditLabels = React.useCallback(() => {
    setPanelContent(PanelContent.LABELS);
    setShowPanel(true);
  }, [setShowPanel, setPanelContent]);

  const handleShowReport = React.useCallback(() => {
    setPanelContent(PanelContent.REPORT);
    setShowPanel(true);
  }, [setShowPanel, setPanelContent]);

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
          concatMap((target: Target) => context.api.getTargetActiveRecordings(target)),
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
        setTarget(target);
        dispatch(recordingAddTargetIntent(target?.connectUrl || ''));
        refreshRecordingList();
      }),
    );
  }, [addSubscription, context, context.target, refreshRecordingList, setTarget, dispatch]);

  React.useEffect(() => {
    addSubscription(
      combineLatest([
        context.target.target(),
        context.notificationChannel.messages(NotificationCategory.ActiveRecordingCreated),
      ]).subscribe(([currentTarget, event]) => {
        if (currentTarget?.jvmId != event.message.jvmId) {
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
        context.notificationChannel.messages(NotificationCategory.ActiveRecordingDeleted),
      ]).subscribe(([currentTarget, event]) => {
        if (currentTarget?.jvmId != event.message.jvmId) {
          return;
        }
        setRecordings((old) => old.filter((r) => r.id !== event.message.recording.id));
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
        if (currentTarget?.jvmId != event.message.jvmId) {
          return;
        }
        setRecordings((old) => {
          const updated = [...old];
          for (const r of updated) {
            if (r.id === event.message.recording.id) {
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
        if (currentTarget?.jvmId != event.message.jvmId) {
          return;
        }
        setRecordings((old) => {
          return old.map((o) => {
            if (o.id == event.message.recording.id) {
              const updatedRecording = { ...o, metadata: { labels: event.message.recording.metadata.labels } };
              return updatedRecording;
            }
            return o;
          });
        });
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
    const tasks: Observable<string>[] = [];
    filteredRecordings.forEach((r: ActiveRecording) => {
      if (checkedIndices.includes(r.id)) {
        handleRowCheck(false, r.id);
        tasks.push(context.api.archiveRecording(r.remoteId).pipe(first()));
      }
    });
    addSubscription(
      forkJoin(tasks).subscribe({
        next: (jobIds) => {
          addSubscription(
            context.notificationChannel
              .messages(NotificationCategory.ArchiveRecordingSuccess)
              .subscribe((notification) => {
                if (jobIds.includes(notification.message.jobId)) {
                  handlePostActions('ARCHIVE');
                }
              }),
          );
        },
        error: () => handlePostActions('ARCHIVE'),
      }),
    );
  }, [
    filteredRecordings,
    checkedIndices,
    context.notificationChannel,
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
          tasks.push(context.api.stopRecording(r.remoteId).pipe(first()));
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
        tasks.push(context.api.deleteRecording(r.remoteId).pipe(first()));
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
    dispatch(recordingDeleteAllFiltersIntent(target!.connectUrl, false));
  }, [dispatch, target]);

  const updateFilters = React.useCallback(
    (
      target: string,
      { filterValue, filterKey, filterValueIndex, deleted = false, deleteOptions }: UpdateFilterOptions,
    ) => {
      if (deleted) {
        if (deleteOptions && deleteOptions.all) {
          dispatch(recordingDeleteCategoryFiltersIntent(target, filterKey, false));
        } else {
          dispatch(recordingDeleteFilterIntent(target, filterKey, false, filterValue, filterValueIndex));
        }
      } else {
        dispatch(recordingAddFilterIntent(target, filterKey, filterValue, false));
      }
    },
    [dispatch],
  );

  const RecordingsToolbar = React.useMemo(
    () => (
      <ActiveRecordingsToolbar
        target={target?.connectUrl || ''}
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
        handleAnalyze={handleShowReport}
        actionLoadings={actionLoadings}
        toolbarBreakReference={props.toolbarBreakReference}
      />
    ),
    [
      target,
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
      handleShowReport,
      actionLoadings,
      props.toolbarBreakReference,
    ],
  );

  const LabelsPanel = React.useMemo(
    () => <RecordingLabelsPanel setShowPanel={setShowPanel} isTargetRecording={true} checkedIndices={checkedIndices} />,
    [checkedIndices, setShowPanel],
  );

  const ReportPanel = React.useMemo(
    () => (
      <DrawerPanelContent isResizable defaultSize="65%">
        <DrawerHead>
          <DrawerActions>
            <Button
              variant="plain"
              onClick={handleReportRefresh}
              aria-label="Request analysis"
              isDisabled={!recordings.length}
            >
              <ProcessAutomationIcon />
            </Button>
            <DrawerCloseButton
              onClick={() => setShowPanel(false)}
              data-testid="hide-recordings-analysis-panel"
              aria-label="hide recordings analysis panel"
            />
          </DrawerActions>
        </DrawerHead>
        <DrawerPanelBody>
          <TargetAnalysis target={target} refreshRequest={reportRefresh} />
        </DrawerPanelBody>
      </DrawerPanelContent>
    ),
    [setShowPanel, target, recordings, reportRefresh, handleReportRefresh],
  );

  const columnConfig: ColumnConfig = React.useMemo(
    () => ({
      columns: tableColumns,
      onSort: getSortParams,
    }),
    [getSortParams],
  );

  return (
    <Drawer isExpanded={showPanel} isInline id={'active-recording-drawer'}>
      <DrawerContent
        panelContent={{ [PanelContent.LABELS]: LabelsPanel, [PanelContent.REPORT]: ReportPanel }[panelContent]}
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
                key={r.id}
                recording={r}
                labelFilters={targetRecordingFilters.Label}
                index={r.id}
                currentSelectedTargetURL={target?.connectUrl || ''}
                checkedIndices={checkedIndices}
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
  handleAnalyze: () => void;
  actionLoadings: Record<ActiveActions, boolean>;
  toolbarBreakReference?: HTMLElement | (() => HTMLElement);
}

const ActiveRecordingsToolbar: React.FC<ActiveRecordingsToolbarProps> = (props) => {
  const { t } = useCryostatTranslation();
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
        spinnerAriaValueText: t('ARCHIVING'),
        spinnerAriaLabel: 'archive-active-recording',
        isLoading: props.actionLoadings['ARCHIVE'],
      },
      STOP: {
        spinnerAriaValueText: t('STOPPING'),
        spinnerAriaLabel: 'stop-active-recording',
        isLoading: props.actionLoadings['STOP'],
      },
      DELETE: {
        spinnerAriaValueText: t('DELETING'),
        spinnerAriaLabel: 'deleting-active-recording',
        isLoading: props.actionLoadings['DELETE'],
      },
    }),
    [t, props.actionLoadings],
  );

  const buttons = React.useMemo(() => {
    let arr = [
      {
        default: (
          <Button variant="primary" onClick={props.handleCreateRecording} data-quickstart-id="recordings-create-btn">
            {t('CREATE')}
          </Button>
        ),
        collapsed: (
          <OverflowMenuDropdownItem key={'Create'} isShared onClick={props.handleCreateRecording}>
            {t('CREATE')}
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
            {props.actionLoadings['ARCHIVE'] ? t('ARCHIVING') : t('ARCHIVE')}
          </Button>
        ),
        collapsed: (
          <OverflowMenuDropdownItem key={'Archive'} isShared onClick={props.handleArchiveRecordings}>
            {props.actionLoadings['ARCHIVE'] ? t('ARCHIVING') : t('ARCHIVE')}
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
            {t('EDIT_LABELS')}
          </Button>
        ),
        collapsed: (
          <OverflowMenuDropdownItem key={'Edit Labels'} isShared onClick={props.handleEditLabels}>
            {t('EDIT_LABELS')}
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
            {props.actionLoadings['STOP'] ? t('STOPPING') : t('STOP')}
          </Button>
        ),
        collapsed: (
          <OverflowMenuDropdownItem
            key={'Stop'}
            isShared
            onClick={props.handleStopRecordings}
            isDisabled={isStopDisabled}
          >
            {props.actionLoadings['STOP'] ? t('STOPPING') : t('STOP')}
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
      {
        default: (
          <Button variant="secondary" onClick={props.handleAnalyze} data-quickstart-id="recordings-analyze-btn">
            {t('ANALYZE')}
          </Button>
        ),
        collapsed: (
          <OverflowMenuDropdownItem key={'Analyze'} isShared onClick={props.handleAnalyze}>
            {t('ANALYZE')}
          </OverflowMenuDropdownItem>
        ),
        key: 'Analyze',
      },
    ];
    return arr;
  }, [
    t,
    handleDeleteButton,
    isStopDisabled,
    actionLoadingProps,
    props.handleCreateRecording,
    props.handleArchiveRecordings,
    props.handleEditLabels,
    props.handleStopRecordings,
    props.handleAnalyze,
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
        <ToolbarItem variant="separator" className="recording-toolbar-separator" />
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
                    appendTo: document.body,
                    enableFlip: true,
                  }}
                >
                  <DropdownList>{buttons.map((b) => b.collapsed)}</DropdownList>
                </Dropdown>
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
  checkedIndices: number[];
  labelFilters: string[];
  handleRowCheck: (checked: boolean, rowIdx: number) => void;
  updateFilters: (target: string, updateFilterOptions: UpdateFilterOptions) => void;
}

export const ActiveRecordingRow: React.FC<ActiveRecordingRowProps> = ({
  recording,
  index,
  currentSelectedTargetURL,
  checkedIndices,
  labelFilters,
  handleRowCheck,
  updateFilters,
}) => {
  const { t } = useCryostatTranslation();
  const [dayjs, datetimeContext] = useDayjs();
  const context = React.useContext(ServiceContext);

  const handleCheck = React.useCallback(
    (_, checked: boolean) => {
      handleRowCheck(checked, index);
    },
    [index, handleRowCheck],
  );

  const recordingOptions = (recording: ActiveRecording): KeyValue[] => {
    const options: KeyValue[] = [];
    options.push({ key: 'toDisk', value: String(recording.toDisk) });
    if (recording.maxAge) {
      options.push({ key: 'maxAge', value: formatDuration(recording.maxAge, 1) });
    }
    if (recording.maxSize) {
      options.push({ key: 'maxSize', value: formatBytes(recording.maxSize) });
    }
    return options;
  };

  return (
    <Tbody key={index}>
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
          data-quickstart-id="recording-chevron"
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
          <span>{recording.duration === 0 ? t('CONTINUOUS') : formatDuration(recording.duration, 1)}</span>
        </Td>
        <Td key={`active-table-row-${index}_5`} dataLabel={tableColumns[3].title}>
          {recording.state}
        </Td>
        <Td key={`active-table-row-${index}_6`} dataLabel={tableColumns[4].title}>
          <LabelGroup isVertical style={{ padding: '0.2em' }}>
            {recordingOptions(recording).map((options) => (
              <Label color="purple" key={options.key} textMaxWidth={LABEL_TEXT_MAXWIDTH}>
                {keyValueToString(options)}
              </Label>
            ))}
          </LabelGroup>
        </Td>
        <Td key={`active-table-row-${index}_7`} dataLabel={tableColumns[5].title}>
          <LabelCell
            target={currentSelectedTargetURL}
            clickableOptions={{
              updateFilters: updateFilters,
              labelFilters: labelFilters,
            }}
            labels={recording.metadata.labels}
          />
        </Td>
        <RecordingActions
          index={index}
          recording={recording}
          uploadFn={() => context.api.uploadActiveRecordingToGrafana(recording.remoteId)}
        />
      </Tr>
    </Tbody>
  );
};
