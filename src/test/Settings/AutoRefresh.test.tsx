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

import { AutoRefresh } from '@app/Settings/AutoRefresh';
import { defaultServices, ServiceContext } from '@app/Shared/Services/Services';
import { cleanup, screen } from '@testing-library/react';
import * as React from 'react';
import renderer, { act } from 'react-test-renderer';
import { renderWithServiceContext, testT } from '../Common';

jest.spyOn(defaultServices.settings, 'autoRefreshEnabled').mockReturnValue(false);
jest.spyOn(defaultServices.settings, 'autoRefreshPeriod').mockReturnValue(30);
jest.spyOn(defaultServices.settings, 'autoRefreshUnits').mockReturnValue(1000);

describe('<AutoRefresh/>', () => {
  beforeEach(() => {
    // Clear mock instances, calls, and results
    jest.mocked(defaultServices.settings.setAutoRefreshEnabled).mockClear();
    jest.mocked(defaultServices.settings.setAutoRefreshPeriod).mockClear();
    jest.mocked(defaultServices.settings.setAutoRefreshUnits).mockClear();
  });
  afterEach(cleanup);

  it('renders correctly', async () => {
    let tree;
    await act(async () => {
      tree = renderer.create(
        <ServiceContext.Provider value={defaultServices}>
          {React.createElement(AutoRefresh.content, null)}
        </ServiceContext.Provider>,
      );
    });
    expect(tree.toJSON()).toMatchSnapshot();
  });

  it('should default to have auto-refresh disabled', async () => {
    renderWithServiceContext(React.createElement(AutoRefresh.content, null));

    const enableCheckbox = screen.getByLabelText('Enabled');
    expect(enableCheckbox).toBeInTheDocument();
    expect(enableCheckbox).toBeVisible();
    expect(enableCheckbox).not.toBeChecked();
  });

  it('should enable selections if checkbox is checked', async () => {
    const { user } = renderWithServiceContext(React.createElement(AutoRefresh.content, null));

    const enableCheckbox = screen.getByLabelText(testT('SETTINGS.AUTO_REFRESH.CHECKBOX_LABEL'));
    expect(enableCheckbox).toBeInTheDocument();
    expect(enableCheckbox).toBeVisible();

    await user.click(enableCheckbox);

    [
      screen.getByLabelText('Duration Picker Period Input'),
      screen.getByLabelText('Duration Picker Units Input'),
    ].forEach((input) => {
      expect(input).toBeInTheDocument();
      expect(input).toBeVisible();
      expect(input).not.toBeDisabled();
    });

    expect(defaultServices.settings.setAutoRefreshEnabled).toHaveBeenCalledTimes(1);
    expect(defaultServices.settings.setAutoRefreshEnabled).toHaveBeenCalledWith(true);
  });

  it('should set value to local storage when congfigured', async () => {
    const { user } = renderWithServiceContext(React.createElement(AutoRefresh.content, null));

    const periodInput = screen.getByLabelText('Duration Picker Period Input');
    expect(periodInput).toBeInTheDocument();
    expect(periodInput).toBeVisible();

    const enableCheckbox = screen.getByLabelText(testT('SETTINGS.AUTO_REFRESH.CHECKBOX_LABEL'));
    expect(enableCheckbox).toBeInTheDocument();
    expect(enableCheckbox).toBeVisible();

    await user.click(enableCheckbox);
    await user.clear(periodInput as HTMLInputElement);
    await user.type(periodInput, '20');

    // Clear + typing 2 + typing 0
    expect(defaultServices.settings.setAutoRefreshPeriod).toHaveBeenCalledTimes(3);
    expect(defaultServices.settings.setAutoRefreshPeriod).toHaveBeenLastCalledWith(20);

    const unitSelect = screen.getByLabelText('Duration Picker Units Input');
    expect(unitSelect).toBeInTheDocument();
    expect(unitSelect).toBeVisible();

    await user.selectOptions(unitSelect, 'Minutes');

    expect(defaultServices.settings.setAutoRefreshUnits).toHaveBeenCalledTimes(1);
    expect(defaultServices.settings.setAutoRefreshUnits).toHaveBeenLastCalledWith(60 * 1000);
  });
});
