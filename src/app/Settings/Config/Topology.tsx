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

import {
  topologyResetReportResultIntent,
  topologySetIgnoreReportResultIntent,
} from '@app/Shared/Redux/Configurations/TopologyConfigSlice';
import { RootState } from '@app/Shared/Redux/ReduxStore';
import { useCryostatTranslation } from '@i18n/i18nextUtil';
import {
  Bullseye,
  Button,
  DualListSelector,
  HelperText,
  HelperTextItem,
  Label,
  LabelGroup,
  Spinner,
  Stack,
  StackItem,
} from '@patternfly/react-core';
import { PlusIcon } from '@patternfly/react-icons';
import * as React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { SettingTab, UserSetting } from '../types';
import { ServiceContext } from '@app/Shared/Services/Services';
import { useSubscriptions } from '@app/utils/hooks/useSubscriptions';
import { tap } from 'rxjs';

interface ReportRule {
  id: string;
  name: string;
  topic: string;
}

const Component = () => {
  const context = React.useContext(ServiceContext);
  const addSubscription = useSubscriptions();
  const dispatch = useDispatch();
  const { t } = useCryostatTranslation();
  const [loading, setLoading] = React.useState(false);
  const [allRules, setAllRules] = React.useState([] as ReportRule[]);
  const { notIds } = useSelector((state: RootState) => state.topologyConfigs.reportFilter);

  React.useEffect(() => {
    setLoading(true);
    addSubscription(
      context.api
        .doGet<ReportRule[]>('/reports_rules', 'v4.1')
        .pipe(tap(() => setLoading(false)))
        .subscribe((v) => setAllRules(v)),
    );
  }, [context.api, setAllRules]);

  const availableRules = React.useMemo(
    () => allRules.filter((r) => !notIds.includes(r.id)).map((r) => r.id),
    [allRules, notIds],
  );

  const selectedRules = React.useMemo(
    () => allRules.filter((r) => notIds.includes(r.id)).map((r) => r.id),
    [allRules, notIds],
  );

  const onAdd = React.useCallback((id: string) => dispatch(topologySetIgnoreReportResultIntent(id, true)), [dispatch]);

  const onDelete = React.useCallback(
    (id: string) => dispatch(topologySetIgnoreReportResultIntent(id, false)),
    [dispatch],
  );

  const onListChange = React.useCallback(
    (_evt, newAvailableOptions: string[], newChosenOptions: string[]) => {
      newAvailableOptions.forEach((v) => onDelete(v));
      newChosenOptions.forEach((v) => onAdd(v));
    },
    [onAdd, onDelete],
  );

  const onReset = React.useCallback(() => {
    dispatch(topologyResetReportResultIntent());
  }, [dispatch]);

  return (
    <Stack hasGutter>
      <StackItem>
        <HelperText>
          <HelperTextItem>{t('SETTINGS.TOPOLOGY.HELPER_TEXT')}</HelperTextItem>
        </HelperText>
      </StackItem>
      <StackItem>
        {loading ? (
          <Bullseye>
            <Spinner />
          </Bullseye>
        ) : (
          <DualListSelector
            availableOptions={availableRules}
            chosenOptions={selectedRules}
            onListChange={onListChange}
          />
        )}
      </StackItem>
      <StackItem>
        <Button onClick={onReset}>{t('SETTINGS.TOPOLOGY.RESET_DEFAULT')}</Button>
      </StackItem>
    </Stack>
  );
};

export const Topology: UserSetting = {
  titleKey: 'SETTINGS.TOPOLOGY.TITLE',
  descConstruct: 'SETTINGS.TOPOLOGY.DESCRIPTION',
  content: Component,
  category: SettingTab.TOPOLOGY,
};
