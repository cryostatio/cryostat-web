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
import { RecordingLabelFields } from '@app/RecordingMetadata/RecordingLabelFields';
import { includesLabel } from '@app/RecordingMetadata/utils';
import { LoadingProps } from '@app/Shared/Components/types';
import {
  NotificationCategory,
  Target,
  KeyValue,
  ThreadDump,
  NullableTarget,
  ThreadDumpDirectory,
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
import { combineLatest, concatMap, filter, first, forkJoin, Observable, of } from 'rxjs';

export interface BulkEditLabelsProps {
  checkedIndices: number[];
  target: Observable<NullableTarget>;
  directory?: ThreadDumpDirectory;
  directoryThreadDumps?: ThreadDump[];
  closePanelFn?: () => void;
}

export const BulkEditThreadDumpLabels: React.FC<BulkEditLabelsProps> = ({
  checkedIndices,
  target: propsTarget,
  directory,
  directoryThreadDumps,
  closePanelFn,
}) => {
  const context = React.useContext(ServiceContext);
  const [threadDumps, setThreadDumps] = React.useState<ThreadDump[]>([]);
  const [commonLabels, setCommonLabels] = React.useState<KeyValue[]>([]);
  const [savedCommonLabels, setSavedCommonLabels] = React.useState<KeyValue[]>([]);
  const [valid, setValid] = React.useState(ValidatedOptions.default);
  const [loading, setLoading] = React.useState(false);
  const addSubscription = useSubscriptions();

  const handlePostUpdate = React.useCallback(() => {
    setLoading(false);
  }, [setLoading]);

  const handleUpdateLabels = React.useCallback(() => {
    setLoading(true);
    const tasks: Observable<unknown>[] = [];
    const toDelete = savedCommonLabels.filter((label) => !includesLabel(commonLabels, label));
    addSubscription(
      propsTarget.pipe(filter((t) => !!t)).subscribe((t) => {
        threadDumps.forEach((r: ThreadDump) => {
          const idx = hashCode(r.threadDumpId);
          if (checkedIndices.includes(idx)) {
            const updatedLabels = [...r.metadata.labels, ...commonLabels].filter(
              (label) => !includesLabel(toDelete, label),
            );
            if (directory) {
              tasks.push(
                context.api
                  .postThreadDumpMetadataForJvmId(directory.jvmId, r.threadDumpId, updatedLabels)
                  .pipe(first()),
              );
            } else {
              tasks.push(context.api.postThreadDumpMetadata(r.threadDumpId, updatedLabels, t).pipe(first()));
            }
          }
        });
        addSubscription(
          forkJoin(tasks).subscribe({
            next: () => handlePostUpdate(),
            error: () => handlePostUpdate(),
          }),
        );
      }),
    );
  }, [
    addSubscription,
    context.api,
    handlePostUpdate,
    propsTarget,
    directory,
    commonLabels,
    savedCommonLabels,
    checkedIndices,
    threadDumps,
  ]);

  const handleCancel = React.useCallback(() => {
    setCommonLabels(savedCommonLabels);
    closePanelFn && closePanelFn();
  }, [setCommonLabels, savedCommonLabels, closePanelFn]);

  const updateCommonLabels = React.useCallback(
    (setLabels: (l: KeyValue[]) => void) => {
      const allThreadDumpLabels: KeyValue[][] = [];

      threadDumps.forEach((r: ThreadDump) => {
        const idx = hashCode(r.threadDumpId);
        if (checkedIndices.includes(idx)) {
          allThreadDumpLabels.push(r.metadata.labels);
        }
      });

      const updatedCommonLabels =
        allThreadDumpLabels.length > 0
          ? allThreadDumpLabels.reduce(
              (prev, curr) => prev.filter((label) => includesLabel(curr, label)),
              allThreadDumpLabels[0],
            )
          : [];

      setLabels(updatedCommonLabels);
    },
    [threadDumps, checkedIndices],
  );

  const refreshThreadDumpsList = React.useCallback(() => {
    let observable: Observable<ThreadDump[]>;
    if (directory) {
      observable = of(directoryThreadDumps ?? []);
    } else {
      observable = propsTarget.pipe(
        filter((target) => !!target),
        concatMap((target: Target) => context.api.getTargetThreadDumps(target)),
        first(),
      );
    }
    addSubscription(observable.subscribe((value) => setThreadDumps(value)));
  }, [addSubscription, propsTarget, directory, directoryThreadDumps, context.api]);

  const saveButtonLoadingProps = React.useMemo(
    () =>
      ({
        spinnerAriaValueText: 'Saving',
        spinnerAriaLabel: 'saving-thread-dump-labels',
        isLoading: loading,
      }) as LoadingProps,
    [loading],
  );

  React.useEffect(() => {
    addSubscription(propsTarget.subscribe(refreshThreadDumpsList));
  }, [addSubscription, propsTarget, refreshThreadDumpsList]);

  // Depends only on ThreadDumpMetadataUpdated notifications
  // since updates on list of thread dumps will mount a completely new BulkEditLabels.
  React.useEffect(() => {
    addSubscription(
      combineLatest([
        propsTarget,
        context.notificationChannel.messages(NotificationCategory.ThreadDumpMetadataUpdated),
      ]).subscribe((parts) => {
        const currentTarget = parts[0];
        const event = parts[1];

        const isMatch =
          currentTarget?.jvmId === event.message.jvmId || currentTarget?.jvmId === event.message.threadDump.jvmId;

        setThreadDumps((oldThreadDumps) => {
          return oldThreadDumps.map((threadDump) => {
            if (isMatch && threadDump.threadDumpId === event.message.threadDump.threadDumpId) {
              const updatedThreadDump = {
                ...threadDump,
                metadata: {
                  labels: event.message.threadDump.metadata.labels,
                },
              };
              return updatedThreadDump;
            }
            return threadDump;
          });
        });
      }),
    );
  }, [addSubscription, propsTarget, context.notificationChannel, setThreadDumps]);

  React.useEffect(() => {
    updateCommonLabels(setCommonLabels);
    updateCommonLabels(setSavedCommonLabels);
  }, [threadDumps, setCommonLabels, setSavedCommonLabels, updateCommonLabels]);

  return (
    <>
      <Stack hasGutter>
        <StackItem>
          <Title headingLevel="h2">Edit labels</Title>
        </StackItem>
        <StackItem>
          <HelperText>
            <HelperTextItem>
              Labels present on all selected Thread Dumps will appear here. Editing the labels will affect all selected
              Thread Dumps. Specify labels with format <Label isCompact>key=value</Label>.
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
