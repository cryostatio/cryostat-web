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
import { EventTemplate } from './api.types';

// ======================================
// Credential
// ======================================
export interface Credential {
  username: string;
  password: string;
}

// ======================================
// Setting
// ======================================
export enum FeatureLevel {
  DEVELOPMENT = 0,
  BETA = 1,
  PRODUCTION = 2,
}

export interface AutomatedAnalysisRecordingConfig {
  template: Pick<EventTemplate, 'name' | 'type'>;
  maxSize: number;
  maxAge: number;
}

export const defaultAutomatedAnalysisRecordingConfig: AutomatedAnalysisRecordingConfig = {
  template: {
    name: 'Continuous',
    type: 'TARGET',
  },
  maxSize: 1048576,
  maxAge: 0,
};

export interface ChartControllerConfig {
  minRefresh: number;
}

// ======================================
// Login
// ======================================
export enum SessionState {
  NO_USER_SESSION,
  CREATING_USER_SESSION,
  USER_SESSION,
}

export enum AuthMethod {
  BASIC = 'Basic',
  BEARER = 'Bearer',
  NONE = 'None',
  UNKNOWN = '',
}
