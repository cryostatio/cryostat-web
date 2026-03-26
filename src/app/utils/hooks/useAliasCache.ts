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

import { ServiceContext } from '@app/Shared/Services/Services';
import { useSubscriptions } from '@app/utils/hooks/useSubscriptions';
import { findInnermostTargetNode } from '@app/utils/targetUtils';
import * as React from 'react';

// Module-level cache that persists across component re-renders and remounts
const globalAliasCache = new Map<string, string>();
const globalFetchedIds = new Set<string>();
const globalInFlightFetches = new Set<string>();

/**
 * Hook to manage a cache of target aliases keyed by jvmId.
 * Fetches aliases from the audit log API on-demand and caches them.
 * Uses a module-level cache that persists across component lifecycles.
 */
export const useAliasCache = (jvmIds: string[]): Map<string, string> => {
  const context = React.useContext(ServiceContext);
  const addSubscription = useSubscriptions();
  const [, forceUpdate] = React.useReducer((x) => x + 1, 0);

  const fetchAlias = React.useCallback(
    (jvmId: string) => {
      if (!jvmId || jvmId === 'uploads' || globalFetchedIds.has(jvmId) || globalInFlightFetches.has(jvmId)) {
        return;
      }

      globalInFlightFetches.add(jvmId);

      addSubscription(
        context.api.getTargetLineage(jvmId).subscribe({
          next: (lineageRoot) => {
            const target = findInnermostTargetNode(lineageRoot);
            if (target?.target?.alias) {
              globalAliasCache.set(jvmId, target.target.alias);
              forceUpdate();
            }
            globalFetchedIds.add(jvmId);
            globalInFlightFetches.delete(jvmId);
          },
          error: () => {
            // Ignore errors - alias just won't be searchable
            globalFetchedIds.add(jvmId);
            globalInFlightFetches.delete(jvmId);
          },
        }),
      );
    },
    [addSubscription, context.api, forceUpdate],
  );

  React.useEffect(() => {
    jvmIds.forEach((jvmId) => {
      if (jvmId && jvmId !== 'uploads' && !globalFetchedIds.has(jvmId) && !globalInFlightFetches.has(jvmId)) {
        fetchAlias(jvmId);
      }
    });
  }, [jvmIds, fetchAlias]);

  return globalAliasCache;
};
