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
import * as React from 'react';

/**
 * Hook to access the target alias cache service.
 * Automatically fetches aliases for the provided jvmIds and returns the current cache.
 */
export const useAliasCache = (jvmIds: string[]): Map<string, string> => {
  const context = React.useContext(ServiceContext);
  const addSubscription = useSubscriptions();
  const [aliasMap, setAliasMap] = React.useState<Map<string, string>>(new Map());

  React.useEffect(() => {
    addSubscription(
      context.targetAlias.aliasMap().subscribe((map) => {
        setAliasMap(map);
      }),
    );
  }, [addSubscription, context.targetAlias]);

  // Fetch aliases for the provided jvmIds
  // Use a stable string representation to avoid re-fetching on array reference changes
  const jvmIdsKey = React.useMemo(() => jvmIds.sort().join(','), [jvmIds]);

  React.useEffect(() => {
    if (jvmIdsKey) {
      context.targetAlias.fetchAliases(jvmIdsKey.split(','));
    }
  }, [jvmIdsKey, context.targetAlias]);

  return aliasMap;
};
