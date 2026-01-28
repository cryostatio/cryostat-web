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
import { EnvironmentNode } from '@app/Shared/Services/api.types';
import { ServiceContext } from '@app/Shared/Services/Services';
import { useSubscriptions } from '@app/utils/hooks/useSubscriptions';
import * as React from 'react';
import { DiscoveryTreeContext } from './Shared/utils';
import { useSelector } from 'react-redux';
import { RootState } from '@app/Shared/Redux/ReduxStore';
import { TopologyGraphView } from './GraphView/TopologyGraphView';
import { EmptyState, EmptyStateHeader, EmptyStateIcon } from '@patternfly/react-core';
import { TopologyIcon } from '@patternfly/react-icons';

interface TargetLineageProps {
  jvmId: string;
}

export const TargetLineage: React.FC<TargetLineageProps> = ({ jvmId }) => {
  const context = React.useContext(ServiceContext);
  const addSubscription = useSubscriptions();

  const displayOptions = useSelector((state: RootState) => state.topologyConfigs.displayOptions);
  const { groupings } = displayOptions;
  const transformConfig = React.useMemo(
    () => ({ showOnlyTopGroup: groupings.realmOnly, expandMode: !groupings.collapseSingles }),
    [groupings],
  );

  const [root, setRoot] = React.useState(undefined as EnvironmentNode | undefined);
  const [hasError, setHasError] = React.useState(false);

  React.useEffect(() => {
    addSubscription(
      context.api
        .doGet<EnvironmentNode>(`audit/target_lineage/${jvmId}`, 'beta')
        .subscribe({
          next: (v) => {
            setRoot(v);
            setHasError(false);
          },
          error: (err) => {
            console.warn('Target lineage unavailable:', err);
            setHasError(true);
            setRoot(undefined);
          },
        }),
    );
  }, [jvmId, context, context.api, addSubscription]);

  if (hasError) {
    return (
      <EmptyState>
        <EmptyStateHeader
          titleText="Target Lineage Unavailable"
          icon={<EmptyStateIcon icon={TopologyIcon} />}
          headingLevel="h4"
        />
      </EmptyState>
    );
  }

  return root ? (
    <DiscoveryTreeContext.Provider value={root}>
      <TopologyGraphView transformConfig={transformConfig} />
    </DiscoveryTreeContext.Provider>
  ) : (
    <></>
  );
};
