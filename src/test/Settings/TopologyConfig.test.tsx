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

import { TopologyConfig } from '@app/Settings/Config/TopologyConfig';
import { defaultServices } from '@app/Shared/Services/Services';
import { cleanup } from '@testing-library/react';
import React from 'react';
import { of } from 'rxjs';
import { renderSnapshot } from '../utils';

jest.spyOn(defaultServices.api, 'doGet').mockReturnValue(
  of([
    {
      id: 'VMOperations',
      name: 'VMOperation Peak Duration',
      requiredEvents: {
        'jdk.ExecuteVMOperation': 'ENABLED',
      },
      topic: 'vm_operations',
    },
    {
      id: 'biasedLockingRevocation',
      name: 'Biased Locking Revocation',
      requiredEvents: {
        'jdk.BiasedLockClassRevocation': 'ENABLED',
      },
      topic: 'biased_locking',
    },
    {
      id: 'biasedLockingRevocationPause',
      name: 'Biased Locking Revocation Pauses',
      requiredEvents: {
        'jdk.ExecuteVMOperation': 'ENABLED',
      },
      topic: 'vm_operations',
    },
  ]),
);

describe('<TopologyConfig />', () => {
  afterEach(cleanup);

  it('renders correctly', async () => {
    const tree = await renderSnapshot({
      routerConfigs: {
        routes: [
          {
            path: '/settings/topology',
            element: React.createElement(TopologyConfig.content, null),
          },
        ],
      },
    });
    expect(tree?.toJSON()).toMatchSnapshot();
  });
});
