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
import { MatchedCredential, Target as AppTarget } from '@app/Shared/Services/api.types';
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
      services: {
        dashboard: {
          available: false,
          configured: false,
          url: '',
        },
        datasource: {
          available: false,
          configured: false,
        },
        reports: {
          available: true,
          configured: false,
        },
      },
    };
    return HttpResponse.json(health);
  }),

  // Auth
  http.post('*/api/v5/auth', () => {
    const auth: components['schemas']['AuthResponse'] = { username: 'preview-user' };
    return HttpResponse.json(auth);
  }),

  // Targets - Create
  http.post('*/api/v5/targets', async ({ request }) => {
    const url = new URL(request.url);
    if (url.searchParams.get('dryrun') === 'true') {
      return new HttpResponse(null, { status: 200 });
    }
    const formData = await request.formData();
    const alias = formData.get('alias')?.toString() || '';
    const connectUrl = formData.get('connectUrl')?.toString() || '';
    const jvmId = `${Date.now().toString(16)}`;

    const target = db.target.create({
      id: Date.now().toString(),
      agent: true,
      alias,
      connectUrl,
      jvmId,
      labels: [],
      annotations: {
        platform: [],
        cryostat: [{ key: 'REALM', value: 'Custom Targets' }],
      },
    });

    mockWsBroadcaster.broadcast({
      meta: {
        category: 'TargetJvmDiscovery',
        type: { type: 'application', subType: 'json' },
      },
      message: { event: { serviceRef: target, kind: 'FOUND' } },
    });

    const targetPayload: AppTarget = {
      id: target.id,
      alias: target.alias,
      connectUrl: target.connectUrl,
      jvmId: target.jvmId,
      agent: target.agent,
      labels: target.labels as any,
      annotations: target.annotations as any,
    };

    return HttpResponse.json(targetPayload, { status: 200 });
  }),

  // Targets - List
  http.get('*/api/v5/targets', () => {
    const targets = db.target.getAll();
    const payload: AppTarget[] = targets.map((t: any) => ({
      id: t.id,
      alias: t.alias,
      connectUrl: t.connectUrl,
      jvmId: t.jvmId,
      agent: t.agent,
      labels: t.labels,
      annotations: t.annotations,
    }));
    return HttpResponse.json(payload);
  }),

  // Discovery Tree
  http.get('*/api/v5/discovery/tree', () => {
    const targets = db.target.getAll();
    const getRealmValue = (t: any): string =>
      (t.annotations?.cryostat ?? []).find((a: any) => a.key === 'REALM')?.value || 'Custom Targets';
    const realmTypes = Array.from(new Set(targets.map(getRealmValue)));

    const discoveryTree: any = {
      id: 'universe',
      name: 'Universe',
      nodeType: 'Universe',
      labels: [],
      children: realmTypes.map((r: string) => ({
        id: `realm-${r}`,
        name: r,
        nodeType: 'Realm',
        labels: [],
        children: targets
          .filter((t: any) => getRealmValue(t) === r)
          .map((t: any) => ({
            id: `target-${t.id}`,
            name: t.alias,
            nodeType: 'Target',
            labels: [],
            target: {
              id: t.id,
              alias: t.alias,
              connectUrl: t.connectUrl,
              jvmId: t.jvmId,
              agent: t.agent,
              labels: t.labels,
              annotations: t.annotations,
            },
            children: [],
          })),
      })),
    };

    return HttpResponse.json(discoveryTree);
  }),

  // Target event types
  http.get('*/api/v5/targets/:jvmId/events', () => HttpResponse.json([])),

  // Match expressions
  http.post('*/api/v5/match-expressions', async ({ request }) => {
    const body = (await request.json()) as any;
    return HttpResponse.json({ targets: body.targets ?? [] });
  }),

  // Event Templates - Global
  http.get('*/api/v5/event-templates', () => {
    return HttpResponse.json([
      {
        name: 'Preset Template',
        provider: 'Cryostat',
        type: 'PRESET',
        description: 'This is not a real event template, but it is here!',
      },
    ]);
  }),

  // Event Templates - Per Target
  http.get('*/api/v5/targets/:jvmId/event-templates', () => {
    return HttpResponse.json([
      {
        name: 'Demo Template',
        provider: 'Demo',
        type: 'TARGET',
        description: 'This is not a real event template, but it is here!',
      },
      {
        name: 'Preset Template',
        provider: 'Cryostat',
        type: 'PRESET',
        description: 'This is not a real event template, but it is here!',
      },
    ]);
  }),

  // Target Delete
  http.delete('*/api/v5/targets/:jvmId', ({ params }) => {
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

  // Recordings - List all, grouped by target (ArchivedRecordingDirectory[])
  http.get('*/api/v5/recordings', () => {
    const archives = db.archive.getAll();
    const byJvmId = new Map<string, any[]>();
    archives.forEach((a: any) => {
      if (!byJvmId.has(a.jvmId)) {
        byJvmId.set(a.jvmId, []);
      }
      byJvmId.get(a.jvmId)!.push({
        name: a.name,
        downloadUrl: a.downloadUrl,
        reportUrl: a.reportUrl,
        metadata: a.metadata,
        size: a.size || 0,
        archivedTime: a.archivedTime || Date.now(),
        jvmId: a.jvmId,
      });
    });
    const payload: components['schemas']['ArchivedRecordingDirectory'][] = Array.from(byJvmId.entries()).map(
      ([jvmId, recordings]) => ({ jvmId, recordings }),
    );
    return HttpResponse.json(payload);
  }),

  // Recordings - List by jvmId
  http.get('*/api/v5/recordings/:jvmId', ({ params }) => {
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
  http.delete('*/api/v5/recordings/:jvmId/:recordingName', ({ params }) => {
    const recordingName = params.recordingName as string;
    const jvmId = params.jvmId as string;
    const target = db.target.findFirst({ where: { jvmId: { equals: jvmId } } });
    const recording = db.archive.findFirst({
      where: { name: { equals: recordingName }, jvmId: { equals: jvmId } },
    });
    if (recording) {
      db.archive.delete({ where: { name: { equals: recording.name } } });
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
  http.post('*/api/v5/targets/:jvmId/recordings', async ({ params, request }) => {
    const jvmId = String(params.jvmId);
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
      state: 'RUNNING',
      duration,
      startTime: Date.now(),
      continuous: duration === 0,
      toDisk,
      maxSize,
      maxAge,
      archiveOnStop: true,
      downloadUrl: `/api/v5/targets/${jvmId}/recordings/${encodeURIComponent(recordingName)}`,
      reportUrl: `/api/v5/targets/${jvmId}/reports/${encodeURIComponent(recordingName)}`,
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
        jvmId,
      },
    });

    return HttpResponse.json(recording, { status: 201 });
  }),

  // Recordings - List active for target
  http.get('*/api/v5/targets/:jvmId/recordings', ({ params }) => {
    const jvmId = String(params.jvmId);
    const recordings = db.recording.findMany({ where: { jvmId: { equals: jvmId } } });
    return HttpResponse.json(recordings);
  }),

  // Recordings - Delete active recording
  http.delete('*/api/v5/targets/:jvmId/recordings/:remoteId', ({ params }) => {
    const jvmId = String(params.jvmId);
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
          jvmId,
        },
      });
    }
    return new HttpResponse(null, { status: 200 });
  }),

  // Recordings - Patch active recording state (STOP / SAVE)
  http.patch('*/api/v5/targets/:jvmId/recordings/:remoteId', async ({ params, request }) => {
    const jvmId = String(params.jvmId);
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
            jvmId,
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
            jvmId,
          },
        });
      }
    }
    return new HttpResponse(null, { status: 200 });
  }),

  // Rules
  http.get('*/api/v5/rules', () => HttpResponse.json(db.rule.getAll())),
  http.post('*/api/v5/rules', async ({ request }) => {
    const contentType = request.headers.get('content-type') || '';
    let data: any;
    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      data = Object.fromEntries(formData.entries());
    } else {
      data = await request.json();
    }
    const metadata = typeof data.metadata === 'string' ? JSON.parse(data.metadata) : data.metadata || { labels: {} };
    let enabled = true;
    if (data.enabled === 'false') {
      enabled = false;
    } else if (data.enabled !== undefined) {
      enabled = Boolean(data.enabled);
    }
    const rule = db.rule.create({
      id: crypto.randomUUID(),
      name: data.name,
      description: data.description || '',
      matchExpression: data.matchExpression || '',
      eventSpecifier: data.eventSpecifier || '',
      archivalPeriodSeconds: Number(data.archivalPeriodSeconds || 0),
      initialDelaySeconds: Number(data.initialDelaySeconds || 0),
      preservedArchives: Number(data.preservedArchives || 0),
      maxAgeSeconds: Number(data.maxAgeSeconds || 0),
      maxSizeBytes: Number(data.maxSizeBytes || 0),
      enabled,
      metadata,
    });
    return HttpResponse.json(rule, { status: 201 });
  }),
  http.patch('*/api/v5/rules/:id', async ({ params, request }) => {
    const id = String(params.id);
    const data = (await request.json()) as any;
    const rule = db.rule.findFirst({ where: { id: { equals: id } } });
    if (!rule) {
      return new HttpResponse(null, { status: 404 });
    }
    db.rule.update({
      where: { id: { equals: id } },
      data: {
        ...data,
        id: rule.id,
        metadata: data.metadata ?? rule.metadata,
      },
    });
    return new HttpResponse(null, { status: 200 });
  }),
  http.delete('*/api/v5/rules/:id', ({ params }) => {
    const id = String(params.id);
    db.rule.delete({ where: { id: { equals: id } } });
    return new HttpResponse(null, { status: 200 });
  }),

  // Credentials
  // Note: the real v5 OpenAPI schema models `matchExpression` as a `{id, script}` object, but the
  // app's hand-written MatchedCredential/Rule types (and all rendering code) treat it as a plain
  // string. Mocking the schema's nested-object shape here would break the Rules/Credentials UI
  // entirely in preview, so this mirrors the app's (string) expectation instead.
  http.get('*/api/v5/credentials', () => {
    const payload: MatchedCredential[] = db.credential.getAll().map((c: any) => ({
      id: c.id,
      matchExpression: c.matchExpression,
      targets: [],
    }));
    return HttpResponse.json(payload);
  }),
  http.post('*/api/v5/credentials', async ({ request }) => {
    const formData = await request.formData();
    const matchExpression = formData.get('matchExpression')?.toString() || '';
    const cred = db.credential.create({
      id: crypto.randomUUID(),
      matchExpression,
    });
    return HttpResponse.json(cred, { status: 201 });
  }),
  http.get('*/api/v5/credentials/:id', ({ params }) => {
    const id = String(params.id);
    const cred = db.credential.findFirst({ where: { id: { equals: id } } });
    const payload: MatchedCredential = cred
      ? { id: cred.id, matchExpression: cred.matchExpression, targets: [] }
      : { id, matchExpression: '', targets: [] };
    return HttpResponse.json(payload);
  }),
  http.delete('*/api/v5/credentials/:id', ({ params }) => {
    const id = String(params.id);
    db.credential.delete({ where: { id: { equals: id } } });
    return new HttpResponse(null, { status: 200 });
  }),
  http.post('*/api/v5/credentials/test/:id', async () => {
    const result: components['schemas']['CredentialTestResult'] = 'SUCCESS';
    return HttpResponse.json(result);
  }),
];
