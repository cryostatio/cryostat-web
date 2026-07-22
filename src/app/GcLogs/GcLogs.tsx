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
import { NullableTarget } from '@app/Shared/Services/api.types';
import { ServiceContext } from '@app/Shared/Services/Services';
import { TargetView } from '@app/TargetView/TargetView';
import { useSubscriptions } from '@app/utils/hooks/useSubscriptions';
import { useCryostatTranslation } from '@i18n/i18nextUtil';
import { Bullseye, EmptyState, EmptyStateBody, EmptyStateVariant, Grid, GridItem } from '@patternfly/react-core';
import { DisconnectedIcon } from '@patternfly/react-icons';
import * as React from 'react';
import { of } from 'rxjs';
import { AllTargetsGcLogsTable } from './AllTargetsGcLogsTable';
import { GcLoggingStatusCard } from './GcLoggingStatusCard';
import { GcLogsTable } from './GcLogsTable';

export const GcLogs: React.FC = () => {
  const { t } = useCryostatTranslation();
  const context = React.useContext(ServiceContext);
  const addSubscription = useSubscriptions();

  const [target, setTarget] = React.useState<NullableTarget>(undefined);
  const [gcLoggingEnabled, setGcLoggingEnabled] = React.useState(false);
  const targetAsObs = React.useMemo(() => of(target), [target]);

  React.useEffect(() => {
    addSubscription(context.target.target().subscribe(setTarget));
  }, [addSubscription, context.target]);

  React.useEffect(() => {
    setGcLoggingEnabled(false);
  }, [target]);

  const isAgentTarget = Boolean(target?.agent);

  return (
    <TargetView pageTitle={t('GcLogs.PAGE_TITLE')} noSelectionContent={<AllTargetsGcLogsTable />}>
      {!target ? null : !isAgentTarget ? (
        <Bullseye>
          <EmptyState variant={EmptyStateVariant.sm} icon={DisconnectedIcon}>
            <EmptyStateBody>{t('GcLogs.AGENT_REQUIRED')}</EmptyStateBody>
          </EmptyState>
        </Bullseye>
      ) : (
        <Grid hasGutter>
          <GridItem span={4}>
            <GcLoggingStatusCard target={target} onStatusChange={setGcLoggingEnabled} />
          </GridItem>
          <GridItem span={12}>
            <GcLogsTable target={targetAsObs} gcLoggingEnabled={gcLoggingEnabled} />
          </GridItem>
        </Grid>
      )}
    </TargetView>
  );
};

export default GcLogs;
