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

import { from, Observable } from 'rxjs';

export interface RecordingLabel {
  key: string;
  value: string;
}

export const parseLabels = (jsonLabels: object) => {
  if (!jsonLabels) return [];

  return Object.entries(jsonLabels).map(([k, v]) => {
    return { key: k, value: v } as RecordingLabel;
  });
};

export const parseLabelsFromFile = (file: File): Observable<RecordingLabel[]> => {
  return from(
    file
      .text()
      .then(JSON.parse)
      .then((obj) => {
        const labels: RecordingLabel[] = [];
        const labelObj = obj['labels'];
        if (labelObj) {
          Object.keys(labelObj).forEach((key) => {
            labels.push({
              key: key,
              value: labelObj[key],
            });
          });
          return labels;
        }
        throw new Error('No labels found in file');
      }),
  );
};

export const includesLabel = (arr: RecordingLabel[], searchLabel: RecordingLabel) => {
  return arr.some((l) => isEqualLabel(searchLabel, l));
};

const isEqualLabel = (a: RecordingLabel, b: RecordingLabel) => {
  return a.key === b.key && a.value === b.value;
};
