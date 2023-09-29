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
import { ruleObjKeys } from './types';

export const isRule = (obj: object): boolean => {
  for (const key of ruleObjKeys) {
    if (!Object.prototype.hasOwnProperty.call(obj, key)) {
      return false;
    }
  } // Ignore unknown fields
  return true;
};

// FIXME check if this is correct/matches backend name validation
export const RuleNamePattern = /^[\w_]+$/;

export const isRuleNameValid = (name: string) => RuleNamePattern.test(name);
