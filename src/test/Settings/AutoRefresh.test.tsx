/*
 * Copyright The Cryostat Authors
 *
 * The Universal Permissive License (UPL), Version 1.0
 *
 * Subject to the condition set forth below, permission is hereby granted to any
 * person obtaining a copy of this software, associated documentation and/or data
 * (collectively the "Software"), free of charge and under any and all copyright
 * rights in the Software, and any and all patent rights owned or freely
 * licensable by each licensor hereunder covering either (i) the unmodified
 * Software as contributed to or provided by such licensor, or (ii) the Larger
 * Works (as defined below), to deal in both
 *
 * (a) the Software, and
 * (b) any piece of software and/or hardware listed in the lrgrwrks.txt file if
 * one is included with the Software (each a "Larger Work" to which the Software
 * is contributed by such licensors),
 *
 * without restriction, including without limitation the rights to copy, create
 * derivative works of, display, perform, and distribute the Software and make,
 * use, sell, offer for sale, import, export, have made, and have sold the
 * Software and the Larger Work(s), and to sublicense the foregoing rights on
 * either these or other terms.
 *
 * This license is subject to the following condition:
 * The above copyright notice and either this complete permission notice or at
 * a minimum a reference to the UPL must be included in all copies or
 * substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

import { AutoRefresh } from '@app/Settings/AutoRefresh';
import { defaultServices, ServiceContext } from '@app/Shared/Services/Services';
import { cleanup, screen } from '@testing-library/react';
import * as React from 'react';
import renderer, { act } from 'react-test-renderer';
import { renderWithServiceContext, testTranslate } from '../Common';

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
        </ServiceContext.Provider>
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

    const enableCheckbox = screen.getByLabelText(testTranslate('SETTINGS.AUTO_REFRESH.CHECKBOX_LABEL'));
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

    const enableCheckbox = screen.getByLabelText(testTranslate('SETTINGS.AUTO_REFRESH.CHECKBOX_LABEL'));
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
