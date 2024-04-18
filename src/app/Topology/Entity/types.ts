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
import type {
  EventProbe,
  EventTemplate,
  EventType,
  KeyValue,
  NotificationMessage,
  Recording,
  Rule,
  StoredCredential,
} from '@app/Shared/Services/api.types';
import { Observable } from 'rxjs';

export type DescriptionConfig = {
  key: React.Key;
  title: React.ReactNode;
  helperTitle: React.ReactNode;
  helperDescription: React.ReactNode;
  content: React.ReactNode;
};
export type PatchFn = (
  arr: ResourceTypes[],
  eventData: NotificationMessage,
  removed?: boolean,
) => Observable<ResourceTypes[]>;

export type ResourceTypes = Recording | EventTemplate | EventType | EventProbe | Rule | StoredCredential;

// Note: Values will be word split to used as display names
export const TargetOwnedResourceTypeAsArray = [
  'activeRecordings',
  'archivedRecordings',
  'eventTemplates',
  'eventTypes',
  'agentProbes',
] as const;

export type Annotations = {
  cryostat: KeyValue[];
  platform: KeyValue[];
};

export const TargetRelatedResourceTypeAsArray = ['automatedRules', 'credentials'] as const;

export type TargetOwnedResourceType = (typeof TargetOwnedResourceTypeAsArray)[number];

export type TargetRelatedResourceType = (typeof TargetRelatedResourceTypeAsArray)[number];
