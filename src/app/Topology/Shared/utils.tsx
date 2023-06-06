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
import { TopologyFilters } from '@app/Shared/Redux/Filters/TopologyFilterSlice';
import { evaluateTargetWithExpr } from '@app/utils/utils';
import { Button, Text, TextVariants } from '@patternfly/react-core';
import { ContextMenuSeparator, GraphElement, NodeStatus } from '@patternfly/react-topology';
import * as React from 'react';
import { BehaviorSubject, debounceTime, Observable, Subscription } from 'rxjs';
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

export class SearchExprService {
  private readonly _state$ = new BehaviorSubject<string>('');

  searchExpression(): Observable<string> {
    return this._state$.asObservable();
  }

  setSearchExpression(expr: string): void {
    this._state$.next(expr);
  }
}

export const SearchExprServiceContext = React.createContext(new SearchExprService());

export const useSearchExpression = (debounceMs = 0): [string, (expr: string) => void] => {
  const [expr, setExpr] = React.useState('');
  const exprSvc = React.useContext(SearchExprServiceContext);
  const _subRef = React.useRef<Subscription>();

  React.useEffect(() => {
    _subRef.current = exprSvc.searchExpression().pipe(debounceTime(debounceMs)).subscribe(setExpr);
    return () => _subRef.current?.unsubscribe();
  }, [_subRef, setExpr, exprSvc, debounceMs]);

  const handleChange = React.useCallback(
    (value: string) => {
      exprSvc.setSearchExpression(value);
    },
    [exprSvc]
  );
  return [expr, handleChange];
};

export const isTargetMatched = ({ target }: TargetNode, matchExpression: string): boolean => {
  try {
    const res = evaluateTargetWithExpr(target, matchExpression);
    if (typeof res === 'boolean') {
      return res;
    }
    return false;
  } catch (err) {
    return false;
  }
};
