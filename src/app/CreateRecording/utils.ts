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
import { TemplateType } from '@app/Shared/Services/api.types';
import { EventTemplateIdentifier } from './types';

export const RecordingNamePattern = /^[\w_]+$/;

export const DurationPattern = /^[1-9][0-9]*$/;

export const isRecordingNameValid = (name: string) => RecordingNamePattern.test(name);

export const isDurationValid = (duration: number) => DurationPattern.test(`${duration}`);

export const templateFromEventSpecifier = (eventSpecifier: string): EventTemplateIdentifier | undefined => {
  const regex = /^template=([a-zA-Z0-9]+)(?:,type=([a-zA-Z0-9]+))?$/im;
  if (eventSpecifier && regex.test(eventSpecifier)) {
    const parts = regex.exec(eventSpecifier);
    if (parts) {
      return {
        name: parts[1],
        type: parts[2] as TemplateType,
      };
    }
  }
  return undefined;
};
