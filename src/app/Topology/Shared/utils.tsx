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
import { TopologyFilters } from '@app/Shared/Redux/Filters/TopologyFilterSlice';
import { ServiceContext } from '@app/Shared/Services/Services';
import { Target } from '@app/Shared/Services/Target.service';
import { useSubscriptions } from '@app/utils/useSubscriptions';
import { Button, Text, TextVariants } from '@patternfly/react-core';
import { ContextMenuSeparator, GraphElement, NodeStatus } from '@patternfly/react-topology';
import * as React from 'react';
import { BehaviorSubject, catchError, combineLatest, debounceTime, Observable, of, switchMap, tap } from 'rxjs';
import { ContextMenuItem, MenuItemVariant, NodeAction, nodeActions } from '../Actions/NodeActions';
import { WarningResolverAsCredModal, WarningResolverAsLink } from '../Actions/WarningResolver';
import { EnvironmentNode, TargetNode, isTargetNode, NodeType, DEFAULT_EMPTY_UNIVERSE } from '../typings';

export const DiscoveryTreeContext = React.createContext(DEFAULT_EMPTY_UNIVERSE);

export const nodeTypeToAbbr = (type: NodeType): string => {
  // Keep uppercases (or uppercase whole word if none) and retain first 4 charaters.
  return (type.replace(/[^A-Z]/g, '') || type.toUpperCase()).slice(0, 4);
};

export const getAllLeaves = (root: EnvironmentNode | TargetNode): TargetNode[] => {
  if (isTargetNode(root)) {
    return [root];
  }
  const INIT: TargetNode[] = [];
  return root.children.reduce((prev, curr) => prev.concat(getAllLeaves(curr)), INIT);
};

export const flattenTree = (
  node: EnvironmentNode | TargetNode,
  includeUniverse?: boolean
): (EnvironmentNode | TargetNode)[] => {
  if (isTargetNode(node)) {
    return [node];
  }

  const INIT: (EnvironmentNode | TargetNode)[] = [];
  const allChildren = node.children.reduce((prev, curr) => prev.concat(flattenTree(curr)), INIT);

  if (node.nodeType === NodeType.UNIVERSE && !includeUniverse) {
    return [...allChildren];
  }

  return [node, ...allChildren];
};

export const getUniqueNodeTypes = (nodes: (EnvironmentNode | TargetNode)[]): NodeType[] => {
  return Array.from(new Set(nodes.map((n) => n.nodeType)));
};

export interface TransformConfig {
  showOnlyTopGroup?: boolean;
  expandMode?: boolean;
}

export const getUniqueGroupId = (group: EnvironmentNode) => {
  return `${group.id}`;
};

export const getUniqueTargetId = (target: TargetNode) => {
  return `${target.id}`;
};

export type StatusExtra = { title?: string; description?: React.ReactNode; callForAction?: React.ReactNode[] };

export const getStatusTargetNode = (node: TargetNode | EnvironmentNode): [NodeStatus?, StatusExtra?] => {
  if (isTargetNode(node)) {
    return node.target.jvmId
      ? []
      : [
          NodeStatus.warning,
          {
            title: 'Failed to compute JVM ID',
            description: (
              <>
                <Text component={TextVariants.p}>
                  If target has JMX Authentication enabled, add the credential to Cryostat keyring.
                </Text>
                <Text component={TextVariants.p}>
                  If the target has SSL enabled over JMX, add its certificate to Cryostat truststore.
                </Text>
              </>
            ),
            callForAction: [
              <WarningResolverAsCredModal key={`${node.target.alias}-resolver-as-credential-modal`}>
                <Button variant="link" isSmall style={{ padding: 0 }}>
                  Add credentials
                </Button>
              </WarningResolverAsCredModal>,
              <WarningResolverAsLink key={`${node.target.alias}-resolver-as-link-to-security`} to="/security">
                Add certificates
              </WarningResolverAsLink>,
            ],
          },
        ];
  }
  return [];
};

export const actionFactory = (
  element: GraphElement | ListElement,
  variant: MenuItemVariant = 'contextMenuItem',
  actionFilter = (_: NodeAction) => true
) => {
  const data: TargetNode = element.getData();
  const isGroup = !isTargetNode(data);
  let filtered = nodeActions.filter((action) => {
    return (
      actionFilter(action) &&
      (action.isGroup || false) === isGroup &&
      (!action.includeList || action.includeList.includes(data.nodeType)) &&
      (!action.blockList || !action.blockList.includes(data.nodeType))
    );
  });

  // Remove trailing separator
  let stop: number = filtered.length - 1;
  for (; stop >= 0; stop--) {
    if (!filtered[stop].isSeparator) {
      break;
    }
  }
  filtered = stop >= 0 ? filtered.slice(0, stop + 1) : [];

  return filtered.map(({ isSeparator, key, title, isDisabled, action }, index) => {
    if (isSeparator) {
      return <ContextMenuSeparator key={`separator-${index}`} />;
    }
    return (
      <ContextMenuItem key={key} element={element} onClick={action} variant={variant} isDisabled={isDisabled}>
        {title}
      </ContextMenuItem>
    );
  });
};

