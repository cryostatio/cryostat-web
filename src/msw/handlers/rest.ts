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
import { http, HttpResponse, ws } from 'msw';
import { components } from '../../schema/openapi.types';
import { db } from '../db';
import { mockWsBroadcaster } from '../ws';

// WebSocket Handler
const wsNotifications = ws.link(/^ws(s)?:\/\/.*\/api\/(v\d+\/)?notifications$/);

export const wsHandlers = [
  wsNotifications.addEventListener('connection', ({ client }) => {
    const listener = (data: string) => {
      client.send(data);
    };
    mockWsBroadcaster.addListener(listener);

    client.addEventListener('close', () => {
      mockWsBroadcaster.removeListener(listener);
    });
  }),
];

// HTTP REST Handlers
export const restHandlers = [
  // Health
  http.get('*/health', () => {
    const health: components['schemas']['ApplicationHealth'] = {
      build: {
        git: {
          hash: '775aee4cdd61f5b8d91aa38f4601933c9750d54e',
        },
      },
      cryostatVersion: `${build.version.replace(/(-\w+)*$/g, '')}-0-preview`,
      dashboardAvailable: false,
      dashboardConfigured: false,
      datasourceAvailable: false,
      datasourceConfigured: false,
      reportsAvailable: true,
      reportsConfigured: false,
    };
    return HttpResponse.json(health);
  }),

  // Grafana endpoints
  http.get('*/api/v4/grafana_datasource_url', () => new HttpResponse(null, { status: 500 })),
  http.get('*/api/v4/grafana_dashboard_url', () => new HttpResponse(null, { status: 500 })),

  // Auth
  http.post('*/api/v4/auth', () => {
    const auth: components['schemas']['AuthResponse'] = { username: 'preview-user' };
    return HttpResponse.json(auth);
  }),
  http.post(
    '*/api/v4/auth/token',
    () => new HttpResponse('Resource downloads are not supported in this demo', { status: 400 }),
  ),

  // Targets - Create
  http.post('*/api/v4/targets', async ({ request }) => {
    const url = new URL(request.url);
    if (url.searchParams.get('dryrun')) {
      return new HttpResponse(null, { status: 200 });
    }
    const formData = await request.formData();
    const alias = formData.get('alias')?.toString() || '';
    const connectUrl = formData.get('connectUrl')?.toString() || '';
    const jvmId = `${Date.now().toString(16)}`;

    const target = db.target.create({
      id: Date.now(),
      agent: true,
      alias,
      connectUrl,
      jvmId,
      labels: [],
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

    mockWsBroadcaster.broadcast({
      meta: {
        category: 'TargetJvmDiscovery',
        type: { type: 'application', subType: 'json' },
      },
      message: { event: { serviceRef: target, kind: 'FOUND' } },
    });

    const targetPayload: components['schemas']['Target'] = {
      alias: target.alias,
      connectUrl: target.connectUrl,
      jvmId: target.jvmId,
      agent: target.agent,
      labels: {},
      annotations: {
        cryostat: { REALM: 'Custom Targets' },
        platform: {},
      },
    };

    return HttpResponse.json(targetPayload, { status: 200 });
  }),

  // Targets - List
  http.get('*/api/v4/targets', () => {
    const targets = db.target.getAll();
    const payload: components['schemas']['Target'][] = targets.map((t: any) => ({
      alias: t.alias,
      connectUrl: t.connectUrl,
      jvmId: t.jvmId,
      agent: t.agent,
      labels: {},
      annotations: {
        cryostat: { REALM: 'Custom Targets' },
        platform: {},
      },
    }));
    return HttpResponse.json(payload);
  }),

  // Discovery Tree
  http.get('*/api/v4/discovery', () => {
    const targets = db.target.getAll();
    const realmTypes = Array.from(
      new Set(
        targets.map((t: any) => {
          const cryostatAnno = t.annotations?.cryostat;
          if (Array.isArray(cryostatAnno)) {
            const realm = cryostatAnno.find((a: any) => a.key === 'REALM');
            return realm?.value || 'Custom Targets';
          }
          return t.annotations?.cryostat?.['REALM'] || 'Custom Targets';
        }),
      ),
    );

    const discoveryTree: components['schemas']['DiscoveryNode'] = {
      name: 'Universe',
      nodeType: 'Universe',
      labels: {},
      children: realmTypes.map((r: string) => ({
        name: r,
        nodeType: 'Realm',
        labels: {},
        id: Date.now(),
        children: targets
          .filter((t: any) => {
            const cryostatAnno = t.annotations?.cryostat;
            if (Array.isArray(cryostatAnno)) {
              const realm = cryostatAnno.find((a: any) => a.key === 'REALM');
              return (realm?.value || 'Custom Targets') === r;
            }
            return (t.annotations?.cryostat?.['REALM'] || 'Custom Targets') === r;
          })
          .map((t: any) => ({
            name: t.alias,
            nodeType: 'Target',
            labels: {},
            target: {
              alias: t.alias,
              connectUrl: t.connectUrl,
              jvmId: t.jvmId,
              agent: t.agent,
              labels: {},
              annotations: {
                cryostat: { REALM: 'Custom Targets' },
                platform: {},
              },
            },
            children: [],
          })),
      })),
    };

    return HttpResponse.json(discoveryTree);
  }),

  // Target Delete
  http.delete('*/api/v4/targets/:jvmId', ({ params }) => {
    const jvmId = params.jvmId as string;
    const target = db.target.findFirst({ where: { jvmId: { equals: jvmId } } });
    if (target) {
      db.target.delete({ where: { jvmId: { equals: jvmId } } });
      mockWsBroadcaster.broadcast({
        meta: {
          category: 'TargetJvmDiscovery',
          type: { type: 'application', subType: 'json' },
        },
        message: { event: { serviceRef: target, kind: 'LOST' } },
      });
    }
    return new HttpResponse(null, { status: 200 });
  }),

  // Recordings - List for all targets
  http.get('*/api/v4/recordings', () => {
    const archives = db.archive.getAll();
    const payload: components['schemas']['ArchivedRecording'][] = archives.map((a: any) => ({
      name: a.name,
      downloadUrl: a.downloadUrl,
      reportUrl: a.reportUrl,
      metadata: a.metadata,
      size: a.size || 0,
      archivedTime: a.archivedTime || Date.now(),
      jvmId: a.jvmId,
    }));
    return HttpResponse.json(payload);
  }),

  // Recordings - List by jvmId
  http.get('*/api/v4/recordings/:jvmId', ({ params }) => {
    const jvmId = params.jvmId as string;
    const archives = db.archive.findMany({ where: { jvmId: { equals: jvmId } } });
    const payload: components['schemas']['ArchivedRecording'][] = archives.map((a: any) => ({
      name: a.name,
      downloadUrl: a.downloadUrl,
      reportUrl: a.reportUrl,
      metadata: a.metadata,
      size: a.size || 0,
      archivedTime: a.archivedTime || Date.now(),
      jvmId: a.jvmId,
    }));
    return HttpResponse.json(payload);
  }),

  // Recordings - Delete archived
  http.delete('*/api/v4/recordings/:jvmId/:recordingName', ({ params }) => {
    const recordingName = params.recordingName as string;
    const jvmId = params.jvmId as string;
    const target = db.target.findFirst({ where: { jvmId: { equals: jvmId } } });
    const recording = db.archive.findFirst({ where: { name: { equals: recordingName } } });
    if (recording) {
      db.archive.delete({ where: { name: { equals: recordingName } } });
      mockWsBroadcaster.broadcast({
        meta: {
          category: 'ArchivedRecordingDeleted',
          type: { type: 'application', subType: 'json' },
        },
        message: {
          target: target?.connectUrl || jvmId,
          recording,
        },
      });
    }
    return new HttpResponse(null, { status: 200 });
  }),

  // Recordings - Create active recording
  http.post('*/api/v4/targets/:jvmId/recordings', async ({ params, request }) => {
    const jvmId = params.jvmId as string;
    const target = db.target.findFirst({ where: { jvmId: { equals: jvmId } } });
    const formData = await request.formData();
    const recordingName = formData.get('recordingName')?.toString() || `recording-${Date.now()}`;
    const duration = Number(formData.get('duration') || 0);
    const toDisk = formData.get('toDisk') === 'true';
    const maxSize = Number(formData.get('maxSize') || 0);
    const maxAge = Number(formData.get('maxAge') || 0);

    const recording = db.recording.create({
      remoteId: Date.now(),
      id: Date.now(),
      name: recordingName,
      state: duration === 0 ? 'RUNNING' : 'STOPPED',
      duration,
      startTime: Date.now(),
      continuous: duration === 0,
      toDisk,
      maxSize,
      maxAge,
      archiveOnStop: true,
      downloadUrl: `/api/v4/targets/${encodeURIComponent(jvmId)}/recordings/${encodeURIComponent(recordingName)}`,
      reportUrl: `/api/v4/targets/${encodeURIComponent(jvmId)}/reports/${encodeURIComponent(recordingName)}`,
      metadata: { labels: {} },
      jvmId,
    });

    mockWsBroadcaster.broadcast({
      meta: {
        category: 'ActiveRecordingCreated',
        type: { type: 'application', subType: 'json' },
      },
      message: {
        target: target?.connectUrl || jvmId,
        recording,
      },
    });

    return HttpResponse.json(recording, { status: 201 });
  }),

  // Recordings - List active for target
  http.get('*/api/v4/targets/:jvmId/recordings', ({ params }) => {
    const jvmId = params.jvmId as string;
    const recordings = db.recording.findMany({ where: { jvmId: { equals: jvmId } } });
    return HttpResponse.json(recordings);
  }),

  // Recordings - Delete active recording
  http.delete('*/api/v4/targets/:jvmId/recordings/:remoteId', ({ params }) => {
    const jvmId = params.jvmId as string;
    const remoteId = Number(params.remoteId);
    const target = db.target.findFirst({ where: { jvmId: { equals: jvmId } } });
    const recording = db.recording.findFirst({ where: { remoteId: { equals: remoteId } } });
    if (recording) {
      db.recording.delete({ where: { remoteId: { equals: remoteId } } });
      mockWsBroadcaster.broadcast({
        meta: {
          category: 'ActiveRecordingDeleted',
          type: { type: 'application', subType: 'json' },
        },
        message: {
          target: target?.connectUrl || jvmId,
          recording,
        },
      });
    }
    return new HttpResponse(null, { status: 200 });
  }),

  // Recordings - Patch active recording state (STOP / SAVE)
  http.patch('*/api/v4/targets/:jvmId/recordings/:remoteId', async ({ params, request }) => {
    const jvmId = params.jvmId as string;
    const remoteId = Number(params.remoteId);
    const target = db.target.findFirst({ where: { jvmId: { equals: jvmId } } });
    const recording = db.recording.findFirst({ where: { remoteId: { equals: remoteId } } });
    const bodyText = await request.text();

    if (recording) {
      if (bodyText.includes('STOP')) {
        db.recording.update({
          where: { remoteId: { equals: remoteId } },
          data: { state: 'STOPPED' },
        });
        mockWsBroadcaster.broadcast({
          meta: {
            category: 'ActiveRecordingStopped',
            type: { type: 'application', subType: 'json' },
          },
          message: {
            target: target?.connectUrl || jvmId,
            recording: { ...recording, state: 'STOPPED' },
          },
        });
      }
      if (bodyText.includes('SAVE')) {
        const archived = db.archive.create({
          name: `${recording.name}_${Date.now()}`,
          jvmId,
          downloadUrl: recording.downloadUrl,
          reportUrl: recording.reportUrl,
          metadata: recording.metadata,
          size: 1024,
          archivedTime: Date.now(),
        });
        mockWsBroadcaster.broadcast({
          meta: {
            category: 'ActiveRecordingSaved',
            type: { type: 'application', subType: 'json' },
          },
          message: {
            target: target?.connectUrl || jvmId,
            recording: archived,
          },
        });
      }
    }
    return new HttpResponse(null, { status: 200 });
  }),

  // Rules
  http.get('*/api/v4/rules', () => HttpResponse.json(db.rule.getAll())),
  http.post('*/api/v4/rules', async ({ request }) => {
    const data = (await request.json()) as any;
    const rule = db.rule.create({
      id: Date.now(),
      name: data.name,
      description: data.description || '',
      matchExpression: data.matchExpression || '',
      eventSpecifier: data.eventSpecifier || '',
      archivalPeriodSeconds: Number(data.archivalPeriodSeconds || 0),
      initialDelaySeconds: Number(data.initialDelaySeconds || 0),
      preservedArchives: Number(data.preservedArchives || 0),
      maxAgeSeconds: Number(data.maxAgeSeconds || 0),
      maxSizeBytes: Number(data.maxSizeBytes || 0),
      enabled: Boolean(data.enabled),
    });
    return HttpResponse.json(rule, { status: 201 });
  }),
  http.delete('*/api/v4/rules/:id', ({ params }) => {
    const id = Number(params.id);
    db.rule.delete({ where: { id: { equals: id } } });
    return new HttpResponse(null, { status: 200 });
  }),

  // Credentials
  http.get('*/api/v4/credentials', () => HttpResponse.json(db.credential.getAll())),
  http.post('*/api/v4/credentials', async ({ request }) => {
    const formData = await request.formData();
    const matchExpression = formData.get('matchExpression')?.toString() || '';
    const cred = db.credential.create({
      id: Date.now(),
      matchExpression,
      numTargets: 1,
    });
    return HttpResponse.json(cred, { status: 201 });
  }),
  http.get('*/api/v4/credentials/:id', ({ params }) => {
    const id = Number(params.id);
    const cred = db.credential.findFirst({ where: { id: { equals: id } } });
    return HttpResponse.json(cred || { matchExpression: '', targets: [] });
  }),
  http.delete('*/api/v4/credentials/:id', ({ params }) => {
    const id = Number(params.id);
    db.credential.delete({ where: { id: { equals: id } } });
    return new HttpResponse(null, { status: 200 });
  }),
];
