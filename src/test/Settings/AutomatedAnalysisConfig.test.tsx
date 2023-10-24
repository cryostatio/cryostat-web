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

/* eslint @typescript-eslint/no-explicit-any: 0 */
import { AutomatedAnalysis } from '@app/Settings/Config/AutomatedAnalysis';
import { defaultAutomatedAnalysisRecordingConfig } from '@app/Shared/Services/service.types';
import { defaultServices } from '@app/Shared/Services/Services';
import { renderSnapshot } from '@test/utils';
import * as React from 'react';

jest.mock('@app/Dashboard/AutomatedAnalysis/AutomatedAnalysisConfigForm', () => ({
  AutomatedAnalysisConfigForm: (_: any) => <>Automated Analysis Configuration Form</>,
}));

jest.mock('@app/TargetView/TargetSelect', () => ({
  TargetSelect: (_: any) => <>Target Select</>,
}));

jest
  .spyOn(defaultServices.settings, 'automatedAnalysisRecordingConfig')
  .mockReturnValue(defaultAutomatedAnalysisRecordingConfig);

describe('<AutomatedAnalysisConfig/>', () => {
  it('renders correctly', async () => {
    const tree = await renderSnapshot({
      routerConfigs: {
        routes: [
          {
            path: '/settings',
            element: React.createElement(AutomatedAnalysis.content, null),
          },
        ],
      },
    });
    expect(tree?.toJSON()).toMatchSnapshot();
  });
});
