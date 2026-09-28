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

import { factory, primaryKey, manyOf, oneOf } from '@mswjs/data';

export const db = factory({
  target: {
    jvmId: primaryKey(String),
    id: Number,
    agent: Boolean,
    alias: String,
    connectUrl: String,
    labels: Array,
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
    id: primaryKey(Number),
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
  },
  credential: {
    id: primaryKey(Number),
    matchExpression: String,
    numTargets: Number,
  },
  smartTrigger: {
    id: primaryKey(Number),
    name: String,
    target: String,
    action: String,
    predicate: String,
    condition: String,
    enabled: Boolean,
  },
  template: {
    name: primaryKey(String),
    type: String,
    description: String,
    provider: String,
    xml: String,
  },
  probeTemplate: {
    name: primaryKey(String),
    xml: String,
  },
  recordingOption: {
    targetId: primaryKey(String),
    toDisk: Boolean,
    maxAge: Number,
    maxSize: Number,
  },
});

export function seedDatabase() {
  db.target.create({
    id: 1,
    agent: true,
    alias: 'Fake Target',
    connectUrl: 'http://fake-target.local:1234',
    jvmId: '1234',
    labels: [],
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

  db.template.create({
    name: 'Continuous',
    type: 'TARGET',
    description: 'A standard continuous recording profile',
    provider: 'OpenJDK',
    xml: '<?xml version="1.0" encoding="UTF-8"?><configuration version="2.0" label="Continuous" description="Continuous template" provider="OpenJDK"><event name="jdk.CPULoad"><setting name="enabled">true</setting><setting name="period">1000 ms</setting></event></configuration>',
  });

  db.template.create({
    name: 'Profiling',
    type: 'TARGET',
    description: 'Low overhead configuration for profiling',
    provider: 'OpenJDK',
    xml: '<?xml version="1.0" encoding="UTF-8"?><configuration version="2.0" label="Profiling" description="Profiling template" provider="OpenJDK"><event name="jdk.ExecutionSample"><setting name="enabled">true</setting><setting name="period">10 ms</setting></event></configuration>',
  });

  db.template.create({
    name: 'CustomTemplate',
    type: 'CUSTOM',
    description: 'Custom user template',
    provider: 'User',
    xml: '<?xml version="1.0" encoding="UTF-8"?><configuration version="2.0" label="Custom" description="Custom template" provider="User"></configuration>',
  });

  db.probeTemplate.create({
    name: 'DefaultProbe',
    xml: '<jfragent><probe name="test"><event name="testEvent"><class>java.lang.Object</class></event></probe></jfragent>',
  });

  db.recordingOption.create({
    targetId: '1234',
    toDisk: true,
    maxAge: 0,
    maxSize: 0,
  });
}
