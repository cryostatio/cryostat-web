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
import { ArchivedRecording } from '@app/Shared/Services/Api.service';
import { ServiceContext } from '@app/Shared/Services/Services';
import { NotificationCategory } from '@app/Shared/Services/NotificationChannel.service';
import { useSubscriptions } from '@app/utils/useSubscriptions';
import { Button, Checkbox, Drawer, DrawerContent, DrawerContentBody, Toolbar, ToolbarContent, ToolbarGroup, ToolbarItem } from '@patternfly/react-core';
import { Tbody, Tr, Td, ExpandableRowContent } from '@patternfly/react-table';
import { RecordingActions } from './RecordingActions';
import { RecordingsTable } from './RecordingsTable';
import { ReportFrame } from './ReportFrame';
import { Observable, forkJoin, merge, combineLatest } from 'rxjs';
import { concatMap, filter, first, map } from 'rxjs/operators';
import { NO_TARGET } from '@app/Shared/Services/Target.service';
import { parseLabels } from '@app/RecordingMetadata/RecordingLabel';
import { LabelCell } from '../RecordingMetadata/LabelCell';
import { RecordingLabelsPanel } from './RecordingLabelsPanel';
import { DeleteWarningModal } from '@app/Modal/DeleteWarningModal';
import { DeleteWarningType } from '@app/Modal/DeleteWarningUtils';
import { RecordingFiltersCategories } from './ActiveRecordingsTable';
import { filterRecordings, RecordingFilters } from './RecordingFilters';

export interface ArchivedRecordingsTableProps { 
  target?: Observable<Target>;
}

