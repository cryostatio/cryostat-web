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

import { DurationPicker } from '@app/DurationPicker/DurationPicker';
import { AsyncProfilerEventTreeSelector } from '@app/Shared/Components/AsyncProfilerEventTreeSelector';
import { NotificationCategory, NullableTarget } from '@app/Shared/Services/api.types';
import { ServiceContext } from '@app/Shared/Services/Services';
import { useExitForm } from '@app/utils/hooks/useExitForm';
import { useSubscriptions } from '@app/utils/hooks/useSubscriptions';
import { useCryostatTranslation } from '@i18n/i18nextUtil';
import {
  ActionGroup,
  Alert,
  AlertActionLink,
  AlertVariant,
  Bullseye,
  Button,
  Card,
  CardBody,
  Content,
  ContentVariants,
  Form,
  FormGroup,
  Spinner,
} from '@patternfly/react-core';
import _ from 'lodash';
import * as React from 'react';
import { filter, map } from 'rxjs';

const MILLIS = 1000;

export interface CreateAsyncProfilerSessionProps {
  onClose?: () => void;
}

export const CreateAsyncProfilerSession: React.FC<CreateAsyncProfilerSessionProps> = ({ onClose }) => {
  const { t } = useCryostatTranslation();
  const context = React.useContext(ServiceContext);
  const addSubscription = useSubscriptions();

  const [target, setTarget] = React.useState<NullableTarget>(undefined);
  const [duration, setDuration] = React.useState(0);
  const [durationUnits, setDurationUnits] = React.useState(MILLIS);
  const [loading, setLoading] = React.useState(true);
  const [chosenLeafIds, setChosenLeafIds] = React.useState<string[]>([]);
  const [hasConflictingRecordings, setHasConflictingRecordings] = React.useState(false);
  const [checkingConflicts, setCheckingConflicts] = React.useState(false);
  const checkIdRef = React.useRef(0);

  React.useEffect(() => {
    addSubscription(
      context.target.target().subscribe((t) => {
        setTarget(t);
        setLoading(false);
      }),
    );
  }, [addSubscription, context, context.target, setTarget]);

  const checkConflictingRecordings = React.useCallback(() => {
    if (!target) {
      setHasConflictingRecordings(false);
      setCheckingConflicts(false);
      return;
    }

    const currentCheckId = ++checkIdRef.current;
    setCheckingConflicts(true);
    addSubscription(
      context.api
        .getTargetActiveRecordings(target)
        .pipe(map((rs) => rs.some((r) => r.state !== 'STOPPED')))
        .subscribe({
          next: (hasRunningRecordings) => {
            if (currentCheckId === checkIdRef.current) {
              setHasConflictingRecordings(hasRunningRecordings);
              setCheckingConflicts(false);
            }
          },
          error: () => {
            if (currentCheckId === checkIdRef.current) {
              setHasConflictingRecordings(true);
              setCheckingConflicts(false);
            }
          },
        }),
    );
  }, [addSubscription, target, context.api]);

  React.useEffect(() => {
    checkConflictingRecordings();
  }, [checkConflictingRecordings]);

  React.useEffect(() => {
    if (!target) return;

    const subs = [NotificationCategory.ActiveRecordingCreated, NotificationCategory.ActiveRecordingStopped].map((cat) =>
      context.notificationChannel.messages(cat).subscribe(() => checkConflictingRecordings()),
    );
    return () => subs.forEach((s) => s.unsubscribe());
  }, [addSubscription, target, context.notificationChannel, checkConflictingRecordings]);

  React.useEffect(() => {
    checkConflictingRecordings();
  }, [checkConflictingRecordings]);

  React.useEffect(() => {
    if (!target) return;

    const subs = [NotificationCategory.ActiveRecordingCreated, NotificationCategory.ActiveRecordingStopped].map((cat) =>
      context.notificationChannel.messages(cat).subscribe(() => checkConflictingRecordings()),
    );
    return () => subs.forEach((s) => s.unsubscribe());
  }, [addSubscription, target, context.notificationChannel, checkConflictingRecordings]);

  const exitForm = useExitForm(onClose);

  const handleSubmit = React.useCallback(() => {
    if (!target) {
      throw new Error('invalid state: must have a target selection');
    }
    const events = _.sortedUniq(chosenLeafIds.slice().sort());
    if (!events.length) {
      throw new Error('invalid state: no events');
    }
    if (duration < 1) {
      throw new Error('invalid state: duration must be positive');
    }
    addSubscription(
      context.api
        .startAsyncProfile(target, events, (duration * durationUnits) / MILLIS)
        .pipe(filter((e) => e?.ok ?? true))
        .subscribe(() => exitForm()),
    );
  }, [addSubscription, target, context.api, chosenLeafIds, duration, durationUnits, exitForm]);

  return (
    <Card>
      <CardBody>
        {loading ? (
          <Bullseye>
            <Spinner />
          </Bullseye>
        ) : (
          <Form isHorizontal>
            <Content>
              <Content component={ContentVariants.p}>{t('CreateAsyncProfilerSession.DESCRIPTION')}</Content>
            </Content>
            {hasConflictingRecordings && (
              <Alert
                isInline
                variant={AlertVariant.warning}
                title={t('CreateAsyncProfilerSession.CONFLICT_WARNING_TITLE')}
                actionLinks={
                  <AlertActionLink onClick={checkConflictingRecordings} isDisabled={checkingConflicts}>
                    Retry
                  </AlertActionLink>
                }
              >
                {t('CreateAsyncProfilerSession.CONFLICT_WARNING_MESSAGE')}
              </Alert>
            )}
            <FormGroup label={t('CreateAsyncProfilerSession.EVENTS')} fieldId="events" isRequired>
              <AsyncProfilerEventTreeSelector
                target={target}
                chosenLeafIds={chosenLeafIds}
                onChosenLeafIdsChange={setChosenLeafIds}
                isDisabled={hasConflictingRecordings}
              />
            </FormGroup>
            <FormGroup label={t('CreateAsyncProfilerSession.DURATION')} fieldId="duration" isRequired>
              <DurationPicker
                enabled={true}
                onPeriodChange={setDuration}
                onUnitScalarChange={setDurationUnits}
                period={duration}
                unitScalar={durationUnits}
              />
            </FormGroup>
            <ActionGroup>
              <Button
                variant="primary"
                onClick={handleSubmit}
                isDisabled={!chosenLeafIds.length || duration < 1 || hasConflictingRecordings || checkingConflicts}
              >
                {t('CREATE')}
              </Button>
              <Button variant="secondary" onClick={exitForm}>
                {t('CANCEL')}
              </Button>
            </ActionGroup>
          </Form>
        )}
      </CardBody>
    </Card>
  );
};

export default CreateAsyncProfilerSession;
