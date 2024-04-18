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

import build from '@app/build.json';
import { createServer, Response } from 'miragejs';
import { Server as WSServer, Client } from 'mock-socket';
import factories from './factories';
import models from './models';
import { Resource } from './typings';
import { sizeUnits } from 'src/app/utils/utils';

export const startMirage = ({ environment = 'development' } = {}) => {
  const wsUrl = `ws://localhost:9091/api/notifications`;
  const wsServer = new WSServer(wsUrl);

  // Create a mock server socket to send notifications
  let websocket: Client;
  wsServer.on('connection', (socket) => {
    websocket = socket;
    socket.on('message', (_) => {
      socket.send(
        JSON.stringify({
          meta: {
            category: 'WsClientActivity',
            type: {
              type: 'application',
              subtype: 'json',
            },
          },
          message: {
            '127.0.0.1': 'accepted',
          },
        }),
      );
    });
  });

  // Create a MirageJS Server to intercept network requests
  return createServer({
    environment,
    models,
    factories,

    seeds(server) {
      server.create(Resource.TARGET);
    },

    routes() {
      this.timing = 0;
      this.urlPrefix = process.env.CRYOSTAT_AUTHORITY || '';
      this.namespace = '/';
      this.logging = environment === 'development';

      this.get('health', () => ({
        cryostatVersion: `${build.version.replace(/(-\w+)*$/g, '')}-0-preview`,
        dashboardAvailable: false,
        dashboardConfigured: false,
        datasourceAvailable: false,
        datasourceConfigured: false,
        reportsAvailable: true,
        reportsConfigured: false,
      }));
      this.get('api/v1/grafana_datasource_url', () => new Response(500));
      this.get('api/v1/grafana_dashboard_url', () => new Response(500));
      this.post('api/v2.1/auth', () => {
        return new Response(
          200,
          { 'X-WWW-Authenticate': 'None' },
          {
            meta: {
              status: 'OK',
            },
            data: {
              result: {
                username: environment,
              },
            },
          },
        );
      });
      this.post(
        'api/v2.1/auth/token',
        () => new Response(400, {}, 'Resource downloads are not supported in this demo'),
      );
      this.post('api/v2/targets', (schema, request) => {
        const attrs = request.requestBody as any;
        const target = schema.create(Resource.TARGET, {
          jvmId: `${Date.now().toString(16)}`,
          alias: attrs.get('alias'),
          connectUrl: attrs.get('connectUrl'),
          annotations: {
            platform: [],
            cryostat: [
              {
                key: 'REALM',
                value: 'Custom Targets',
              },
            ],
          },
        });
        websocket.send(
          JSON.stringify({
            meta: {
              category: 'TargetJvmDiscovery',
              type: { type: 'application', subType: 'json' },
            },
            message: { event: { serviceRef: target, kind: 'FOUND' } },
          }),
        );
        return {
          data: {
            result: target,
          },
        };
      });
      this.get('api/v1/targets', (schema) => schema.all(Resource.TARGET).models);
      this.get('api/v3/discovery', (schema) => {
        const models = schema.all(Resource.TARGET).models;
        const realmTypes = models.map((t) => t.annotations.cryostat['REALM']);
        return {
          name: 'Universe',
          nodeType: 'Universe',
          labels: [],
          children: realmTypes.map((r: string) => ({
            name: r,
            nodeType: 'Realm',
            labels: [],
            id: r,
            children: models
              .filter((t) => t.annotations.cryostat['REALM'] === r)
              .map((t) => ({
                id: t.alias,
                name: t.alias,
                nodeType: r === 'Custom Targets' ? 'CustomTarget' : 'JVM',
                target: t,
              })),
          })),
        };
      });
      this.get('api/v1/recordings', (schema) => schema.all(Resource.ARCHIVE).models);
      this.get('api/beta/fs/recordings', (schema) => {
        const target = schema.first(Resource.TARGET);
        const archives = schema.all(Resource.ARCHIVE).models;
        return target
          ? [
              {
                connectUrl: target.attrs.connectUrl,
                jvmId: target.attrs.jvmId,
                recordings: archives,
              },
            ]
          : [];
      });
      this.delete('api/beta/recordings/:targetId/:recordingName', (schema, request) => {
        const recordingName = request.params.recordingName;
        const recording = schema.findBy(Resource.ARCHIVE, { name: recordingName });

        if (!recording) {
          return new Response(404);
        }
        recording.destroy();

        const msg = {
          meta: {
            category: 'ArchivedRecordingDeleted',
            type: { type: 'application', subType: 'json' },
          },
          message: {
            recording: {
              ...recording.attrs,
            },
            target: request.params['targetId'],
          },
        };
        websocket.send(JSON.stringify(msg));
        return new Response(200);
      });
      this.post('api/v1/targets/:targetId/recordings', (schema, request) => {
        // Note: MirageJS will fake serialize FormData (i.e. FormData object is returned when accessing request.requestBody)
        const attrs = request.requestBody as any;

        const recording = schema.create(Resource.RECORDING, {
          // id will generated by Mirage (i.e. increment intergers)
          downloadUrl: '',
          reportUrl: `beta/reports/${encodeURIComponent(request.params.targetId)}/${encodeURIComponent(
            attrs.get('recordingName'),
          )}`,
          name: attrs.get('recordingName'),
          state: 'RUNNING',
          startTime: +Date.now(),
          duration: attrs.get('duration') * 1000 || 0,
          continuous: attrs.get('duration') == 0,
          toDisk: attrs.get('toDisk') || false,
          maxSize: attrs.get('maxSize') || 0,
          maxAge: attrs.get('maxAge') || 0,
          metadata: {
            labels: [
              ...(attrs.labels || []),
              {
                key: 'template.type',
                value: 'TARGET',
              },
              {
                key: 'template.name',
                value: 'Demo_Template',
              },
            ],
          },
        });
        websocket.send(
          JSON.stringify({
            meta: {
              category: 'ActiveRecordingCreated',
              type: { type: 'application', subType: 'json' },
            },
            message: {
              target: request.params.targetId,
              recording,
            },
          }),
        );
        return recording;
      });
      this.get('api/v1/targets/:targetId/recordings', (schema) => schema.all(Resource.RECORDING).models);
      this.delete('api/v1/targets/:targetId/recordings/:recordingName', (schema, request) => {
        const recordingName = request.params.recordingName;
        const recording = schema.findBy(Resource.RECORDING, { name: recordingName });

        if (!recording) {
          return new Response(404);
        }
        recording.destroy();

        const msg = {
          meta: {
            category: 'ActiveRecordingDeleted',
            type: { type: 'application', subType: 'json' },
          },
          message: {
            recording: {
              ...recording.attrs,
            },
            target: request.params.targetId,
          },
        };
        websocket.send(JSON.stringify(msg));
        return new Response(200);
      });
      this.patch('api/v1/targets/:targetId/recordings/:recordingName', (schema, request) => {
        const body = request.requestBody;
        const recordingName = request.params.recordingName;
        const target = schema.findBy(Resource.TARGET, { connectUrl: request.params.targetId });
        const recording = schema.findBy(Resource.RECORDING, { name: recordingName });

        if (!recording || !target) {
          return new Response(404);
        }
        let msg = {};
        switch (body) {
          case 'STOP': {
            recording.update({ state: 'STOPPED' });
            msg = {
              meta: {
                category: 'ActiveRecordingStopped',
                type: { type: 'application', subType: 'json' },
              },
              message: {
                recording: {
                  ...recording.attrs,
                },
                target: request.params.targetId,
              },
            };
            websocket.send(JSON.stringify(msg));
            break;
          }
          case 'SAVE': {
            const ts = +Date.now();
            const archived = schema.create(Resource.ARCHIVE, {
              name: `${target.alias}-${recording.name}-${ts}`,
              downloadUrl: recording.downloadUrl,
              reportUrl: recording.reportUrl,
              metadata: recording.metadata,
              size: Math.ceil(Math.random() * 1000000),
              archivedTime: ts,
            });
            msg = {
              meta: {
                category: 'ActiveRecordingSaved',
                type: { type: 'application', subType: 'json' },
              },
              message: {
                recording: archived,
                target: request.params.targetId,
              },
            };
            websocket.send(JSON.stringify(msg));
            break;
          }
        }
        return new Response(200);
      });
      this.get('api/beta/reports/:targetId/:recordingName', () => {
        return new Response(
          200,
          {},
          {
            Demo: {
              score: 100,
              name: 'Fake Demo Result',
              topic: 'demo',
              description: 'Remember, all of this data is static, fake, and entirely within your browser.',
            },
            VMOperations: {
              score: 0.5943414499999999,
              name: 'VMOperation Peak Duration',
              topic: 'vm_operations',
              description:
                'Summary:\nNo excessively long VM operations were found in this recording (the longest was 23.774 ms).',
            },
            PasswordsInSystemProperties: {
              score: 75.0,
              name: 'Passwords in System Properties',
              topic: 'system_properties',
              description:
                'Summary:\nThe system properties in the recording may contain passwords.\n\nExplanation:\nThe following suspicious system properties were found in this recording: javax.net.ssl.keyStorePassword,javax.net.ssl.trustStorePassword,com.sun.management.jmxremote.password.file. The following regular expression was used to exclude strings from this rule: \u0027\u0027(passworld|passwise)\u0027\u0027.\n\nSolution:\nIf you wish to keep having passwords in your system properties, but want to be able to share recordings without also sharing the passwords, please disable the \u0027\u0027Initial System Property\u0027\u0027 event.',
            },
            Options: {
              score: 0.0,
              name: 'Command Line Options Check',
              topic: 'jvm_information',
              description: 'Summary:\nNo undocumented, deprecated or non-recommended option flags were detected.',
            },
            PasswordsInEnvironment: {
              score: 75.0,
              name: 'Passwords in Environment Variables',
              topic: 'environment_variables',
              description:
                'Summary:\nThe environment variables in the recording may contain passwords.\n\nExplanation:\nThe following suspicious environment variables were found in this recording: CRYOSTAT_JDBC_PASSWORD, CRYOSTAT_JMX_CREDENTIALS_DB_PASSWORD. The following regular expression was used to exclude strings from this rule: \u0027\u0027(passworld|passwise)\u0027\u0027.\n\nSolution:\nIf you wish to keep having passwords in your environment variables, but want to be able to share recordings without also sharing the passwords, please disable the \u0027\u0027Initial Environment Variable\u0027\u0027 event.',
            },
            MethodProfiling: {
              score: 0.6705776661956153,
              name: 'Method Profiling',
              topic: 'method_profiling',
              description: 'Summary:\nNo methods where optimization would be particularly efficient could be detected.',
            },
            ManyRunningProcesses: {
              score: 0.20309488837692125,
              name: 'Competing Processes',
              topic: 'processes',
              description:
                'Summary:\n1 processes were running while this Flight Recording was made.\n\nExplanation:\nAt 5/5/23, 5:17:27.180 PM, a total of 1 other processes were running on the host machine that this Flight Recording was made on.\n\nSolution:\nIf this is a server environment, it may be good to only run other critical processes on that machine.',
            },
            StackdepthSetting: {
              score: 25.0,
              name: 'Stackdepth Setting',
              topic: 'jvm_information',
              description:
                'Summary:\nSome stack traces were truncated in this recording.\n\nExplanation:\nThe Flight Recorder is configured with a maximum captured stack depth of 64. 3.11 % of all traces were larger than this option, and were therefore truncated. If more detailed traces are required, increase the \u0027\u0027-XX:FlightRecorderOptions\u003dstackdepth\u003d\u003cvalue\u003e\u0027\u0027 value.\nEvents of the following types have truncated stack traces: org.openjdk.jmc.flightrecorder.rules.jdk.general.StackDepthSettingRule$StackDepthTruncationData@21e159e2,org.openjdk.jmc.flightrecorder.rules.jdk.general.StackDepthSettingRule$StackDepthTruncationData@174930bc,org.openjdk.jmc.flightrecorder.rules.jdk.general.StackDepthSettingRule$StackDepthTruncationData@4f5d6223',
            },
            PasswordsInArguments: {
              score: 0.0,
              name: 'Passwords in Java Arguments',
              topic: 'jvm_information',
              description: 'Summary:\nThe recording does not seem to contain passwords in the application arguments.',
            },
          },
        );
      });
      this.get('api/v1/targets/:targetId/recordingOptions', () => []);
      this.get('api/v1/targets/:targetId/events', () => [
        {
          category: ['GC', 'Java Virtual Machine'],
          name: 'GC Heap Configuration',
          typeId: 'jdk.GCHeapConfiguration',
          description: 'The configuration of the garbage collected heap',
        },
      ]);
      this.get('api/v1/targets/:targetId/templates', () => [
        {
          name: 'Demo Template',
          provider: 'Demo',
          type: 'TARGET',
          description: 'This is not a real event template, but it is here!',
        },
      ]);
      this.get('api/v2/probes', () => []);
      this.post('api/beta/matchExpressions', (_, request) => {
        const attr = JSON.parse(request.requestBody);
        if (!attr.matchExpression || !attr.targets) {
          return new Response(400);
        }
        return {
          data: {
            result: {
              targets: attr.targets,
            },
          },
        };
      });
      this.post('api/v2/rules', (schema, request) => {
        const attrs = JSON.parse(request.requestBody);
        const rule = schema.create(Resource.RULE, attrs);
        const msg = {
          meta: {
            category: 'RuleCreated',
            type: { type: 'application', subType: 'json' },
          },
          message: rule,
        };
        websocket.send(JSON.stringify(msg));
        return {
          data: {
            result: rule,
          },
        };
      });
      this.get('api/v2/rules', (schema) => ({
        data: { result: schema.all(Resource.RULE).models },
      }));
      this.patch('api/v2/rules/:ruleName', (schema, request) => {
        const ruleName = request.params.ruleName;
        const patch = JSON.parse(request.requestBody);
        const rule = schema.findBy(Resource.RULE, { name: ruleName });

        if (!rule) {
          return new Response(404);
        }
        rule.update(patch);
        const msg = {
          meta: {
            category: 'RuleUpdated',
            type: { type: 'application', subType: 'json' },
          },
          message: rule,
        };
        websocket.send(JSON.stringify(msg));
        return new Response(200);
      });
      this.delete('api/v2/rules/:ruleName', (schema, request) => {
        const ruleName = request.params.ruleName;
        const rule = schema.findBy(Resource.RULE, { name: ruleName });

        if (!rule) {
          return new Response(404);
        }
        rule.destroy();

        const msg = {
          meta: {
            category: 'RuleDeleted',
            type: { type: 'application', subType: 'json' },
          },
          message: rule,
        };
        websocket.send(JSON.stringify(msg));
        return new Response(200);
      });
      this.get('api/v2.2/credentials', () => ({ data: { result: [] } }));
      this.post('api/v2.2/graphql', (schema, request) => {
        const body = JSON.parse(request.requestBody);
        const query = body.query.trim();
        const variables = body.variables;
        const begin = query.substring(0, query.indexOf('{'));
        let name = 'unknown';
        for (const n of begin.split(' ')) {
          if (n == '{') {
            break;
          }
          if (!n || n == 'query') {
            continue;
          }
          name = n.substring(0, n.indexOf('('));
          break;
        }
        if (name === 'unknown' || !name) {
          return new Response(
            400,
            {},
            `${JSON.stringify(request.url)} (query: '${name}') currently unsupported in demo`,
          );
        }
        let data = {};
        switch (name) {
          case 'ArchivedRecordingsForTarget':
          case 'UploadedRecordings':
            data = {
              targetNodes: [
                {
                  target: {
                    archivedRecordings: {
                      data: schema.all(Resource.ARCHIVE).models,
                    },
                  },
                },
              ],
            };
            break;
          case 'ActiveRecordingsForTarget':
            data = {
              targetNodes: [
                {
                  target: {
                    archivedRecordings: {
                      data: schema.all(Resource.ARCHIVE).models,
                    },
                  },
                },
              ],
            };
            break;
          case 'ArchivedRecordingsForAutomatedAnalysis':
            data = {
              targetNodes: [
                {
                  target: {
                    archivedRecordings: {
                      data: schema.all(Resource.ARCHIVE).models,
                    },
                  },
                },
              ],
            };
            break;
          case 'ActiveRecordingsForAutomatedAnalysis':
            data = {
              targetNodes: [
                {
                  target: {
                    activeRecordings: {
                      data: schema.all(Resource.RECORDING).models,
                    },
                  },
                },
              ],
            };
            break;
          case 'PostRecordingMetadata': {
            const labelsArray = JSON.parse(variables.labels).map((l) => ({ key: l.key, value: l.value }));

            schema.findBy(Resource.ARCHIVE, { name: variables.recordingName })?.update({
              metadata: {
                labels: labelsArray,
              },
            });
            data = {
              targetNodes: [
                {
                  target: {
                    archivedRecordings: {
                      data: [
                        {
                          doPutMetadata: {
                            metadata: {
                              labels: labelsArray,
                            },
                          },
                          size: 1024 * 1024 * 50,
                          archivedTime: +Date.now(),
                        },
                      ],
                    },
                  },
                },
              ],
            };
            websocket.send(
              JSON.stringify({
                meta: {
                  category: 'RecordingMetadataUpdated',
                  type: { type: 'application', subType: 'json' },
                },
                message: {
                  recordingName: variables.recordingName,
                  target: variables.connectUrl,
                  metadata: {
                    labels: labelsArray,
                  },
                },
              }),
            );
            break;
          }
          case 'PostActiveRecordingMetadata': {
            const labelsArray = JSON.parse(variables.labels).map((l) => ({ key: l.key, value: l.value }));

            schema.findBy(Resource.RECORDING, { name: variables.recordingName })?.update({
              metadata: {
                labels: labelsArray,
              },
            });
            data = {
              targetNodes: [
                {
                  target: {
                    activeRecordings: {
                      data: [
                        {
                          doPutMetadata: {
                            metadata: {
                              labels: labelsArray,
                            },
                          },
                        },
                      ],
                    },
                  },
                },
              ],
            };
            websocket.send(
              JSON.stringify({
                meta: {
                  category: 'RecordingMetadataUpdated',
                  type: { type: 'application', subType: 'json' },
                },
                message: {
                  recordingName: variables.recordingName,
                  target: variables.connectUrl,
                  metadata: {
                    labels: labelsArray,
                  },
                },
              }),
            );
            break;
          }
          case 'MBeanMXMetricsForTarget':
            data = {
              targetNodes: [
                {
                  target: {
                    mbeanMetrics: {
                      thread: {
                        threadCount: Math.ceil(Math.random() * 5),
                        daemonThreadCount: Math.ceil(Math.random() * 5),
                      },
                      os: {
                        arch: 'x86_64',
                        availableProcessors: Math.ceil(Math.random() * 8),
                        version: '10.0.1',
                        systemCpuLoad: Math.random(),
                        systemLoadAverage: Math.random(),
                        processCpuLoad: Math.random(),
                        totalPhysicalMemorySize: Math.ceil(Math.random() * 64),
                        freePhysicalMemorySize: Math.ceil(Math.random() * 64),
                      },
                      memory: {
                        heapMemoryUsage: {
                          init: Math.ceil(Math.random() * 64),
                          used: Math.ceil(Math.random() * 64),
                          committed: Math.ceil(Math.random() * 64),
                          max: Math.ceil(Math.random() * 64),
                        },
                        nonHeapMemoryUsage: {
                          init: Math.ceil(Math.random() * 64),
                          used: Math.ceil(Math.random() * 64),
                          committed: Math.ceil(Math.random() * 64),
                          max: Math.ceil(Math.random() * 64),
                        },
                        heapMemoryUsagePercent: Math.random(),
                      },
                      runtime: {
                        bootClassPath: '/path/to/boot/classpath',
                        classPath: '/path/to/classpath',
                        inputArguments: ['-Xmx1g', '-Djava.security.policy=...'],
                        libraryPath: '/path/to/library/path',
                        managementSpecVersion: '1.0',
                        name: 'Java Virtual Machine',
                        specName: 'Java Virtual Machine Specification',
                        specVendor: 'Oracle Corporation',
                        startTime: Date.now(),
                        // systemProperties: {...}
                        uptime: Date.now(),
                        vmName: 'Java HotSpot(TM) 64-Bit Server VM',
                        vmVendor: 'Oracle Corporation',
                        vmVersion: '25.131-b11',
                        bootClassPathSupported: true,
                      },
                    },
                  },
                },
              ],
            };
            break;
        }
        return { data };
      });
    },
  });
};

startMirage({ environment: process.env.NODE_ENV });
