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

import { RecordingDirectory } from '@app/Shared/Services/Api.service';
import { Target } from '@app/Shared/Services/Target.service';

export const includesDirectory = (arr: RecordingDirectory[], dir: RecordingDirectory): boolean => {
  return arr.some((t) => t.connectUrl === dir.connectUrl);
};

export const indexOfDirectory = (arr: RecordingDirectory[], dir: RecordingDirectory): number => {
  let index = -1;
  arr.forEach((d, idx) => {
    if (d.connectUrl === dir.connectUrl) {
      index = idx;
    }
  });
  return index;
};

export const getTargetFromDirectory = (dir: RecordingDirectory): Target => {
  return {
    connectUrl: dir.connectUrl,
    alias: dir.jvmId,
  };
};
