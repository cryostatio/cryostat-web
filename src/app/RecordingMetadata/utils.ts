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

import { KeyValue } from '@app/Shared/Services/api.types';
import { ValidatedOptions } from '@patternfly/react-core';
import { Observable, from } from 'rxjs';

export const isEqualLabel = (a: KeyValue, b: KeyValue) => {
  return a.key === b.key && a.value === b.value;
};

export const includesLabel = (arr: KeyValue[], searchLabel: KeyValue) => {
  return arr.some((l) => isEqualLabel(searchLabel, l));
};

export const parseLabelsFromFile = (file: File): Observable<KeyValue[]> => {
  return from(
    file
      .text()
      .then(JSON.parse)
      .then((obj) => {
        const labels: KeyValue[] = [];
        const labelObj = obj['labels'];
        if (labelObj && Array.isArray(labelObj)) {
          Object.values(labelObj).forEach((keyValue) => {
            labels.push({
              key: keyValue.key,
              value: keyValue.value,
            });
          });
          return labels;
        }
        throw new Error('No Labels found in file');
      }),
  );
};
<<<<<<< HEAD

export const getLabelDisplay = (label: KeyValue) => `${label.key}:${label.value}`;

=======
>>>>>>> 73a7e9e (fix(labels): fix broken label file parsing in archive upload modal (#1323))
export const LabelPattern = /^\S+$/;

export const getValidatedOption = (isValid: boolean) => {
  return isValid ? ValidatedOptions.success : ValidatedOptions.error;
};

export const matchesLabelSyntax = (l: KeyValue) => {
  return l && LabelPattern.test(l.key) && LabelPattern.test(l.value);
};
