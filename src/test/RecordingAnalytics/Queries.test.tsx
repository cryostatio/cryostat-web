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

import { Queries } from '@app/RecordingAnalytics/queries/Queries';
import { ThemeSetting } from '@app/Settings/types';
import { defaultServices } from '@app/Shared/Services/Services';
import { cleanup, screen, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { of, throwError } from 'rxjs';
import { render } from '../utils';

jest.mock('monaco-editor', () => ({
  editor: {
    getModels: jest.fn(() => [{ updateOptions: jest.fn() }]),
  },
}));

jest.mock('@monaco-editor/react', () => ({
  loader: { config: jest.fn() },
}));

jest.mock('@patternfly/react-code-editor', () => ({
  CodeEditor: jest.fn((props) => (
    <div data-testid="code-editor">
      <div data-testid="code-editor-language">{props.language}</div>
      <div data-testid="code-editor-readonly">{props.isReadOnly ? 'true' : 'false'}</div>
      <div data-testid="code-editor-code">{props.code}</div>
      {props.customControls && (
        <div data-testid="code-editor-controls">
          {props.customControls.map((control: any, idx: number) => (
            <div key={idx}>{control}</div>
          ))}
        </div>
      )}
      <button onClick={() => props.onChange && props.onChange('test query')}>Change Query</button>
      <button onClick={() => props.onEditorDidMount && props.onEditorDidMount({}, {})}>Mount Editor</button>
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
      {props.isLoading && <span>Loading...</span>}
    </button>
  )),
  Language: { sql: 'sql', json: 'json' },
}));

const mockApiResponse = {
  data: [
    { column1: 'value1', column2: 'value2' },
    { column1: 'value3', column2: 'value4' },
  ],
};

const createMockResponse = (data: any) => ({
  json: () => Promise.resolve(data),
  ok: true,
  status: 200,
  statusText: 'OK',
});

describe('<Queries />', () => {
  let mockSendRequest: jest.SpyInstance;

  beforeEach(() => {
    mockSendRequest = jest
      .spyOn(defaultServices.api, 'sendRequest')
      .mockReturnValue(of(createMockResponse(mockApiResponse) as any));
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

  const renderQueries = (jvmId = '', filename = '') =>
    render({
      routerConfigs: {
        routes: [{ path: '/queries', element: <Queries jvmId={jvmId} filename={filename} /> }],
      },
    });

  it('renders SQL code editor for query input', async () => {
    renderQueries();

    await waitFor(() => expect(screen.getAllByTestId('code-editor').length).toBeGreaterThan(0));

    const sqlEditor = screen.getAllByTestId('code-editor')[0];
    expect(within(sqlEditor).getByTestId('code-editor-language')).toHaveTextContent('sql');
    expect(within(sqlEditor).getByTestId('code-editor-readonly')).toHaveTextContent('false');
  });

  it('renders JSON code editor for results display', async () => {
    renderQueries();

    await waitFor(() => expect(screen.getAllByTestId('code-editor').length).toBe(2));

    const jsonEditor = screen.getAllByTestId('code-editor')[1];
    expect(within(jsonEditor).getByTestId('code-editor-language')).toHaveTextContent('json');
    expect(within(jsonEditor).getByTestId('code-editor-readonly')).toHaveTextContent('true');
  });

  it('displays sample query dropdown', async () => {
    renderQueries();
    await waitFor(() => expect(screen.getByLabelText('Insert sample query')).toBeInTheDocument());
  });

  it('inserts sample query when selected from dropdown', async () => {
    const { user } = renderQueries();
    await waitFor(() => expect(screen.getByLabelText('Insert sample query')).toBeInTheDocument());

    await user.click(screen.getByLabelText('Insert sample query'));
    await waitFor(() => expect(screen.getByText('Count object allocation sample events')).toBeInTheDocument());

    await user.click(screen.getByText('Count object allocation sample events'));
    await waitFor(() => expect(screen.queryByText('Count object allocation sample events')).not.toBeVisible());
  });

  it('disables execute button when JVM ID is not provided', async () => {
    renderQueries('', 'recording1.jfr');
    await waitFor(() => expect(screen.getByLabelText('Execute query')).toBeDisabled());
  });

  it('disables execute button when filename is not provided', async () => {
    renderQueries('jvm-1', '');
    await waitFor(() => expect(screen.getByLabelText('Execute query')).toBeDisabled());
  });

  it('disables execute button when query is empty', async () => {
    renderQueries('jvm-1', 'recording1.jfr');
    await waitFor(() => expect(screen.getByLabelText('Execute query')).toBeDisabled());
  });

  it('enables execute button when jvmId, filename, and query are all present', async () => {
    const { user } = renderQueries('jvm-1', 'recording1.jfr');

    await user.click(within(screen.getAllByTestId('code-editor')[0]).getByText('Change Query'));

    await waitFor(() => expect(screen.getByLabelText('Execute query')).not.toBeDisabled());
  });

  it('executes query and displays results', async () => {
    const { user } = renderQueries('jvm-1', 'recording1.jfr');

    await user.click(within(screen.getAllByTestId('code-editor')[0]).getByText('Change Query'));
    await waitFor(() => expect(screen.getByLabelText('Execute query')).not.toBeDisabled());
    await user.click(screen.getByLabelText('Execute query'));

    await waitFor(() =>
      expect(mockSendRequest).toHaveBeenCalledWith('beta', 'recording_analytics/jvm-1/recording1.jfr', {
        method: 'POST',
        body: expect.any(FormData),
      }),
    );

    await waitFor(
      () => {
        const resultCode = within(screen.getAllByTestId('code-editor')[1]).getByTestId('code-editor-code');
        expect(resultCode.textContent).toContain('"data"');
        expect(resultCode.textContent).toContain('"column1"');
        expect(resultCode.textContent).toContain('"value1"');
      },
      { timeout: 3000 },
    );
  });

  it('displays error message when query execution fails', async () => {
    mockSendRequest.mockReturnValue(throwError(() => new Error('Query execution failed')));

    const { user } = renderQueries('jvm-1', 'recording1.jfr');

    await user.click(within(screen.getAllByTestId('code-editor')[0]).getByText('Change Query'));
    await waitFor(() => expect(screen.getByLabelText('Execute query')).not.toBeDisabled());
    await user.click(screen.getByLabelText('Execute query'));

    await waitFor(
      () => {
        const resultCode = within(screen.getAllByTestId('code-editor')[1]).getByTestId('code-editor-code');
        expect(resultCode).toHaveTextContent('Error: Query execution failed');
      },
      { timeout: 3000 },
    );
  });

  it('executes query multiple times successfully', async () => {
    const { user } = renderQueries('jvm-1', 'recording1.jfr');

    await user.click(within(screen.getAllByTestId('code-editor')[0]).getByText('Change Query'));
    const executeButton = screen.getByLabelText('Execute query');
    await user.click(executeButton);

    await waitFor(
      () => {
        const resultCode = within(screen.getAllByTestId('code-editor')[1]).getByTestId('code-editor-code');
        expect(resultCode.textContent).toContain('"data"');
      },
      { timeout: 3000 },
    );

    await user.click(executeButton);

    await waitFor(
      () => {
        expect(mockSendRequest).toHaveBeenCalledTimes(2);
        expect(within(screen.getAllByTestId('code-editor')[1]).getByTestId('code-editor-code').textContent).toContain(
          '"data"',
        );
      },
      { timeout: 3000 },
    );
  });
});
