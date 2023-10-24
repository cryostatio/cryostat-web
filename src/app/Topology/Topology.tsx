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

import { BreadcrumbPage } from '@app/BreadcrumbPage/BreadcrumbPage';
import { ErrorView } from '@app/ErrorView/ErrorView';
import { LinearDotSpinner } from '@app/Shared/Components/LinearDotSpinner';
import { ViewMode } from '@app/Shared/Redux/Configurations/TopologyConfigSlice';
import { RootState } from '@app/Shared/Redux/ReduxStore';
import { NotificationCategory } from '@app/Shared/Services/api.types';
import { DEFAULT_EMPTY_UNIVERSE } from '@app/Shared/Services/api.utils';
import { MatchExpressionService } from '@app/Shared/Services/MatchExpression.service';
import { SearchExprServiceContext } from '@app/Shared/Services/service.utils';
import { ServiceContext } from '@app/Shared/Services/Services';
import { useSubscriptions } from '@app/utils/hooks/useSubscriptions';
import { Bullseye, Card, CardBody } from '@patternfly/react-core';
import * as React from 'react';
import { useSelector } from 'react-redux';
import { TopologyGraphView } from './GraphView/TopologyGraphView';
import { TopologyListView } from './ListView/TopologyListView';
import { DiscoveryTreeContext } from './Shared/utils';

export interface TopologyProps {}

export const Topology: React.FC<TopologyProps> = ({ ..._props }) => {
  const addSubscription = useSubscriptions();
  const context = React.useContext(ServiceContext);
  const matchExpreRef = React.useRef(new MatchExpressionService());
  const firstFetchRef = React.useRef(false);
  const firstFetched = firstFetchRef.current;

  const displayOptions = useSelector((state: RootState) => state.topologyConfigs.displayOptions);
  const { groupings } = displayOptions;
  const transformConfig = React.useMemo(
    () => ({ showOnlyTopGroup: groupings.realmOnly, expandMode: !groupings.collapseSingles }),
    [groupings],
  );

  const [discoveryTree, setDiscoveryTree] = React.useState(DEFAULT_EMPTY_UNIVERSE);

  const isGraphView = useSelector((state: RootState) => {
    const _currentMode: ViewMode = state.topologyConfigs.viewMode;
    return _currentMode === 'graph';
  });

  const [error, setError] = React.useState<Error>();

  const _refreshDiscoveryTree = React.useCallback(
    (onSuccess?: () => void) => {
      addSubscription(
        context.api.getDiscoveryTree().subscribe({
          next: (tree) => {
            onSuccess && onSuccess();
            setError(undefined);
            setDiscoveryTree(tree);
          },
          error: (err) => {
            setError(err);
          },
        }),
      );
    },
    [addSubscription, context.api, setDiscoveryTree, setError],
  );

  React.useEffect(() => {
    addSubscription(
      // Credentials will trigger modifed target event if any
      context.notificationChannel
        .messages(NotificationCategory.TargetJvmDiscovery)
        .subscribe((_) => _refreshDiscoveryTree()),
    );
  }, [addSubscription, context.notificationChannel, _refreshDiscoveryTree]);

  React.useEffect(() => {
    _refreshDiscoveryTree(() => (firstFetchRef.current = true));
  }, [_refreshDiscoveryTree, firstFetchRef]);

  React.useEffect(() => {
    if (!context.settings.autoRefreshEnabled()) {
      return;
    }
    const id = window.setInterval(
      () => _refreshDiscoveryTree(),
      context.settings.autoRefreshPeriod() * context.settings.autoRefreshUnits(),
    );
    return () => window.clearInterval(id);
  }, [context.settings, _refreshDiscoveryTree]);

  const content = React.useMemo(() => {
    if (error) {
      return (
        <Bullseye>
          <ErrorView
            title={'Unable load topology view'}
            message={error.message}
            retry={() => {
              // Start from initial state
              firstFetchRef.current = false;
              setError(undefined);
              _refreshDiscoveryTree(() => (firstFetchRef.current = true));
            }}
          />
        </Bullseye>
      );
    }

    if (!firstFetched) {
      return (
        <Bullseye>
          <LinearDotSpinner />
        </Bullseye>
      );
    }

    return (
      <SearchExprServiceContext.Provider value={matchExpreRef.current}>
        {isGraphView ? (
          <TopologyGraphView transformConfig={transformConfig} />
        ) : (
          <TopologyListView transformConfig={transformConfig} />
        )}
      </SearchExprServiceContext.Provider>
    );
  }, [
    isGraphView,
    transformConfig,
    firstFetched,
    error,
    firstFetchRef,
    matchExpreRef,
    setError,
    _refreshDiscoveryTree,
  ]);

  return (
    <>
      <BreadcrumbPage pageTitle={'Topology'} {..._props}>
        <Card isFullHeight id="topology-card">
          <CardBody style={{ padding: 0 }}>
            <DiscoveryTreeContext.Provider value={discoveryTree}>{content}</DiscoveryTreeContext.Provider>
          </CardBody>
        </Card>
        <></>
      </BreadcrumbPage>
    </>
  );
};

export default Topology;
