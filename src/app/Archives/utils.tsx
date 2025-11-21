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

import { HeapDumpDirectory, RecordingDirectory, Target, ThreadDumpDirectory } from '@app/Shared/Services/api.types';

export function includesDirectory<T extends RecordingDirectory | ThreadDumpDirectory | HeapDumpDirectory>(
  arr: T[],
  dir: T,
): boolean {
  return arr.some((t) => (t['connectUrl'] && t['connectUrl'] === dir['connectUrl']) || t.jvmId === dir.jvmId);
}

export function indexOfDirectory<T extends RecordingDirectory | ThreadDumpDirectory | HeapDumpDirectory>(
  arr: T[],
  dir: T,
): number {
  let index = -1;
  arr.forEach((d, idx) => {
    if (d['connectUrl'] && d['connectUrl'] === dir['connectUrl']) {
      index = idx;
    } else if (d.jvmId === dir.jvmId) {
      index = idx;
    }
  });
  return index;
}

export const getTargetFromDirectory = (dir: RecordingDirectory | ThreadDumpDirectory | HeapDumpDirectory): Target => {
  return {
    agent: dir['connectUrl']?.startsWith('http') || false,
    connectUrl: dir['connectUrl'] ?? '',
    alias: dir.jvmId,
    labels: [],
    annotations: {
      cryostat: [],
      platform: [],
    },
  };
};
