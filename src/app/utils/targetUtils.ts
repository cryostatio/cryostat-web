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

import { EnvironmentNode, NodeType, TargetNode } from '@app/Shared/Services/api.types';

/**
 * Represents a node in a lineage path for filtering purposes.
 */
export interface LineageNode {
  readonly id: number;
  readonly name: string;
  readonly nodeType: NodeType;
}

/**
 * Finds the innermost TargetNode in a lineage tree using iterative traversal.
 */
export const findInnermostTargetNode = (root: EnvironmentNode | TargetNode): TargetNode | undefined => {
  const MAX_DEPTH = 100;
  const stack: Array<{ node: EnvironmentNode | TargetNode; depth: number }> = [{ node: root, depth: 0 }];

  while (stack.length > 0) {
    const current = stack.pop();
    if (!current || current.depth > MAX_DEPTH) {
      continue;
    }

    const { node, depth } = current;

    // If this is a TargetNode, return it
    if ('target' in node) {
      return node as TargetNode;
    }

    // Otherwise, it's an EnvironmentNode - add children to stack
    const envNode = node as EnvironmentNode;
    if (envNode.children && envNode.children.length > 0) {
      for (let i = envNode.children.length - 1; i >= 0; i--) {
        stack.push({ node: envNode.children[i], depth: depth + 1 });
      }
    }
  }

  return undefined;
};

/**
 * Extracts the full lineage path from root to target node.
 *
 * Walks the tree from the root node down to the target node, collecting all nodes
 * along the path. The returned array starts with the root (typically Universe) and
 * ends with the target node itself.
 *
 * @param root - The root node to start traversal from
 * @returns Array of LineageNode objects representing the full path, or empty array if no path found
 *
 * @example
 * // Returns: [Universe, Realm, Namespace, Deployment, ReplicaSet, Pod]
 * const path = extractLineagePath(universeNode);
 */
export const extractLineagePath = (root: EnvironmentNode | TargetNode): LineageNode[] => {
  if (!root) {
    return [];
  }

  const MAX_DEPTH = 100;
  const path: LineageNode[] = [];

  // Helper to convert node to LineageNode
  const toLineageNode = (node: EnvironmentNode | TargetNode): LineageNode => ({
    id: node.id,
    name: node.name,
    nodeType: node.nodeType,
  });

  // Iterative DFS to find path to target
  const stack: Array<{
    node: EnvironmentNode | TargetNode;
    path: LineageNode[];
    depth: number;
  }> = [{ node: root, path: [toLineageNode(root)], depth: 0 }];

  while (stack.length > 0) {
    const current = stack.pop();
    if (!current || current.depth > MAX_DEPTH) {
      continue;
    }

    const { node, path: currentPath, depth } = current;

    if ('target' in node) {
      return currentPath;
    }

    const envNode = node as EnvironmentNode;
    if (envNode.children && envNode.children.length > 0) {
      // Add children to stack in reverse order for left-to-right traversal
      for (let i = envNode.children.length - 1; i >= 0; i--) {
        const child = envNode.children[i];
        stack.push({
          node: child,
          path: [...currentPath, toLineageNode(child)],
          depth: depth + 1,
        });
      }
    }
  }

  return path;
};

/**
 * Extracts the filterable lineage path, excluding Universe, Realm, and target nodes.
 *
 * This function returns only the intermediate nodes in the lineage that are useful
 * for filtering. It excludes:
 * - Universe node (too generic)
 * - Realm node (too generic)
 * - Target node itself (unique, not useful for filtering)
 *
 * For example, in a Kubernetes context, this would return nodes like:
 * Namespace → Deployment → ReplicaSet
 *
 * @param root - The root node to start traversal from
 * @returns Array of LineageNode objects suitable for filtering, or empty array if none exist
 *
 * @example
 * // Input path: [Universe, Realm, Namespace, Deployment, ReplicaSet, Pod]
 * // Returns: [Namespace, Deployment, ReplicaSet]
 * const filterablePath = extractFilterableLineagePath(universeNode);
 */
export const extractFilterableLineagePath = (root: EnvironmentNode | TargetNode): LineageNode[] => {
  const fullPath = extractLineagePath(root);

  if (fullPath.length === 0) {
    return [];
  }

  // Filter out Universe, Realm, and the target node (last in path)
  return fullPath.filter((node, index) => {
    const isUniverseOrRealm = node.nodeType === NodeType.UNIVERSE || node.nodeType === NodeType.REALM;
    const isTargetNode = index === fullPath.length - 1;

    return !isUniverseOrRealm && !isTargetNode;
  });
};

/**
 * Returns a PatternFly color for a given NodeType for visual distinction.
 *
 * Colors are assigned to provide visual hierarchy and distinction between
 * different node types in the lineage chain.
 *
 * @param nodeType - The NodeType to get a color for
 * @returns PatternFly color string (e.g., 'blue', 'green', 'purple')
 *
 * @example
 * const color = getColorForNodeType(NodeType.NAMESPACE); // Returns 'blue'
 */
export const getColorForNodeType = (nodeType: NodeType): string => {
  switch (nodeType) {
    // Kubernetes platform nodes
    case NodeType.NAMESPACE:
      return 'blue';
    case NodeType.DEPLOYMENT:
    case NodeType.DEPLOYMENTCONFIG:
      return 'green';
    case NodeType.STATEFULSET:
    case NodeType.DAEMONSET:
      return 'cyan';
    case NodeType.REPLICASET:
    case NodeType.REPLICATIONCONTROLLER:
      return 'purple';
    case NodeType.POD:
      return 'orange';
    case NodeType.ENDPOINT:
      return 'gold';

    // Target types
    case NodeType.JVM:
    case NodeType.AGENT:
      return 'red';
    case NodeType.CUSTOM_TARGET:
      return 'grey';
    case NodeType.TARGET:
      return 'grey';

    // Generic/fallback
    case NodeType.UNIVERSE:
    case NodeType.REALM:
    case NodeType.NODE:
    default:
      return 'grey';
  }
};
