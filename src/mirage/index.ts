/*
 * Copyright The Cryostat Authors
 *
 * The Universal Permissive License (UPL), Version 1.0
 *
 * Subject to the condition set forth below, permission is hereby granted to any
 * person obtaining a copy of this software, associated documentation and/or data
 * (collectively the "Software"), free of charge and under any and all copyright
 * rights in the Software, and any and all patent rights owned or freely
 * licensable by each licensor hereunder covering either (i) the unmodified
 * Software as contributed to or provided by such licensor, or (ii) the Larger
 * Works (as defined below), to deal in both
 *
 * (a) the Software, and
 * (b) any piece of software and/or hardware listed in the lrgrwrks.txt file if
 * one is included with the Software (each a "Larger Work" to which the Software
 * is contributed by such licensors),
 *
 * without restriction, including without limitation the rights to copy, create
 * derivative works of, display, perform, and distribute the Software and make,
 * use, sell, offer for sale, import, export, have made, and have sold the
 * Software and the Larger Work(s), and to sublicense the foregoing rights on
 * either these or other terms.
 *
 * This license is subject to the following condition:
 * The above copyright notice and either this complete permission notice or at
 * a minimum a reference to the UPL must be included in all copies or
 * substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

import build from '@app/build.json';
import { createServer, Response } from 'miragejs';
import { Server as WSServer, Client } from 'mock-socket';
import factories from './factories';
import models from './models';
import { Resource } from './typings';

export const startMirage = ({ environment = 'development' } = {}) => {
  const wsUrl = `ws://cryostat.local.preview:8181`;
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
            serverTime: +Date.now(),
          },
          message: {
            '127.0.0.1': 'accepted',
          },
        })
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
      this.get('api/v1/notifications_url', () => ({
        notificationsUrl: wsUrl,
      }));
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
          }
        );
      });
      this.post(
        'api/v2.1/auth/token',
        () => new Response(400, {}, 'Resource downloads are not supported in this demo')
      );
      this.post('api/v2/targets', (schema, request) => {
        const attrs = JSON.parse(request.requestBody);
        const target = schema.create(Resource.TARGET, {
          jvmId: `${Math.floor(1000 * Math.random())}`,
          alias: attrs.get('alias'),
          connectUrl: attrs.get('connectUrl'),
          annotations: {
            platform: {},
            cryostat: {},
          },
        });
        websocket.send(
          JSON.stringify({
            meta: {
              category: 'TargetJvmDiscovery',
              type: { type: 'application', subType: 'json' },
              serverTime: +Date.now(),
            },
            message: { event: { serviceRef: target, kind: 'FOUND' } },
          })
        );
        return {
          data: {
            result: target,
          },
        };
      });
      this.get('api/v1/targets', (schema) => schema.all(Resource.TARGET).models);
      this.get('api/v2.1/discovery', (schema) => ({
        meta: {
          status: 'OK',
          type: 'application/json',
        },
        data: {
          result: {
            name: 'Universe',
            nodeType: 'Universe',
            labels: {},
            children: [
              {
                name: 'KubernetesApi',
                nodeType: 'Realm',
                labels: {},
                children: schema.all(Resource.TARGET).models.map((t) => ({
                  name: t.alias,
                  nodeType: 'JVM',
                  target: t,
                })),
              },
            ],
          },
        },
      }));
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
        const recording = schema.where(Resource.ARCHIVE, { name: recordingName });
        schema.findBy(Resource.ARCHIVE, { name: recordingName })?.destroy();
        const msg = {
          meta: {
            category: 'ArchivedRecordingDeleted',
            type: { type: 'application', subType: 'json' },
            serverTime: +Date.now(),
          },
          message: {
            recording: {
              ...recording.models[0].attrs,
            },
            target: request.params['targetId'],
          },
        };
        websocket.send(JSON.stringify(msg));
        return new Response(200);
      });
      this.post('api/v1/targets/:targetId/recordings', (schema, request) => {
        const attrs = JSON.parse(request.requestBody);
        const recording = schema.create(Resource.RECORDING, {
          // id will generated by Mirage (i.e. increment intergers)
          downloadUrl: '',
          reportUrl: `beta/reports/${encodeURIComponent(request.params.targetId)}/${encodeURIComponent(
            attrs.get('recordingName')
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
            labels: {
              ...(attrs.labels || {}),
              'template.type': 'TARGET',
              'template.name': 'Demo Template',
            },
          },
        });
        websocket.send(
          JSON.stringify({
            meta: {
              category: 'ActiveRecordingCreated',
              type: { type: 'application', subType: 'json' },
              serverTime: +Date.now(),
            },
            message: {
              target: request.params.targetId,
              recording,
            },
          })
        );
        return recording;
      });
      this.get('api/v1/targets/:targetId/recordings', (schema) => schema.all(Resource.RECORDING).models);
      this.delete('api/v1/targets/:targetId/recordings/:recordingName', (schema, request) => {
        const recordingName = request.params.recordingName;
        const recording = schema.where(Resource.RECORDING, { name: recordingName });
        schema.findBy(Resource.RECORDING, { name: recordingName })?.destroy();
        const msg = {
          meta: {
            category: 'ActiveRecordingDeleted',
            type: { type: 'application', subType: 'json' },
            serverTime: +Date.now(),
          },
          message: {
            recording: {
              ...recording.models[0].attrs,
            },
            target: request.params.targetId,
          },
        };
        websocket.send(JSON.stringify(msg));
        return new Response(200);
      });
      this.patch('api/v1/targets/:targetId/recordings/:recordingName', (schema, request) => {
        const body = JSON.parse(request.requestBody);
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
                serverTime: +Date.now(),
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
                serverTime: ts,
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
          }
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
      this.post('api/v2/rules', (schema, request) => {
        const attrs = JSON.parse(request.requestBody);
        return {
          data: {
            result: schema.create(Resource.RULE, attrs),
          },
        };
      });
      this.get('api/v2/rules', (schema) => ({
        data: { result: schema.all(Resource.RULE).models },
      }));
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
            `${JSON.stringify(request.url)} (query: '${name}') currently unsupported in demo`
          );
        }
        let data = {};
        switch (name) {
          case 'ArchivedRecordingsForTarget':
          case 'UploadedRecordings':
            data = {
              archivedRecordings: {
                data: schema.all(Resource.ARCHIVE).models,
              },
            };
            break;
          case 'ActiveRecordingsForTarget':
            data = {
              targetNodes: [
                {
                  recordings: {
                    archived: {
                      data: schema.all(Resource.ARCHIVE).models,
                    },
                  },
                },
              ],
            };
            break;
          case 'ArchivedRecordingsForAutomatedAnalysis':
            data = {
              archivedRecordings: {
                data: schema.all(Resource.ARCHIVE).models,
              },
            };
            break;
          case 'ActiveRecordingsForAutomatedAnalysis':
            data = {
              targetNodes: [
                {
                  recordings: {
                    active: {
                      data: schema.all(Resource.RECORDING).models,
                    },
                  },
                },
              ],
            };
            break;
          case 'PostRecordingMetadata': {
            const labels = {};
            for (const l of eval(variables.labels)) {
              labels[l.key] = l.value;
            }
            schema.findBy(Resource.ARCHIVE, { name: variables.recordingName })?.update({
              metadata: {
                labels,
              },
            });
            data = {
              targetNodes: [
                {
                  recordings: {
                    archived: {
                      data: [
                        {
                          doPutMetadata: {
                            metadata: {
                              labels,
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
                  serverTime: +Date.now(),
                },
                message: {
                  recordingName: variables.recordingName,
                  target: variables.connectUrl,
                  metadata: {
                    labels,
                  },
                },
              })
            );
            break;
          }
          case 'PostActiveRecordingMetadata': {
            const labels = {};
            for (const l of eval(variables.labels)) {
              labels[l.key] = l.value;
            }
            schema.findBy(Resource.RECORDING, { name: variables.recordingName })?.update({
              metadata: {
                labels,
              },
            });
            data = {
              targetNodes: [
                {
                  recordings: {
                    active: {
                      data: [
                        {
                          doPutMetadata: {
                            metadata: {
                              labels,
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
                  serverTime: +Date.now(),
                },
                message: {
                  recordingName: variables.recordingName,
                  target: variables.connectUrl,
                  metadata: {
                    labels,
                  },
                },
              })
            );
            break;
          }
          case 'MBeanMXMetricsForTarget':
            data = {
              targetNodes: [
                {
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
