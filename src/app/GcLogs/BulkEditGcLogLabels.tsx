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
import { NotificationCategory, Target, KeyValue, GcLog, NullableTarget } from '@app/Shared/Services/api.types';
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

export interface BulkEditGcLogLabelsProps {
  checkedIndices: number[];
  target: Observable<NullableTarget>;
  jvmId?: string;
  directoryGcLogs?: GcLog[];
  closePanelFn?: () => void;
}

export const BulkEditGcLogLabels: React.FC<BulkEditGcLogLabelsProps> = ({
  checkedIndices,
  target: propsTarget,
  jvmId,
  directoryGcLogs,
  closePanelFn,
}) => {
  const context = React.useContext(ServiceContext);
  const [gcLogs, setGcLogs] = React.useState<GcLog[]>([]);
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
        gcLogs.forEach((r: GcLog) => {
          const idx = hashCode(r.gcLogId);
          if (checkedIndices.includes(idx)) {
            const updatedLabels = [...(r.metadata?.labels ?? []), ...commonLabels].filter(
              (label) => !includesLabel(toDelete, label),
            );
            if (jvmId) {
              tasks.push(context.api.postGcLogMetadataForJvmId(jvmId, r.gcLogId, updatedLabels).pipe(first()));
            } else {
              tasks.push(context.api.postGcLogMetadata(t as Target, r.gcLogId, updatedLabels).pipe(first()));
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
    jvmId,
    commonLabels,
    savedCommonLabels,
    checkedIndices,
    gcLogs,
  ]);

  const handleCancel = React.useCallback(() => {
    setCommonLabels(savedCommonLabels);
    closePanelFn && closePanelFn();
  }, [setCommonLabels, savedCommonLabels, closePanelFn]);

  const updateCommonLabels = React.useCallback(
    (setLabels: (l: KeyValue[]) => void) => {
      const allGcLogLabels: KeyValue[][] = [];

      gcLogs.forEach((r: GcLog) => {
        const idx = hashCode(r.gcLogId);
        if (checkedIndices.includes(idx)) {
          allGcLogLabels.push(r.metadata?.labels ?? []);
        }
      });

      const updatedCommonLabels =
        allGcLogLabels.length > 0
          ? allGcLogLabels.reduce((prev, curr) => prev.filter((label) => includesLabel(curr, label)), allGcLogLabels[0])
          : [];

      setLabels(updatedCommonLabels);
    },
    [gcLogs, checkedIndices],
  );

  const refreshGcLogsList = React.useCallback(() => {
    let observable: Observable<GcLog[]>;
    if (jvmId) {
      observable = of(directoryGcLogs ?? []);
    } else {
      observable = propsTarget.pipe(
        filter((target) => !!target),
        concatMap((target: Target) => context.api.getGcLogs(target)),
        first(),
      );
    }
    addSubscription(observable.subscribe((value) => setGcLogs(value)));
  }, [addSubscription, propsTarget, jvmId, directoryGcLogs, context.api]);

  const saveButtonLoadingProps = React.useMemo(
    () =>
      ({
        spinnerAriaValueText: 'Saving',
        spinnerAriaLabel: 'saving-gc-log-labels',
        isLoading: loading,
      }) as LoadingProps,
    [loading],
  );

  React.useEffect(() => {
    addSubscription(propsTarget.subscribe(refreshGcLogsList));
  }, [addSubscription, propsTarget, refreshGcLogsList]);

  // Depends only on GcLogMetadataUpdated notifications
  // since updates on list of gc logs will mount a completely new BulkEditGcLogLabels.
  React.useEffect(() => {
    addSubscription(
      combineLatest([
        propsTarget,
        context.notificationChannel.messages(NotificationCategory.GcLogMetadataUpdated),
      ]).subscribe((parts) => {
        const currentTarget = parts[0];
        const event = parts[1];

        const isMatch =
          currentTarget?.jvmId === event.message.jvmId || currentTarget?.jvmId === event.message.gcLog.jvmId;

        setGcLogs((oldGcLogs) => {
          return oldGcLogs.map((gcLog) => {
            if (isMatch && gcLog.gcLogId === event.message.gcLog.gcLogId) {
              const updatedGcLog = {
                ...gcLog,
                metadata: {
                  labels: event.message.gcLog.metadata?.labels ?? [],
                },
              };
              return updatedGcLog;
            }
            return gcLog;
          });
        });
      }),
    );
  }, [addSubscription, propsTarget, context.notificationChannel, setGcLogs]);

  React.useEffect(() => {
    updateCommonLabels(setCommonLabels);
    updateCommonLabels(setSavedCommonLabels);
  }, [gcLogs, setCommonLabels, setSavedCommonLabels, updateCommonLabels]);

  return (
    <>
      <Stack hasGutter>
        <StackItem>
          <Title headingLevel="h2">Edit labels</Title>
        </StackItem>
        <StackItem>
          <HelperText>
            <HelperTextItem>
              Labels present on all selected GC Logs will appear here. Editing the labels will affect all selected GC
              Logs. Specify labels with format <Label isCompact>key=value</Label>.
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
