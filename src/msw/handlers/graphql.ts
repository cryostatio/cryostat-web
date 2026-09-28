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

import { http, HttpResponse } from 'msw';
import { db } from '../db';
import { mockWsBroadcaster } from '../ws';

function extractQueryName(query: string): string {
  const trimmed = query.trim();
  const begin = trimmed.substring(0, trimmed.indexOf('{'));
  for (const n of begin.split(' ')) {
    if (n === '{') break;
    if (!n || n === 'query' || n === 'mutation') continue;
    if (n.includes('(')) {
      return n.substring(0, n.indexOf('('));
    }
    return n.trim();
  }
  return '';
}

export const graphqlHandlers = [
  http.post('*/api/v4/graphql', async ({ request }) => {
    const body = (await request.json()) as any;
    const query = body?.query || '';
    const variables = body?.variables || {};
    const name = extractQueryName(query);

    let target: any = null;
    if (variables.connectUrl) {
      target = db.target.findFirst({ where: { connectUrl: { equals: variables.connectUrl } } });
    } else if (variables.jvmId) {
      target = db.target.findFirst({ where: { jvmId: { equals: variables.jvmId } } });
    } else if (variables.targetIds && variables.targetIds.length > 0) {
      target = db.target.findFirst({ where: { id: { equals: variables.targetIds[0] } } });
    }
    if (!target) {
      target = db.target.findFirst({ where: { jvmId: { equals: '1234' } } });
    }

    let data: any = {};

    switch (name) {
      case 'ArchivedRecordingsForTarget':
      case 'AllTargetsArchives':
      case 'ArchivedRecordingsForAutomatedAnalysis':
        data = {
          targetNodes: [
            {
              target: {
                archivedRecordings: {
                  data: db.archive.getAll(),
                },
              },
            },
          ],
        };
        break;

      case 'UploadedRecordings':
        data = {
          archivedRecordings: {
            data: [],
          },
        };
        break;

      case 'ActiveRecordingsForTarget':
      case 'ActiveRecordingsForAutomatedAnalysis':
        data = {
          targetNodes: [
            {
              target: {
                activeRecordings: {
                  data: db.recording.getAll(),
                },
              },
            },
          ],
        };
        break;

      case 'AggregateReportForTarget':
        data = {
          targetNodes: [
            {
              target: {
                id: target?.id || 1,
                report: {
                  lastUpdated: Date.now(),
                  aggregate: {
                    count: 0,
                    max: 0,
                  },
                },
              },
            },
          ],
        };
        break;

      case 'PostRecordingMetadata': {
        const labelsArray =
          typeof variables.labels === 'string' ? JSON.parse(variables.labels) : variables.labels || [];
        db.archive.update({
          where: { name: { equals: variables.recordingName } },
          data: { metadata: { labels: labelsArray } },
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
                      archivedTime: Date.now(),
                    },
                  ],
                },
              },
            },
          ],
        };

        mockWsBroadcaster.broadcast({
          meta: {
            category: 'RecordingMetadataUpdated',
            type: { type: 'application', subType: 'json' },
          },
          message: {
            recordingName: variables.recordingName,
            target: target?.jvmId ?? 'unknown',
            metadata: {
              labels: labelsArray,
            },
          },
        });
        break;
      }

      case 'PostActiveRecordingMetadata': {
        const labelsArray =
          typeof variables.labels === 'string' ? JSON.parse(variables.labels) : variables.labels || [];
        db.recording.update({
          where: { name: { equals: variables.recordingName } },
          data: { metadata: { labels: labelsArray } },
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

        mockWsBroadcaster.broadcast({
          meta: {
            category: 'RecordingMetadataUpdated',
            type: { type: 'application', subType: 'json' },
          },
          message: {
            recordingName: variables.recordingName,
            target: target?.jvmId ?? 'unknown',
            metadata: {
              labels: labelsArray,
            },
          },
        });
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
                    availableProcessors: 4,
                    version: '10.0.1',
                    systemCpuLoad: Math.random(),
                    systemLoadAverage: Math.random(),
                    processCpuLoad: Math.random(),
                    totalPhysicalMemorySize: 64,
                    freePhysicalMemorySize: 32,
                  },
                  memory: {
                    heapMemoryUsage: {
                      init: 16,
                      used: Math.ceil(Math.random() * 32),
                      committed: 32,
                      max: 64,
                    },
                    nonHeapMemoryUsage: {
                      init: 8,
                      used: 12,
                      committed: 16,
                      max: 32,
                    },
                    heapMemoryUsagePercent: Math.random(),
                  },
                  runtime: {
                    bootClassPath: '/path/to/boot/classpath',
                    classPath: '/path/to/classpath',
                    inputArguments: ['-Xmx1g'],
                    libraryPath: '/path/to/library/path',
                    managementSpecVersion: '1.0',
                    name: 'Java Virtual Machine',
                    specName: 'Java Virtual Machine Specification',
                    specVendor: 'Oracle Corporation',
                    startTime: Date.now(),
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

      default:
        data = {
          targetNodes: [
            {
              target: {
                ...target,
                activeRecordings: { data: db.recording.getAll() },
                archivedRecordings: { data: db.archive.getAll() },
              },
            },
          ],
        };
        break;
    }

    return HttpResponse.json({ data });
  }),
];
