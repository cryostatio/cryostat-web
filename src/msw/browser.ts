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

import { setupWorker, SetupWorker } from 'msw/browser';
import { createHandlers } from './handlers';
import { seedDatabase } from './db';

let workerInstance: SetupWorker | null = null;

export async function getWorker(): Promise<SetupWorker> {
  if (!workerInstance) {
    const handlers = await createHandlers();
    workerInstance = setupWorker(...handlers);
  }
  return workerInstance;
}

export async function startWorker() {
  seedDatabase();
  const worker = await getWorker();
  return worker.start({
    onUnhandledRequest: 'bypass',
    serviceWorker: {
      url: '/mockServiceWorker.js',
    },
  });
}
