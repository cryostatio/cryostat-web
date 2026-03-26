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
import { findInnermostTargetNode } from '@app/utils/targetUtils';

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
});
