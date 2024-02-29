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
jest.useFakeTimers('modern').setSystemTime(new Date('14 Feb 2023 00:00:00 UTC'));

import { Dashboard } from '@app/Dashboard/Dashboard';
import { ThemeSetting } from '@app/Settings/types';
import { Target } from '@app/Shared/Services/api.types';
import { FeatureLevel } from '@app/Shared/Services/service.types';
import { defaultChartControllerConfig } from '@app/Shared/Services/service.utils';
import { defaultServices } from '@app/Shared/Services/Services';
import { defaultDatetimeFormat } from '@i18n/datetime';
import { renderSnapshot } from '@test/utils';
import { of } from 'rxjs';

const mockFooConnectUrl = 'service:jmx:rmi://someFooUrl';

const mockFooTarget: Target = {
  connectUrl: mockFooConnectUrl,
  alias: 'fooTarget',
  annotations: {
    cryostat: [],
    platform: [],
  },
};

jest.mock('@app/TargetView/TargetContextSelector', () => ({
  TargetContextSelector: () => <div>Target Context Selector</div>,
}));

jest.mock('@app/Dashboard/AddCard.tsx', () => ({
  AddCard: () => <div>Add Card</div>,
}));

jest.mock('@app/Dashboard/DashboardLayoutToolbar', () => ({
  DashboardLayoutToolbar: () => <div>Dashboard Layout Toolbar</div>,
}));

jest.spyOn(defaultServices.target, 'target').mockReturnValue(of(mockFooTarget));
jest.spyOn(defaultServices.settings, 'featureLevel').mockReturnValue(of(FeatureLevel.PRODUCTION));
jest.spyOn(defaultServices.settings, 'datetimeFormat').mockReturnValue(of(defaultDatetimeFormat));
jest.spyOn(defaultServices.settings, 'themeSetting').mockReturnValue(of(ThemeSetting.LIGHT));
jest.spyOn(defaultServices.settings, 'media').mockReturnValue(of());
jest.spyOn(defaultServices.settings, 'chartControllerConfig').mockReturnValue(defaultChartControllerConfig);
jest.spyOn(defaultServices.api, 'getTargetMBeanMetrics').mockReturnValue(of({}));

describe('<Dashboard />', () => {
  it('renders correctly', async () => {
    const tree = await renderSnapshot({ routerConfigs: { routes: [{ path: '/', element: <Dashboard /> }] } });
    expect(tree?.toJSON()).toMatchSnapshot();
  });
});
