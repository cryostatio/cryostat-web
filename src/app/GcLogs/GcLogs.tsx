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
import { Bullseye, EmptyState, EmptyStateBody, EmptyStateVariant } from '@patternfly/react-core';
import { DisconnectedIcon } from '@patternfly/react-icons';
import * as React from 'react';
import { of } from 'rxjs';

export const GcLogs: React.FC = () => {
  const { t } = useCryostatTranslation();
  const context = React.useContext(ServiceContext);
  const addSubscription = useSubscriptions();

  const [target, setTarget] = React.useState<NullableTarget>(undefined);
  const targetAsObs = React.useMemo(() => of(target), [target]);

  React.useEffect(() => {
    addSubscription(context.target.target().subscribe(setTarget));
  }, [addSubscription, context.target]);

  const body = React.useMemo(() => {
    if (!target) {
      return null;
    }
    if (!target.agent) {
      return (
        <Bullseye>
          <EmptyState variant={EmptyStateVariant.sm} icon={DisconnectedIcon}>
            <EmptyStateBody>{t('GcLogs.AGENT_REQUIRED')}</EmptyStateBody>
          </EmptyState>
        </Bullseye>
      );
    }
    return null;
  }, [t, target, targetAsObs]);

  return (
    <TargetView
      pageTitle={t('GcLogs.PAGE_TITLE')}
      noSelectionContent={<div>{/* TODO AllTargetsGcLogsTable */}</div>}
    >
      {body}
    </TargetView>
  );
};

export default GcLogs;
