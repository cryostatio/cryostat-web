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
import { NotificationCategory, Target, KeyValue, UnifiedLog, NullableTarget } from '@app/Shared/Services/api.types';
import { ServiceContext } from '@app/Shared/Services/Services';
import { useSubscriptions } from '@app/utils/hooks/useSubscriptions';
import { hashCode } from '@app/utils/utils';
import { useCryostatTranslation } from '@i18n/i18nextUtil';
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

export interface BulkEditUnifiedLogLabelsProps {
  checkedIndices: number[];
  target: Observable<NullableTarget>;
  jvmId?: string;
  directoryUnifiedLogs?: UnifiedLog[];
  closePanelFn?: () => void;
}

export const BulkEditUnifiedLogLabels: React.FC<BulkEditUnifiedLogLabelsProps> = ({
  checkedIndices,
  target: propsTarget,
  jvmId,
  directoryUnifiedLogs,
  closePanelFn,
}) => {
  const { t } = useCryostatTranslation();
  const context = React.useContext(ServiceContext);
  const [unifiedLogs, setUnifiedLogs] = React.useState<UnifiedLog[]>([]);
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
        unifiedLogs.forEach((r: UnifiedLog) => {
          const idx = hashCode(r.logId);
          if (checkedIndices.includes(idx)) {
            const updatedLabels = [...(r.metadata?.labels ?? []), ...commonLabels].filter(
              (label) => !includesLabel(toDelete, label),
            );
            if (jvmId) {
              tasks.push(context.api.postUnifiedLogMetadataForJvmId(jvmId, r.logId, updatedLabels).pipe(first()));
            } else {
              tasks.push(context.api.postUnifiedLogMetadata(t as Target, r.logId, updatedLabels).pipe(first()));
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
    unifiedLogs,
  ]);

  const handleCancel = React.useCallback(() => {
    setCommonLabels(savedCommonLabels);
    closePanelFn && closePanelFn();
  }, [setCommonLabels, savedCommonLabels, closePanelFn]);

  const updateCommonLabels = React.useCallback(
    (setLabels: (l: KeyValue[]) => void) => {
      const allUnifiedLogLabels: KeyValue[][] = [];

      unifiedLogs.forEach((r: UnifiedLog) => {
        const idx = hashCode(r.logId);
        if (checkedIndices.includes(idx)) {
          allUnifiedLogLabels.push(r.metadata?.labels ?? []);
        }
      });

      const updatedCommonLabels =
        allUnifiedLogLabels.length > 0
          ? allUnifiedLogLabels.reduce(
              (prev, curr) => prev.filter((label) => includesLabel(curr, label)),
              allUnifiedLogLabels[0],
            )
          : [];

      setLabels(updatedCommonLabels);
    },
    [unifiedLogs, checkedIndices],
  );

  const refreshUnifiedLogsList = React.useCallback(() => {
    let observable: Observable<UnifiedLog[]>;
    if (jvmId) {
      observable = of(directoryUnifiedLogs ?? []);
    } else {
      observable = propsTarget.pipe(
        filter((target) => !!target),
        concatMap((target: Target) => context.api.getUnifiedLogs(target)),
        first(),
      );
    }
    addSubscription(observable.subscribe((value) => setUnifiedLogs(value)));
  }, [addSubscription, propsTarget, jvmId, directoryUnifiedLogs, context.api]);

  const saveButtonLoadingProps = React.useMemo(
    () =>
      ({
        spinnerAriaValueText: 'Saving',
        spinnerAriaLabel: 'saving-unified-log-labels',
        isLoading: loading,
      }) as LoadingProps,
    [loading],
  );

  React.useEffect(() => {
    addSubscription(propsTarget.subscribe(refreshUnifiedLogsList));
  }, [addSubscription, propsTarget, refreshUnifiedLogsList]);

  // Depends only on UnigiedLogMetadataUpdated notifications
  // since updates on list of logs will mount a completely new BulkEditUnifiedLogLabels.
  React.useEffect(() => {
    addSubscription(
      combineLatest([
        propsTarget,
        context.notificationChannel.messages(NotificationCategory.UnifiedLogMetadataUpdated),
      ]).subscribe((parts) => {
        const currentTarget = parts[0];
        const event = parts[1];

        const isMatch =
          currentTarget?.jvmId === event.message.jvmId || currentTarget?.jvmId === event.message.unifiedLog.jvmId;

        setUnifiedLogs((oldUnifiedLogs) => {
          return oldUnifiedLogs.map((unifiedLog) => {
            if (isMatch && unifiedLog.logId === event.message.unifiedLog.logId) {
              const updatedUnifiedLog = {
                ...unifiedLog,
                metadata: {
                  labels: event.message.unifiedLog.metadata?.labels ?? [],
                },
              };
              return updatedUnifiedLog;
            }
            return unifiedLog;
          });
        });
      }),
    );
  }, [addSubscription, propsTarget, context.notificationChannel, setUnifiedLogs]);

  React.useEffect(() => {
    updateCommonLabels(setCommonLabels);
    updateCommonLabels(setSavedCommonLabels);
  }, [unifiedLogs, setCommonLabels, setSavedCommonLabels, updateCommonLabels]);

  return (
    <>
      <Stack hasGutter>
        <StackItem>
          <Title headingLevel="h2">{t('BulkEditUnifiedLogLabels.TITLE')}</Title>
        </StackItem>
        <StackItem>
          <HelperText>
            <HelperTextItem>
              {t('BulkEditUnifiedLogLabels.HELPER_TEXT')} <Label isCompact>key=value</Label>.
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
                {loading ? t('BulkEditUnifiedLogLabels.SAVING') : t('BulkEditUnifiedLogLabels.SAVE')}
              </Button>
            </ActionListItem>
            <ActionListItem>
              <Button variant="secondary" onClick={handleCancel} isDisabled={loading}>
                {t('CANCEL')}
              </Button>
            </ActionListItem>
          </ActionList>
        </StackItem>
      </Stack>
    </>
  );
};
