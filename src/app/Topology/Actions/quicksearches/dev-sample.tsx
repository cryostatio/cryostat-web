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
import { FeatureLevel } from '@app/Shared/Services/service.types';
import { ContainerNodeIcon } from '@patternfly/react-icons';
import * as React from 'react';
import { QuickSearchItem } from '../types';

const _DevSampleSearchItem: QuickSearchItem = {
  id: 'dev-sample',
  name: 'Sample',
  icon: <ContainerNodeIcon />,
  labels: [
    {
      content: 'Sample',
      color: 'blue',
    },
  ],
  descriptionShort: 'This is a sample template to create a search item.',
  descriptionFull: 'Put the full description of the item here.',
  featureLevel: FeatureLevel.DEVELOPMENT,
  createAction: () => undefined,
};

export default _DevSampleSearchItem;
