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

import { EnvironmentNode, TargetNode } from '@app/Shared/Services/api.types';

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
