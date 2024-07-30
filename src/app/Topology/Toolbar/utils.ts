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
import { NodeType, isKeyValue, keyValueToString } from '@app/Shared/Services/api.types';

export const isLabelOrAnnotation = (category: string) => /(label|annotation)/i.test(category);

export const isAnnotation = (category: string) => /annotation/i.test(category);

export const fieldValueToStrings = (value: unknown): string[] => {
  if (value === undefined || value === null) {
    return [];
  }
  if (typeof value === 'object') {
    if (Array.isArray(value)) {
      if (value.length > 0 && typeof value[0] === 'object') {
        if (isKeyValue(value[0])) {
          return value.map(keyValueToString);
        } else {
          return value.map((o) => {
            let str = '';
            for (const p in Object.getOwnPropertyNames(o)) {
              str += `${p}=${o[p]}`;
            }
            return str;
          });
        }
      }
      return value.map((v) => `${v}`);
    } else {
      return Object.entries(value as object).map(([k, v]) => `${k}=${v}`);
    }
  } else {
    return [`${value}`];
  }
};

export interface TopologyFilterGroupOption {
  groupLabel?: NodeType;
  category: string;
  options: TopologyFilterSelectOption[];
}

export interface TopologyFilterSelectOption {
  value: string;
  render?: () => React.ReactNode;
}
