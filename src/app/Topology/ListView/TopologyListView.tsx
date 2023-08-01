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
