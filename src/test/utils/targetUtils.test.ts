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
import {
  extractFilterableLineagePath,
  extractLineagePath,
  findInnermostTargetNode,
  getColorForNodeType,
  LineageNode,
} from '@app/utils/targetUtils';

describe('targetUtils', () => {
  describe('findInnermostTargetNode', () => {
    const createTargetNode = (id: number, alias: string): TargetNode => ({
      id,
      name: `Target-${id}`,
      nodeType: NodeType.JVM,
      labels: [],
      target: {
        agent: false,
        alias,
        connectUrl: 'service:jmx:rmi:///jndi/rmi://localhost:9091/jmxrmi',
        labels: [],
        annotations: {
          cryostat: [],
          platform: [],
        },
      },
    });

    const createEnvironmentNode = (
      id: number,
      name: string,
      children: (EnvironmentNode | TargetNode)[],
    ): EnvironmentNode => ({
      id,
      name,
      nodeType: NodeType.REALM,
      labels: [],
      children,
    });

    it('should return the target node when given a target node directly', () => {
      const targetNode = createTargetNode(1, 'test-target');
      const result = findInnermostTargetNode(targetNode);
      expect(result).toBe(targetNode);
    });

    it('should find target node in a simple hierarchy', () => {
      const targetNode = createTargetNode(2, 'nested-target');
      const envNode = createEnvironmentNode(1, 'Environment', [targetNode]);

      const result = findInnermostTargetNode(envNode);
      expect(result).toBe(targetNode);
    });

    it('should find target node in a deep hierarchy', () => {
      const targetNode = createTargetNode(4, 'deep-target');
      const level3 = createEnvironmentNode(3, 'Level3', [targetNode]);
      const level2 = createEnvironmentNode(2, 'Level2', [level3]);
      const level1 = createEnvironmentNode(1, 'Level1', [level2]);

      const result = findInnermostTargetNode(level1);
      expect(result).toBe(targetNode);
    });

    it('should return the first target node found when multiple exist', () => {
      const targetNode1 = createTargetNode(2, 'target-1');
      const targetNode2 = createTargetNode(3, 'target-2');
      const envNode = createEnvironmentNode(1, 'Environment', [targetNode1, targetNode2]);

      const result = findInnermostTargetNode(envNode);
      expect(result).toBe(targetNode1);
    });

    it('should return undefined when no target node exists', () => {
      const emptyEnvNode = createEnvironmentNode(1, 'Empty', []);

      const result = findInnermostTargetNode(emptyEnvNode);
      expect(result).toBeUndefined();
    });

    it('should return undefined when hierarchy only contains environment nodes', () => {
      const level2 = createEnvironmentNode(2, 'Level2', []);
      const level1 = createEnvironmentNode(1, 'Level1', [level2]);

      const result = findInnermostTargetNode(level1);
      expect(result).toBeUndefined();
    });

    it('should handle complex branching hierarchies', () => {
      const targetNode1 = createTargetNode(4, 'target-1');
      const targetNode2 = createTargetNode(5, 'target-2');
      const branch1 = createEnvironmentNode(2, 'Branch1', [targetNode1]);
      const branch2 = createEnvironmentNode(3, 'Branch2', [targetNode2]);
      const root = createEnvironmentNode(1, 'Root', [branch1, branch2]);

      const result = findInnermostTargetNode(root);
      // Should find the first target in depth-first traversal
      expect(result).toBeDefined();
      expect(result?.target.alias).toBe('target-1');
    });

    it('should handle very deep hierarchies without stack overflow', () => {
      let current: EnvironmentNode | TargetNode = createTargetNode(101, 'deep-target');

      // Create a hierarchy 50 levels deep
      for (let i = 100; i > 0; i--) {
        current = createEnvironmentNode(i, `Level-${i}`, [current]);
      }

      const result = findInnermostTargetNode(current as EnvironmentNode);
      expect(result).toBeDefined();
      expect(result?.target.alias).toBe('deep-target');
    });

    it('should stop at MAX_DEPTH to prevent infinite loops', () => {
      // Create a hierarchy deeper than MAX_DEPTH (100)
      let current: EnvironmentNode | TargetNode = createTargetNode(151, 'very-deep-target');

      // Create a hierarchy 150 levels deep
      for (let i = 150; i > 0; i--) {
        current = createEnvironmentNode(i, `Level-${i}`, [current]);
      }

      const result = findInnermostTargetNode(current as EnvironmentNode);
      // Should return undefined because it exceeds MAX_DEPTH
      expect(result).toBeUndefined();
    });

    it('should handle mixed children with both environment and target nodes', () => {
      const targetNode = createTargetNode(3, 'target');
      const emptyEnv = createEnvironmentNode(4, 'EmptyEnv', []);
      const parent = createEnvironmentNode(2, 'Parent', [emptyEnv, targetNode]);
      const root = createEnvironmentNode(1, 'Root', [parent]);

      const result = findInnermostTargetNode(root);
      expect(result).toBe(targetNode);
    });
  });

  describe('extractLineagePath', () => {
    const createTargetNode = (id: number, name: string, nodeType: NodeType = NodeType.JVM): TargetNode => ({
      id,
      name,
      nodeType,
      labels: [],
      target: {
        agent: false,
        alias: name,
        connectUrl: 'service:jmx:rmi:///jndi/rmi://localhost:9091/jmxrmi',
        labels: [],
        annotations: {
          cryostat: [],
          platform: [],
        },
      },
    });

    const createEnvironmentNode = (
      id: number,
      name: string,
      nodeType: NodeType,
      children: (EnvironmentNode | TargetNode)[],
    ): EnvironmentNode => ({
      id,
      name,
      nodeType,
      labels: [],
      children,
    });

    it('should return empty array for null input', () => {
      const result = extractLineagePath(null as any);
      expect(result).toEqual([]);
    });

    it('should return empty array for undefined input', () => {
      const result = extractLineagePath(undefined as any);
      expect(result).toEqual([]);
    });

    it('should return single node for target node only', () => {
      const targetNode = createTargetNode(1, 'Target-1', NodeType.POD);
      const result = extractLineagePath(targetNode);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        name: 'Target-1',
        nodeType: NodeType.POD,
      });
    });

    it('should extract full path for simple hierarchy', () => {
      const targetNode = createTargetNode(3, 'my-pod', NodeType.POD);
      const namespace = createEnvironmentNode(2, 'my-namespace', NodeType.NAMESPACE, [targetNode]);
      const realm = createEnvironmentNode(1, 'Kubernetes', NodeType.REALM, [namespace]);

      const result = extractLineagePath(realm);

      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({ name: 'Kubernetes', nodeType: NodeType.REALM });
      expect(result[1]).toEqual({ name: 'my-namespace', nodeType: NodeType.NAMESPACE });
      expect(result[2]).toEqual({ name: 'my-pod', nodeType: NodeType.POD });
    });

    it('should extract full path for Kubernetes-like hierarchy', () => {
      const pod = createTargetNode(6, 'my-app-abc-123', NodeType.POD);
      const replicaset = createEnvironmentNode(5, 'my-app-abc', NodeType.REPLICASET, [pod]);
      const deployment = createEnvironmentNode(4, 'my-app', NodeType.DEPLOYMENT, [replicaset]);
      const namespace = createEnvironmentNode(3, 'production', NodeType.NAMESPACE, [deployment]);
      const realm = createEnvironmentNode(2, 'Kubernetes', NodeType.REALM, [namespace]);
      const universe = createEnvironmentNode(1, 'Universe', NodeType.UNIVERSE, [realm]);

      const result = extractLineagePath(universe);

      expect(result).toHaveLength(6);
      expect(result[0]).toEqual({ name: 'Universe', nodeType: NodeType.UNIVERSE });
      expect(result[1]).toEqual({ name: 'Kubernetes', nodeType: NodeType.REALM });
      expect(result[2]).toEqual({ name: 'production', nodeType: NodeType.NAMESPACE });
      expect(result[3]).toEqual({ name: 'my-app', nodeType: NodeType.DEPLOYMENT });
      expect(result[4]).toEqual({ name: 'my-app-abc', nodeType: NodeType.REPLICASET });
      expect(result[5]).toEqual({ name: 'my-app-abc-123', nodeType: NodeType.POD });
    });

    it('should return empty array when environment node has no children (no target)', () => {
      const emptyEnv = createEnvironmentNode(1, 'Empty', NodeType.REALM, []);
      const result = extractLineagePath(emptyEnv);

      // When there's no target node in the tree, returns empty array
      expect(result).toEqual([]);
    });

    it('should find first target in branching hierarchy', () => {
      const target1 = createTargetNode(3, 'target-1', NodeType.JVM);
      const target2 = createTargetNode(4, 'target-2', NodeType.JVM);
      const branch1 = createEnvironmentNode(5, 'Branch1', NodeType.NODE, [target1]);
      const branch2 = createEnvironmentNode(6, 'Branch2', NodeType.NODE, [target2]);
      const root = createEnvironmentNode(1, 'Root', NodeType.REALM, [branch1, branch2]);

      const result = extractLineagePath(root);

      // Should find path to first target
      expect(result).toHaveLength(3);
      expect(result[2].name).toBe('target-1');
    });

    it('should handle very deep hierarchy', () => {
      let current: EnvironmentNode | TargetNode = createTargetNode(51, 'deep-target', NodeType.JVM);

      for (let i = 50; i > 0; i--) {
        current = createEnvironmentNode(i, `Level-${i}`, NodeType.NODE, [current]);
      }

      const result = extractLineagePath(current as EnvironmentNode);

      expect(result).toHaveLength(51);
      expect(result[0].name).toBe('Level-1');
      expect(result[50].name).toBe('deep-target');
    });

    it('should respect MAX_DEPTH limit', () => {
      let current: EnvironmentNode | TargetNode = createTargetNode(151, 'very-deep-target', NodeType.JVM);

      for (let i = 150; i > 0; i--) {
        current = createEnvironmentNode(i, `Level-${i}`, NodeType.NODE, [current]);
      }

      const result = extractLineagePath(current as EnvironmentNode);

      expect(result.length).toBeLessThan(151);
    });
  });

  describe('extractFilterableLineagePath', () => {
    const createTargetNode = (id: number, name: string, nodeType: NodeType = NodeType.POD): TargetNode => ({
      id,
      name,
      nodeType,
      labels: [],
      target: {
        agent: false,
        alias: name,
        connectUrl: 'service:jmx:rmi:///jndi/rmi://localhost:9091/jmxrmi',
        labels: [],
        annotations: {
          cryostat: [],
          platform: [],
        },
      },
    });

    const createEnvironmentNode = (
      id: number,
      name: string,
      nodeType: NodeType,
      children: (EnvironmentNode | TargetNode)[],
    ): EnvironmentNode => ({
      id,
      name,
      nodeType,
      labels: [],
      children,
    });

    it('should return empty array for null input', () => {
      const result = extractFilterableLineagePath(null as any);
      expect(result).toEqual([]);
    });

    it('should return empty array for undefined input', () => {
      const result = extractFilterableLineagePath(undefined as any);
      expect(result).toEqual([]);
    });

    it('should filter out Universe node', () => {
      const target = createTargetNode(3, 'target', NodeType.JVM);
      const realm = createEnvironmentNode(2, 'Realm', NodeType.REALM, [target]);
      const universe = createEnvironmentNode(1, 'Universe', NodeType.UNIVERSE, [realm]);

      const result = extractFilterableLineagePath(universe);

      // Only the target node remains (Universe and Realm filtered out)
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({ name: 'target', nodeType: NodeType.JVM });
      expect(result.every((n) => n.nodeType !== NodeType.UNIVERSE)).toBe(true);
    });

    it('should filter out Realm node', () => {
      const target = createTargetNode(3, 'target', NodeType.JVM);
      const realm = createEnvironmentNode(2, 'Kubernetes', NodeType.REALM, [target]);
      const universe = createEnvironmentNode(1, 'Universe', NodeType.UNIVERSE, [realm]);

      const result = extractFilterableLineagePath(universe);

      // Only the target node remains (Universe and Realm filtered out)
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({ name: 'target', nodeType: NodeType.JVM });
      expect(result.every((n) => n.nodeType !== NodeType.REALM)).toBe(true);
    });

    it('should include target node (leaf node)', () => {
      const target = createTargetNode(4, 'my-pod', NodeType.POD);
      const namespace = createEnvironmentNode(3, 'my-namespace', NodeType.NAMESPACE, [target]);
      const realm = createEnvironmentNode(2, 'Kubernetes', NodeType.REALM, [namespace]);
      const universe = createEnvironmentNode(1, 'Universe', NodeType.UNIVERSE, [realm]);

      const result = extractFilterableLineagePath(universe);

      // Should include both namespace and pod (leaf node)
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ name: 'my-namespace', nodeType: NodeType.NAMESPACE });
      expect(result[1]).toEqual({ name: 'my-pod', nodeType: NodeType.POD });
    });

    it('should return all intermediate nodes plus leaf for Kubernetes hierarchy', () => {
      const pod = createTargetNode(6, 'my-app-abc-123', NodeType.POD);
      const replicaset = createEnvironmentNode(5, 'my-app-abc', NodeType.REPLICASET, [pod]);
      const deployment = createEnvironmentNode(4, 'my-app', NodeType.DEPLOYMENT, [replicaset]);
      const namespace = createEnvironmentNode(3, 'production', NodeType.NAMESPACE, [deployment]);
      const realm = createEnvironmentNode(2, 'Kubernetes', NodeType.REALM, [namespace]);
      const universe = createEnvironmentNode(1, 'Universe', NodeType.UNIVERSE, [realm]);

      const result = extractFilterableLineagePath(universe);

      // Should include namespace, deployment, replicaset, AND pod
      expect(result).toHaveLength(4);
      expect(result[0]).toEqual({ name: 'production', nodeType: NodeType.NAMESPACE });
      expect(result[1]).toEqual({ name: 'my-app', nodeType: NodeType.DEPLOYMENT });
      expect(result[2]).toEqual({ name: 'my-app-abc', nodeType: NodeType.REPLICASET });
      expect(result[3]).toEqual({ name: 'my-app-abc-123', nodeType: NodeType.POD });
    });

    it('should return only target when only Universe, Realm, and Target exist', () => {
      const target = createTargetNode(3, 'target', NodeType.JVM);
      const realm = createEnvironmentNode(2, 'Realm', NodeType.REALM, [target]);
      const universe = createEnvironmentNode(1, 'Universe', NodeType.UNIVERSE, [realm]);

      const result = extractFilterableLineagePath(universe);

      // Should include the target node
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({ name: 'target', nodeType: NodeType.JVM });
    });

    it('should work with non-Kubernetes hierarchy', () => {
      const target = createTargetNode(5, 'service-instance', NodeType.JVM);
      const group = createEnvironmentNode(4, 'ApplicationGroup', NodeType.NODE, [target]);
      const custom = createEnvironmentNode(3, 'CustomRealm', NodeType.NODE, [group]);
      const realm = createEnvironmentNode(2, 'CustomTargets', NodeType.REALM, [custom]);
      const universe = createEnvironmentNode(1, 'Universe', NodeType.UNIVERSE, [realm]);

      const result = extractFilterableLineagePath(universe);

      // Should include custom nodes AND the target
      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({ name: 'CustomRealm', nodeType: NodeType.NODE });
      expect(result[1]).toEqual({ name: 'ApplicationGroup', nodeType: NodeType.NODE });
      expect(result[2]).toEqual({ name: 'service-instance', nodeType: NodeType.JVM });
    });

    it('should preserve node order including leaf', () => {
      const pod = createTargetNode(5, 'pod', NodeType.POD);
      const deployment = createEnvironmentNode(4, 'deployment', NodeType.DEPLOYMENT, [pod]);
      const namespace = createEnvironmentNode(3, 'namespace', NodeType.NAMESPACE, [deployment]);
      const realm = createEnvironmentNode(2, 'Kubernetes', NodeType.REALM, [namespace]);
      const universe = createEnvironmentNode(1, 'Universe', NodeType.UNIVERSE, [realm]);

      const result = extractFilterableLineagePath(universe);

      // Should include namespace, deployment, AND pod
      expect(result).toHaveLength(3);
      expect(result[0].name).toBe('namespace');
      expect(result[1].name).toBe('deployment');
      expect(result[2].name).toBe('pod');
    });

    it('should handle StatefulSet hierarchy with leaf', () => {
      const pod = createTargetNode(5, 'db-0', NodeType.POD);
      const statefulset = createEnvironmentNode(4, 'db', NodeType.STATEFULSET, [pod]);
      const namespace = createEnvironmentNode(3, 'database', NodeType.NAMESPACE, [statefulset]);
      const realm = createEnvironmentNode(2, 'Kubernetes', NodeType.REALM, [namespace]);
      const universe = createEnvironmentNode(1, 'Universe', NodeType.UNIVERSE, [realm]);

      const result = extractFilterableLineagePath(universe);

      // Should include namespace, statefulset, AND pod
      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({ name: 'database', nodeType: NodeType.NAMESPACE });
      expect(result[1]).toEqual({ name: 'db', nodeType: NodeType.STATEFULSET });
      expect(result[2]).toEqual({ name: 'db-0', nodeType: NodeType.POD });
    });

    it('should handle DaemonSet hierarchy with leaf', () => {
      const pod = createTargetNode(5, 'logger-xyz', NodeType.POD);
      const daemonset = createEnvironmentNode(4, 'logger', NodeType.DAEMONSET, [pod]);
      const namespace = createEnvironmentNode(3, 'kube-system', NodeType.NAMESPACE, [daemonset]);
      const realm = createEnvironmentNode(2, 'Kubernetes', NodeType.REALM, [namespace]);
      const universe = createEnvironmentNode(1, 'Universe', NodeType.UNIVERSE, [realm]);

      const result = extractFilterableLineagePath(universe);

      // Should include namespace, daemonset, AND pod
      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({ name: 'kube-system', nodeType: NodeType.NAMESPACE });
      expect(result[1]).toEqual({ name: 'logger', nodeType: NodeType.DAEMONSET });
      expect(result[2]).toEqual({ name: 'logger-xyz', nodeType: NodeType.POD });
    });
  });

  describe('getColorForNodeType', () => {
    it('should return blue for NAMESPACE', () => {
      expect(getColorForNodeType(NodeType.NAMESPACE)).toBe('blue');
    });

    it('should return green for DEPLOYMENT', () => {
      expect(getColorForNodeType(NodeType.DEPLOYMENT)).toBe('green');
    });

    it('should return green for DEPLOYMENTCONFIG', () => {
      expect(getColorForNodeType(NodeType.DEPLOYMENTCONFIG)).toBe('green');
    });

    it('should return cyan for STATEFULSET', () => {
      expect(getColorForNodeType(NodeType.STATEFULSET)).toBe('cyan');
    });

    it('should return cyan for DAEMONSET', () => {
      expect(getColorForNodeType(NodeType.DAEMONSET)).toBe('cyan');
    });

    it('should return purple for REPLICASET', () => {
      expect(getColorForNodeType(NodeType.REPLICASET)).toBe('purple');
    });

    it('should return purple for REPLICATIONCONTROLLER', () => {
      expect(getColorForNodeType(NodeType.REPLICATIONCONTROLLER)).toBe('purple');
    });

    it('should return orange for POD', () => {
      expect(getColorForNodeType(NodeType.POD)).toBe('orange');
    });

    it('should return gold for ENDPOINT', () => {
      expect(getColorForNodeType(NodeType.ENDPOINT)).toBe('gold');
    });

    it('should return red for JVM', () => {
      expect(getColorForNodeType(NodeType.JVM)).toBe('red');
    });

    it('should return red for AGENT', () => {
      expect(getColorForNodeType(NodeType.AGENT)).toBe('red');
    });

    it('should return grey for CUSTOM_TARGET', () => {
      expect(getColorForNodeType(NodeType.CUSTOM_TARGET)).toBe('grey');
    });

    it('should return grey for TARGET', () => {
      expect(getColorForNodeType(NodeType.TARGET)).toBe('grey');
    });

    it('should return grey for UNIVERSE', () => {
      expect(getColorForNodeType(NodeType.UNIVERSE)).toBe('grey');
    });

    it('should return grey for REALM', () => {
      expect(getColorForNodeType(NodeType.REALM)).toBe('grey');
    });

    it('should return grey for NODE', () => {
      expect(getColorForNodeType(NodeType.NODE)).toBe('grey');
    });

    it('should return grey for unknown node type', () => {
      expect(getColorForNodeType('UNKNOWN' as NodeType)).toBe('grey');
    });

    it('should return consistent colors for same node type', () => {
      const color1 = getColorForNodeType(NodeType.DEPLOYMENT);
      const color2 = getColorForNodeType(NodeType.DEPLOYMENT);
      expect(color1).toBe(color2);
    });

    it('should return distinct colors for different Kubernetes resource types', () => {
      const namespaceColor = getColorForNodeType(NodeType.NAMESPACE);
      const deploymentColor = getColorForNodeType(NodeType.DEPLOYMENT);
      const replicasetColor = getColorForNodeType(NodeType.REPLICASET);
      const podColor = getColorForNodeType(NodeType.POD);

      const colors = new Set([namespaceColor, deploymentColor, replicasetColor, podColor]);
      expect(colors.size).toBe(4); // All should be distinct
    });
  });
});
