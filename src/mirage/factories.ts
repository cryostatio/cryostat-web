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
import { Factory } from 'miragejs';
import { FactoryDefinition } from 'miragejs/-types';
import { Resource } from './typings';

export const targetFactory: FactoryDefinition<any> = Factory.extend({
  alias: 'Fake Target',
  connectUrl: 'http://fake-target.local:1234',
  jvmId: '1234',
  annotations: {
    platform: [
      {
        key: 'io.cryostat.demo',
        value: 'this-is-not-real',
      },
    ],
    cryostat: [
      {
        key: 'hello',
        value: 'world',
      },
      {
        key: 'REALM',
        value: 'Some Realm',
      },
    ],
  },
});

export const factories = {
  [Resource.TARGET]: targetFactory,
};

export default factories;
