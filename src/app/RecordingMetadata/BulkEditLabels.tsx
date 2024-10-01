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
import { hashCode } from '@app/utils/utils';
import {
  ActionList,
  ActionListItem,
  Button,
  HelperText,
  HelperTextItem,
  Label,
  Stack,
  StackItem,
  Title,
  ValidatedOptions,
} from '@patternfly/react-core';
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
  closePanelFn?: () => void;
}

export const BulkEditLabels: React.FC<BulkEditLabelsProps> = ({
  isTargetRecording,
  isUploadsTable,
  checkedIndices,
  directory,
  directoryRecordings,
  closePanelFn,
}) => {
  const context = React.useContext(ServiceContext);
  const [recordings, setRecordings] = React.useState<Recording[]>([]);
  const [commonLabels, setCommonLabels] = React.useState<KeyValue[]>([]);
  const [savedCommonLabels, setSavedCommonLabels] = React.useState<KeyValue[]>([]);
  const [valid, setValid] = React.useState(ValidatedOptions.default);
  const [loading, setLoading] = React.useState(false);
  const addSubscription = useSubscriptions();

  const getIdxFromRecording = React.useCallback(
    (r: Recording): number => (isTargetRecording ? (r as ActiveRecording).id : hashCode(r.name)),
    [isTargetRecording],
  );

  const handlePostUpdate = React.useCallback(() => {
    setLoading(false);
  }, [setLoading]);

  const handleUpdateLabels = React.useCallback(() => {
    setLoading(true);
    const tasks: Observable<unknown>[] = [];
    const toDelete = savedCommonLabels.filter((label) => !includesLabel(commonLabels, label));

    recordings.forEach((r: Recording) => {
      const idx = getIdxFromRecording(r);
      if (checkedIndices.includes(idx)) {
        const updatedLabels = [...r.metadata.labels, ...commonLabels].filter(
          (label) => !includesLabel(toDelete, label),
        );

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

  const handleCancel = React.useCallback(() => {
    setCommonLabels(savedCommonLabels);
    closePanelFn && closePanelFn();
  }, [setCommonLabels, savedCommonLabels, closePanelFn]);

  const updateCommonLabels = React.useCallback(
    (setLabels: (l: KeyValue[]) => void) => {
      const allRecordingLabels: KeyValue[][] = [];

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
        concatMap((target: Target) => context.api.getTargetActiveRecordings(target)),
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
              map((v) => (v.data?.archivedRecordings?.data as ArchivedRecording[]) ?? []),
              first(),
            )
        : context.target.target().pipe(
            filter((target) => !!target),
            concatMap((target: Target) =>
              context.api.graphql<any>(
                `query ArchivedRecordingsForTarget($id: BigInteger!) {
                targetNodes(filter: { targetIds: [$id] }) {
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
                { id: target.id! },
              ),
            ),
            map((v) => (v.data?.targetNodes[0]?.target?.archivedRecordings?.data as ArchivedRecording[]) ?? []),
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
          currentTarget?.jvmId === event.message.jvmId ||
          currentTarget?.jvmId === event.message.recording.jvmId ||
          currentTarget?.jvmId === 'uploads';

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
  }, [recordings, setCommonLabels, setSavedCommonLabels, updateCommonLabels]);

  return (
    <>
      <Stack hasGutter>
        <StackItem>
          <Title headingLevel="h2">Edit labels</Title>
        </StackItem>
        <StackItem>
          <HelperText>
            <HelperTextItem>
              Labels present on all selected Recordings will appear here. Editing the labels will affect all selected
              Recordings. Specify labels with format <Label isCompact>key=value</Label>.
            </HelperTextItem>
          </HelperText>
        </StackItem>
        <StackItem>
          <RecordingLabelFields
            labels={commonLabels}
            setLabels={setCommonLabels}
            setValid={setValid}
            isDisabled={loading}
          />
        </StackItem>
        <StackItem>
          <ActionList>
            <ActionListItem>
              <Button
                variant="primary"
                onClick={handleUpdateLabels}
                isDisabled={valid != ValidatedOptions.success || loading}
                {...saveButtonLoadingProps}
              >
                {loading ? 'Saving' : 'Save'}
              </Button>
            </ActionListItem>
            <ActionListItem>
              <Button variant="secondary" onClick={handleCancel} isDisabled={loading}>
                Cancel
              </Button>
            </ActionListItem>
          </ActionList>
        </StackItem>
      </Stack>
    </>
  );
};
