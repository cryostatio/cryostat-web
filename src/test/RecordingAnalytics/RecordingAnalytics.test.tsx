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

import { RecordingAnalytics } from '@app/RecordingAnalytics/RecordingAnalytics';
import { ThemeSetting } from '@app/Settings/types';
import { RecordingDirectory } from '@app/Shared/Services/api.types';
import { defaultServices } from '@app/Shared/Services/Services';
import { cleanup, screen, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { of, throwError } from 'rxjs';
import { basePreloadedState, render } from '../utils';

jest.mock('monaco-editor', () => ({
  editor: {
    getModels: jest.fn(() => [
      {
        updateOptions: jest.fn(),
      },
    ]),
  },
}));

jest.mock('@monaco-editor/react', () => ({
  loader: {
    config: jest.fn(),
  },
}));

jest.mock('@app/BreadcrumbPage/BreadcrumbPage', () => ({
  BreadcrumbPage: jest.fn(({ children, pageTitle }) => (
    <div>
      <h1>{pageTitle}</h1>
      {children}
    </div>
  )),
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
  Language: {
    sql: 'sql',
    json: 'json',
  },
}));

jest.mock('@patternfly/react-templates', () => ({
  SimpleDropdown: jest.fn((props) => (
    <div data-testid="simple-dropdown">
      <button disabled={props.isDisabled}>{props.toggleContent}</button>
      <div data-testid="dropdown-items">
        {props.initialItems?.map((item: any, idx: number) => (
          <div key={idx}>
            {item.isDivider ? (
              <hr />
            ) : (
              <button onClick={item.onClick} data-value={item.value}>
                {item.content}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )),
}));

const mockRecordingDirectories: RecordingDirectory[] = [
  {
    connectUrl: 'service:jmx:rmi://jvm-1',
    jvmId: 'jvm-1',
    recordings: [
      {
        name: 'recording1.jfr',
        downloadUrl: 'http://example.com/recording1.jfr',
        reportUrl: '',
        archivedTime: 1234567890,
        size: 1024,
        metadata: { labels: [] },
      },
      {
        name: 'recording2.jfr',
        downloadUrl: 'http://example.com/recording2.jfr',
        reportUrl: '',
        archivedTime: 1234567891,
        size: 2048,
        metadata: { labels: [] },
      },
    ],
  },
  {
    connectUrl: 'service:jmx:rmi://jvm-2',
    jvmId: 'jvm-2',
    recordings: [
      {
        name: 'recording3.jfr',
        downloadUrl: 'http://example.com/recording3.jfr',
        reportUrl: '',
        archivedTime: 1234567892,
        size: 4096,
        metadata: { labels: [] },
      },
    ],
  },
];

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

describe('<RecordingAnalytics />', () => {
  let mockDoGet: jest.SpyInstance;
  let mockSendRequest: jest.SpyInstance;

  beforeEach(() => {
    mockDoGet = jest.spyOn(defaultServices.api, 'doGet').mockReturnValue(of(mockRecordingDirectories));
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

  it('renders with correct page title', async () => {
    render({
      routerConfigs: {
        routes: [
          {
            path: '/analytics',
            element: <RecordingAnalytics />,
          },
        ],
      },
    });

    expect(screen.getByText('Analytics')).toBeInTheDocument();
  });

  it('loads recording directories on mount', async () => {
    render({
      routerConfigs: {
        routes: [
          {
            path: '/analytics',
            element: <RecordingAnalytics />,
          },
        ],
      },
    });

    await waitFor(() => {
      expect(mockDoGet).toHaveBeenCalledWith('fs/recordings', 'beta');
    });
  });

  it('displays JVM ID dropdown with loaded JVM IDs', async () => {
    render({
      routerConfigs: {
        routes: [
          {
            path: '/analytics',
            element: <RecordingAnalytics />,
          },
        ],
      },
    });

    await waitFor(() => {
      expect(screen.getByText('JVM ID')).toBeInTheDocument();
    });

    const dropdowns = screen.getAllByTestId('simple-dropdown');
    const jvmDropdown = dropdowns[0];

    expect(within(jvmDropdown).getByText('jvm-1')).toBeInTheDocument();
    expect(within(jvmDropdown).getByText('jvm-2')).toBeInTheDocument();
    expect(within(jvmDropdown).getByText('Clear Selection')).toBeInTheDocument();
  });

  it('displays filename dropdown as disabled when no JVM ID is selected', async () => {
    render({
      routerConfigs: {
        routes: [
          {
            path: '/analytics',
            element: <RecordingAnalytics />,
          },
        ],
      },
    });

    await waitFor(() => {
      expect(screen.getByText('Filename')).toBeInTheDocument();
    });

    const dropdowns = screen.getAllByTestId('simple-dropdown');
    const filenameDropdown = dropdowns[1];
    const filenameButton = within(filenameDropdown).getByRole('button', { name: 'Filename' });

    expect(filenameButton).toBeDisabled();
  });

  it('enables filename dropdown and shows recordings when JVM ID is selected', async () => {
    const { user } = render({
      routerConfigs: {
        routes: [
          {
            path: '/analytics',
            element: <RecordingAnalytics />,
          },
        ],
      },
    });

    await waitFor(() => {
      expect(screen.getByText('JVM ID')).toBeInTheDocument();
    });

    const dropdowns = screen.getAllByTestId('simple-dropdown');
    const jvmDropdown = dropdowns[0];
    const jvm1Button = within(jvmDropdown).getByText('jvm-1');

    await user.click(jvm1Button);

    await waitFor(() => {
      const filenameDropdown = screen.getAllByTestId('simple-dropdown')[1];
      expect(within(filenameDropdown).getByText('recording1.jfr')).toBeInTheDocument();
      expect(within(filenameDropdown).getByText('recording2.jfr')).toBeInTheDocument();
    });
  });

  it('clears filename when JVM ID selection is cleared', async () => {
    const { user } = render({
      routerConfigs: {
        routes: [
          {
            path: '/analytics',
            element: <RecordingAnalytics />,
          },
        ],
      },
    });

    await waitFor(() => {
      expect(screen.getByText('JVM ID')).toBeInTheDocument();
    });

    const dropdowns = screen.getAllByTestId('simple-dropdown');
    const jvmDropdown = dropdowns[0];

    await user.click(within(jvmDropdown).getByText('jvm-1'));

    await waitFor(() => {
      const filenameDropdown = screen.getAllByTestId('simple-dropdown')[1];
      const items = within(filenameDropdown).getByTestId('dropdown-items');
      expect(within(items).getByRole('button', { name: 'recording1.jfr' })).toBeInTheDocument();
    });

    const filenameDropdown = screen.getAllByTestId('simple-dropdown')[1];
    const filenameItems = within(filenameDropdown).getByTestId('dropdown-items');
    await user.click(within(filenameItems).getByRole('button', { name: 'recording1.jfr' }));

    await waitFor(() => {
      const updatedDropdowns = screen.getAllByTestId('simple-dropdown');
      const toggleButton = within(updatedDropdowns[1]).getAllByRole('button')[0];
      expect(toggleButton).toHaveTextContent('recording1.jfr');
    });

    const jvmItems = within(jvmDropdown).getByTestId('dropdown-items');
    await user.click(within(jvmItems).getByRole('button', { name: 'Clear Selection' }));

    await waitFor(() => {
      const updatedDropdowns = screen.getAllByTestId('simple-dropdown');
      const jvmToggle = within(updatedDropdowns[0]).getAllByRole('button')[0];
      const filenameToggle = within(updatedDropdowns[1]).getAllByRole('button')[0];
      expect(jvmToggle).toHaveTextContent('JVM ID');
      expect(filenameToggle).toHaveTextContent('Filename');
    });
  });

  it('renders SQL code editor for query input', async () => {
    render({
      routerConfigs: {
        routes: [
          {
            path: '/analytics',
            element: <RecordingAnalytics />,
          },
        ],
      },
    });

    await waitFor(() => {
      const editors = screen.getAllByTestId('code-editor');
      expect(editors.length).toBeGreaterThan(0);
    });

    const editors = screen.getAllByTestId('code-editor');
    const sqlEditor = editors[0];

    expect(within(sqlEditor).getByTestId('code-editor-language')).toHaveTextContent('sql');
    expect(within(sqlEditor).getByTestId('code-editor-readonly')).toHaveTextContent('false');
  });

  it('renders JSON code editor for results display', async () => {
    render({
      routerConfigs: {
        routes: [
          {
            path: '/analytics',
            element: <RecordingAnalytics />,
          },
        ],
      },
    });

    await waitFor(() => {
      const editors = screen.getAllByTestId('code-editor');
      expect(editors.length).toBe(2);
    });

    const editors = screen.getAllByTestId('code-editor');
    const jsonEditor = editors[1];

    expect(within(jsonEditor).getByTestId('code-editor-language')).toHaveTextContent('json');
    expect(within(jsonEditor).getByTestId('code-editor-readonly')).toHaveTextContent('true');
  });

  it('displays sample query dropdown', async () => {
    render({
      routerConfigs: {
        routes: [
          {
            path: '/analytics',
            element: <RecordingAnalytics />,
          },
        ],
      },
    });

    await waitFor(() => {
      expect(screen.getByLabelText('Insert sample query')).toBeInTheDocument();
    });
  });

  it('inserts sample query when selected from dropdown', async () => {
    const { user } = render({
      routerConfigs: {
        routes: [
          {
            path: '/analytics',
            element: <RecordingAnalytics />,
          },
        ],
      },
    });

    await waitFor(() => {
      expect(screen.getByLabelText('Insert sample query')).toBeInTheDocument();
    });

    const sampleQueryButton = screen.getByLabelText('Insert sample query');
    await user.click(sampleQueryButton);

    await waitFor(() => {
      expect(screen.getByText('Count object allocation sample events')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Count object allocation sample events'));

    await waitFor(() => {
      expect(screen.queryByText('Count object allocation sample events')).not.toBeVisible();
    });
  });

  it('disables execute button when JVM ID is not selected', async () => {
    render({
      routerConfigs: {
        routes: [
          {
            path: '/analytics',
            element: <RecordingAnalytics />,
          },
        ],
      },
    });

    await waitFor(() => {
      const executeButton = screen.getByLabelText('Execute query');
      expect(executeButton).toBeDisabled();
    });
  });

  it('disables execute button when filename is not selected', async () => {
    const { user } = render({
      routerConfigs: {
        routes: [
          {
            path: '/analytics',
            element: <RecordingAnalytics />,
          },
        ],
      },
    });

    await waitFor(() => {
      expect(screen.getByText('JVM ID')).toBeInTheDocument();
    });

    const dropdowns = screen.getAllByTestId('simple-dropdown');
    const jvmDropdown = dropdowns[0];
    await user.click(within(jvmDropdown).getByText('jvm-1'));

    await waitFor(() => {
      const executeButton = screen.getByLabelText('Execute query');
      expect(executeButton).toBeDisabled();
    });
  });

  it('disables execute button when query is empty', async () => {
    const { user } = render({
      routerConfigs: {
        routes: [
          {
            path: '/analytics',
            element: <RecordingAnalytics />,
          },
        ],
      },
    });

    await waitFor(() => {
      expect(screen.getByText('JVM ID')).toBeInTheDocument();
    });

    const dropdowns = screen.getAllByTestId('simple-dropdown');
    const jvmDropdown = dropdowns[0];
    await user.click(within(jvmDropdown).getByText('jvm-1'));

    await waitFor(() => {
      const filenameDropdown = screen.getAllByTestId('simple-dropdown')[1];
      expect(within(filenameDropdown).getByText('recording1.jfr')).toBeInTheDocument();
    });

    const filenameDropdown = screen.getAllByTestId('simple-dropdown')[1];
    await user.click(within(filenameDropdown).getByText('recording1.jfr'));

    await waitFor(() => {
      const executeButton = screen.getByLabelText('Execute query');
      expect(executeButton).toBeDisabled();
    });
  });

  it('executes query and displays results when all inputs are valid', async () => {
    const { user } = render({
      routerConfigs: {
        routes: [
          {
            path: '/analytics',
            element: <RecordingAnalytics />,
          },
        ],
      },
    });

    await waitFor(() => {
      expect(screen.getByText('JVM ID')).toBeInTheDocument();
    });

    const dropdowns = screen.getAllByTestId('simple-dropdown');
    const jvmItems = within(dropdowns[0]).getByTestId('dropdown-items');
    await user.click(within(jvmItems).getByRole('button', { name: 'jvm-1' }));

    await waitFor(() => {
      const filenameDropdown = screen.getAllByTestId('simple-dropdown')[1];
      const items = within(filenameDropdown).getByTestId('dropdown-items');
      expect(within(items).getByRole('button', { name: 'recording1.jfr' })).toBeInTheDocument();
    });

    const filenameDropdown = screen.getAllByTestId('simple-dropdown')[1];
    const filenameItems = within(filenameDropdown).getByTestId('dropdown-items');
    await user.click(within(filenameItems).getByRole('button', { name: 'recording1.jfr' }));

    const editors = screen.getAllByTestId('code-editor');
    const changeQueryButton = within(editors[0]).getByText('Change Query');
    await user.click(changeQueryButton);

    await waitFor(() => {
      const executeButton = screen.getByLabelText('Execute query');
      expect(executeButton).not.toBeDisabled();
    });

    const executeButton = screen.getByLabelText('Execute query');
    await user.click(executeButton);

    await waitFor(() => {
      expect(mockSendRequest).toHaveBeenCalledWith('beta', 'recording_analytics/jvm-1/recording1.jfr', {
        method: 'POST',
        body: expect.any(FormData),
      });
    });

    await waitFor(
      () => {
        const resultEditor = screen.getAllByTestId('code-editor')[1];
        const resultCode = within(resultEditor).getByTestId('code-editor-code');
        expect(resultCode.textContent).toContain('"data"');
        expect(resultCode.textContent).toContain('"column1"');
        expect(resultCode.textContent).toContain('"value1"');
      },
      { timeout: 3000 },
    );
  });

  it('displays error message when query execution fails', async () => {
    mockSendRequest.mockReturnValue(throwError(() => new Error('Query execution failed')));

    const { user } = render({
      routerConfigs: {
        routes: [
          {
            path: '/analytics',
            element: <RecordingAnalytics />,
          },
        ],
      },
    });

    await waitFor(() => {
      expect(screen.getByText('JVM ID')).toBeInTheDocument();
    });

    const dropdowns = screen.getAllByTestId('simple-dropdown');
    const jvmItems = within(dropdowns[0]).getByTestId('dropdown-items');
    await user.click(within(jvmItems).getByRole('button', { name: 'jvm-1' }));

    await waitFor(() => {
      const filenameDropdown = screen.getAllByTestId('simple-dropdown')[1];
      const items = within(filenameDropdown).getByTestId('dropdown-items');
      expect(within(items).getByRole('button', { name: 'recording1.jfr' })).toBeInTheDocument();
    });

    const filenameDropdown = screen.getAllByTestId('simple-dropdown')[1];
    const filenameItems = within(filenameDropdown).getByTestId('dropdown-items');
    await user.click(within(filenameItems).getByRole('button', { name: 'recording1.jfr' }));

    const editors = screen.getAllByTestId('code-editor');
    const changeQueryButton = within(editors[0]).getByText('Change Query');
    await user.click(changeQueryButton);

    await waitFor(() => {
      const executeButton = screen.getByLabelText('Execute query');
      expect(executeButton).not.toBeDisabled();
    });

    const executeButton = screen.getByLabelText('Execute query');
    await user.click(executeButton);

    await waitFor(
      () => {
        const resultEditor = screen.getAllByTestId('code-editor')[1];
        const resultCode = within(resultEditor).getByTestId('code-editor-code');
        expect(resultCode).toHaveTextContent('Error: Query execution failed');
      },
      { timeout: 3000 },
    );
  });

  it('prefills JVM ID and filename from location state', async () => {
    render({
      routerConfigs: {
        routes: [
          {
            path: '/analytics',
            element: <RecordingAnalytics />,
          },
        ],
        options: {
          initialEntries: [
            {
              pathname: '/analytics',
              state: { jvmId: 'jvm-1', filename: 'recording1.jfr' },
            },
          ],
        },
      },
    });

    await waitFor(() => {
      const dropdowns = screen.getAllByTestId('simple-dropdown');
      const jvmToggle = within(dropdowns[0]).getAllByRole('button')[0];
      const filenameToggle = within(dropdowns[1]).getAllByRole('button')[0];
      expect(jvmToggle).toHaveTextContent('jvm-1');
      expect(filenameToggle).toHaveTextContent('recording1.jfr');
    });
  });

  it('prefills JVM ID and filename from Redux state', async () => {
    render({
      routerConfigs: {
        routes: [
          {
            path: '/analytics',
            element: <RecordingAnalytics />,
          },
        ],
      },
      preloadedState: {
        ...basePreloadedState,
        modalPrefill: {
          route: '/analytics',
          data: { jvmId: 'jvm-2', filename: 'recording3.jfr' },
        },
      },
    });

    await waitFor(() => {
      const dropdowns = screen.getAllByTestId('simple-dropdown');
      const jvmToggle = within(dropdowns[0]).getAllByRole('button')[0];
      const filenameToggle = within(dropdowns[1]).getAllByRole('button')[0];
      expect(jvmToggle).toHaveTextContent('jvm-2');
      expect(filenameToggle).toHaveTextContent('recording3.jfr');
    });
  });

  it('executes query multiple times successfully', async () => {
    const { user } = render({
      routerConfigs: {
        routes: [
          {
            path: '/analytics',
            element: <RecordingAnalytics />,
          },
        ],
      },
    });

    await waitFor(() => {
      expect(screen.getByText('JVM ID')).toBeInTheDocument();
    });

    const dropdowns = screen.getAllByTestId('simple-dropdown');
    const jvmItems = within(dropdowns[0]).getByTestId('dropdown-items');
    await user.click(within(jvmItems).getByRole('button', { name: 'jvm-1' }));

    await waitFor(() => {
      const filenameDropdown = screen.getAllByTestId('simple-dropdown')[1];
      const items = within(filenameDropdown).getByTestId('dropdown-items');
      expect(within(items).getByRole('button', { name: 'recording1.jfr' })).toBeInTheDocument();
    });

    const filenameDropdown = screen.getAllByTestId('simple-dropdown')[1];
    const filenameItems = within(filenameDropdown).getByTestId('dropdown-items');
    await user.click(within(filenameItems).getByRole('button', { name: 'recording1.jfr' }));

    const editors = screen.getAllByTestId('code-editor');
    const changeQueryButton = within(editors[0]).getByText('Change Query');
    await user.click(changeQueryButton);

    const executeButton = screen.getByLabelText('Execute query');
    await user.click(executeButton);

    await waitFor(
      () => {
        const resultEditor = screen.getAllByTestId('code-editor')[1];
        const resultCode = within(resultEditor).getByTestId('code-editor-code');
        expect(resultCode.textContent).toContain('"data"');
        expect(resultCode.textContent).toContain('"column1"');
        expect(resultCode.textContent).toContain('"value1"');
      },
      { timeout: 3000 },
    );

    // Execute again - result should be populated again
    await user.click(executeButton);

    await waitFor(
      () => {
        expect(mockSendRequest).toHaveBeenCalledTimes(2);
        const resultEditor = screen.getAllByTestId('code-editor')[1];
        const resultCode = within(resultEditor).getByTestId('code-editor-code');
        expect(resultCode.textContent).toContain('"data"');
      },
      { timeout: 3000 },
    );
  });

  it('renders correctly', async () => {
    const { container } = render({
      routerConfigs: {
        routes: [
          {
            path: '/analytics',
            element: <RecordingAnalytics />,
          },
        ],
      },
    });

    await waitFor(() => {
      expect(screen.getByText('Analytics')).toBeInTheDocument();
    });

    expect(container).toMatchSnapshot();
  });
});
