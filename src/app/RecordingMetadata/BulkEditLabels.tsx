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
import { uploadAsTarget } from '@app/Archives/Archives';
import { LabelCell } from '@app/RecordingMetadata/LabelCell';
import { LoadingPropsType } from '@app/Shared/ProgressIndicator';
import {
  ActiveRecording,
  ArchivedRecording,
  Recording,
  RecordingDirectory,
  UPLOADS_SUBDIRECTORY,
} from '@app/Shared/Services/Api.service';
import { NotificationCategory } from '@app/Shared/Services/NotificationChannel.service';
import { ServiceContext } from '@app/Shared/Services/Services';
import { NO_TARGET } from '@app/Shared/Services/Target.service';
import { useSubscriptions } from '@app/utils/useSubscriptions';
import { hashCode, portalRoot } from '@app/utils/utils';
import { Button, Split, SplitItem, Stack, StackItem, Text, Tooltip, ValidatedOptions } from '@patternfly/react-core';
import { HelpIcon } from '@patternfly/react-icons';
import * as React from 'react';
import { combineLatest, concatMap, filter, first, forkJoin, map, Observable, of } from 'rxjs';
import { includesLabel, parseLabels, RecordingLabel } from './RecordingLabel';
import { RecordingLabelFields } from './RecordingLabelFields';

export interface BulkEditLabelsProps {
  isTargetRecording: boolean;
  isUploadsTable?: boolean;
  checkedIndices: number[];
  directory?: RecordingDirectory;
  directoryRecordings?: ArchivedRecording[];
}

