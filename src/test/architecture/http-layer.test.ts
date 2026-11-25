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

import * as fs from 'fs';
import * as path from 'path';
import { it, describe } from '@jest/globals';

describe('HTTP Layer Architecture', () => {
  const srcDir = path.join(__dirname, '../../app');

  const getSourceFiles = (dir: string, excludeDirs: string[] = []): string[] => {
    const files: string[] = [];
    const walk = (currentPath: string) => {
      const entries = fs.readdirSync(currentPath);
      for (const entry of entries) {
        const fullPath = path.join(currentPath, entry);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
          if (!excludeDirs.includes(entry)) {
            walk(fullPath);
          }
        } else if (entry.endsWith('.ts') || entry.endsWith('.tsx')) {
          files.push(fullPath);
        }
      }
    };
    walk(dir);
    return files;
  };

  const readFileContent = (filePath: string): string => {
    return fs.readFileSync(filePath, 'utf-8');
  };

  const isInTestOrFakeFile = (filePath: string): boolean => {
    return (
      filePath.includes('/test/') ||
      filePath.includes('/itest/') ||
      filePath.includes('fakeData') ||
      filePath.includes('.test.') ||
      filePath.includes('.spec.')
    );
  };

  it('should enforce that fetch() and fetchFn parameters are only used in Api.service, tests, mocks, or fakes', () => {
    const sourceFiles = getSourceFiles(srcDir);
    const violations: string[] = [];

    for (const filePath of sourceFiles) {
      // Skip test files and fakes
      if (isInTestOrFakeFile(filePath)) {
        continue;
      }

      // Skip Api.service itself
      if (filePath.includes('Api.service')) {
        continue;
      }

      const content = readFileContent(filePath);

      // Check for direct fetch() usage (not in comments)
      const fetchMatches = content.match(/(?<!\/\/.*)(?<!\/\*.*)\bfetch\s*\(/g);
      if (fetchMatches) {
        violations.push(`${filePath}: Found direct fetch() call. Use ApiService methods instead.`);
      }

      // Check for fetchFn parameter or usage
      if (content.includes('fetchFn') && !filePath.includes('api.types')) {
        violations.push(`${filePath}: Found fetchFn usage. Use ApiService methods instead.`);
      }

      // Check for fromFetch import
      if (content.includes("from 'rxjs/fetch'") || content.includes('fromFetch')) {
        violations.push(`${filePath}: Found fromFetch usage. Use ApiService methods instead.`);
      }
    }

    if (violations.length > 0) {
      throw new Error(
        'HTTP Layer Architecture violations:\n' +
          'All HTTP requests must flow through Api.service.\n' +
          'Direct use of fetch(), fetchFn, or fromFetch() is only allowed in Api.service and test/mock/fake files.\n\n' +
          violations.join('\n'),
      );
    }
  });

  it('should ensure that FetchFn type is only used in Api.service and api.types', () => {
    const sourceFiles = getSourceFiles(srcDir);
    const violations: string[] = [];

    for (const filePath of sourceFiles) {
      // Skip test files and fakes
      if (isInTestOrFakeFile(filePath)) {
        continue;
      }

      // Allow Api.service and api.types
      if (filePath.includes('Api.service') || filePath.includes('api.types')) {
        continue;
      }

      const content = readFileContent(filePath);

      // Check for FetchFn type usage
      if (content.includes('FetchFn')) {
        violations.push(
          `${filePath}: Found FetchFn type usage. This is an internal implementation detail of Api.service. Use ApiService methods instead.`,
        );
      }
    }

    if (violations.length > 0) {
      throw new Error(
        'FetchFn Architecture violations:\n' +
          'FetchFn is an internal implementation detail of Api.service.\n' +
          'Other services should not depend on FetchFn.\n\n' +
          violations.join('\n'),
      );
    }
  });
});
