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
import { Button, Split, SplitItem, Stack, StackItem, Text, Tooltip, ValidatedOptions } from '@patternfly/react-core';
import { ServiceContext } from '@app/Shared/Services/Services';
import { useSubscriptions } from '@app/utils/useSubscriptions';
import { ActiveRecording, ArchivedRecording } from '@app/Shared/Services/Api.service';
import { includesLabel, parseLabels, RecordingLabel } from './RecordingLabel';
import { combineLatest, concatMap, filter, first, forkJoin, map, merge, Observable } from 'rxjs';
import { LabelCell } from '@app/RecordingMetadata/LabelCell';
import { RecordingLabelFields } from './RecordingLabelFields';
import { HelpIcon } from '@patternfly/react-icons';
import { NO_TARGET } from '@app/Shared/Services/Target.service';
import { NotificationCategory } from '@app/Shared/Services/NotificationChannel.service';
import { convertToNumber } from '@app/Recordings/ArchivedRecordingsTable';

export interface BulkEditLabelsProps {
  isTargetRecording: boolean;
  checkedIndices: number[];
}

export const BulkEditLabels: React.FunctionComponent<BulkEditLabelsProps> = (props) => {
  const context = React.useContext(ServiceContext);
  const [recordings, setRecordings] = React.useState([] as ArchivedRecording[]);
  const [editing, setEditing] = React.useState(false);
  const [commonLabels, setCommonLabels] = React.useState([] as RecordingLabel[]);
  const [savedCommonLabels, setSavedCommonLabels] = React.useState([] as RecordingLabel[]);
  const [valid, setValid] = React.useState(ValidatedOptions.default);
  const addSubscription = useSubscriptions();

  const getIdxFromRecording = React.useCallback((r: ArchivedRecording): number =>  {
    if (props.isTargetRecording) {
      return (r as ActiveRecording).id;
    } else {
      return convertToNumber(r.name);
    }
  }, [convertToNumber, props.isTargetRecording]);

  const handleUpdateLabels = React.useCallback(() => {
    const tasks: Observable<any>[] = [];
    const toDelete = savedCommonLabels.filter((label) => !includesLabel(commonLabels, label));

    recordings.forEach((r: ArchivedRecording) => {
      const idx = getIdxFromRecording(r);
      if (props.checkedIndices.includes(idx)) {
        let updatedLabels = [...parseLabels(r.metadata.labels), ...commonLabels];
        updatedLabels = updatedLabels.filter((label) => {
          return !includesLabel(toDelete, label);
        });

        tasks.push(
          props.isTargetRecording
            ? context.api.postTargetRecordingMetadata(r.name, updatedLabels).pipe(first())
            : context.api.postRecordingMetadata(r.name, updatedLabels).pipe(first())
        );
      }
    });
    addSubscription(forkJoin(tasks).subscribe(() => setEditing((editing) => !editing)));
  }, [
    recordings,
    props.checkedIndices,
    props.isTargetRecording,
    editing,
    setEditing,
    commonLabels,
    savedCommonLabels,
    parseLabels,
    context,
    context.api,
  ]);

  const handleEditLabels = React.useCallback(() => {
    setEditing(true);
  }, [setEditing]);

  const handleCancel = React.useCallback(() => {
    setEditing(false);
    setCommonLabels(savedCommonLabels);
  }, [setEditing, savedCommonLabels]);

  const updateCommonLabels = React.useCallback(
    (setLabels: (l: RecordingLabel[]) => void) => {
      let allRecordingLabels = [] as RecordingLabel[][];

      recordings.forEach((r: ArchivedRecording) => {
        const idx = getIdxFromRecording(r);
        if (props.checkedIndices.includes(idx)) {
          allRecordingLabels.push(parseLabels(r.metadata.labels));
        }
      });

      const updatedCommonLabels = allRecordingLabels.reduce(
        (prev, curr) => prev.filter((label) => includesLabel(curr, label)),
        allRecordingLabels[0]
      );
      setLabels(updatedCommonLabels);
    },
    [recordings, props.checkedIndices]
  );

  const refreshRecordingList = React.useCallback(() => {
    addSubscription(
      context.target
        .target()
        .pipe(
          filter((target) => target !== NO_TARGET),
          concatMap((target) =>
            props.isTargetRecording ?
              context.api.doGet<ActiveRecording[]>(`targets/${encodeURIComponent(target.connectUrl)}/recordings`)
              : context.api.graphql<any>(`
                  query {
                    targetNodes(filter: { name: "${target.connectUrl}" }) {
                      recordings {
                        archived {
                          data {
                            name
                            downloadUrl
                            reportUrl
                            metadata {
                              labels
                            }
                          }
                        }
                      }
                    }
                  }`),
          ),
          map(v => props.isTargetRecording ? v : v.data.targetNodes[0].recordings.archived.data as ArchivedRecording[]),
          first()
        )
        .subscribe((value) => setRecordings(value))
    );
  }, [addSubscription, props.isTargetRecording, context, context.target, context.api, setRecordings]);

  React.useEffect(() => {
    addSubscription(context.target.target().subscribe(refreshRecordingList));
  }, [addSubscription, context, context.target, refreshRecordingList]);

  // Depends only on RecordingMetadataUpdated notifications
  // since updates on list of recordings will mount a completely new BulkEditLabels.
  React.useEffect(() => {
    addSubscription(
      combineLatest([
        context.target.target(),
        context.notificationChannel.messages(NotificationCategory.RecordingMetadataUpdated),
      ]).subscribe((parts) => {
        const currentTarget = parts[0];
        const event = parts[1];
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
    updateCommonLabels(setCommonLabels);
    updateCommonLabels(setSavedCommonLabels);

    if (!recordings.length && editing) {
      setEditing(false);
    }
  }, [recordings, props.checkedIndices, setCommonLabels, setSavedCommonLabels]);

  React.useEffect(() => {
    if (!props.checkedIndices.length) {
      setEditing(false);
    }
  }, [props.checkedIndices]);

  return (
    <>
      <Stack hasGutter>
        <StackItem>
          <Split hasGutter>
            <SplitItem>
              <Text>Edit Recording Labels</Text>
            </SplitItem>
            <SplitItem>
              <Tooltip
                content={
                  <div>
                    Labels present on all selected recordings will appear here. Editing the labels will affect ALL
                    selected recordings.
                  </div>
                }
              >
                <HelpIcon noVerticalAlign />
              </Tooltip>
            </SplitItem>
          </Split>
        </StackItem>
        <StackItem>
          <LabelCell target='' labels={savedCommonLabels} />
        </StackItem>
        <StackItem>
          {editing ? (
            <>
              <RecordingLabelFields
                labels={commonLabels}
                setLabels={setCommonLabels}
                valid={valid}
                setValid={setValid}
              />
              <Split hasGutter>
                <SplitItem>
                  <Button variant="primary" onClick={handleUpdateLabels} isDisabled={valid != ValidatedOptions.success}>
                    Save
                  </Button>
                </SplitItem>
                <SplitItem>
                  <Button variant="secondary" onClick={handleCancel}>
                    Cancel
                  </Button>
                </SplitItem>
              </Split>
            </>
          ) : (
            <Button
              key="edit labels"
              aria-label='Edit Labels'
              variant="secondary"
              onClick={handleEditLabels}
              isDisabled={!props.checkedIndices.length}
            >
              Edit
            </Button>
          )}
        </StackItem>
      </Stack>
    </>
  );
};
