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

import { parseLabels } from '@app/RecordingMetadata/RecordingLabel';
import { ActiveRecording, RecordingState } from '@app/Shared/Services/Api.service';
import { NotificationCategory } from '@app/Shared/Services/NotificationChannel.service';
import { ServiceContext } from '@app/Shared/Services/Services';
import { NO_TARGET } from '@app/Shared/Services/Target.service';
import { useSubscriptions} from '@app/utils/useSubscriptions';
import { Button, Checkbox, Drawer, DrawerContent, DrawerContentBody, Text, Toolbar, ToolbarContent, ToolbarGroup, ToolbarItem } from '@patternfly/react-core';
import { Tbody, Tr, Td, ExpandableRowContent } from '@patternfly/react-table';
import * as React from 'react';
import { useHistory, useRouteMatch } from 'react-router-dom';
import { combineLatest, forkJoin, merge, Observable } from 'rxjs';
import { concatMap, filter, first } from 'rxjs/operators';
import { LabelCell } from '../RecordingMetadata/LabelCell';
import { RecordingActions } from './RecordingActions';
import { RecordingLabelsPanel } from './RecordingLabelsPanel';
import { emptyActiveRecordingFilters, filterRecordings, RecordingFilters, RecordingFiltersCategories } from './RecordingFilters';
import { RecordingsTable } from './RecordingsTable';
import { ReportFrame } from './ReportFrame';
import { DeleteWarningModal } from '../Modal/DeleteWarningModal';
import { DeleteWarningType } from '@app/Modal/DeleteWarningUtils';
import { useDispatch, useSelector } from 'react-redux';
import { addFilterIntent, addTargetIntent, deleteAllFiltersIntent, deleteCategoryFiltersIntent, deleteFilterIntent } from '@app/Shared/Redux/RecordingFilterActions';
import { TargetRecordingFilters } from '@app/Shared/Redux/RecordingFilterReducer';

export enum PanelContent {
  LABELS,
}
export interface ActiveRecordingsTableProps {
  archiveEnabled: boolean;
}

