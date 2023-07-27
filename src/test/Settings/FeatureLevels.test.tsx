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
import { FeatureLevels } from '@app/Settings/FeatureLevels';
import { defaultServices } from '@app/Shared/Services/Services';
import { FeatureLevel } from '@app/Shared/Services/Settings.service';
import { cleanup, screen, act } from '@testing-library/react';
import * as React from 'react';
import { of } from 'rxjs';
import { renderWithServiceContext, testT } from '../Common';

jest.spyOn(defaultServices.settings, 'featureLevel').mockReturnValue(of(FeatureLevel.PRODUCTION));

describe('<FeatureLevels/>', () => {
  beforeEach(() => {
    jest.mocked(defaultServices.settings.setFeatureLevel).mockClear();
  });

  afterEach(cleanup);

  it('should show PRODUCTION as default', async () => {
    renderWithServiceContext(React.createElement(FeatureLevels.content, null));

    const productionOption = screen.getByText(testT(FeatureLevel[FeatureLevel.PRODUCTION], { ns: 'common' }));
    expect(productionOption).toBeInTheDocument();
    expect(productionOption).toBeVisible();
  });

  it('should set value to local storage when configured', async () => {
    const { user } = renderWithServiceContext(React.createElement(FeatureLevels.content, null));

    const featureLevelSelect = screen.getByLabelText('Options menu');
    expect(featureLevelSelect).toBeInTheDocument();
    expect(featureLevelSelect).toBeVisible();

    await act(async () => {
      await user.click(featureLevelSelect);
    });

    const ul = screen.getByRole('listbox');
    expect(ul).toBeInTheDocument();
    expect(ul).toBeVisible();

    await user.selectOptions(ul, testT(FeatureLevel[FeatureLevel.BETA], { ns: 'common' }));

    expect(ul).not.toBeInTheDocument(); // Should close menu

    const betaOption = screen.getByText(testT(FeatureLevel[FeatureLevel.BETA], { ns: 'common' }));

    expect(betaOption).toBeInTheDocument();
    expect(betaOption).toBeVisible();

    const productionOption = screen.queryByText(testT(FeatureLevel[FeatureLevel.PRODUCTION], { ns: 'common' }));
    expect(productionOption).not.toBeInTheDocument();
  });
});
