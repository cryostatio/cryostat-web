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

import type { CodegenConfig } from '@graphql-codegen/cli';

const config: CodegenConfig = {
  overwrite: true,
  schema: [
    `
    scalar BigInteger
    scalar Map
    scalar Upload
    `,
    '.schemas/schema.graphql',
  ],
  generates: {
    'src/schema/graphql.types.ts': {
      plugins: ['typescript'],
      config: {
        scalars: {
          BigInteger: 'number',
          Map: 'Record<string, unknown>',
        },
      },
    },
  },
};

export default config;
