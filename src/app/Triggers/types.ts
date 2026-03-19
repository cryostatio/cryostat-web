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
import { EventTemplate, KeyValue } from '@app/Shared/Services/api.types';
import { ValidatedOptions } from '@patternfly/react-core';

export type EventTemplateIdentifier = Pick<EventTemplate, 'name' | 'type'>;

interface _FormBaseData {
  name: string;
  enabled: boolean;
  expression: string;
  template?: EventTemplateIdentifier;
}

interface _FormValidationData {
  nameValid: ValidatedOptions;
  expressionValid: ValidatedOptions;
}

export type SmartTriggersFormData = _FormBaseData & _FormValidationData;
