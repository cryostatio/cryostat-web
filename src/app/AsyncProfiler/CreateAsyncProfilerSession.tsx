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
  DualListSelector,
  DualListSelectorTreeItemData,
  Form,
  FormGroup,
  Spinner,
  Text,
  TextContent,
  TextVariants,
} from '@patternfly/react-core';
import _ from 'lodash';
import * as React from 'react';
import { useNavigate } from 'react-router-dom-v5-compat';
import { filter, map } from 'rxjs';

export const MILLIS = 1000;

export const CreateAsyncProfilerSession: React.FC = () => {
  const { t } = useCryostatTranslation();
  const context = React.useContext(ServiceContext);
  const addSubscription = useSubscriptions();
  const navigate = useNavigate();

  const [target, setTarget] = React.useState<NullableTarget>(undefined);
  const [selectedEvents, setSelectedEvents] = React.useState<DualListSelectorTreeItemData[]>([]);
  const [availableEvents, setAvailableEvents] = React.useState<DualListSelectorTreeItemData[]>([]);
  const [duration, setDuration] = React.useState(5);
  const [durationUnits, setDurationUnits] = React.useState(MILLIS);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    addSubscription(context.target.target().subscribe((t) => setTarget(t)));
  }, [addSubscription, context, context.target, setTarget]);

  const convertEventsToTree = React.useCallback((rawEvents: string[]): DualListSelectorTreeItemData[] => {
    const out: DualListSelectorTreeItemData[] = [];
    Object.keys(rawEvents).forEach((k) => {
      const category: DualListSelectorTreeItemData = {
        id: k.trim(),
        text: k.trim(),
        isChecked: false,
        hasBadge: true,
        defaultExpanded: true,
        children: rawEvents[k].map((e) => ({
          id: e.trim(),
          text: e.trim(),
          isChecked: false,
        })),
      };
      out.push(category);
    });
    return out;
  }, []);

  const convertSelectionToEvents = React.useCallback((selection: DualListSelectorTreeItemData[]): string[] => {
    const flattened: DualListSelectorTreeItemData[] = [];
    selection.forEach((s) => {
      if (s.children) {
        s.children.forEach((c) => flattened.push(c));
      } else {
        flattened.push(s);
      }
    });
    return _.sortedUniq(flattened.map((v) => v.id).sort());
  }, []);

  React.useEffect(() => {
    if (!target) {
      return;
    }
    addSubscription(
      context.api
        .getAsyncProfilerAvailableEvents(target)
        .pipe(map(convertEventsToTree))
        .subscribe((e) => {
          setAvailableEvents(e);
          setLoading(false);
        }),
    );
  }, [addSubscription, target, context.api, convertEventsToTree, setAvailableEvents, setLoading]);

  const handleListChange = React.useCallback(
    (
      _: React.MouseEvent<HTMLElement>,
      newAvailableOptions: DualListSelectorTreeItemData[],
      newChosenOptions: DualListSelectorTreeItemData[],
    ) => {
      setAvailableEvents(newAvailableOptions.sort());
      setSelectedEvents(newChosenOptions.sort());
    },
    [setAvailableEvents, setSelectedEvents],
  );

  const exitForm = React.useCallback(() => navigate(toPath('/async-profiler')), [navigate]);

  const handleSubmit = React.useCallback(() => {
    if (!target) {
      throw new Error('invalid state: must have a target selection');
    }
    const events = convertSelectionToEvents(selectedEvents);
    if (!events) {
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
  }, [
    addSubscription,
    target,
    context.api,
    convertSelectionToEvents,
    selectedEvents,
    duration,
    durationUnits,
    exitForm,
  ]);

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
              <TextContent>
                <Text component={TextVariants.p}>{t('CreateAsyncProfilerSession.DESCRIPTION')}</Text>
              </TextContent>
              <FormGroup label={t('CreateAsyncProfilerSession.EVENTS')} fieldId="events" isRequired>
                <DualListSelector
                  isSearchable
                  isTree
                  availableOptions={availableEvents}
                  chosenOptions={selectedEvents}
                  onListChange={handleListChange}
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
                <Button variant="primary" onClick={handleSubmit} isDisabled={!selectedEvents.length || duration < 1}>
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
