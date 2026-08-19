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
import { ArchivedRecording, NotificationCategory, NotificationMessage, Target } from '@app/Shared/Services/api.types';
import { ServiceContext } from '@app/Shared/Services/Services';
import { useAliasCache } from '@app/utils/hooks/useAliasCache';
import { useNotificationMessages } from '@app/utils/hooks/useNotificationMessages';
import { useSynthesisHeuristic } from '@app/utils/hooks/useSynthesisHeuristic';
import { useSubscriptions } from '@app/utils/hooks/useSubscriptions';
import { formatBytes, formatDuration } from '@app/utils/utils';
import { useCryostatTranslation } from '@i18n/i18nextUtil';
import {
  ActionGroup,
  Alert,
  Button,
  Form,
  FormGroup,
  HelperText,
  HelperTextItem,
  Progress,
  Skeleton,
  Split,
  SplitItem,
  TextInput,
  Tooltip,
} from '@patternfly/react-core';
import dayjs from 'dayjs';
import * as React from 'react';
import { concatMap, first } from 'rxjs/operators';

export interface SynthesisFormProps {
  target: Target | string;
  recordings: ArchivedRecording[];
  dismissLabel?: string;
  onSuccess?: () => void;
  onDismiss?: () => void;
  onHighlightChange?: (names: Set<string>) => void;
}