export const ArchivedRecordingsTable: React.FunctionComponent<ArchivedRecordingsTableProps> = (props) => {
  const context = React.useContext(ServiceContext);

  const [recordings, setRecordings] = React.useState([] as ArchivedRecording[]);
  const [filteredRecordings, setFilteredRecordings] = React.useState([] as ArchivedRecording[]);
  const [headerChecked, setHeaderChecked] = React.useState(false);
  const [checkedIndices, setCheckedIndices] = React.useState([] as number[]);
  const [expandedRows, setExpandedRows] = React.useState([] as string[]);
  const [showDetailsPanel, setShowDetailsPanel] = React.useState(false);
  const [warningModalOpen, setWarningModalOpen] = React.useState(false);
  const [filters, setFilters] = React.useState({
    Name: [],
    Labels: [],
  } as RecordingFiltersCategories);
  const [isLoading, setIsLoading] = React.useState(false);
  const addSubscription = useSubscriptions();

  const tableColumns: string[] = [
    'Name',
    'Labels',
  ];

  const handleHeaderCheck = React.useCallback((event, checked) => {
    setHeaderChecked(checked);
    setCheckedIndices(checked ? Array.from(new Array(filteredRecordings.length), (x, i) => i) : []);
  }, [setHeaderChecked, setCheckedIndices, filteredRecordings]);

  const handleRowCheck = React.useCallback((checked, index) => {
    if (checked) {
      setCheckedIndices(ci => ([...ci, index]));
    } else {
      setHeaderChecked(false);
      setCheckedIndices(ci => ci.filter(v => v !== index));
    }
  }, [setCheckedIndices, setHeaderChecked]);

  const handleEditLabels = React.useCallback(() => {
    setShowDetailsPanel(true);
  }, [setShowDetailsPanel]);

  const handleRecordings = React.useCallback((recordings) => {
    setRecordings(recordings);
    setIsLoading(false);
  }, [setRecordings, setIsLoading]);

  const queryTargetRecordings = (connectUrl: string) => {
    return context.api.graphql<any>(`
      query {
        targetNodes(filter: { name: "${connectUrl}" }) {
          recordings {
            archived {
              name
              downloadUrl
              reportUrl
              metadata {
                labels
              }
            }
          }
        }
      }`)
  }

  const refreshRecordingList = React.useCallback(() => {
    setIsLoading(true);
    if (typeof props.target === 'undefined' || props.target === null) {
      addSubscription(
        context.target.target()
        .pipe(
          filter(target => target !== NO_TARGET),
          first(),
          concatMap(target =>
            queryTargetRecordings(target.connectUrl)
          ),
          map(v => v.data.targetNodes[0].recordings.archived as ArchivedRecording[]),
        )
        .subscribe(handleRecordings)
      );
    } else {
      addSubscription(
        props.target
        .pipe(
          concatMap(target =>
            queryTargetRecordings(target.connectUrl)
          ),
          map(v => v.data.targetNodes[0].recordings.archived as ArchivedRecording[]),
        )
        .subscribe(handleRecordings)
      );
    }
  }, [addSubscription, context, context.api, setIsLoading, handleRecordings]);

  const handleClearFilters = React.useCallback(() => {
    setFilters({
      Name: [],
      Labels: [],
    } as RecordingFiltersCategories);
  }, [setFilters]);

  React.useEffect(() => {
    addSubscription(
      context.target.target().subscribe(refreshRecordingList)
    );
  }, [addSubscription, context, context.target, refreshRecordingList]);

  React.useEffect(() => {
    addSubscription(
      combineLatest([
        (typeof props.target === 'undefined' || props.target === null) ? context.target.target() : props.target,
        merge(
          context.notificationChannel.messages(NotificationCategory.ArchivedRecordingCreated),
          context.notificationChannel.messages(NotificationCategory.ActiveRecordingSaved),
        ),
      ])
      .subscribe(parts => {
        const currentTarget = parts[0];
        const event = parts[1];
        if (currentTarget.connectUrl != event.message.target) {
          return;
        }
        setRecordings(old => old.concat(event.message.recording));
      })
    );
  }, [addSubscription, context, context.notificationChannel, setRecordings]);

  React.useEffect(() => {
    addSubscription(
      combineLatest([
        (typeof props.target === 'undefined' || props.target === null) ? context.target.target() : props.target,
        context.notificationChannel.messages(NotificationCategory.ArchivedRecordingDeleted),
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
      context.notificationChannel.messages(NotificationCategory.RecordingMetadataUpdated)
      .subscribe(event => {
        setRecordings(old => old.map(
          o => o.name == event.message.recordingName 
            ? { ...o, metadata: { labels: event.message.metadata.labels } } 
            : o));
      })
    );
  }, [addSubscription, context, context.notificationChannel, setRecordings]);

  const handleDeleteRecordings = React.useCallback(() => {
    const tasks: Observable<any>[] = [];
    filteredRecordings.forEach((r: ArchivedRecording, idx) => {
      if (checkedIndices.includes(idx)) {
        context.reports.delete(r);
        tasks.push(
          context.api.deleteArchivedRecording(r.name).pipe(first())
        );
      }
    });
    addSubscription(
      forkJoin(tasks).subscribe()
    );
  }, [filteredRecordings, checkedIndices, context.reports, context.api, addSubscription]);
 
  const toggleExpanded = (id) => {
    const idx = expandedRows.indexOf(id);
    setExpandedRows(expandedRows => idx >= 0 ? [...expandedRows.slice(0, idx), ...expandedRows.slice(idx + 1, expandedRows.length)] : [...expandedRows, id]);
  };

  React.useEffect(() => {
    setFilteredRecordings(filterRecordings(recordings, filters));
  }, [recordings, filters]);

  React.useEffect(() => {
    if (!context.settings.autoRefreshEnabled()) {
      return;
    }
    const id = window.setInterval(() => refreshRecordingList(), context.settings.autoRefreshPeriod() * context.settings.autoRefreshUnits());
    return () => window.clearInterval(id);
  }, [context, context.settings, refreshRecordingList]);

  const RecordingRow = (props) => {
    const parsedLabels = React.useMemo(() => {
      return parseLabels(props.recording.metadata.labels);
    }, [props.recording.metadata.labels]);

    const expandedRowId =`archived-table-row-${props.index}-exp`;
    const handleToggle = () => {
      toggleExpanded(expandedRowId);
    };

    const isExpanded = React.useMemo(() => {
      return expandedRows.includes(expandedRowId);
    }, [expandedRows, expandedRowId]);

    const handleCheck = (checked) => {
      handleRowCheck(checked, props.index);
    };

    const parentRow = React.useMemo(() => {
      return(
        <Tr key={`${props.index}_parent`}>
          <Td key={`archived-table-row-${props.index}_0`}>
            <Checkbox
              name={`archived-table-row-${props.index}-check`}
              onChange={handleCheck}
              isChecked={checkedIndices.includes(props.index)}
              id={`archived-table-row-${props.index}-check`}
            />
          </Td>
          <Td
              key={`archived-table-row-${props.index}_1`}
              id={`archived-ex-toggle-${props.index}`}
              aria-controls={`archived-ex-expand-${props.index}`}
              expand={{
                rowIndex: props.index,
                isExpanded: isExpanded,
                onToggle: handleToggle,
              }}
            />
          <Td key={`archived-table-row-${props.index}_2`} dataLabel={tableColumns[0]}>
            {props.recording.name}
          </Td>
          <Td key={`active-table-row-${props.index}_3`} dataLabel={tableColumns[1]}>
            <LabelCell 
              labels={parsedLabels} 
            />
          </Td>
          <RecordingActions
            recording={props.recording}
            index={props.index}
            uploadFn={() => context.api.uploadArchivedRecordingToGrafana(props.recording.name)}
          />
        </Tr>
      );
    }, [props.recording, props.recording.metadata.labels, props.recording.name, props.index, handleCheck, checkedIndices, isExpanded, handleToggle, tableColumns, context.api]);

    const childRow = React.useMemo(() => {
      return (
        <Tr key={`${props.index}_child`} isExpanded={isExpanded}>
          <Td
            key={`archived-ex-expand-${props.index}`}
            dataLabel={"Content Details"}
            colSpan={tableColumns.length + 3}
          >
          <ExpandableRowContent>
            <ReportFrame isExpanded={isExpanded} recording={props.recording} width="100%" height="640" />
          </ExpandableRowContent>
          </Td>
        </Tr>
      )
    }, [props.recording, props.recording.name, props.index, isExpanded, tableColumns]);

    return (
      <Tbody key={props.index} isExpanded={isExpanded[props.index]}>
        {parentRow}
        {childRow}
      </Tbody>
    );
  };

  const handleDeleteButton = React.useCallback(() => {
    if (context.settings.deletionDialogsEnabledFor(DeleteWarningType.DeleteArchivedRecordings)) {
      setWarningModalOpen(true);
    }
    else {
      handleDeleteRecordings();
    }
  }, [context, context.settings, setWarningModalOpen, handleDeleteRecordings])

  const handleWarningModalClose = React.useCallback(() => {
    setWarningModalOpen(false);
  }, [setWarningModalOpen]);

  const RecordingsToolbar = () => {
    const deleteArchivedWarningModal = React.useMemo(() => {
      return <DeleteWarningModal 
        warningType={DeleteWarningType.DeleteArchivedRecordings}
        visible={warningModalOpen}
        onAccept={handleDeleteRecordings}
        onClose={handleWarningModalClose}
      />
    }, [recordings, checkedIndices]);

    return (
      <Toolbar id="archived-recordings-toolbar" clearAllFilters={handleClearFilters}>
        <ToolbarContent>
          <RecordingFilters filters={filters} setFilters={setFilters} />
          <ToolbarGroup variant="button-group">
            <ToolbarItem>
              <Button key="edit labels" variant="secondary" onClick={handleEditLabels} isDisabled={!checkedIndices.length}>Edit Labels</Button>
            </ToolbarItem>
            <ToolbarItem>
              <Button variant="danger" onClick={handleDeleteButton} isDisabled={!checkedIndices.length}>Delete</Button>
            </ToolbarItem>
          </ToolbarGroup>
          { deleteArchivedWarningModal }
        </ToolbarContent>
      </Toolbar>
    );
  };

  const recordingRows = React.useMemo(() => {
    return filteredRecordings.map((r, idx) => <RecordingRow key={idx} recording={r} index={idx}/>)
  }, [filteredRecordings, expandedRows, checkedIndices]);

  const LabelsPanel = React.useMemo(() => (
    <RecordingLabelsPanel
      setShowPanel={setShowDetailsPanel}  
      isTargetRecording={true}
      checkedIndices={checkedIndices}
    />
  ), [checkedIndices]);

  return (
    <Drawer isExpanded={showDetailsPanel} isInline>
      <DrawerContent panelContent={LabelsPanel} className='recordings-table-drawer-content'>
        <DrawerContentBody hasPadding>
          <RecordingsTable
              tableTitle="Archived Flight Recordings"
              toolbar={<RecordingsToolbar />}
              tableColumns={tableColumns}
              isHeaderChecked={headerChecked}
              onHeaderCheck={handleHeaderCheck}
              isLoading={isLoading}
              isEmpty={!recordings.length}
              isEmptyFilterResult={!filteredRecordings.length}
              clearFilters={handleClearFilters}
              errorMessage=''
          >
            {recordingRows}
          </RecordingsTable>
        </DrawerContentBody>
      </DrawerContent>
    </Drawer>
  );
};