export const BulkEditLabels: React.FC<BulkEditLabelsProps> = (props) => {
  const context = React.useContext(ServiceContext);
  const [recordings, setRecordings] = React.useState([] as Recording[]);
  const [editing, setEditing] = React.useState(false);
  const [commonLabels, setCommonLabels] = React.useState([] as RecordingLabel[]);
  const [savedCommonLabels, setSavedCommonLabels] = React.useState([] as RecordingLabel[]);
  const [valid, setValid] = React.useState(ValidatedOptions.default);
  const [loading, setLoading] = React.useState(false);
  const addSubscription = useSubscriptions();

  const getIdxFromRecording = React.useCallback(
    (r: Recording): number => (props.isTargetRecording ? (r as ActiveRecording).id : hashCode(r.name)),
    [props.isTargetRecording],
  );

  const handlePostUpdate = React.useCallback(() => {
    setEditing(false);
    setLoading(false);
  }, [setLoading, setEditing]);

  const handleUpdateLabels = React.useCallback(() => {
    setLoading(true);
    const tasks: Observable<unknown>[] = [];
    const toDelete = savedCommonLabels.filter((label) => !includesLabel(commonLabels, label));

    recordings.forEach((r: Recording) => {
      const idx = getIdxFromRecording(r);
      if (props.checkedIndices.includes(idx)) {
        let updatedLabels = [...parseLabels(r.metadata.labels), ...commonLabels];
        updatedLabels = updatedLabels.filter((label) => {
          return !includesLabel(toDelete, label);
        });
        if (props.directory) {
          tasks.push(
            context.api.postRecordingMetadataFromPath(props.directory.jvmId, r.name, updatedLabels).pipe(first()),
          );
        }
        if (props.isTargetRecording) {
          tasks.push(context.api.postTargetRecordingMetadata(r.name, updatedLabels).pipe(first()));
        } else if (props.isUploadsTable) {
          tasks.push(context.api.postUploadedRecordingMetadata(r.name, updatedLabels).pipe(first()));
        } else {
          tasks.push(context.api.postRecordingMetadata(r.name, updatedLabels).pipe(first()));
        }
      }
    });
    addSubscription(
      forkJoin(tasks).subscribe({
        next: handlePostUpdate,
        error: handlePostUpdate,
      }),
    );
  }, [
    addSubscription,
    context.api,
    getIdxFromRecording,
    handlePostUpdate,
    commonLabels,
    savedCommonLabels,
    recordings,
    props.checkedIndices,
    props.isTargetRecording,
    props.isUploadsTable,
    props.directory,
  ]);

  const handleEditLabels = React.useCallback(() => {
    setEditing(true);
  }, [setEditing]);

  const handleCancel = React.useCallback(() => {
    setEditing(false);
    setCommonLabels(savedCommonLabels);
  }, [setEditing, setCommonLabels, savedCommonLabels]);

  const updateCommonLabels = React.useCallback(
    (setLabels: (l: RecordingLabel[]) => void) => {
      const allRecordingLabels = [] as RecordingLabel[][];

      recordings.forEach((r: Recording) => {
        const idx = getIdxFromRecording(r);
        if (props.checkedIndices.includes(idx)) {
          allRecordingLabels.push(parseLabels(r.metadata.labels));
        }
      });

      const updatedCommonLabels =
        allRecordingLabels.length > 0
          ? allRecordingLabels.reduce(
              (prev, curr) => prev.filter((label) => includesLabel(curr, label)),
              allRecordingLabels[0],
            )
          : [];

      setLabels(updatedCommonLabels);
    },
    [recordings, getIdxFromRecording, props.checkedIndices],
  );

  /* eslint-disable @typescript-eslint/no-explicit-any */
  const refreshRecordingList = React.useCallback(() => {
    let observable: Observable<Recording[]>;
    if (props.directoryRecordings) {
      observable = of(props.directoryRecordings);
    } else if (props.isTargetRecording) {
      observable = context.target.target().pipe(
        filter((target) => target !== NO_TARGET),
        concatMap((target) =>
          context.api.doGet<ActiveRecording[]>(`targets/${encodeURIComponent(target.connectUrl)}/recordings`),
        ),
        first(),
      );
    } else {
      observable = props.isUploadsTable
        ? context.api
            .graphql<any>(
              `query GetUploadedRecordings($filter: ArchivedRecordingFilterInput) {
                archivedRecordings(filter: $filter) {
                  data {
                    name
                    downloadUrl
                    reportUrl
                    metadata {
                      labels
                    }
                  }
                }
              }`,
              { filter: { sourceTarget: UPLOADS_SUBDIRECTORY } },
            )
            .pipe(
              map((v) => v.data.archivedRecordings.data as ArchivedRecording[]),
              first(),
            )
        : context.target.target().pipe(
            filter((target) => target !== NO_TARGET),
            concatMap((target) =>
              context.api.graphql<any>(
                `query ArchivedRecordingsForTarget($connectUrl: String) {
                targetNodes(filter: { name: $connectUrl }) {
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
              }`,
                { connectUrl: target.connectUrl },
              ),
            ),
            map((v) => v.data.targetNodes[0].recordings.archived.data as ArchivedRecording[]),
            first(),
          );
    }

    addSubscription(observable.subscribe((value) => setRecordings(value)));
  }, [
    addSubscription,
    props.isTargetRecording,
    props.isUploadsTable,
    props.directoryRecordings,
    context.target,
    context.api,
    setRecordings,
  ]);
  /* eslint-enable @typescript-eslint/no-explicit-any */

  const saveButtonLoadingProps = React.useMemo(
    () =>
      ({
        spinnerAriaValueText: 'Saving',
        spinnerAriaLabel: 'saving-recording-labels',
        isLoading: loading,
      }) as LoadingPropsType,
    [loading],
  );

  React.useEffect(() => {
    addSubscription(context.target.target().subscribe(refreshRecordingList));
  }, [addSubscription, context, context.target, refreshRecordingList]);

  // Depends only on RecordingMetadataUpdated notifications
  // since updates on list of recordings will mount a completely new BulkEditLabels.
  React.useEffect(() => {
    addSubscription(
      combineLatest([
        props.isUploadsTable ? of(uploadAsTarget) : context.target.target(),
        context.notificationChannel.messages(NotificationCategory.RecordingMetadataUpdated),
      ]).subscribe((parts) => {
        const currentTarget = parts[0];
        const event = parts[1];
        if (currentTarget.connectUrl != event.message.target) {
          return;
        }
        setRecordings((old) =>
          old.map((o) =>
            o.name == event.message.recordingName ? { ...o, metadata: { labels: event.message.metadata.labels } } : o,
          ),
        );
      }),
    );
  }, [addSubscription, context.target, context.notificationChannel, setRecordings, props.isUploadsTable]);

  React.useEffect(() => {
    updateCommonLabels(setCommonLabels);
    updateCommonLabels(setSavedCommonLabels);

    if (!recordings.length && editing) {
      setEditing(false);
    }
  }, [editing, recordings, setCommonLabels, setSavedCommonLabels, updateCommonLabels, setEditing]);

  React.useEffect(() => {
    if (!props.checkedIndices.length) {
      setEditing(false);
    }
  }, [props.checkedIndices, setEditing]);

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
                appendTo={portalRoot}
              >
                <HelpIcon noVerticalAlign />
              </Tooltip>
            </SplitItem>
          </Split>
        </StackItem>
        <StackItem>
          <LabelCell target="" labels={savedCommonLabels} />
        </StackItem>
        <StackItem>
          {editing ? (
            <>
              <RecordingLabelFields
                labels={commonLabels}
                setLabels={setCommonLabels}
                setValid={setValid}
                isDisabled={loading}
              />
              <Split hasGutter>
                <SplitItem>
                  <Button
                    variant="primary"
                    onClick={handleUpdateLabels}
                    isDisabled={valid != ValidatedOptions.success || loading}
                    {...saveButtonLoadingProps}
                  >
                    {loading ? 'Saving' : 'Save'}
                  </Button>
                </SplitItem>
                <SplitItem>
                  <Button variant="secondary" onClick={handleCancel} isDisabled={loading}>
                    Cancel
                  </Button>
                </SplitItem>
              </Split>
            </>
          ) : (
            <Button
              key="edit labels"
              aria-label="Edit Labels"
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
