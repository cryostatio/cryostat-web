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
import { AutomatedAnalysisConfigForm } from '@app/Dashboard/AutomatedAnalysis/AutomatedAnalysisConfigForm';
import { defaultAutomatedAnalysisRecordingConfig, EventTemplate } from '@app/Shared/Services/Api.service';
import { defaultServices } from '@app/Shared/Services/Services';
import '@testing-library/jest-dom';
import { cleanup, screen } from '@testing-library/react';
import * as React from 'react';
import { of } from 'rxjs';
import { renderWithServiceContext } from '../../Common';

const mockTarget = { connectUrl: 'service:jmx:rmi://someUrl', alias: 'fooTarget' };

const mockTemplate1: EventTemplate = {
  name: 'template1',
  description: 'template1 description',
  provider: 'Cryostat',
  type: 'TARGET',
};

const mockTemplates: EventTemplate[] = [
  mockTemplate1,
  {
    name: 'template2',
    description: 'template2 description',
    provider: 'Cryostat',
    type: 'TARGET',
  },
];

jest.spyOn(defaultServices.api, 'createRecording').mockReturnValue(of());
jest.spyOn(defaultServices.api, 'doGet').mockReturnValue(of(mockTemplates));

jest
  .spyOn(defaultServices.settings, 'automatedAnalysisRecordingConfig')
  .mockReturnValue(defaultAutomatedAnalysisRecordingConfig);

jest.spyOn(defaultServices.target, 'target').mockReturnValue(of(mockTarget));
jest.spyOn(defaultServices.target, 'authFailure').mockReturnValue(of());
jest.spyOn(defaultServices.target, 'authRetry').mockReturnValue(of());

describe('<AutomatedAnalysisConfigForm />', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders default view correctly', async () => {
    renderWithServiceContext(<AutomatedAnalysisConfigForm useTitle />);

    expect(screen.getByText(/profiling recording configuration/i)).toBeInTheDocument(); // Form title

    const templateSelect = screen.getByLabelText('Template *'); // Template select
    expect(templateSelect).toBeInTheDocument();
    expect(templateSelect).toBeVisible();
    expect(screen.getByText(/The Event Template to be applied to Automated Analysis recordings./i)).toBeInTheDocument();

    expect(screen.getByText(/the maximum size of recording data saved to disk./i)).toBeInTheDocument();

    expect(screen.getByText(/the maximum age of recording data stored to disk./i)).toBeInTheDocument();
  });

  it('renders settings view correctly', async () => {
    renderWithServiceContext(<AutomatedAnalysisConfigForm />);

    expect(screen.queryByText(/profiling recording configuration/i)).not.toBeInTheDocument(); // Form title

    const templateSelect = screen.getByLabelText('Template *'); // Template select
    expect(templateSelect).toBeInTheDocument();
    expect(templateSelect).toBeVisible();
    expect(screen.getByText(/The Event Template to be applied to Automated Analysis recordings./i)).toBeInTheDocument();

    expect(screen.getByText(/the maximum size of recording data saved to disk./i)).toBeInTheDocument();

    expect(screen.getByText(/the maximum age of recording data stored to disk./i)).toBeInTheDocument();
  });

  it('saves configuration', async () => {
    const setConfigRequestSpy = jest.spyOn(defaultServices.settings, 'setAutomatedAnalysisRecordingConfig');
    const { user } = renderWithServiceContext(<AutomatedAnalysisConfigForm />);

    const templateSelect = screen.getByRole('combobox', {
      name: /event template input/i,
    });

    const maxSizeInput = screen.getByRole('spinbutton', {
      name: /maximum size value/i,
    });

    const maxAgeInput = screen.getByRole('spinbutton', {
      name: /maximum age value/i,
    });

    expect(templateSelect).toHaveDisplayValue(['Select a Template']);
    expect(maxAgeInput).toHaveValue(defaultAutomatedAnalysisRecordingConfig.maxAge);
    expect(maxSizeInput).toHaveValue(defaultAutomatedAnalysisRecordingConfig.maxSize);

    await user.selectOptions(templateSelect, ['template1']);
    expect(setConfigRequestSpy).toHaveBeenCalledTimes(1);

    await user.clear(maxSizeInput);
    expect(setConfigRequestSpy).toHaveBeenCalledTimes(2);

    await user.clear(maxAgeInput);
    expect(setConfigRequestSpy).toHaveBeenCalledTimes(3);

    await user.type(maxSizeInput, '100');
    expect(setConfigRequestSpy).toHaveBeenCalledTimes(6);

    await user.type(maxAgeInput, '100');
    expect(setConfigRequestSpy).toHaveBeenCalledTimes(9); // settings are saved on every change

    const config = {
      template: `template=${mockTemplate1.name},type=${mockTemplate1.type}`,
      maxSize: 100,
      maxAge: 100,
    };

    expect(setConfigRequestSpy).toHaveBeenCalledWith(config);
  });
});
