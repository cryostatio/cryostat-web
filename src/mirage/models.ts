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
import { Model } from 'miragejs';
import { ModelDefinition } from 'miragejs/-types';
import { Resource } from './typings';

const TargetModel: ModelDefinition<any> = Model.extend({});
const RecordingModel: ModelDefinition<any> = Model.extend({});
const ArchiveModel: ModelDefinition<any> = Model.extend({});
const RuleModel: ModelDefinition<any> = Model.extend({});

export const models = {
  [Resource.TARGET]: TargetModel,
  [Resource.RECORDING]: RecordingModel,
  [Resource.ARCHIVE]: ArchiveModel,
  [Resource.RULE]: RuleModel,
};

export default models;
