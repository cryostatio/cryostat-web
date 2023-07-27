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
import { ServiceContext } from '@app/Shared/Services/Services';
import { Target } from '@app/Shared/Services/Target.service';
import { useSubscriptions } from '@app/utils/useSubscriptions';
import { Divider, Stack, StackItem, TreeView, TreeViewDataItem } from '@patternfly/react-core';
import * as React from 'react';
import { useSelector } from 'react-redux';
import { Subject, catchError, combineLatest, of, switchMap } from 'rxjs';
import { TopologyEmptyState } from '../Shared/TopologyEmptyState';
import { DiscoveryTreeContext, TransformConfig, getAllLeaves, useExprSvc } from '../Shared/utils';
import { TopologyToolbar, TopologyToolbarVariant } from '../Toolbar/TopologyToolbar';
import { transformData } from './UtilsFactory';

export interface TopologyListViewProps {
  transformConfig?: TransformConfig;
}

export const TopologyListView: React.FC<TopologyListViewProps> = ({ transformConfig, ...props }) => {
  const discoveryTree = React.useContext(DiscoveryTreeContext);
  const svcContext = React.useContext(ServiceContext);
  const addSubscription = useSubscriptions();
  const matchExprService = useExprSvc();

  const tSubjectRef = React.useRef(new Subject<Target[]>());
  const tSubject = tSubjectRef.current;

  const filters = useSelector((state: RootState) => state.topologyFilters);

  const [matchedTargets, setMatchedTargets] = React.useState<Target[]>();

  const _treeViewData: TreeViewDataItem[] = React.useMemo(
    () => transformData(discoveryTree, transformConfig, filters, matchedTargets),
    [discoveryTree, transformConfig, filters, matchedTargets]
  );

  const isEmptyList = React.useMemo(() => !_treeViewData.length, [_treeViewData]);

  React.useEffect(() => {
    addSubscription(
      combineLatest([matchExprService.searchExpression(), tSubject.asObservable()])
        .pipe(
          switchMap(([input, ts]) =>
            input ? svcContext.api.matchTargetsWithExpr(input, ts).pipe(catchError((_) => of([]))) : of(undefined)
          )
        )
        .subscribe(setMatchedTargets)
    );
  }, [svcContext.api, matchExprService, tSubject, addSubscription, setMatchedTargets]);

  React.useEffect(() => {
    tSubject.next(getAllLeaves(discoveryTree).map((tn) => tn.target));
  }, [discoveryTree, tSubject]);

  return (
    <Stack {...props}>
      <StackItem>
        <TopologyToolbar variant={TopologyToolbarVariant.List} />
      </StackItem>
      <StackItem>
        <Divider />
      </StackItem>
      <StackItem isFilled>
        {isEmptyList ? (
          <TopologyEmptyState />
        ) : (
          <TreeView
            className="topology__treeview-container"
            data={_treeViewData}
            variant="compact"
            hasGuides
            allExpanded={matchedTargets !== undefined}
          />
        )}
      </StackItem>
    </Stack>
  );
};