export type ListElement = {
  getData: GraphElement['getData'];
};

export const isGraphElement = (element: GraphElement | ListElement): element is GraphElement => {
  return (element as GraphElement).getGraph !== undefined;
};

export const COLLAPSE_EXEMPTS = [NodeType.NAMESPACE, NodeType.REALM, NodeType.UNIVERSE];

// For searching
export const isGroupNodeFiltered = (
  groupNode: EnvironmentNode,
  filters?: TopologyFilters['groupFilters']['filters']
) => {
  if (!filters || !filters[groupNode.nodeType]) {
    return true;
  }
  const filter = filters[groupNode.nodeType];
  let matched = true;
  if (filter.Name && filter.Name.length) {
    matched = matched && filter.Name.includes(groupNode.name);
  }
  if (filter.Label && filter.Label.length) {
    matched =
      matched && Object.entries(groupNode.labels).filter(([k, v]) => filter.Label.includes(`${k}=${v}`)).length > 0;
  }
  return matched;
};

export const isTargetNodeFiltered = ({ target }: TargetNode, filters?: TopologyFilters['targetFilters']['filters']) => {
  if (!filters) {
    return true;
  }
  let matched = true;
  if (filters.Alias && filters.Alias.length) {
    matched = matched && filters.Alias.includes(target.alias);
  }
  if (filters.ConnectionUrl && filters.ConnectionUrl.length) {
    matched = matched && filters.ConnectionUrl.includes(target.connectUrl);
  }
  if (filters.JvmId && filters.JvmId.length) {
    matched = matched && target.jvmId !== undefined && filters.JvmId.includes(target.jvmId);
  }
  if (filters.Label && filters.Label.length) {
    matched =
      matched && Object.entries(target.labels || {}).filter(([k, v]) => filters.Label.includes(`${k}=${v}`)).length > 0;
  }
  if (filters.Annotation && filters.Annotation.length) {
    const annotations = target.annotations;
    matched =
      matched &&
      [...Object.entries(annotations?.cryostat || {}), ...Object.entries(annotations?.platform || {})].filter(
        ([k, v]) => filters.Annotation.includes(`${k}=${v}`)
      ).length > 0;
  }
  return matched;
};

export const DEFAULT_MATCH_EXPR_DEBOUNCE_TIME = 300; // ms

export class SearchExprService {
  private readonly _state$ = new BehaviorSubject<string>('');

  searchExpression({
    debounceMs = DEFAULT_MATCH_EXPR_DEBOUNCE_TIME,
    immediateFn = (_: string) => undefined,
  } = {}): Observable<string> {
    return this._state$.asObservable().pipe(tap(immediateFn), debounceTime(debounceMs));
  }

  setSearchExpression(expr: string): void {
    this._state$.next(expr);
  }
}

export const SearchExprServiceContext = React.createContext(new SearchExprService());

export const useExprSvc = (): SearchExprService => React.useContext(SearchExprServiceContext);

export const MatchedTargetsServiceContext = React.createContext(new BehaviorSubject<Target[] | undefined>(undefined));

export const useMatchedTargetsSvcSource = (): BehaviorSubject<Target[] | undefined> => {
  const matchedTargetsSvcRef = React.useRef(new BehaviorSubject<Target[] | undefined>(undefined));
  const matchExprService = useExprSvc();
  const svc = React.useContext(ServiceContext);
  const addSubscription = useSubscriptions();

  React.useEffect(() => {
    addSubscription(
      combineLatest([matchExprService.searchExpression(), svc.targets.targets()])
        .pipe(
          switchMap(([input, targets]) =>
            input ? svc.api.matchTargetsWithExpr(input, targets).pipe(catchError((_) => of([]))) : of(undefined)
          )
        )
        .subscribe((ts) => {
          matchedTargetsSvcRef.current.next(ts);
        })
    );
  }, [svc.targets, svc.api, matchExprService, addSubscription]);

  return matchedTargetsSvcRef.current;
};

export const useMatchedTargetsSvc = () => React.useContext(MatchedTargetsServiceContext);
