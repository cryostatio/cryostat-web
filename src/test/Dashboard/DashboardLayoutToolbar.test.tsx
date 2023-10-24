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
import { DashboardLayoutToolbar } from '@app/Dashboard/DashboardLayoutToolbar';
import { defaultServices } from '@app/Shared/Services/Services';
import { renderSnapshot } from '@test/utils';

jest.spyOn(defaultServices.settings, 'deletionDialogsEnabledFor').mockReturnValue(true);

jest.mock('@patternfly/react-core', () => ({
  ...jest.requireActual('@patternfly/react-core'),
  Tooltip: ({ t }) => <>{t}</>,
}));

describe('<DashboardLayoutToolbar />', () => {
  it('renders correctly', async () => {
    const tree = await renderSnapshot({
      routerConfigs: { routes: [{ path: '/', element: <DashboardLayoutToolbar /> }] },
    });
    expect(tree?.toJSON()).toMatchSnapshot();
  });
});
