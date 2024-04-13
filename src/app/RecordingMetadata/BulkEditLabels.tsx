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
import { LoadingProps } from '@app/Shared/Components/types';
import {
  RecordingDirectory,
  ArchivedRecording,
  Recording,
  ActiveRecording,
  UPLOADS_SUBDIRECTORY,
  NotificationCategory,
  Target,
  KeyValue,
} from '@app/Shared/Services/api.types';
import { ServiceContext } from '@app/Shared/Services/Services';
import { useSubscriptions } from '@app/utils/hooks/useSubscriptions';
import { hashCode, portalRoot } from '@app/utils/utils';
import { Button, Split, SplitItem, Stack, StackItem, Text, Tooltip, ValidatedOptions } from '@patternfly/react-core';
import { HelpIcon } from '@patternfly/react-icons';
import * as React from 'react';
import { combineLatest, concatMap, filter, first, forkJoin, map, Observable, of } from 'rxjs';
import { RecordingLabelFields } from './RecordingLabelFields';
import { includesLabel } from './utils';

export interface BulkEditLabelsProps {
  isTargetRecording: boolean;
  isUploadsTable?: boolean;
  checkedIndices: number[];
  directory?: RecordingDirectory;
  directoryRecordings?: ArchivedRecording[];
}

export const BulkEditLabels: React.FC<BulkEditLabelsProps> = ({
  isTargetRecording,
  isUploadsTable,
  checkedIndices,
  directory,
  directoryRecordings,
}) => {
  const context = React.useContext(ServiceContext);
  const [recordings, setRecordings] = React.useState([] as Recording[]);
  const [editing, setEditing] = React.useState(false);
  const [commonLabels, setCommonLabels] = React.useState([] as KeyValue[]);
  const [savedCommonLabels, setSavedCommonLabels] = React.useState([] as KeyValue[]);
  const [valid, setValid] = React.useState(ValidatedOptions.default);
  const [loading, setLoading] = React.useState(false);
  const addSubscription = useSubscriptions();

  const getIdxFromRecording = React.useCallback(
    (r: Recording): number => (isTargetRecording ? (r as ActiveRecording).id : hashCode(r.name)),
    [isTargetRecording],
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
      if (checkedIndices.includes(idx)) {
        let updatedLabels = [...r.metadata.labels, ...commonLabels];
        updatedLabels = updatedLabels.filter((label) => {
          return !includesLabel(toDelete, label);
        });
        if (directory) {
          tasks.push(context.api.postRecordingMetadataForJvmId(directory.jvmId, r.name, updatedLabels).pipe(first()));
        }
        if (isTargetRecording) {
          tasks.push(context.api.postTargetRecordingMetadata(r.name, updatedLabels).pipe(first()));
        } else if (isUploadsTable) {
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
    checkedIndices,
    isTargetRecording,
    isUploadsTable,
    directory,
  ]);

  const handleEditLabels = React.useCallback(() => {
    setEditing(true);
  }, [setEditing]);

  const handleCancel = React.useCallback(() => {
    setEditing(false);
    setCommonLabels(savedCommonLabels);
  }, [setEditing, setCommonLabels, savedCommonLabels]);

  const updateCommonLabels = React.useCallback(
    (setLabels: (l: KeyValue[]) => void) => {
      const allRecordingLabels = [] as KeyValue[][];

      recordings.forEach((r: Recording) => {
        const idx = getIdxFromRecording(r);
        if (checkedIndices.includes(idx)) {
          allRecordingLabels.push(r.metadata.labels);
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
    [recordings, getIdxFromRecording, checkedIndices],
  );

  /* eslint-disable @typescript-eslint/no-explicit-any */
  const refreshRecordingList = React.useCallback(() => {
    let observable: Observable<Recording[]>;
    if (directoryRecordings) {
      observable = of(directoryRecordings);
    } else if (isTargetRecording) {
      observable = context.target.target().pipe(
        filter((target) => !!target),
        concatMap((target: Target) =>
          context.api.doGet<ActiveRecording[]>(`targets/${encodeURIComponent(target.connectUrl)}/recordings`),
        ),
        first(),
      );
    } else {
      observable = isUploadsTable
        ? context.api
            .graphql<any>(
              `query GetUploadedRecordings($filter: ArchivedRecordingsFilterInput) {
                archivedRecordings(filter: $filter) {
                  data {
                    name
                    downloadUrl
                    reportUrl
                    metadata {
                      labels {
                        key
                        value
                      }
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
            filter((target) => !!target),
            concatMap((target: Target) =>
              context.api.graphql<any>(
                `query ArchivedRecordingsForTarget($connectUrl: String) {
                targetNodes(filter: { name: $connectUrl }) {
                  target {
                    archivedRecordings {
                      data {
                        name
                        downloadUrl
                        reportUrl
                        metadata {
                          labels {
                            key
                            value
                          }
                        }
                        size
                        archivedTime
                      }
                    }
                  }
                }
              }`,
                { connectUrl: target.connectUrl },
              ),
            ),
            map((v) => v.data.targetNodes[0].target.archivedRecordings.data as ArchivedRecording[]),
            first(),
          );
    }

    addSubscription(observable.subscribe((value) => setRecordings(value)));
  }, [
    addSubscription,
    isTargetRecording,
    isUploadsTable,
    directoryRecordings,
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
      }) as LoadingProps,
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
        isUploadsTable ? of(uploadAsTarget) : context.target.target(),
        context.notificationChannel.messages(NotificationCategory.RecordingMetadataUpdated),
      ]).subscribe((parts) => {
        const currentTarget = parts[0];
        const event = parts[1];

        const isMatch =
          currentTarget?.connectUrl === event.message.target || currentTarget?.jvmId === event.message.recording.jvmId || currentTarget?.connectUrl === 'uploads' ;

        setRecordings((oldRecordings) => {
          return oldRecordings.map((recording) => {
            if (isMatch && recording.name === event.message.recording.name) {
              const updatedRecording = {
                ...recording,
                metadata: {
                  labels: event.message.recording.metadata.labels,
                },
              };
              return updatedRecording;
            }
            return recording;
          });
        });
      }),
    );
  }, [addSubscription, context.target, context.notificationChannel, setRecordings, isUploadsTable]);

  React.useEffect(() => {
    updateCommonLabels(setCommonLabels);
    updateCommonLabels(setSavedCommonLabels);

    if (!recordings.length && editing) {
      setEditing(false);
    }
  }, [editing, recordings, setCommonLabels, setSavedCommonLabels, updateCommonLabels, setEditing]);

  React.useEffect(() => {
    if (!checkedIndices.length) {
      setEditing(false);
    }
  }, [checkedIndices, setEditing]);

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
              isDisabled={!checkedIndices.length}
            >
              Edit
            </Button>
          )}
        </StackItem>
      </Stack>
    </>
  );
};
