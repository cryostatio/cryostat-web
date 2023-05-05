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
import { AutomatedAnalysisRecordingConfig, EventTemplate } from '@app/Shared/Services/Api.service';
import { defaultServices } from '@app/Shared/Services/Services';
import '@testing-library/jest-dom';
import { cleanup, screen } from '@testing-library/react';
import * as React from 'react';
import { of } from 'rxjs';
import { renderWithServiceContext, testT } from '../../Common';

const mockTarget = { connectUrl: 'service:jmx:rmi://someUrl', alias: 'fooTarget' };

const mockTemplate1: EventTemplate = {
  name: 'template1',
  description: 'template1 description',
  provider: 'Cryostat',
  type: 'TARGET',
};

const mockTemplate2: EventTemplate = {
  name: 'template2',
  description: 'template2 description',
  provider: 'Cryostat',
  type: 'TARGET',
};

const mockAutomatedAnalysisRecordingConfig: AutomatedAnalysisRecordingConfig = {
  template: {
    name: 'template1',
    type: 'TARGET',
  },
  maxSize: 1048576,
  maxAge: 0,
};

jest.mock('@app/Shared/Services/Target.service', () => ({
  ...jest.requireActual('@app/Shared/Services/Target.service'), // Require actual implementation of utility functions for Target
}));

jest.mock('@app/utils/LocalStorage', () => {
  return {
    getFromLocalStorage: jest.fn((_key: string, _defaultValue: unknown): unknown => {
      return 'service:jmx:rmi://someUrl';
    }),
  };
});

jest.spyOn(defaultServices.api, 'doGet').mockReturnValue(of([mockTemplate1, mockTemplate2]));

jest
  .spyOn(defaultServices.settings, 'automatedAnalysisRecordingConfig')
  .mockReturnValue(mockAutomatedAnalysisRecordingConfig);

jest.spyOn(defaultServices.targets, 'targets').mockReturnValue(of([mockTarget]));

describe('<AutomatedAnalysisConfigForm />', () => {
  afterEach(cleanup);

  it('renders default view correctly', async () => {
    renderWithServiceContext(<AutomatedAnalysisConfigForm />);

    expect(screen.getByText(/Current Configuration/i)).toBeInTheDocument();
    expect(screen.getByText('Template')).toBeInTheDocument();
    expect(screen.getByText(/maximum size \(b\)/i)).toBeInTheDocument();
    expect(screen.getByText(/maximum age \(s\)/i)).toBeInTheDocument();
  });

  it('renders editing drawer view correctly', async () => {
    const { user } = renderWithServiceContext(<AutomatedAnalysisConfigForm useTitle />);

    expect(screen.getByText(/profiling recording configuration/i)).toBeInTheDocument(); // Form title

    await user.click(
      screen.getByRole('button', {
        name: /edit/i,
      })
    ); // Edit button

    const templateSelect = screen.getByLabelText('Template *'); // Template select
    expect(templateSelect).toBeInTheDocument();
    expect(templateSelect).toBeVisible();
    expect(screen.getByText(/The Event Template to be applied to Automated Analysis recordings./i)).toBeInTheDocument();

    expect(screen.getByText(/the maximum size of recording data saved to disk./i)).toBeInTheDocument();

    expect(screen.getByText(/the maximum age of recording data stored to disk./i)).toBeInTheDocument();
  });

  it('renders editing settings view correctly', async () => {
    const { user } = renderWithServiceContext(<AutomatedAnalysisConfigForm inlineForm />);

    expect(screen.queryByText(/profiling recording configuration/i)).not.toBeInTheDocument(); // Form title

    await user.click(screen.getByLabelText('Edit')); // Edit button

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

    await user.click(
      screen.getByRole('button', {
        name: /edit/i,
      })
    );

    const templateSelect = screen.getByRole('combobox', {
      name: /event template input/i,
    });

    const maxSizeInput = screen.getByRole('spinbutton', {
      name: /maximum size value/i,
    });

    const maxAgeInput = screen.getByRole('spinbutton', {
      name: /maximum age value/i,
    });

    expect(templateSelect).toHaveDisplayValue(['template1']);
    expect(maxAgeInput).toHaveValue(mockAutomatedAnalysisRecordingConfig.maxAge);
    expect(maxSizeInput).toHaveValue(mockAutomatedAnalysisRecordingConfig.maxSize);

    await user.selectOptions(templateSelect, ['template2']);
    await user.clear(maxSizeInput);
    await user.clear(maxAgeInput);
    await user.type(maxSizeInput, '100');
    await user.type(maxAgeInput, '100');

    const config = {
      template: {
        name: mockTemplate2.name,
        type: mockTemplate2.type,
      },
      maxSize: 100,
      maxAge: 100,
    };

    await user.click(
      screen.getByRole('button', {
        name: testT('AutomatedAnalysisConfigForm.SAVE_CHANGES'),
      })
    );
    expect(setConfigRequestSpy).toHaveBeenCalledWith(config);
  });
});
