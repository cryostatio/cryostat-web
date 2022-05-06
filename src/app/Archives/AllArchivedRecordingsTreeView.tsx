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
import { TreeView , TreeViewDataItem } from '@patternfly/react-core';
import { ArchivedRecording } from '@app/Shared/Services/Api.service';
import { ServiceContext } from '@app/Shared/Services/Services';
import { Target } from '@app/Shared/Services/Target.service';
import { NotificationCategory } from '@app/Shared/Services/NotificationChannel.service';
import { useSubscriptions } from '@app/utils/useSubscriptions';
import { Button, Checkbox, Label, Text, Toolbar, ToolbarContent, ToolbarGroup, ToolbarItem } from '@patternfly/react-core';
import { TableComposable, Th, Thead, Tbody, Tr, Td, ExpandableRowContent } from '@patternfly/react-table';
import { ArchivedRecordingsTable } from '@app/Recordings/ArchivedRecordingsTable';
import { RecordingActions } from '@app/Recordings/RecordingActions';
import { RecordingsTable } from '@app/Recordings/RecordingsTable';
import { ReportFrame } from '@app/Recordings/ReportFrame';
import { Observable, forkJoin, merge, of } from 'rxjs';
import { first, map } from 'rxjs/operators';
import { PlusIcon } from '@patternfly/react-icons';
import { ArchiveUploadModal } from './ArchiveUploadModal';
import { EditRecordingLabels, parseLabels } from '@app/CreateRecording/EditRecordingLabels';

export interface AllArchivedRecordingsTreeViewProps { }

export const AllArchivedRecordingsTreeView: React.FunctionComponent<AllArchivedRecordingsTreeViewProps> = () => {
  const context = React.useContext(ServiceContext);

  const [targets, setTargets] = React.useState([] as Target[]);
  const [expandedRows, setExpandedRows] = React.useState([] as string[]);
  const [isLoading, setIsLoading] = React.useState(false);
  const addSubscription = useSubscriptions();

  const tableColumns: string[] = [
    'Target',
  ];

  React.useEffect(() => {
    const sub = context.targets.targets().subscribe((targets) => {
      setTargets(targets);
    });
    return () => sub.unsubscribe();
  }, [context, context.targets, setTargets]);

  const refreshTargetList = React.useCallback(() => {
    setIsLoading(true);
    addSubscription(
      context.targets.queryForTargets().subscribe(() => setIsLoading(false))
    );
  }, [setIsLoading, addSubscription, context.targets]);

  React.useEffect(() => {
    if (!context.settings.autoRefreshEnabled()) {
      return;
    }
    const id = window.setInterval(() => refreshTargetList(), context.settings.autoRefreshPeriod() * context.settings.autoRefreshUnits());
    return () => window.clearInterval(id);
  }, [context.target, context.settings, refreshTargetList]);

  const toggleExpanded = (id) => {
    const idx = expandedRows.indexOf(id);
    setExpandedRows(expandedRows => idx >= 0 ? [...expandedRows.slice(0, idx), ...expandedRows.slice(idx + 1, expandedRows.length)] : [...expandedRows, id]);
  };

  const TargetRow = (props) => {
    const expandedRowId =`target-table-row-${props.index}-exp`;
    const handleToggle = () => {
      toggleExpanded(expandedRowId);
    };

    const isExpanded = React.useMemo(() => {
      return expandedRows.includes(expandedRowId);
    }, [expandedRows, expandedRowId]);

    const parentRow = React.useMemo(() => {
      return(
        <Tr>
          <Td
              key={`target-table-row-${props.index}_1`}
              id={`target-ex-toggle-${props.index}`}
              aria-controls={`target-ex-expand-${props.index}`}
              expand={{
                rowIndex: props.index,
                isExpanded: isExpanded,
                onToggle: handleToggle,
              }}
            />
          <Td key={`target-table-row-${props.index}_2`} dataLabel={tableColumns[0]}>
            {(props.target.alias == props.target.connectUrl) || !props.target.alias ?
              `${props.target.connectUrl}`
            : 
              `${props.target.alias} (${props.target.connectUrl})`}
          </Td>
        </Tr> 
      );
    }, [props.target, props.target.alias, props.target.connectUrl, props.index, isExpanded, handleToggle, tableColumns]);

    const childRow = React.useMemo(() => {
      return (
        <Tr key={`${props.index}_child`} isExpanded={isExpanded}>
          <Td
            key={`target-ex-expand-${props.index}`}
            dataLabel={"Content Details"}
            colSpan={tableColumns.length + 1}
          >
          <ExpandableRowContent>
            <ArchivedRecordingsTable target={of(props.target)}/>
          </ExpandableRowContent>
          </Td>
        </Tr>
      )
    }, [props.target, props.index, context.api, isExpanded, tableColumns]);

    return (
      <Tbody key={props.index} isExpanded={isExpanded[props.index]}>
        {parentRow}
        {childRow}
      </Tbody>
    );
  }

  const targetRows = React.useMemo(() => {
    return targets.map((t, idx) => <TargetRow key={idx} target={t} index={idx}/>)
  }, [targets, expandedRows]);

  return (<>
    <TableComposable aria-label="all-archives">
      <Thead>
        <Tr>
          <Th key="table-header-expand"/>
          {tableColumns.map((key , idx) => (
            <Th key={`table-header-${key}`}>{key}</Th>
          ))}
        </Tr>
      </Thead>
      {targetRows}
    </TableComposable>
  </>);
};