export const ActiveRecordingsTable: React.FunctionComponent<ActiveRecordingsTableProps> = (props) => {
  const context = React.useContext(ServiceContext);
  const routerHistory = useHistory();
  const { url } = useRouteMatch();
  const addSubscription = useSubscriptions();
  const dispatch = useDispatch();

  const [target, setTarget] = React.useState(""); // connectURL of the target
  const [recordings, setRecordings] = React.useState([] as ActiveRecording[]);
  const [filteredRecordings, setFilteredRecordings] = React.useState([] as ActiveRecording[]);
  const [headerChecked, setHeaderChecked] = React.useState(false);
  const [checkedIndices, setCheckedIndices] = React.useState([] as number[]);
  const [expandedRows, setExpandedRows] = React.useState([] as string[]);
  const [showDetailsPanel, setShowDetailsPanel] = React.useState(false);
  const [warningModalOpen, setWarningModalOpen] = React.useState(false);
  const [panelContent, setPanelContent] = React.useState(PanelContent.LABELS);
  const [isLoading, setIsLoading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState('');

  const targetRecordingFilters = useSelector((state: any) => {
    const filters = state.recordingFilters.list.filter((targetFilter: TargetRecordingFilters) => targetFilter.target === target);
    return filters.length > 0? filters[0].active.filters: emptyActiveRecordingFilters;
  }) as RecordingFiltersCategories;

  const tableColumns: string[] = [
    'Name',
    'Start Time',
    'Duration',
    'State',
    'Labels',
  ];

  const handleRowCheck = React.useCallback((checked, index) => {
    if (checked) {
      setCheckedIndices(ci => ([...ci, index]));
    } else {
      setHeaderChecked(false);
      setCheckedIndices(ci => ci.filter(v => v !== index));
    }
  }, [setCheckedIndices, setHeaderChecked]);

  const handleHeaderCheck = React.useCallback((event, checked) => {
    setHeaderChecked(checked);
    setCheckedIndices(checked ? Array.from(new Array(filteredRecordings.length), (x, i) => i) : []);
  }, [setHeaderChecked, setCheckedIndices, filteredRecordings]);

  const handleCreateRecording = React.useCallback(() => {
    routerHistory.push(`${url}/create`);
  }, [routerHistory]);

  const handleEditLabels = React.useCallback(() => {
    setShowDetailsPanel(true);
    setPanelContent(PanelContent.LABELS);
  }, [setShowDetailsPanel, setPanelContent]);

  const handleRecordings = React.useCallback((recordings) => {
    setRecordings(recordings);
    setIsLoading(false);
    setErrorMessage('');
  }, [setRecordings, setIsLoading, setErrorMessage]);

  const handleError = React.useCallback((error) => {
    setIsLoading(false);
    setErrorMessage(error.message);
  }, [setIsLoading, setErrorMessage]);

  const refreshRecordingList = React.useCallback(() => {
    setIsLoading(true);
    addSubscription(
      context.target.target()
      .pipe(
        filter(target => target !== NO_TARGET),
        concatMap(target => context.api.doGet<ActiveRecording[]>(`targets/${encodeURIComponent(target.connectUrl)}/recordings`)),
        first(),
      ).subscribe(value => handleRecordings(value), err => handleError(err))
    );
  }, [addSubscription, context, context.target, context.api, setIsLoading, handleRecordings, handleError]);

  React.useEffect(() => {
    addSubscription(
      context.target.target().subscribe((target) => {
        setTarget(target.connectUrl);
        dispatch(addTargetIntent(target.connectUrl));
        refreshRecordingList();
      })
    );
  }, [addSubscription, context, context.target, refreshRecordingList, setTarget]);

  React.useEffect(() => {
    addSubscription(
      combineLatest([
        context.target.target(),
        merge(
          context.notificationChannel.messages(NotificationCategory.ActiveRecordingCreated),
          context.notificationChannel.messages(NotificationCategory.SnapshotCreated),
        ),
      ])
      .subscribe(parts => {
        const currentTarget = parts[0];
        const event = parts[1];
        if (currentTarget.connectUrl != event.message.target) {
          return;
        }
        setRecordings(old => old.concat([event.message.recording]));
      })
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
      ])
      .subscribe(parts => {
        const currentTarget = parts[0];
        const event = parts[1];
        if (currentTarget.connectUrl != event.message.target) {
          return;
        }
        let deleted;

        setRecordings((old) => {
          return old.filter((r, i) => {
            if (r.name == event.message.recording.name) {
              deleted = i;
              return false;
            }
            return true;
          });
        });
        setCheckedIndices(old => old
          .filter((v) => v !== deleted)
          .map(ci => ci > deleted ? ci - 1 : ci)
        );
      })
    );
  }, [addSubscription, context, context.notificationChannel, setRecordings, setCheckedIndices]);

  React.useEffect(() => {
    addSubscription(
      combineLatest([
        context.target.target(),
        context.notificationChannel.messages(NotificationCategory.ActiveRecordingStopped),
      ])
      .subscribe(parts => {
        const currentTarget = parts[0];
        const event = parts[1];
        if (currentTarget.connectUrl != event.message.target) {
          return;
        }
        setRecordings(old => {
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
    addSubscription(context.target.authFailure().subscribe(() => {
      setErrorMessage("Auth failure");
    }));
  }, [context, context.target, setErrorMessage, addSubscription]);

  React.useEffect(() => {
    addSubscription(
      combineLatest([
      context.target.target(),
      context.notificationChannel.messages(NotificationCategory.RecordingMetadataUpdated),
    ])
      .subscribe(parts => {
        const currentTarget = parts[0];
        const event = parts[1];
        if (currentTarget.connectUrl != event.message.target) {
          return;
        }
        setRecordings(old => old.map(
          o => o.name == event.message.recordingName 
            ? { ...o, metadata: { labels: event.message.metadata.labels } } 
            : o));
      })
    );
  }, [addSubscription, context, context.notificationChannel, setRecordings]);

  const handleArchiveRecordings = React.useCallback(() => {
    const tasks: Observable<boolean>[] = [];
    filteredRecordings.forEach((r: ActiveRecording, idx) => {
      if (checkedIndices.includes(idx)) {
        handleRowCheck(false, idx);
        tasks.push(
          context.api.archiveRecording(r.name).pipe(first())
        );
      }
    });
    addSubscription(
      forkJoin(tasks).subscribe(() => {} /* do nothing */, window.console.error)
    );
  }, [filteredRecordings, checkedIndices, handleRowCheck, context.api, addSubscription]);

  const handleStopRecordings = React.useCallback(() => {
    const tasks: Observable<boolean>[] = [];
    filteredRecordings.forEach((r: ActiveRecording, idx) => {
      if (checkedIndices.includes(idx)) {
        handleRowCheck(false, idx);
        if (r.state === RecordingState.RUNNING || r.state === RecordingState.STARTING) {
          tasks.push(
            context.api.stopRecording(r.name).pipe(first())
          );
        }
      }
    });
    addSubscription(
      forkJoin(tasks).subscribe((() => {} /* do nothing */), window.console.error)
    );
  }, [filteredRecordings, checkedIndices, handleRowCheck, context.api, addSubscription]);

  const handleDeleteRecordings = React.useCallback(() => {
    const tasks: Observable<{}>[] = [];
    filteredRecordings.forEach((r: ActiveRecording, idx) => {
      if (checkedIndices.includes(idx)) {
        context.reports.delete(r);
        tasks.push(
          context.api.deleteRecording(r.name).pipe(first())
        );
      }
    });
    addSubscription(
      forkJoin(tasks).subscribe((() => {} /* do nothing */), window.console.error)
    );
  }, [filteredRecordings, checkedIndices, context.reports, context.api, addSubscription]);

  const handleClearFilters = React.useCallback(() => {
    dispatch(deleteAllFiltersIntent(target, false));
  }, [dispatch, target]);

  const updateFilters = React.useCallback((target, {filterValue, filterKey, deleted = false, deleteOptions}) => {
    if (deleted) {
      if (deleteOptions && deleteOptions.all) {
        dispatch(deleteCategoryFiltersIntent(target, filterKey, false));
      } else {
        dispatch(deleteFilterIntent(target, filterKey, filterValue, false));
      }
    } else {
      dispatch(addFilterIntent(target, filterKey, filterValue, false));
    }
  }, [dispatch]);

  React.useEffect(() => {
    setFilteredRecordings(filterRecordings(recordings, targetRecordingFilters));
  }, [recordings, targetRecordingFilters, setFilteredRecordings, filterRecordings]);

  React.useEffect(() => {
    if (!context.settings.autoRefreshEnabled()) {
      return;
    }
    const id = window.setInterval(() => refreshRecordingList(), context.settings.autoRefreshPeriod() * context.settings.autoRefreshUnits());
    return () => window.clearInterval(id);
  }, [refreshRecordingList, context, context.settings]);

  const RecordingRow = (props) => {
    const parsedLabels = React.useMemo(() => {
      return parseLabels(props.recording.metadata.labels);
    }, [props.recording.metadata.labels]);

    const expandedRowId = React.useMemo(() => `active-table-row-${props.recording.name}-${props.recording.startTime}-exp`,
     [props.recording.name, props.recording.startTime]);

    const handleToggle = React.useCallback(() => toggleExpanded(expandedRowId), [toggleExpanded]);

    const isExpanded = React.useMemo(() => {
      return expandedRows.includes(expandedRowId)
    }, [expandedRows, expandedRowId]);

    const handleCheck = React.useCallback((checked) => {
      handleRowCheck(checked, props.index);
    }, [handleRowCheck, props.index]);

    const parentRow = React.useMemo(() => {
      const ISOTime = (props) => {
        const fmt = React.useMemo(() => new Date(props.timeStr).toISOString(), [props.timeStr]);
        return (<span>{fmt}</span>);
      };

      const RecordingDuration = (props) => {
        const str = React.useMemo(() => props.duration === 0 ? 'Continuous' : `${props.duration / 1000}s`, [props.duration]);
        return (<span>{str}</span>);
      };

      return (
        <Tr key={`${props.index}_parent`}>
          <Td key={`active-table-row-${props.index}_0`}>
            <Checkbox
              name={`active-table-row-${props.index}-check`}
              onChange={handleCheck}
              isChecked={checkedIndices.includes(props.index)}
              id={`active-table-row-${props.index}-check`}
            />
          </Td>
          <Td
            key={`active-table-row-${props.index}_1`}
            id={`active-ex-toggle-${props.index}`}
            aria-controls={`active-ex-expand-${props.index}`}
            expand={{
              rowIndex: props.index,
              isExpanded: isExpanded,
              onToggle: handleToggle,
            }}
          />
          <Td key={`active-table-row-${props.index}_2`} dataLabel={tableColumns[0]}>
            {props.recording.name}
          </Td>
          <Td key={`active-table-row-${props.index}_3`} dataLabel={tableColumns[1]}>
            <ISOTime timeStr={props.recording.startTime} />
          </Td>
          <Td key={`active-table-row-${props.index}_4`} dataLabel={tableColumns[2]}>
            <RecordingDuration duration={props.recording.duration} />
          </Td>
          <Td key={`active-table-row-${props.index}_5`} dataLabel={tableColumns[3]}>
            {props.recording.state}
          </Td>
          <Td key={`active-table-row-${props.index}_6`} dataLabel={tableColumns[4]}>
            <LabelCell 
              target={target}
              updateFilters={updateFilters}
              labelFilters={props.labelFilters}
              labels={parsedLabels} 
            />
          </Td>
          <RecordingActions
            index={props.index}
            recording={props.recording}
            uploadFn={() => context.api.uploadActiveRecordingToGrafana(props.recording.name)}
          />
        </Tr>
      );
    }, [
      props.duration,
      props.index,
      props.recording,
      props.recording.duration,
      props.recording.name,
      props.recording.startTime,
      props.recording.state,
      props.timeStr,
      props.recording.metadata.labels,
      props.labelFilters,
      context.api,
      context.api.uploadActiveRecordingToGrafana,
      checkedIndices,
      handleCheck,
      handleToggle,
      updateFilters,
      isExpanded,
      tableColumns,
      parsedLabels,
      target
    ]);

    const childRow = React.useMemo(() => {
      return (
        <Tr key={`${props.index}_child`} isExpanded={isExpanded}>
          <Td
            key={`active-ex-expand-${props.index}`}
            dataLabel={"Content Details"}
            colSpan={tableColumns.length + 3}
          >
            <ExpandableRowContent>
              <Text>Recording Options:</Text>
              <Text>
                toDisk = { String(props.recording.toDisk) } &emsp;
                maxAge = {props.recording.maxAge / 1000}s &emsp;
                maxSize = { props.recording.maxSize }B
              </Text>
              <br></br>
              <hr></hr>
              <br></br>
              <Text>Automated Analysis:</Text>
              <ReportFrame isExpanded={isExpanded} recording={props.recording} width="100%" height="640" />
            </ExpandableRowContent>
          </Td>
        </Tr>
      );
    }, [props.recording, props.recording.name, props.duration, props.index, isExpanded, tableColumns, props.recording.toDisk, props.recording.maxAge, props.recording.maxSize]);

    return (
      <Tbody key={props.index} isExpanded={isExpanded[props.index]}>
        {parentRow}
        {childRow}
      </Tbody>
    );
  };

  const toggleExpanded = React.useCallback((id: string) => {
    setExpandedRows(expandedRows => {
      const idx = expandedRows.indexOf(id);
      return idx >= 0 ? [...expandedRows.slice(0, idx), ...expandedRows.slice(idx + 1, expandedRows.length)] : [...expandedRows, id]
    });
  }, [expandedRows, setExpandedRows]);

  const handleDeleteButton = React.useCallback(() => {
    if (context.settings.deletionDialogsEnabledFor(DeleteWarningType.DeleteActiveRecordings)) {
      setWarningModalOpen(true);
    }
    else {
      handleDeleteRecordings();
    }
  }, [context, context.settings, context.settings.deletionDialogsEnabledFor, setWarningModalOpen, handleDeleteRecordings]);

  const handleWarningModalClose = React.useCallback(() => {
    setWarningModalOpen(false);
  }, [setWarningModalOpen]);

  const RecordingsToolbar = () => {
    const isStopDisabled = React.useMemo(() => {
      if (!checkedIndices.length) {
        return true;
      }
      const filtered = filteredRecordings.filter((r: ActiveRecording, idx: number) => checkedIndices.includes(idx));
      const anyRunning = filtered.some((r: ActiveRecording) => r.state === RecordingState.RUNNING || r.state == RecordingState.STARTING);
      return !anyRunning;
    }, [checkedIndices, filteredRecordings]);

    const buttons = React.useMemo(() => {
      let arr = [
        <Button key="create" variant="primary" onClick={handleCreateRecording}>Create</Button>
      ];
      if (props.archiveEnabled) {
        arr.push((
          <Button key="archive" variant="secondary" onClick={handleArchiveRecordings} isDisabled={!checkedIndices.length}>Archive</Button>
        ));
      }
      arr = [
        ...arr,
        <Button key="edit labels" variant="secondary" onClick={handleEditLabels} isDisabled={!checkedIndices.length}>Edit Labels</Button>,
        <Button key="stop" variant="tertiary" onClick={handleStopRecordings} isDisabled={isStopDisabled}>Stop</Button>,
        <Button key="delete" variant="danger" onClick={handleDeleteButton} isDisabled={!checkedIndices.length}>Delete</Button>
      ]
      return <>
        {
          arr.map((btn, idx) => (
            <ToolbarItem key={idx}>
              { btn }
            </ToolbarItem>
          ))
        }
      </>;
    }, [checkedIndices]);

    const deleteActiveWarningModal = React.useMemo(() => {
      return <DeleteWarningModal 
        warningType={DeleteWarningType.DeleteActiveRecordings}
        visible={warningModalOpen}
        onAccept={handleDeleteRecordings}
        onClose={handleWarningModalClose}
      />
    }, [recordings, checkedIndices]);

    return (
      <Toolbar id="active-recordings-toolbar" clearAllFilters={handleClearFilters}>
        <ToolbarContent>
          <RecordingFilters 
            target={target}
            isArchived={false} 
            recordings={recordings} 
            filters={targetRecordingFilters} 
            updateFilters={updateFilters} />
          <ToolbarGroup variant="button-group">
            { buttons }
          </ToolbarGroup>  
          { deleteActiveWarningModal }
        </ToolbarContent>
      </Toolbar>
    );
  };

  const recordingRows = React.useMemo(() => {
    return filteredRecordings.map((r, idx) => <RecordingRow key={idx} recording={r} labelFilters={targetRecordingFilters.Labels} index={idx}/>)
  }, [filteredRecordings, expandedRows, checkedIndices]);

  const LabelsPanel = React.useMemo(() => (
    <RecordingLabelsPanel
      setShowPanel={setShowDetailsPanel}  
      isTargetRecording={true}
      checkedIndices={checkedIndices}
    />
  ), [checkedIndices]);

  return (
    <Drawer isExpanded={showDetailsPanel} isInline id={"active-recording-drawer"}>
      <DrawerContent panelContent={
        {
          [PanelContent.LABELS]: LabelsPanel,
        }[panelContent]
      } className='recordings-table-drawer-content'>
        <DrawerContentBody hasPadding>
          <RecordingsTable
          tableTitle="Active Flight Recordings"
          toolbar={<RecordingsToolbar />}
          tableColumns={tableColumns}
          isHeaderChecked={headerChecked}
          onHeaderCheck={handleHeaderCheck}
          isEmpty={!recordings.length}
          isEmptyFilterResult={!filteredRecordings.length}
          clearFilters={handleClearFilters}
          isLoading ={isLoading}
          isNestedTable={false}
          errorMessage ={errorMessage}
          >
            {recordingRows}
          </RecordingsTable>
        </DrawerContentBody>
      </DrawerContent>
    </Drawer>
  );
};
