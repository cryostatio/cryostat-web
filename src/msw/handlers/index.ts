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

import { fromOpenApi } from '@msw/source/open-api';
import openApiSpec from '../../../.schemas/openapi.json';
import { restHandlers, wsHandlers } from './rest';
import { graphqlHandlers } from './graphql';

export async function createHandlers() {
  const rawSpec = openApiSpec as Record<string, any>;
  const authority = process.env.CRYOSTAT_AUTHORITY || 'http://localhost:8181';
  const spec = {
    ...rawSpec,
    servers: [{ url: authority }, ...(rawSpec.servers || [])],
  };
  const openApiHandlers = await fromOpenApi(spec as any);
  // Stateful custom handlers backed by @mswjs/data take precedence,
  // falling back to schema-generated @msw/source handlers for un-overridden endpoints
  return [...restHandlers, ...graphqlHandlers, ...wsHandlers, ...openApiHandlers];
}