export const SynthesisForm: React.FC<SynthesisFormProps> = (props) => {
  const { t } = useCryostatTranslation();
  const context = React.useContext(ServiceContext);
  const addSubscription = useSubscriptions();

  const isTargetObject = typeof props.target !== 'string';

  const effectiveJvmId: string = isTargetObject ? ((props.target as Target).jvmId ?? '') : (props.target as string);

  const aliasMap = useAliasCache(isTargetObject ? [] : [effectiveJvmId]);
  const resolvedAlias: string | undefined = isTargetObject
    ? (props.target as Target).alias
    : aliasMap.get(effectiveJvmId);
  const displayName: string = resolvedAlias ?? effectiveJvmId;
  const showAliasSkeleton = !isTargetObject && aliasMap.size === 0;

  const [fromInput, setFromInput] = React.useState('');
  const [toInput, setToInput] = React.useState('');
  const [tagInput, setTagInput] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);
  const [pendingJobId, setPendingJobId] = React.useState<string | null>(null);
  const [jobError, setJobError] = React.useState<string | null>(null);

  const pendingJobIdRef = React.useRef<string | null>(null);
  React.useEffect(() => {
    pendingJobIdRef.current = pendingJobId;
  }, [pendingJobId]);

  const fromMs: number | null = React.useMemo(() => {
    if (!fromInput) return null;
    const d = dayjs(fromInput, 'YYYY-MM-DDTHH:mm');
    return d.isValid() ? d.valueOf() : null;
  }, [fromInput]);

  const toMs: number | null = React.useMemo(() => {
    if (!toInput) return null;
    const d = dayjs(toInput, 'YYYY-MM-DDTHH:mm');
    return d.isValid() ? d.valueOf() : null;
  }, [toInput]);

  const heuristic = useSynthesisHeuristic(props.recordings, fromMs, toMs);

  const SYNTHESIS_CATEGORIES = React.useMemo(
    () => [NotificationCategory.RecordingSynthesisComplete, NotificationCategory.RecordingSynthesisFailure],
    [],
  );

  const handleSynthesisMessage = React.useCallback(
    (msg: NotificationMessage) => {
      const jobId: string = msg.message?.jobId ?? msg.message;
      if (!jobId || jobId !== pendingJobIdRef.current) return;
      const isFailure = msg.meta.category === NotificationCategory.RecordingSynthesisFailure;
      setPendingJobId(null);
      setSubmitting(false);
      if (isFailure) {
        setJobError(msg.message?.error ?? t('SynthesisForm.SYNTHESIS_FAILED_ERROR', 'Synthesis failed'));
      } else {
        props.onSuccess?.();
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [props.onSuccess, t],
  );

  useNotificationMessages(SYNTHESIS_CATEGORIES, handleSynthesisMessage);

  React.useEffect(() => {
    props.onHighlightChange?.(new Set(heuristic.candidates.map((r) => r.name)));
  }, [heuristic.candidates, props.onHighlightChange]);

  React.useEffect(() => {
    return () => props.onHighlightChange?.(new Set());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.onHighlightChange]);

  const PRESETS = React.useMemo(
    () => [
      { label: t('SynthesisForm.PRESET_5MIN', 'Last 5 min'), offsetMs: 5 * 60 * 1000 },
      { label: t('SynthesisForm.PRESET_15MIN', 'Last 15 min'), offsetMs: 15 * 60 * 1000 },
      { label: t('SynthesisForm.PRESET_1HR', 'Last 1 hr'), offsetMs: 60 * 60 * 1000 },
      { label: t('SynthesisForm.PRESET_6HR', 'Last 6 hr'), offsetMs: 360 * 60 * 1000 },
    ],
    [t],
  );

  const handlePreset = React.useCallback((offsetMs: number) => {
    const now = Date.now();
    setFromInput(dayjs(now - offsetMs).format('YYYY-MM-DDTHH:mm'));
    setToInput(dayjs(now).format('YYYY-MM-DDTHH:mm'));
  }, []);

  const handleSubmit = React.useCallback(() => {
    if (!fromMs || !toMs) return;
    setSubmitting(true);
    setJobError(null);

    const fromSec = Math.floor(fromMs / 1000);
    const toSec = Math.floor(toMs / 1000);
    const params = new URLSearchParams({ fromTimestamp: String(fromSec), toTimestamp: String(toSec) });
    const tag = tagInput.trim();
    if (tag) {
      params.set('tag', tag);
    }

    addSubscription(
      context.api
        .sendRequest('beta', `recording_synthesis/${encodeURIComponent(effectiveJvmId)}`, { method: 'POST' }, params)
        .pipe(
          concatMap((resp) => {
            if (resp.status === 200) {
              return Promise.resolve(null);
            }
            return resp.text();
          }),
          first(),
        )
        .subscribe({
          next: (resp) => {
            if (resp === null) {
              setSubmitting(false);
              props.onSuccess?.();
              return;
            }
            const jobId = resp as string;
            pendingJobIdRef.current = jobId;
            setPendingJobId(jobId);
          },
          error: (err) => {
            setSubmitting(false);
            setJobError(err.message ?? t('SynthesisForm.SYNTHESIS_REQUEST_FAILED_ERROR', 'Synthesis request failed'));
          },
        }),
    );
  }, [effectiveJvmId, fromMs, toMs, tagInput, addSubscription, context.api, props.onSuccess, t]);

  const handleDismiss = React.useCallback(() => {
    props.onDismiss?.();
  }, [props.onDismiss]);

  const canSubmit =
    !!effectiveJvmId && !!fromMs && !!toMs && fromMs < toMs && heuristic.candidates.length > 0 && !submitting;

  return (
    <Form>
      <FormGroup label={t('SynthesisForm.TARGET_LABEL', 'Target')}>
        {showAliasSkeleton ? <Skeleton width="60%" /> : <span>{displayName}</span>}
      </FormGroup>

      <FormGroup label={t('SynthesisForm.TIME_RANGE_LABEL', 'Time range')}>
        <ActionGroup style={{ gap: 'var(--pf-t--global--spacer--sm)' }}>
          {PRESETS.map(({ label, offsetMs }) => (
            <Button key={label} variant="tertiary" size="sm" onClick={() => handlePreset(offsetMs)}>
              {label}
            </Button>
          ))}
        </ActionGroup>
        <Split hasGutter style={{ marginTop: 'var(--pf-t--global--spacer--sm)' }}>
          <SplitItem isFilled>
            <TextInput
              type="datetime-local"
              id="synthesis-from"
              aria-label={t('SynthesisForm.FROM_ARIA_LABEL', 'From date and time')}
              value={fromInput}
              onChange={(_evt, val) => setFromInput(val)}
            />
          </SplitItem>
          <SplitItem style={{ alignSelf: 'center' }}>—</SplitItem>
          <SplitItem isFilled>
            <TextInput
              type="datetime-local"
              id="synthesis-to"
              aria-label={t('SynthesisForm.TO_ARIA_LABEL', 'To date and time')}
              value={toInput}
              onChange={(_evt, val) => setToInput(val)}
            />
          </SplitItem>
        </Split>
      </FormGroup>

      <FormGroup label={t('SynthesisForm.TAG_LABEL', 'Tag (optional)')}>
        <TextInput
          type="text"
          id="synthesis-tag"
          aria-label={t('SynthesisForm.TAG_ARIA_LABEL', 'Synthesis tag')}
          placeholder={t('SynthesisForm.TAG_PLACEHOLDER', 'e.g. incident-2024-01')}
          value={tagInput}
          onChange={(_evt, val) => setTagInput(val)}
        />
      </FormGroup>

      {fromMs && toMs && (
        <FormGroup label={t('SynthesisForm.HEURISTIC_LABEL', 'Matching recordings')}>
          <Split hasGutter>
            <SplitItem>
              {t('SynthesisForm.CANDIDATES_LABEL', 'Candidates: {{count}}', {
                count: heuristic.candidates.length,
              })}
            </SplitItem>
            <SplitItem>
              <Tooltip
                content={t(
                  'SynthesisForm.ESTIMATED_SIZE_TOOLTIP',
                  'Sum of sizes of all candidate recordings before synthesis',
                )}
              >
                <span>
                  {t('SynthesisForm.ESTIMATED_SIZE_LABEL', 'Estimated size: ~{{size}}', {
                    size: formatBytes(heuristic.estimatedSizeBytes),
                  })}
                </span>
              </Tooltip>
            </SplitItem>
          </Split>

          <Progress
            title={t('SynthesisForm.COVERAGE_TITLE', 'Time window coverage')}
            value={Math.round(heuristic.coverageRatio * 100)}
            size="sm"
            measureLocation="outside"
            aria-label={t('SynthesisForm.COVERAGE_ARIA_LABEL', 'Coverage of requested time window by recordings')}
            style={{ marginTop: 'var(--pf-t--global--spacer--sm)' }}
          />

          {heuristic.gapMs > 0 && (
            <HelperText>
              <HelperTextItem variant="warning">
                {t('SynthesisForm.GAP_WARNING', 'Gap of {{duration}} with no recording data', {
                  duration: formatDuration(heuristic.gapMs, 1),
                })}
              </HelperTextItem>
            </HelperText>
          )}

          {heuristic.heuristicEarliest !== null && (
            <HelperText>
              <HelperTextItem>
                {t('SynthesisForm.EARLIEST_AVAILABLE', 'Earliest available')}:{' '}
                <Button
                  variant="link"
                  isInline
                  onClick={() => setFromInput(dayjs(heuristic.heuristicEarliest!).format('YYYY-MM-DDTHH:mm'))}
                >
                  {dayjs(heuristic.heuristicEarliest).format('YYYY-MM-DD HH:mm')}
                </Button>
              </HelperTextItem>
            </HelperText>
          )}

          {heuristic.heuristicLatest !== null && (
            <HelperText>
              <HelperTextItem>
                {t('SynthesisForm.LATEST_AVAILABLE', 'Latest available')}:{' '}
                <Button
                  variant="link"
                  isInline
                  onClick={() => setToInput(dayjs(heuristic.heuristicLatest!).format('YYYY-MM-DDTHH:mm'))}
                >
                  {dayjs(heuristic.heuristicLatest).format('YYYY-MM-DD HH:mm')}
                </Button>
              </HelperTextItem>
            </HelperText>
          )}

          {heuristic.heuristicEarliest !== null && heuristic.heuristicLatest !== null && (
            <Button
              variant="link"
              isInline
              onClick={() => {
                setFromInput(dayjs(heuristic.heuristicEarliest!).format('YYYY-MM-DDTHH:mm'));
                setToInput(dayjs(heuristic.heuristicLatest!).format('YYYY-MM-DDTHH:mm'));
              }}
            >
              {t('SynthesisForm.USE_AVAILABLE_RANGE', 'Use full available range')}
            </Button>
          )}

          {heuristic.candidates.length === 0 && (
            <Alert
              variant="warning"
              isInline
              title={t('SynthesisForm.NO_CANDIDATES_WARNING', 'No recordings found in the selected range')}
            />
          )}
        </FormGroup>
      )}

      {jobError && (
        <Alert
          variant="danger"
          isInline
          title={t('SynthesisForm.JOB_ERROR_TITLE', 'Synthesis error')}
          style={{ marginBottom: 'var(--pf-t--global--spacer--sm)' }}
        >
          {jobError}
        </Alert>
      )}

      <ActionGroup>
        <Button variant="primary" onClick={handleSubmit} isAriaDisabled={!canSubmit} isLoading={submitting}>
          {submitting ? t('SynthesisForm.SUBMITTING_LABEL', 'Submitting…') : t('SynthesisForm.SUBMIT_LABEL', 'Submit')}
        </Button>
        <Button variant="secondary" onClick={handleDismiss}>
          {props.dismissLabel ?? t('SynthesisForm.DISMISS_DEFAULT_LABEL', 'Clear')}
        </Button>
      </ActionGroup>
    </Form>
  );
};
