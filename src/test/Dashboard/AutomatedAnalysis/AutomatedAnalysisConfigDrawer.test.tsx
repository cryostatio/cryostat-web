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
import { AutomatedAnalysisConfigDrawer } from '@app/Dashboard/AutomatedAnalysis/AutomatedAnalysisConfigDrawer';
import { SimpleResponse } from '@app/Shared/Services/api.types';
import { defaultAutomatedAnalysisRecordingConfig } from '@app/Shared/Services/service.types';
import { defaultServices } from '@app/Shared/Services/Services';
import '@testing-library/jest-dom';
import { cleanup, screen } from '@testing-library/react';
import { of } from 'rxjs';
import { renderWithServiceContext } from '../../Common';

const drawerContent = <div>Drawer Content</div>;

jest.mock('@app/Dashboard/AutomatedAnalysis/AutomatedAnalysisConfigForm', () => {
  return {
    ...jest.requireActual('@app/Dashboard/AutomatedAnalysis/AutomatedAnalysisConfigForm'),
    AutomatedAnalysisConfigForm: jest.fn(() => {
      return <div>AutomatedAnalysisConfigForm</div>;
    }),
  };
});

jest.spyOn(defaultServices.api, 'createRecording').mockReturnValue(of({ ok: true } as SimpleResponse));
jest
  .spyOn(defaultServices.settings, 'automatedAnalysisRecordingConfig')
  .mockReturnValue(defaultAutomatedAnalysisRecordingConfig);

describe('<AutomatedAnalysisConfigDrawer />', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders default view correctly', async () => {
    renderWithServiceContext(
      <AutomatedAnalysisConfigDrawer
        drawerContent={drawerContent}
        isContentAbove={false}
        onCreate={() => undefined}
        onError={() => undefined}
      />,
    );

    expect(screen.getByText(/drawer content/i)).toBeInTheDocument();
    const createRecording = screen.queryByRole('button', {
      name: /create recording/i,
    });
    const recordingActions = screen.queryByRole('button', {
      name: /open settings/i,
    });
    expect(createRecording).toBeInTheDocument();
    expect(recordingActions).toBeInTheDocument();
  });

  it('opens drawer when button clicked', async () => {
    const { user } = renderWithServiceContext(
      <AutomatedAnalysisConfigDrawer
        drawerContent={drawerContent}
        isContentAbove={false}
        onCreate={() => undefined}
        onError={() => undefined}
      />,
    );

    expect(screen.getByText(/drawer content/i)).toBeInTheDocument();
    const recordingActions = screen.getByRole('button', {
      name: /open settings/i,
    });

    await user.click(recordingActions);
    expect(screen.getByText(/automatedanalysisconfigform/i)).toBeInTheDocument();
  });

  it('creates a recording when Create Recording is clicked', async () => {
    const onCreateFunction = jest.fn();
    const requestSpy = jest.spyOn(defaultServices.api, 'createRecording');
    const { user } = renderWithServiceContext(
      <AutomatedAnalysisConfigDrawer
        drawerContent={drawerContent}
        isContentAbove={false}
        onCreate={onCreateFunction}
        onError={() => undefined}
      />,
    );

    const createRecording = screen.getByRole('button', {
      name: /create recording/i,
    });

    expect(screen.queryByText(/automatedanalysisconfigform/i)).not.toBeInTheDocument();

    // Click Default
    await user.click(createRecording);
    expect(requestSpy).toHaveBeenCalledTimes(1);
    expect(onCreateFunction).toHaveBeenCalledTimes(1);
  });
});
