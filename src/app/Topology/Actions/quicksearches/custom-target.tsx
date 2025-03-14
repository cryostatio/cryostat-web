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
import openjdkSvg from '@app/assets/openjdk.svg';
import { FeatureLevel } from '@app/Shared/Services/service.types';
import { toPath } from '@app/utils/utils';
import { QuickSearchItem } from '../types';

const _CustomTargetSearchItem: QuickSearchItem = {
  id: 'custom-target',
  name: 'Custom Target',
  icon: <img src={openjdkSvg} />,
  labels: [
    {
      content: 'Discovery',
      color: 'green',
    },
  ],
  descriptionShort: 'Define a Custom Target definition.',
  descriptionFull: 'Provide a JMX Service URL along with necessary credentials to point to a Target JVM.',
  featureLevel: FeatureLevel.PRODUCTION,
  createAction: ({ navigate }) => {
    navigate(toPath('/topology/create-custom-target'));
  },
};

export default _CustomTargetSearchItem;
