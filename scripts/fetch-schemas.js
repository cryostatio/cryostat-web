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

const fs = require('fs');
const path = require('path');
const https = require('https');

const TARGET_DIR = path.resolve(__dirname, '..', '.schemas');
const SCHEMA_FILES = ['openapi.yaml', 'schema.graphql'];
const DEFAULT_GITHUB_REPO = 'cryostatio/cryostat';
const DEFAULT_REF = process.env.CRYOSTAT_BACKEND_REF || 'main';

function fetchRemote(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return resolve(fetchRemote(res.headers.location));
        }
        if (res.statusCode !== 200) {
          return reject(new Error(`HTTP ${res.statusCode} when fetching ${url}`));
        }
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => resolve(data));
      })
      .on('error', reject);
  });
}

async function syncSchemas() {
  if (!fs.existsSync(TARGET_DIR)) {
    fs.mkdirSync(TARGET_DIR, { recursive: true });
  }

  const localCandidates = [
    process.env.CRYOSTAT_SCHEMA_DIR,
    path.resolve(__dirname, '..', '..', 'cryostat', 'schema'),
    path.resolve(__dirname, '..', 'schema'),
  ].filter(Boolean);

  let localSourceDir = null;
  for (const candidate of localCandidates) {
    if (
      fs.existsSync(candidate) &&
      SCHEMA_FILES.every((file) => fs.existsSync(path.join(candidate, file)))
    ) {
      localSourceDir = candidate;
      break;
    }
  }

  for (const filename of SCHEMA_FILES) {
    const destinationPath = path.join(TARGET_DIR, filename);

    let content = '';
    if (localSourceDir) {
      const sourcePath = path.join(localSourceDir, filename);
      console.log(`[schema:sync] Reading ${filename} from local directory: ${sourcePath}`);
      content = fs.readFileSync(sourcePath, 'utf8');
    } else {
      const remoteUrl = `https://raw.githubusercontent.com/${DEFAULT_GITHUB_REPO}/${DEFAULT_REF}/schema/${filename}`;
      console.log(`[schema:sync] Fetching ${filename} from ${remoteUrl}`);
      try {
        content = await fetchRemote(remoteUrl);
      } catch (err) {
        if (fs.existsSync(destinationPath)) {
          console.warn(`[schema:sync] Failed to fetch remote schema (${err.message}), using existing cached ${destinationPath}`);
          content = fs.readFileSync(destinationPath, 'utf8');
        } else {
          throw new Error(`Failed to obtain schema ${filename}: ${err.message}`);
        }
      }
    }

    if (filename.endsWith('.yaml') || filename.endsWith('.yml')) {
      // Strip leading C-style block license comments that break standard YAML parsers
      content = content.replace(/^\/\*[\s\S]*?\*\/\s*/, '');
    }

    fs.writeFileSync(destinationPath, content, 'utf8');

    if (filename === 'openapi.yaml') {
      try {
        const yaml = require('js-yaml');
        const jsonDoc = yaml.load(content);
        const jsonPath = path.join(TARGET_DIR, 'openapi.json');
        fs.writeFileSync(jsonPath, JSON.stringify(jsonDoc, null, 2), 'utf8');
        console.log(`[schema:sync] Converted openapi.yaml to ${jsonPath}`);
      } catch (e) {
        console.warn(`[schema:sync] Warning: Could not convert openapi.yaml to JSON:`, e.message);
      }
    }
  }

  console.log(`[schema:sync] Schemas successfully synced to ${TARGET_DIR}`);
}

syncSchemas().catch((err) => {
  console.error('[schema:sync] Error syncing schemas:', err);
  process.exit(1);
});
