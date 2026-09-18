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

import { AnalysisResult } from '@app/RecordingAnalytics/AnalysisResult';
import { ThemeSetting } from '@app/Settings/types';
import { defaultServices } from '@app/Shared/Services/Services';
import { act, cleanup, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { of } from 'rxjs';
import { render } from '../utils';

jest.mock('@patternfly/react-code-editor', () => ({
  CodeEditor: jest.fn((props) => (
    <div data-testid="code-editor">
      <div data-testid="code-editor-code">{props.code}</div>
      {props.customControls && (
        <div data-testid="code-editor-controls">
          {(Array.isArray(props.customControls) ? props.customControls : [props.customControls]).map(
            (control: React.ReactNode, idx: number) => (
              <div key={idx}>{control}</div>
            ),
          )}
        </div>
      )}
    </div>
  )),
  CodeEditorControl: jest.fn((props) => (
    <button
      data-testid="code-editor-control"
      onClick={props.onClick}
      disabled={props.isDisabled}
      aria-label={props['aria-label']}
    >
      {props.icon}
    </button>
  )),
  Language: { sql: 'sql', json: 'json' },
}));

Object.defineProperty(navigator, 'clipboard', {
  value: { writeText: jest.fn().mockResolvedValue(undefined) },
  configurable: true,
  writable: true,
});

describe('<AnalysisResult />', () => {
  beforeEach(() => {
    jest.spyOn(defaultServices.settings, 'themeSetting').mockReturnValue(of(ThemeSetting.LIGHT));
    jest.spyOn(defaultServices.settings, 'media').mockReturnValue(
      of({
        matches: false,
        media: '(prefers-color-scheme: dark)',
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      }),
    );
  });

  afterEach(() => {
    cleanup();
    jest.clearAllMocks();
  });

  const renderAnalysisResult = (code = '') =>
    render({
      routerConfigs: {
        routes: [{ path: '/result', element: <AnalysisResult code={code} /> }],
      },
    });

  it('renders the code editor', async () => {
    renderAnalysisResult('some result');
    await waitFor(() => expect(screen.getByTestId('code-editor')).toBeInTheDocument());
  });

  it('displays the provided code', async () => {
    renderAnalysisResult('hello world');
    await waitFor(() => expect(screen.getByTestId('code-editor-code')).toHaveTextContent('hello world'));
  });

  it('renders the copy to clipboard button', async () => {
    renderAnalysisResult('some result');
    await waitFor(() => expect(screen.getByLabelText('Copy result to clipboard')).toBeInTheDocument());
  });

  it('copy button is disabled when code is empty', async () => {
    renderAnalysisResult('');
    await waitFor(() => expect(screen.getByLabelText('Copy result to clipboard')).toBeDisabled());
  });

  it('copy button is enabled when code is non-empty', async () => {
    renderAnalysisResult('some result');
    await waitFor(() => expect(screen.getByLabelText('Copy result to clipboard')).not.toBeDisabled());
  });

  it('clicking copy button writes code to clipboard', async () => {
    const { user } = renderAnalysisResult('result text');
    const mockWriteText = jest.fn().mockResolvedValue(undefined);
    navigator.clipboard.writeText = mockWriteText;

    await waitFor(() => expect(screen.getByLabelText('Copy result to clipboard')).not.toBeDisabled());

    await act(async () => {
      await user.click(screen.getByLabelText('Copy result to clipboard'));
    });

    expect(mockWriteText).toHaveBeenCalledWith('result text');
  });

  it('clicking copy button with multiline code writes full content to clipboard', async () => {
    const multilineCode = 'line1\nline2\nline3';
    const { user } = renderAnalysisResult(multilineCode);
    const mockWriteText = jest.fn().mockResolvedValue(undefined);
    navigator.clipboard.writeText = mockWriteText;

    await waitFor(() => expect(screen.getByLabelText('Copy result to clipboard')).not.toBeDisabled());

    await act(async () => {
      await user.click(screen.getByLabelText('Copy result to clipboard'));
    });

    expect(mockWriteText).toHaveBeenCalledWith(multilineCode);
  });

  it('renders additional custom controls alongside the copy button', async () => {
    const extraControl = <button aria-label="extra-action">Extra</button>;
    render({
      routerConfigs: {
        routes: [
          {
            path: '/result',
            element: <AnalysisResult code="some result" customControls={[extraControl]} />,
          },
        ],
      },
    });

    await waitFor(() => {
      expect(screen.getByLabelText('extra-action')).toBeInTheDocument();
      expect(screen.getByLabelText('Copy result to clipboard')).toBeInTheDocument();
    });
  });
});
