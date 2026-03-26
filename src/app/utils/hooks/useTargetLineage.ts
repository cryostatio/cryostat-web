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
import { getTargetRepresentation } from '@app/Shared/Services/api.utils';
import { ServiceContext } from '@app/Shared/Services/Services';
import { useSubscriptions } from '@app/utils/hooks/useSubscriptions';
import * as React from 'react';

interface UseTargetLineageResult {
  displayName: string;
  isLoading: boolean;
  error: Error | null;
  targetNode: TargetNode | null;
}

const formatFallbackDisplayName = (connectUrl: string | undefined, jvmId: string, alias?: string): string => {
  if (alias && connectUrl) {
    return `${alias} (${connectUrl})`;
  }
  if (alias) {
    return alias;
  }
  if (connectUrl && jvmId && connectUrl !== jvmId) {
    return `${connectUrl} (${jvmId})`;
  }
  return connectUrl || jvmId;
};

export const useTargetLineage = (jvmId: string, connectUrl?: string, alias?: string): UseTargetLineageResult => {
  const context = React.useContext(ServiceContext);
  const addSubscription = useSubscriptions();

  const [displayName, setDisplayName] = React.useState<string>('');
  const [isLoading, setIsLoading] = React.useState<boolean>(true);
  const [error, setError] = React.useState<Error | null>(null);
  const [targetNode, setTargetNode] = React.useState<TargetNode | null>(null);

  const findInnermostTargetNode = React.useCallback((node: EnvironmentNode | TargetNode): TargetNode | undefined => {
    const MAX_DEPTH = 100;
    const stack: Array<{ node: EnvironmentNode | TargetNode; depth: number }> = [{ node, depth: 0 }];

    while (stack.length > 0) {
      const current = stack.pop();
      if (!current || current.depth >= MAX_DEPTH) {
        continue;
      }

      if ('target' in current.node) {
        return current.node as TargetNode;
      }

      const envNode = current.node as EnvironmentNode;
      if (envNode.children && envNode.children.length > 0) {
        for (let i = envNode.children.length - 1; i >= 0; i--) {
          stack.push({ node: envNode.children[i], depth: current.depth + 1 });
        }
      }
    }

    return undefined;
  }, []);

  React.useEffect(() => {
    if (!jvmId || jvmId === 'uploads') {
      setDisplayName(alias || connectUrl || jvmId);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    addSubscription(
      context.api.getTargetLineage(jvmId).subscribe({
        next: (lineageRoot) => {
          const target = findInnermostTargetNode(lineageRoot);
          if (target?.target) {
            setTargetNode(target);
            setDisplayName(getTargetRepresentation(target.target));
          } else {
            setDisplayName(formatFallbackDisplayName(connectUrl, jvmId, alias));
          }
          setIsLoading(false);
        },
        error: (err) => {
          setError(err);
          setDisplayName(formatFallbackDisplayName(connectUrl, jvmId, alias));
          setIsLoading(false);
        },
      }),
    );
  }, [jvmId, connectUrl, alias, addSubscription, context.api, findInnermostTargetNode]);

  return { displayName, isLoading, error, targetNode };
};
