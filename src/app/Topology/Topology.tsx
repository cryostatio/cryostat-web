/*
 * Copyright The Cryostat Authors
 *
 * The Universal Permissive License (UPL), Version 1.0
 *
 * Subject to the condition set forth below, permission is hereby granted to any
 * person obtaining a copy of this software, associated documentation and/or data
 * (collectively the "Software"), free of charge and under any and all copyright
 * rights in the Software, and any and all patent rights owned or freely
 * licensable by each licensor hereunder covering either (i) the unmodified
 * Software as contributed to or provided by such licensor, or (ii) the Larger
 * Works (as defined below), to deal in both
 *
 * (a) the Software, and
 * (b) any piece of software and/or hardware listed in the lrgrwrks.txt file if
 * one is included with the Software (each a "Larger Work" to which the Software
 * is contributed by such licensors),
 *
 * without restriction, including without limitation the rights to copy, create
 * derivative works of, display, perform, and distribute the Software and make,
 * use, sell, offer for sale, import, export, have made, and have sold the
 * Software and the Larger Work(s), and to sublicense the foregoing rights on
 * either these or other terms.
 *
 * This license is subject to the following condition:
 * The above copyright notice and either this complete permission notice or at
 * a minimum a reference to the UPL must be included in all copies or
 * substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

import { BreadcrumbPage } from '@app/BreadcrumbPage/BreadcrumbPage';
import { ErrorView } from '@app/ErrorView/ErrorView';
import { FeatureFlag } from '@app/Shared/FeatureFlag/FeatureFlag';
import { LinearDotSpinner } from '@app/Shared/LinearDotSpinner';
import { ViewMode } from '@app/Shared/Redux/Configurations/TopologyConfigSlicer';
import { RootState } from '@app/Shared/Redux/ReduxStore';
import { NotificationCategory } from '@app/Shared/Services/NotificationChannel.service';
import { ServiceContext } from '@app/Shared/Services/Services';
import { FeatureLevel } from '@app/Shared/Services/Settings.service';
import '@app/Topology/styles/base.css';
import { getFromLocalStorage, saveToLocalStorage } from '@app/utils/LocalStorage';
import { useSubscriptions } from '@app/utils/useSubscriptions';
import { Bullseye, Card, CardBody } from '@patternfly/react-core';
import * as React from 'react';
import { useSelector } from 'react-redux';
import { Link, withRouter } from 'react-router-dom';
import { TopologyGraphView } from './GraphView/TopologyGraphView';
import { TopologyListView } from './ListView/TopologyListView';
import { HintBanner } from './Shared/HintBanner';
import {
  defaultSearchExpression as defaultSearchExprService,
  DiscoveryTreeContext,
  SearchExprServiceContext,
} from './Shared/utils';
import { DEFAULT_EMPTY_UNIVERSE } from './typings';

export interface TopologyProps {}

export const Topology: React.FC<TopologyProps> = ({ ..._props }) => {
  const addSubscription = useSubscriptions();
  const context = React.useContext(ServiceContext);
  const firstFetchRef = React.useRef(false);
  const firstFetched = firstFetchRef.current;

  const displayOptions = useSelector((state: RootState) => state.topologyConfigs.displayOptions);
  const { groupings } = displayOptions;
  const transformConfig = React.useMemo(
    () => ({ showOnlyTopGroup: groupings.realmOnly, expandMode: !groupings.collapseSingles }),
    [groupings]
  );

  const [discoveryTree, setDiscoveryTree] = React.useState(DEFAULT_EMPTY_UNIVERSE);

  const [shouldShowBanner, setShouldShowBanner] = React.useState(getFromLocalStorage('TOPOLOGY_SHOW_BANNER', true));
  const isGraphView = useSelector((state: RootState) => {
    const _currentMode: ViewMode = state.topologyConfigs.viewMode;
    return _currentMode === 'graph';
  });

  const [error, setError] = React.useState<Error>();

  const closeBanner = React.useCallback(() => {
    setShouldShowBanner(false);
    saveToLocalStorage('TOPOLOGY_SHOW_BANNER', false);
  }, [setShouldShowBanner]);

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
            console.log(err);
          },
        })
      );
    },
    [addSubscription, context.api, setDiscoveryTree, setError]
  );

  React.useEffect(() => {
    addSubscription(
      // Credentials will trigger modifed target event if any
      context.notificationChannel
        .messages(NotificationCategory.TargetJvmDiscovery)
        .subscribe((_) => _refreshDiscoveryTree())
    );
  }, [addSubscription, context.notificationChannel, _refreshDiscoveryTree]);

  React.useEffect(() => {
    _refreshDiscoveryTree(() => (firstFetchRef.current = true));
  }, [_refreshDiscoveryTree, firstFetchRef]);

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
      <SearchExprServiceContext.Provider value={defaultSearchExprService}>
        {isGraphView ? (
          <TopologyGraphView transformConfig={transformConfig} />
        ) : (
          <TopologyListView transformConfig={transformConfig} />
        )}
      </SearchExprServiceContext.Provider>
    );
  }, [isGraphView, transformConfig, firstFetched, error, firstFetchRef, setError, _refreshDiscoveryTree]);

  return (
    <>
      <FeatureFlag level={FeatureLevel.BETA}>
        <HintBanner onClose={closeBanner} show={shouldShowBanner}>
          For topology guides, see <Link to={'/quickstarts'}>Quickstarts</Link>.
        </HintBanner>
      </FeatureFlag>
      <BreadcrumbPage pageTitle={'Topology'} {..._props}>
        <Card isFullHeight id="topology-card" className="topology__main-container">
          <CardBody style={{ padding: 0 }}>
            <DiscoveryTreeContext.Provider value={discoveryTree}>{content}</DiscoveryTreeContext.Provider>
          </CardBody>
        </Card>
        <></>
      </BreadcrumbPage>
    </>
  );
};

export default withRouter(Topology);
