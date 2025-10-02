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
import { NotificationCategory, Target, KeyValue, HeapDump, NullableTarget } from '@app/Shared/Services/api.types';
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
import { combineLatest, concatMap, filter, first, forkJoin, Observable } from 'rxjs';

export interface BulkEditLabelsProps {
  checkedIndices: number[];
  target: Observable<NullableTarget>;
  closePanelFn?: () => void;
}

export const BulkEditHeapDumpLabels: React.FC<BulkEditLabelsProps> = ({ checkedIndices, target: propsTarget, closePanelFn }) => {
  const context = React.useContext(ServiceContext);
  const [heapDumps, setHeapDumps] = React.useState<HeapDump[]>([]);
  const [commonLabels, setCommonLabels] = React.useState<KeyValue[]>([]);
  const [savedCommonLabels, setSavedCommonLabels] = React.useState<KeyValue[]>([]);
  const [valid, setValid] = React.useState(ValidatedOptions.default);
  const [loading, setLoading] = React.useState(false);
  const addSubscription = useSubscriptions();

  const getIdxFromHeapDump = React.useCallback((r: HeapDump): number => hashCode(r.heapDumpId), []);

  const handlePostUpdate = React.useCallback(() => {
    setLoading(false);
  }, [setLoading]);

  const handleUpdateLabels = React.useCallback(() => {
    setLoading(true);
    const tasks: Observable<unknown>[] = [];
    const toDelete = savedCommonLabels.filter((label) => !includesLabel(commonLabels, label));
    addSubscription(
      propsTarget.subscribe((t) => {
        if (!t) {
          return;
        }
        heapDumps.forEach((r: HeapDump) => {
          const idx = hashCode(r.heapDumpId);
          if (checkedIndices.includes(idx)) {
            const updatedLabels = [...r.metadata.labels, ...commonLabels].filter(
              (label) => !includesLabel(toDelete, label),
            );
            tasks.push(context.api.postHeapDumpMetadata(r.heapDumpId, updatedLabels, t).pipe(first()));
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
  },[
    addSubscription,
    context.api,
    getIdxFromHeapDump,
    handlePostUpdate,
    propsTarget,
    commonLabels,
    savedCommonLabels,
    checkedIndices,
    heapDumps,
  ]);

  const handleCancel = React.useCallback(() => {
    setCommonLabels(savedCommonLabels);
    closePanelFn && closePanelFn();
  }, [setCommonLabels, savedCommonLabels, closePanelFn]);

  const updateCommonLabels = React.useCallback(
    (setLabels: (l: KeyValue[]) => void) => {
      const allHeapDumpLabels: KeyValue[][] = [];

      heapDumps.forEach((r: HeapDump) => {
        const idx = getIdxFromHeapDump(r);
        if (checkedIndices.includes(idx)) {
          allHeapDumpLabels.push(r.metadata.labels);
        }
      });

      const updatedCommonLabels =
        allHeapDumpLabels.length > 0
          ? allHeapDumpLabels.reduce(
              (prev, curr) => prev.filter((label) => includesLabel(curr, label)),
              allHeapDumpLabels[0],
            )
          : [];

      setLabels(updatedCommonLabels);
    },
    [heapDumps, getIdxFromHeapDump, checkedIndices],
  );

  const refreshHeapDumpsList = React.useCallback(() => {
    let observable: Observable<HeapDump[]>;
    observable = propsTarget.pipe(
      filter((target) => !!target),
      concatMap((target: Target) => {
        return context.api.getTargetHeapDumps(target)}),
      first(),
    );
    addSubscription(observable.subscribe((value) => {
      setHeapDumps(value)}));
  }, [addSubscription, propsTarget, context.api]);

  const saveButtonLoadingProps = React.useMemo(
    () =>
      ({
        spinnerAriaValueText: 'Saving',
        spinnerAriaLabel: 'saving-heap-dump-labels',
        isLoading: loading,
      }) as LoadingProps,
    [loading],
  );

  React.useEffect(() => {
    addSubscription(propsTarget.subscribe(refreshHeapDumpsList));
  }, [addSubscription, context, propsTarget, refreshHeapDumpsList]);

  // Depends only on HeapDumpMetadataUpdated notifications
  // since updates on list of heap dumps will mount a completely new BulkEditLabels.
  React.useEffect(() => {
    addSubscription(
      combineLatest([
        propsTarget,
        context.notificationChannel.messages(NotificationCategory.HeapDumpMetadataUpdated),
      ]).subscribe((parts) => {
        const currentTarget = parts[0];
        const event = parts[1];

        const isMatch =
          currentTarget?.jvmId === event.message.jvmId || currentTarget?.jvmId === event.message.heapDump.jvmId;

        setHeapDumps((oldHeapDumps) => {
          return oldHeapDumps.map((heapDump) => {
            if (isMatch && heapDump.heapDumpId === event.message.heapDump.heapDumpId) {
              const updatedHeapDump = {
                ...heapDump,
                metadata: {
                  labels: event.message.heapDump.metadata.labels,
                },
              };
              return updatedHeapDump;
            }
            return heapDump;
          });
        });
      }),
    );
  }, [addSubscription, propsTarget, context.notificationChannel, setHeapDumps]);

  React.useEffect(() => {
    updateCommonLabels(setCommonLabels);
    updateCommonLabels(setSavedCommonLabels);
  }, [heapDumps, setCommonLabels, setSavedCommonLabels, updateCommonLabels]);

  return (
    <>
      <Stack hasGutter>
        <StackItem>
          <Title headingLevel="h2">Edit labels</Title>
        </StackItem>
        <StackItem>
          <HelperText>
            <HelperTextItem>
              Labels present on all selected Heap Dumps will appear here. Editing the labels will affect all selected
              Heap Dumps. Specify labels with format <Label isCompact>key=value</Label>.
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
