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
import { RootState } from '@app/Shared/Redux/ReduxStore';
import { EnvironmentNode } from '@app/Shared/Services/api.types';
import { ServiceContext } from '@app/Shared/Services/Services';
import { useSubscriptions } from '@app/utils/hooks/useSubscriptions';
import { EmptyState, EmptyStateHeader, EmptyStateIcon } from '@patternfly/react-core';
import { TopologyIcon } from '@patternfly/react-icons';
import * as React from 'react';
import { useSelector } from 'react-redux';
import { TopologyGraphView } from './GraphView/TopologyGraphView';
import { DiscoveryTreeContext } from './Shared/utils';

interface TargetLineageProps {
  jvmId: string;
  hideActions?: boolean;
}

export const TargetLineage: React.FC<TargetLineageProps> = ({ jvmId, hideActions = false }) => {
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
      context.api.getTargetLineage(jvmId).subscribe({
        next: (v) => {
          setRoot(v);
          setHasError(false);
        },
        error: (_) => {
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
    <div style={{ height: '100%', width: '100%' }}>
      <DiscoveryTreeContext.Provider value={root}>
        <TopologyGraphView transformConfig={transformConfig} hideToolbar={true} hideActions={hideActions} />
      </DiscoveryTreeContext.Provider>
    </div>
  ) : (
    <></>
  );
};
