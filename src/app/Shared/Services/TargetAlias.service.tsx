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

import { findInnermostTargetNode } from '@app/utils/targetUtils';
import { BehaviorSubject, Observable } from 'rxjs';
import type { ApiService } from './Api.service';

export class TargetAliasService {
  private readonly aliasCache: Map<string, string> = new Map();
  private readonly fetchedIds: Set<string> = new Set();
  private readonly inFlightFetches: Set<string> = new Set();
  private readonly _aliasMap: BehaviorSubject<Map<string, string>> = new BehaviorSubject(new Map());

  constructor(private api: ApiService) {}

  /**
   * Get an Observable of the current alias cache.
   * Emits whenever the cache is updated with new aliases.
   */
  aliasMap(): Observable<Map<string, string>> {
    return this._aliasMap.asObservable();
  }

  /**
   * Get the alias for a specific jvmId from the cache.
   * Returns undefined if not cached.
   */
  getAlias(jvmId: string): string | undefined {
    return this.aliasCache.get(jvmId);
  }

  /**
   * Fetch and cache the alias for a jvmId if not already cached or in-flight.
   * This method is idempotent - calling it multiple times for the same jvmId
   * will only result in one API call.
   */
  fetchAlias(jvmId: string): void {
    if (!jvmId || jvmId === 'uploads' || this.fetchedIds.has(jvmId) || this.inFlightFetches.has(jvmId)) {
      return;
    }

    this.inFlightFetches.add(jvmId);

    this.api.getTargetLineage(jvmId).subscribe({
      next: (lineageRoot) => {
        const target = findInnermostTargetNode(lineageRoot);
        if (target?.target?.alias) {
          this.aliasCache.set(jvmId, target.target.alias);
          this._aliasMap.next(new Map(this.aliasCache));
        }
        this.fetchedIds.add(jvmId);
        this.inFlightFetches.delete(jvmId);
      },
      error: () => {
        // Ignore errors - alias just won't be available
        this.fetchedIds.add(jvmId);
        this.inFlightFetches.delete(jvmId);
      },
    });
  }

  /**
   * Fetch aliases for multiple jvmIds.
   * Only fetches aliases that aren't already cached or in-flight.
   */
  fetchAliases(jvmIds: string[]): void {
    jvmIds.forEach((jvmId) => this.fetchAlias(jvmId));
  }

  /**
   * Clear the entire alias cache.
   * Useful for testing or when you want to force a refresh.
   */
  clearCache(): void {
    this.aliasCache.clear();
    this.fetchedIds.clear();
    this.inFlightFetches.clear();
    this._aliasMap.next(new Map());
  }
}