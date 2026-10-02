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

import { ApiService } from '@app/Shared/Services/Api.service';
import { Metadata, Rule, Target, TargetMetadata } from '@app/Shared/Services/api.types';
import { NotificationService } from '@app/Shared/Services/Notifications.service';
import { TargetService } from '@app/Shared/Services/Target.service';
import { firstValueFrom, of } from 'rxjs';

jest.unmock('@app/Shared/Services/Api.service');

const ctx = {
  headers: () => of(new Headers()),
  url: (p: string) => of(`./${p}`),
};

const fakeTarget: Target = {
  id: 1,
  jvmId: 'abcd1234',
  agent: false,
  connectUrl: 'service:jmx:rmi:///jndi/rmi://localhost:9091/jmxrmi',
  alias: 'io.cryostat.Cryostat',
  labels: [{ key: 'app', value: 'cryostat' }],
  annotations: {
    cryostat: [{ key: 'REALM', value: 'Custom Targets' }],
    platform: [],
  },
};

function responseOf(body: unknown): Response {
  return { json: () => Promise.resolve(body) } as unknown as Response;
}

describe('ApiService', () => {
  let svc: ApiService;

  beforeEach(() => {
    svc = new ApiService(ctx, {} as TargetService, {} as NotificationService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('transformLabelsToObject', () => {
    it('converts a KeyValue array into a map', () => {
      expect(svc.transformLabelsToObject([{ key: 'a', value: '1' }])).toEqual({ a: '1' });
    });

    it('returns an empty object for an empty array', () => {
      expect(svc.transformLabelsToObject([])).toEqual({});
    });
  });

  describe('transformMetadataToObject', () => {
    it('converts Metadata labels', () => {
      const metadata: Metadata = { labels: [{ key: 'a', value: '1' }] };
      expect(svc.transformMetadataToObject(metadata)).toEqual({ labels: { a: '1' } });
    });

    it('converts TargetMetadata labels and annotations, including non-empty cryostat annotations', () => {
      const metadata: TargetMetadata = {
        labels: [{ key: 'a', value: '1' }],
        annotations: {
          cryostat: [{ key: 'REALM', value: 'Custom Targets' }],
          platform: [{ key: 'io.cryostat.demo', value: 'true' }],
        },
      };
      expect(svc.transformMetadataToObject(metadata)).toEqual({
        labels: { a: '1' },
        annotations: {
          cryostat: { REALM: 'Custom Targets' },
          platform: { 'io.cryostat.demo': 'true' },
        },
      });
    });
  });

  describe('getTargets', () => {
    it('passes entry-array responses through untouched', async () => {
      jest.spyOn(svc, 'sendRequest').mockReturnValue(of(responseOf([fakeTarget])));
      const result = await firstValueFrom(svc.getTargets());
      expect(result).toEqual([fakeTarget]);
    });
  });

  describe('getDiscoveryTree', () => {
    it('passes entry-array responses through untouched', async () => {
      const tree = {
        name: 'Universe',
        nodeType: 'Universe',
        labels: [],
        children: [],
      };
      jest.spyOn(svc, 'sendRequest').mockReturnValue(of(responseOf(tree)));
      const result = await firstValueFrom(svc.getDiscoveryTree());
      expect(result).toEqual(tree);
    });
  });

  describe('matchTargetsWithExpr / isTargetMatched', () => {
    it('includes non-empty annotations in the outgoing request body', async () => {
      let sentBody: any;
      jest.spyOn(svc, 'sendRequest').mockImplementation((_apiVersion, _path, config) => {
        sentBody = JSON.parse(config!.body as string);
        return of(responseOf({ targets: [] }));
      });

      await firstValueFrom(svc.matchTargetsWithExpr('true', [fakeTarget]));

      expect(sentBody.targets).toHaveLength(1);
      expect(sentBody.targets[0].annotations.cryostat).toEqual({ REALM: 'Custom Targets' });
      expect(sentBody.targets[0].annotations.platform).toEqual({});
      expect(sentBody.targets[0].labels).toEqual({ app: 'cryostat' });
    });

    it('matches a target against an expression over target.annotations.cryostat', async () => {
      jest.spyOn(svc, 'sendRequest').mockImplementation((_apiVersion, _path, config) => {
        const body = JSON.parse(config!.body as string);
        const matched = body.targets.filter((t: any) => t.annotations.cryostat.REALM === 'Custom Targets');
        return of(responseOf({ targets: matched }));
      });

      const result = await firstValueFrom(
        svc.isTargetMatched('target.annotations.cryostat.REALM == "Custom Targets"', fakeTarget),
      );

      expect(result).toBe(true);
    });

    it('does not match when the expression references annotations the target lacks', async () => {
      jest.spyOn(svc, 'sendRequest').mockImplementation((_apiVersion, _path, config) => {
        const body = JSON.parse(config!.body as string);
        const matched = body.targets.filter((t: any) => t.annotations.cryostat.REALM === 'Kubernetes');
        return of(responseOf({ targets: matched }));
      });

      const result = await firstValueFrom(
        svc.isTargetMatched('target.annotations.cryostat.REALM == "Kubernetes"', fakeTarget),
      );

      expect(result).toBe(false);
    });
  });

  describe('uploadRule', () => {
    it('includes falsy field values (enabled=false, zero-valued numbers) in the uploaded FormData', async () => {
      const rule: Rule = {
        name: 'test-rule',
        description: '',
        matchExpression: 'true',
        enabled: false,
        eventSpecifier: 'template=Continuous,type=TARGET',
        archivalPeriodSeconds: 0,
        initialDelaySeconds: 0,
        preservedArchives: 0,
        maxAgeSeconds: 0,
        maxSizeBytes: 0,
        metadata: { labels: [] },
      };

      let uploadedBody: FormData | undefined;
      jest.spyOn(svc as any, 'sendUploadRequest').mockImplementation((...args: unknown[]) => {
        uploadedBody = args[3] as FormData;
        return of(responseOf({}));
      });

      await firstValueFrom(svc.uploadRule(rule));

      expect(uploadedBody).toBeDefined();
      expect(uploadedBody!.get('enabled')).toBe('false');
      expect(uploadedBody!.get('archivalPeriodSeconds')).toBe('0');
      expect(uploadedBody!.get('initialDelaySeconds')).toBe('0');
      expect(uploadedBody!.get('preservedArchives')).toBe('0');
      expect(uploadedBody!.get('maxAgeSeconds')).toBe('0');
      expect(uploadedBody!.get('maxSizeBytes')).toBe('0');
      expect(uploadedBody!.get('name')).toBe('test-rule');
    });
  });
});
