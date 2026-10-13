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

import { factory, primaryKey } from '@mswjs/data';

export const db = factory({
  target: {
    jvmId: primaryKey(String),
    id: String,
    agent: Boolean,
    alias: String,
    connectUrl: String,
    labels: Object,
    annotations: Object,
  },
  recording: {
    remoteId: primaryKey(Number),
    id: Number,
    name: String,
    state: String,
    duration: Number,
    startTime: Number,
    continuous: Boolean,
    toDisk: Boolean,
    maxSize: Number,
    maxAge: Number,
    archiveOnStop: Boolean,
    downloadUrl: String,
    reportUrl: String,
    metadata: Object,
    jvmId: String,
  },
  archive: {
    name: primaryKey(String),
    jvmId: String,
    downloadUrl: String,
    reportUrl: String,
    metadata: Object,
    size: Number,
    archivedTime: Number,
  },
  rule: {
    id: primaryKey(String),
    name: String,
    description: String,
    matchExpression: String,
    eventSpecifier: String,
    archivalPeriodSeconds: Number,
    initialDelaySeconds: Number,
    preservedArchives: Number,
    maxAgeSeconds: Number,
    maxSizeBytes: Number,
    enabled: Boolean,
    metadata: Object,
  },
  credential: {
    id: primaryKey(String),
    matchExpression: String,
  },
});

export function seedDatabase() {
  db.target.create({
    id: '1',
    agent: true,
    alias: 'Fake Target',
    connectUrl: 'http://fake-target.local:1234',
    jvmId: '1234',
    labels: [],
    annotations: {
      platform: [{ key: 'io.cryostat.demo', value: 'this-is-not-real' }],
      cryostat: [
        { key: 'hello', value: 'world' },
        { key: 'REALM', value: 'Some Realm' },
      ],
    },
  });
}
