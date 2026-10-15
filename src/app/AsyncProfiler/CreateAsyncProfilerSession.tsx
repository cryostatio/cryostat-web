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
import { NullableTarget } from '@app/Shared/Services/api.types';
import { ServiceContext } from '@app/Shared/Services/Services';
import { TargetView } from '@app/TargetView/TargetView';
import { useSubscriptions } from '@app/utils/hooks/useSubscriptions';
import { toPath } from '@app/utils/utils';
import { useCryostatTranslation } from '@i18n/i18nextUtil';
import {
  ActionGroup,
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
import { useNavigate } from 'react-router-dom';
import { filter } from 'rxjs';

const MILLIS = 1000;

export const CreateAsyncProfilerSession: React.FC = () => {
  const { t } = useCryostatTranslation();
  const context = React.useContext(ServiceContext);
  const addSubscription = useSubscriptions();
  const navigate = useNavigate();

  const [target, setTarget] = React.useState<NullableTarget>(undefined);
  const [duration, setDuration] = React.useState(0);
  const [durationUnits, setDurationUnits] = React.useState(MILLIS);
  const [loading, setLoading] = React.useState(true);
  const [chosenLeafIds, setChosenLeafIds] = React.useState<string[]>([]);

  React.useEffect(() => {
    addSubscription(
      context.target.target().subscribe((t) => {
        setTarget(t);
        setLoading(false);
      }),
    );
  }, [addSubscription, context, context.target, setTarget]);

  const exitForm = React.useCallback(() => navigate(toPath('/async-profiler')), [navigate]);

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
    <TargetView pageTitle="Create" breadcrumbs={[{ title: 'async-profiler', path: toPath('/async-profiler') }]}>
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
              <FormGroup label={t('CreateAsyncProfilerSession.EVENTS')} fieldId="events" isRequired>
                <AsyncProfilerEventTreeSelector
                  target={target}
                  chosenLeafIds={chosenLeafIds}
                  onChosenLeafIdsChange={setChosenLeafIds}
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
                <Button variant="primary" onClick={handleSubmit} isDisabled={!chosenLeafIds.length || duration < 1}>
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
    </TargetView>
  );
};

export default CreateAsyncProfilerSession;
