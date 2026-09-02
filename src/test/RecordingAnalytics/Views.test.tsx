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

import { Views } from '@app/RecordingAnalytics/views/Views';
import { ThemeSetting } from '@app/Settings/types';
import { defaultServices } from '@app/Shared/Services/Services';
import { cleanup, screen, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { of, throwError } from 'rxjs';
import { render } from '../utils';

jest.mock('@app/RecordingAnalytics/AnalysisResult', () => ({
  AnalysisResult: jest.fn((props) => (
    <div data-testid="code-editor">
      <div data-testid="code-editor-code">{props.code}</div>
      {props.customControls && (
        <div data-testid="code-editor-controls">
          {(Array.isArray(props.customControls) ? props.customControls : [props.customControls]).map(
            (c: React.ReactNode, i: number) => (
              <div key={i}>{c}</div>
            ),
          )}
        </div>
      )}
    </div>
  )),
}));

jest.mock('@patternfly/react-code-editor', () => ({
  CodeEditorControl: jest.fn((props) => (
    <button
      data-testid="code-editor-control"
      onClick={props.onClick}
      disabled={props.isDisabled}
      aria-label={props['aria-label']}
    >
      {props.isLoading && <span>Loading...</span>}
    </button>
  )),
  Language: { sql: 'sql', json: 'json' },
}));

const mockViewList = {
  vm: ['blocked-by-system-gc', 'gc'],
  env: ['active-recordings', 'recording'],
  app: ['allocation-by-class', 'hot-methods'],
};

const MOCK_VIEW_TEXT = '====================\nView: recording\n====================\nEvent Count   42\n';

describe('<Views />', () => {
  let mockDoGet: jest.SpyInstance;
  let mockSendRequest: jest.SpyInstance;

  beforeEach(() => {
    mockDoGet = jest.spyOn(defaultServices.api, 'doGet').mockImplementation((path: string) => {
      if ((path as string).endsWith('/views')) return of(mockViewList) as any;
      return of([]) as any;
    });
    mockSendRequest = jest.spyOn(defaultServices.api, 'sendRequest').mockReturnValue(
      of({
        ok: true,
        status: 200,
        text: () => Promise.resolve(MOCK_VIEW_TEXT),
      } as any),
    );
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

  const renderViews = (jvmId = '', filename = '') =>
    render({
      routerConfigs: {
        routes: [{ path: '/views', element: <Views jvmId={jvmId} filename={filename} /> }],
      },
    });

  it('render view button is disabled when jvmId is empty', async () => {
    renderViews('', 'recording1.jfr');
    await waitFor(() => expect(screen.getByLabelText('Render view')).toBeDisabled());
  });

  it('render view button is disabled when filename is empty', async () => {
    renderViews('jvm-1', '');
    await waitFor(() => expect(screen.getByLabelText('Render view')).toBeDisabled());
  });

  it('render view button is enabled when jvmId and filename are provided', async () => {
    renderViews('jvm-1', 'recording1.jfr');
    await waitFor(() => expect(screen.getByLabelText('Render view')).not.toBeDisabled());
  });

  it('fetches view list when jvmId and filename are provided', async () => {
    renderViews('jvm-1', 'recording1.jfr');
    await waitFor(() =>
      expect(mockDoGet).toHaveBeenCalledWith('targets/jvm-1/recordings/recording1.jfr/views', 'beta'),
    );
  });

  it('does not fetch view list when jvmId is empty', async () => {
    renderViews('', 'recording1.jfr');
    await waitFor(() => expect(screen.getByLabelText('Render view')).toBeDisabled());
    expect(mockDoGet).not.toHaveBeenCalled();
  });

  it('view selector shows grouped options from the fetched view list', async () => {
    const { user } = renderViews('jvm-1', 'recording1.jfr');

    await waitFor(() => expect(screen.getByLabelText('Select view')).toBeInTheDocument());
    await user.click(screen.getByLabelText('Select view'));

    await waitFor(() => {
      expect(screen.getByText('JVM')).toBeInTheDocument();
      expect(screen.getByText('Environment')).toBeInTheDocument();
      expect(screen.getByText('Application')).toBeInTheDocument();
      expect(screen.getByRole('treeitem', { name: 'gc' })).toBeInTheDocument();
      expect(screen.getByRole('treeitem', { name: 'recording' })).toBeInTheDocument();
      expect(screen.getByRole('treeitem', { name: 'hot-methods' })).toBeInTheDocument();
    });
  });

  it('executes a view render and displays the plain-text result', async () => {
    const { user } = renderViews('jvm-1', 'recording1.jfr');

    await waitFor(() => expect(screen.getByLabelText('Render view')).not.toBeDisabled());
    await user.click(screen.getByLabelText('Render view'));

    await waitFor(() =>
      expect(mockSendRequest).toHaveBeenCalledWith(
        'beta',
        'targets/jvm-1/recordings/recording1.jfr/view',
        { method: 'GET' },
        expect.any(URLSearchParams),
      ),
    );

    await waitFor(() => {
      const editor = screen.getByTestId('code-editor');
      expect(within(editor).getByTestId('code-editor-code')).toHaveTextContent('Event Count');
    });
  });

  it('passes correct query params for default options', async () => {
    const { user } = renderViews('jvm-1', 'recording1.jfr');

    await waitFor(() => expect(screen.getByLabelText('Render view')).not.toBeDisabled());
    await user.click(screen.getByLabelText('Render view'));

    await waitFor(() => expect(mockSendRequest).toHaveBeenCalled());

    const params: URLSearchParams = mockSendRequest.mock.calls[0][3];
    expect(params.get('view')).toBe('recording');
    expect(params.get('width')).toBe('120');
    expect(params.get('verbose')).toBe('false');
    expect(params.has('truncate')).toBe(false);
    expect(params.has('cellHeight')).toBe(false);
  });

  it('displays error message when view render fails', async () => {
    mockSendRequest.mockReturnValue(throwError(() => new Error('render failed')));

    const { user } = renderViews('jvm-1', 'recording1.jfr');

    await waitFor(() => expect(screen.getByLabelText('Render view')).not.toBeDisabled());
    await user.click(screen.getByLabelText('Render view'));

    await waitFor(() => {
      const editor = screen.getByTestId('code-editor');
      expect(within(editor).getByTestId('code-editor-code')).toHaveTextContent('Error: render failed');
    });
  });

  it('renders AnalysisResult for the result panel', async () => {
    renderViews('jvm-1', 'recording1.jfr');
    await waitFor(() => expect(screen.getByTestId('code-editor')).toBeInTheDocument());
  });
});
