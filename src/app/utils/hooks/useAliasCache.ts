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

/**
 * Hook to manage a cache of target aliases keyed by jvmId.
 * Fetches aliases from the audit log API on-demand and caches them.
 * The cache updates automatically when the jvmIds array changes (e.g., when parent components
 * receive websocket notifications and update their directories state).
 */
export const useAliasCache = (jvmIds: string[]): Map<string, string> => {
  const context = React.useContext(ServiceContext);
  const addSubscription = useSubscriptions();
  const [aliasMap, setAliasMap] = React.useState<Map<string, string>>(new Map());
  const fetchedIds = React.useRef<Set<string>>(new Set());
  const prevJvmIdsRef = React.useRef<Set<string>>(new Set());

  const fetchAlias = React.useCallback(
    (jvmId: string) => {
      if (!jvmId || jvmId === 'uploads' || fetchedIds.current.has(jvmId)) {
        return;
      }

      fetchedIds.current.add(jvmId);

      addSubscription(
        context.api.getTargetLineage(jvmId).subscribe({
          next: (lineageRoot) => {
            const target = findInnermostTargetNode(lineageRoot);
            if (target?.target?.alias) {
              setAliasMap((prev) => {
                const newMap = new Map(prev);
                newMap.set(jvmId, target.target.alias);
                return newMap;
              });
            }
          },
          error: () => {
            // Ignore errors - alias just won't be searchable
          },
        }),
      );
    },
    [addSubscription, context.api],
  );

  React.useEffect(() => {
    // Only fetch aliases for jvmIds that are new (not in prevJvmIdsRef)
    const currentJvmIds = new Set(jvmIds);
    const newJvmIds = jvmIds.filter((jvmId) => !prevJvmIdsRef.current.has(jvmId));

    newJvmIds.forEach((jvmId) => {
      if (jvmId && jvmId !== 'uploads' && !fetchedIds.current.has(jvmId)) {
        fetchAlias(jvmId);
      }
    });

    // Update the previous jvmIds set
    prevJvmIdsRef.current = currentJvmIds;
  }, [jvmIds, fetchAlias]);

  return aliasMap;
};
