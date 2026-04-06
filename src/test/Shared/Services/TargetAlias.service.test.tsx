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
import { EnvironmentNode, NodeType, TargetNode } from '@app/Shared/Services/api.types';
import { TargetAliasService } from '@app/Shared/Services/TargetAlias.service';
import { of, throwError } from 'rxjs';

jest.mock('@app/Shared/Services/Api.service');

const mockApiService = {
  getTargetLineage: jest.fn(),
} as unknown as ApiService;

describe('TargetAliasService', () => {
  let service: TargetAliasService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new TargetAliasService(mockApiService);
  });

  afterEach(() => {
    service.clearCache();
  });

  const createMockLineage = (alias: string): EnvironmentNode => ({
    id: 1,
    name: 'Universe',
    nodeType: NodeType.UNIVERSE,
    labels: [],
    children: [
      {
        id: 2,
        name: 'Realm',
        nodeType: NodeType.REALM,
        labels: [],
        children: [
          {
            id: 3,
            name: 'Target',
            nodeType: NodeType.JVM,
            labels: [],
            target: {
              agent: false,
              alias,
              connectUrl: 'service:jmx:rmi:///jndi/rmi://localhost:9091/jmxrmi',
              labels: [],
              annotations: {
                cryostat: [],
                platform: [],
              },
            },
          } as TargetNode,
        ],
      },
    ],
  });

  describe('aliasMap', () => {
    it('should return an Observable of the alias cache', (done) => {
      service.aliasMap().subscribe({
        next: (map) => {
          expect(map).toBeInstanceOf(Map);
          expect(map.size).toBe(0);
          done();
        },
      });
    });

    it('should emit updated cache when aliases are fetched', (done) => {
      const jvmId = 'test-jvm-id';
      const alias = 'test-alias';
      const mockLineage = createMockLineage(alias);

      (mockApiService.getTargetLineage as jest.Mock).mockReturnValue(of(mockLineage));

      const emissions: Map<string, string>[] = [];
      const subscription = service.aliasMap().subscribe((map) => {
        emissions.push(new Map(map));
        if (emissions.length === 2) {
          expect(emissions[0].size).toBe(0);
          expect(emissions[1].size).toBe(1);
          expect(emissions[1].get(jvmId)).toBe(alias);
          subscription.unsubscribe();
          done();
        }
      });

      service.fetchAlias(jvmId);
    });
  });

  describe('getAlias', () => {
    it('should return undefined for uncached jvmId', () => {
      expect(service.getAlias('unknown-id')).toBeUndefined();
    });

    it('should return cached alias after successful fetch', (done) => {
      const jvmId = 'test-jvm-id';
      const alias = 'test-alias';
      const mockLineage = createMockLineage(alias);

      (mockApiService.getTargetLineage as jest.Mock).mockReturnValue(of(mockLineage));

      service.fetchAlias(jvmId);

      setTimeout(() => {
        expect(service.getAlias(jvmId)).toBe(alias);
        done();
      }, 10);
    });
  });

  describe('fetchAlias', () => {
    it('should fetch and cache alias for valid jvmId', (done) => {
      const jvmId = 'test-jvm-id';
      const alias = 'test-alias';
      const mockLineage = createMockLineage(alias);

      (mockApiService.getTargetLineage as jest.Mock).mockReturnValue(of(mockLineage));

      service.fetchAlias(jvmId);

      setTimeout(() => {
        expect(mockApiService.getTargetLineage).toHaveBeenCalledWith(jvmId);
        expect(service.getAlias(jvmId)).toBe(alias);
        done();
      }, 10);
    });

    it('should not fetch for empty jvmId', () => {
      service.fetchAlias('');
      expect(mockApiService.getTargetLineage).not.toHaveBeenCalled();
    });

    it('should not fetch for "uploads" jvmId', () => {
      service.fetchAlias('uploads');
      expect(mockApiService.getTargetLineage).not.toHaveBeenCalled();
    });

    it('should not fetch twice for the same jvmId', (done) => {
      const jvmId = 'test-jvm-id';
      const alias = 'test-alias';
      const mockLineage = createMockLineage(alias);

      (mockApiService.getTargetLineage as jest.Mock).mockReturnValue(of(mockLineage));

      service.fetchAlias(jvmId);
      service.fetchAlias(jvmId);

      setTimeout(() => {
        expect(mockApiService.getTargetLineage).toHaveBeenCalledTimes(1);
        done();
      }, 10);
    });

    it('should handle API errors gracefully', (done) => {
      const jvmId = 'test-jvm-id';
      const error = new Error('API Error');

      (mockApiService.getTargetLineage as jest.Mock).mockReturnValue(throwError(() => error));

      service.fetchAlias(jvmId);

      setTimeout(() => {
        expect(mockApiService.getTargetLineage).toHaveBeenCalledWith(jvmId);
        expect(service.getAlias(jvmId)).toBeUndefined();
        done();
      }, 10);
    });

    it('should not cache alias if target has no alias', (done) => {
      const jvmId = 'test-jvm-id';
      const mockLineage: EnvironmentNode = {
        id: 1,
        name: 'Universe',
        nodeType: NodeType.UNIVERSE,
        labels: [],
        children: [
          {
            id: 2,
            name: 'Target',
            nodeType: NodeType.JVM,
            labels: [],
            target: {
              agent: false,
              alias: '',
              connectUrl: 'service:jmx:rmi:///jndi/rmi://localhost:9091/jmxrmi',
              labels: [],
              annotations: {
                cryostat: [],
                platform: [],
              },
            },
          } as TargetNode,
        ],
      };

      (mockApiService.getTargetLineage as jest.Mock).mockReturnValue(of(mockLineage));

      service.fetchAlias(jvmId);

      setTimeout(() => {
        expect(service.getAlias(jvmId)).toBeUndefined();
        done();
      }, 10);
    });
  });

  describe('fetchAliases', () => {
    it('should fetch aliases for multiple jvmIds', (done) => {
      const jvmIds = ['jvm-1', 'jvm-2', 'jvm-3'];
      const mockLineage1 = createMockLineage('alias-1');
      const mockLineage2 = createMockLineage('alias-2');
      const mockLineage3 = createMockLineage('alias-3');

      (mockApiService.getTargetLineage as jest.Mock)
        .mockReturnValueOnce(of(mockLineage1))
        .mockReturnValueOnce(of(mockLineage2))
        .mockReturnValueOnce(of(mockLineage3));

      service.fetchAliases(jvmIds);

      setTimeout(() => {
        expect(mockApiService.getTargetLineage).toHaveBeenCalledTimes(3);
        expect(service.getAlias('jvm-1')).toBe('alias-1');
        expect(service.getAlias('jvm-2')).toBe('alias-2');
        expect(service.getAlias('jvm-3')).toBe('alias-3');
        done();
      }, 10);
    });

    it('should skip invalid jvmIds', (done) => {
      const jvmIds = ['', 'uploads', 'valid-id'];
      const mockLineage = createMockLineage('valid-alias');

      (mockApiService.getTargetLineage as jest.Mock).mockReturnValue(of(mockLineage));

      service.fetchAliases(jvmIds);

      setTimeout(() => {
        expect(mockApiService.getTargetLineage).toHaveBeenCalledTimes(1);
        expect(mockApiService.getTargetLineage).toHaveBeenCalledWith('valid-id');
        done();
      }, 10);
    });
  });

  describe('clearCache', () => {
    it('should clear all cached data', (done) => {
      const jvmId = 'test-jvm-id';
      const alias = 'test-alias';
      const mockLineage = createMockLineage(alias);

      (mockApiService.getTargetLineage as jest.Mock).mockReturnValue(of(mockLineage));

      service.fetchAlias(jvmId);

      setTimeout(() => {
        expect(service.getAlias(jvmId)).toBe(alias);

        service.clearCache();

        expect(service.getAlias(jvmId)).toBeUndefined();
        done();
      }, 10);
    });

    it('should emit empty map after clearing', (done) => {
      const jvmId = 'test-jvm-id';
      const alias = 'test-alias';
      const mockLineage = createMockLineage(alias);

      (mockApiService.getTargetLineage as jest.Mock).mockReturnValue(of(mockLineage));

      const emissions: Map<string, string>[] = [];
      const subscription = service.aliasMap().subscribe((map) => {
        emissions.push(new Map(map));
      });

      service.fetchAlias(jvmId);

      setTimeout(() => {
        service.clearCache();

        setTimeout(() => {
          expect(emissions[emissions.length - 1].size).toBe(0);
          subscription.unsubscribe();
          done();
        }, 10);
      }, 10);
    });
  });
});
