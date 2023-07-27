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
import { QuickStart } from '@patternfly/quickstarts';
import AutomatedRulesQuickStart from './quickstarts/automated-rules-quickstart';
import DashboardQuickStart from './quickstarts/dashboard-quickstart';
import GenericQuickStart from './quickstarts/generic-quickstart';
import SettingsQuickStart from './quickstarts/settings-quickstart';
import RecordingQuickStart from './quickstarts/start-a-recording';
import CustomTargetQuickstart from './quickstarts/topology/custom-target-quickstart';
import GroupStartRecordingQuickStart from './quickstarts/topology/group-start-recordings';

// Add your quick start here e.g. [GenericQuickStart, ...]
export const allQuickStarts: QuickStart[] = [
  AutomatedRulesQuickStart,
  DashboardQuickStart,
  GenericQuickStart,
  RecordingQuickStart,
  SettingsQuickStart,
  GroupStartRecordingQuickStart,
  CustomTargetQuickstart,
];
