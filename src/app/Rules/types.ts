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

import { EventTemplateIdentifier } from '@app/CreateRecording/types';
import { Rule } from '@app/Shared/Services/api.types';
import { ValidatedOptions } from '@patternfly/react-core';

export interface RuleToDeleteOrDisable {
  rule: Rule;
  type: 'DELETE' | 'DISABLE';
}

interface _FormBaseData {
  name: string;
  enabled: boolean;
  matchExpression: string;
  description: string;
  template?: EventTemplateIdentifier;
  maxAge: number;
  maxAgeUnit: number;
  maxSize: number;
  maxSizeUnit: number;
  archivalPeriod: number;
  archivalPeriodUnit: number;
  initialDelay: number;
  initialDelayUnit: number;
  preservedArchives: number;
}

interface _FormValidationData {
  nameValid: ValidatedOptions;
  matchExpressionValid: ValidatedOptions;
}

export type RuleFormData = _FormBaseData & _FormValidationData;

export const ruleObjKeys = [
  'name',
  'description',
  'matchExpression',
  'enabled',
  'eventSpecifier',
  'archivalPeriodSeconds',
  'initialDelaySeconds',
  'preservedArchives',
  'maxAgeSeconds',
  'maxSizeBytes',
];
