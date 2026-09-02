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
import { NotificationCategory, RecordingDirectory } from '@app/Shared/Services/api.types';
import { defaultServices } from '@app/Shared/Services/Services';
import { cleanup, screen, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { of, Subject } from 'rxjs';
import { basePreloadedState, render } from '../utils';

// Stub the inner tab components — their behaviour is tested in Queries.test.tsx / Views.test.tsx.
jest.mock('@app/RecordingAnalytics/queries/Queries', () => ({
  Queries: jest.fn(({ jvmId, filename }) => (
    <div data-testid="queries-stub" data-jvm-id={jvmId} data-filename={filename} />
  )),
}));

jest.mock('@app/RecordingAnalytics/views/Views', () => ({
  Views: jest.fn(({ jvmId, filename }) => (
    <div data-testid="views-stub" data-jvm-id={jvmId} data-filename={filename} />
  )),
}));

jest.mock('@app/BreadcrumbPage/BreadcrumbPage', () => ({
  BreadcrumbPage: jest.fn(({ children, pageTitle }) => (
    <div>
      <h1>{pageTitle}</h1>
      {children}
    </div>
  )),
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

describe('<RecordingAnalytics />', () => {
  let mockDoGet: jest.SpyInstance;
  let archivedRecordingCreatedSubject: Subject<any>;
  let archivedRecordingDeletedSubject: Subject<any>;

  beforeEach(() => {
    archivedRecordingCreatedSubject = new Subject();
    archivedRecordingDeletedSubject = new Subject();

    mockDoGet = jest.spyOn(defaultServices.api, 'doGet').mockReturnValue(of(mockRecordingDirectories) as any);
    jest.spyOn(defaultServices.notificationChannel, 'messages').mockImplementation((category) => {
      switch (category) {
        case NotificationCategory.ArchivedRecordingCreated:
          return archivedRecordingCreatedSubject.asObservable();
        case NotificationCategory.ArchivedRecordingDeleted:
          return archivedRecordingDeletedSubject.asObservable();
        default:
          return of();
      }
    });
  });

  afterEach(() => {
    cleanup();
    jest.clearAllMocks();
  });

  const renderPage = (options?: Parameters<typeof render>[0]['routerConfigs']['options']) =>
    render({
      routerConfigs: {
        routes: [{ path: '/analytics', element: <RecordingAnalytics /> }],
        options,
      },
    });

  it('renders with correct page title', async () => {
    renderPage();
    expect(screen.getByText('Analytics')).toBeInTheDocument();
  });

  it('loads recording directories on mount', async () => {
    renderPage();
    await waitFor(() => expect(mockDoGet).toHaveBeenCalledWith('fs/recordings', 'beta'));
  });

  it('displays JVM ID dropdown with loaded JVM IDs', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText('JVM ID')).toBeInTheDocument());

    const jvmDropdown = screen.getAllByTestId('simple-dropdown')[0];
    expect(within(jvmDropdown).getByText('jvm-1')).toBeInTheDocument();
    expect(within(jvmDropdown).getByText('jvm-2')).toBeInTheDocument();
    expect(within(jvmDropdown).getByText('Clear Selection')).toBeInTheDocument();
  });

  it('displays filename dropdown as disabled when no JVM ID is selected', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText('Filename')).toBeInTheDocument());

    const filenameButton = within(screen.getAllByTestId('simple-dropdown')[1]).getByRole('button', {
      name: 'Filename',
    });
    expect(filenameButton).toBeDisabled();
  });

  it('enables filename dropdown and shows recordings when JVM ID is selected', async () => {
    const { user } = renderPage();
    await waitFor(() => expect(screen.getByText('JVM ID')).toBeInTheDocument());

    await user.click(within(screen.getAllByTestId('simple-dropdown')[0]).getByText('jvm-1'));

    await waitFor(() => {
      const filenameDropdown = screen.getAllByTestId('simple-dropdown')[1];
      expect(within(filenameDropdown).getByText('recording1.jfr')).toBeInTheDocument();
      expect(within(filenameDropdown).getByText('recording2.jfr')).toBeInTheDocument();
    });
  });

  it('clears filename when JVM ID selection is cleared', async () => {
    const { user } = renderPage();
    await waitFor(() => expect(screen.getByText('JVM ID')).toBeInTheDocument());

    const jvmDropdown = screen.getAllByTestId('simple-dropdown')[0];
    await user.click(within(jvmDropdown).getByText('jvm-1'));

    await waitFor(() =>
      expect(
        within(within(screen.getAllByTestId('simple-dropdown')[1]).getByTestId('dropdown-items')).getByRole('button', {
          name: 'recording1.jfr',
        }),
      ).toBeInTheDocument(),
    );

    await user.click(
      within(within(screen.getAllByTestId('simple-dropdown')[1]).getByTestId('dropdown-items')).getByRole('button', {
        name: 'recording1.jfr',
      }),
    );

    await user.click(
      within(within(jvmDropdown).getByTestId('dropdown-items')).getByRole('button', { name: 'Clear Selection' }),
    );

    await waitFor(() => {
      expect(within(screen.getAllByTestId('simple-dropdown')[0]).getAllByRole('button')[0]).toHaveTextContent('JVM ID');
      expect(within(screen.getAllByTestId('simple-dropdown')[1]).getAllByRole('button')[0]).toHaveTextContent(
        'Filename',
      );
    });
  });

  it('passes jvmId and filename props to Queries stub', async () => {
    const { user } = renderPage();
    await waitFor(() => expect(screen.getByText('JVM ID')).toBeInTheDocument());

    await user.click(within(screen.getAllByTestId('simple-dropdown')[0]).getByText('jvm-1'));
    await waitFor(() =>
      expect(within(screen.getAllByTestId('simple-dropdown')[1]).getByText('recording1.jfr')).toBeInTheDocument(),
    );
    await user.click(within(screen.getAllByTestId('simple-dropdown')[1]).getByText('recording1.jfr'));

    await waitFor(() => {
      const stub = screen.getByTestId('queries-stub');
      expect(stub).toHaveAttribute('data-jvm-id', 'jvm-1');
      expect(stub).toHaveAttribute('data-filename', 'recording1.jfr');
    });
  });

  it('prefills JVM ID and filename from location state', async () => {
    renderPage({ initialEntries: [{ pathname: '/analytics', state: { jvmId: 'jvm-1', filename: 'recording1.jfr' } }] });

    await waitFor(() => {
      expect(within(screen.getAllByTestId('simple-dropdown')[0]).getAllByRole('button')[0]).toHaveTextContent('jvm-1');
      expect(within(screen.getAllByTestId('simple-dropdown')[1]).getAllByRole('button')[0]).toHaveTextContent(
        'recording1.jfr',
      );
    });
  });

  it('prefills JVM ID and filename from Redux state', async () => {
    render({
      routerConfigs: { routes: [{ path: '/analytics', element: <RecordingAnalytics /> }] },
      preloadedState: {
        ...basePreloadedState,
        modalPrefill: { route: '/analytics', data: { jvmId: 'jvm-2', filename: 'recording3.jfr' } },
      },
    });

    await waitFor(() => {
      expect(within(screen.getAllByTestId('simple-dropdown')[0]).getAllByRole('button')[0]).toHaveTextContent('jvm-2');
      expect(within(screen.getAllByTestId('simple-dropdown')[1]).getAllByRole('button')[0]).toHaveTextContent(
        'recording3.jfr',
      );
    });
  });

  it('renders the Queries tab selected by default', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByRole('tab', { name: 'Queries' })).toHaveAttribute('aria-selected', 'true');
      expect(screen.getByRole('tab', { name: 'Views' })).toHaveAttribute('aria-selected', 'false');
    });
  });

  it('refreshes recording directories when ArchivedRecordingCreated notification is received', async () => {
    renderPage();
    await waitFor(() => expect(mockDoGet).toHaveBeenCalledTimes(1));

    const updatedDirectories = [
      ...mockRecordingDirectories,
      {
        connectUrl: 'service:jmx:rmi://jvm-3',
        jvmId: 'jvm-3',
        recordings: [
          {
            name: 'new-recording.jfr',
            downloadUrl: '',
            reportUrl: '',
            archivedTime: 0,
            size: 0,
            metadata: { labels: [] },
          },
        ],
      },
    ];
    mockDoGet.mockReturnValue(of(updatedDirectories) as any);
    archivedRecordingCreatedSubject.next({ message: { jvmId: 'jvm-3', recording: { name: 'new-recording.jfr' } } });

    await waitFor(() => expect(mockDoGet).toHaveBeenCalledTimes(2));
    await waitFor(() =>
      expect(within(screen.getAllByTestId('simple-dropdown')[0]).getByText('jvm-3')).toBeInTheDocument(),
    );
  });

  it('refreshes recording directories when ArchivedRecordingDeleted notification is received', async () => {
    renderPage();
    await waitFor(() => expect(mockDoGet).toHaveBeenCalledTimes(1));

    const updatedDirectories = [
      { ...mockRecordingDirectories[0], recordings: [mockRecordingDirectories[0].recordings[0]] },
      mockRecordingDirectories[1],
    ];
    mockDoGet.mockReturnValue(of(updatedDirectories) as any);
    archivedRecordingDeletedSubject.next({ message: { jvmId: 'jvm-1', recording: { name: 'recording2.jfr' } } });

    await waitFor(() => expect(mockDoGet).toHaveBeenCalledTimes(2));
    await waitFor(() =>
      expect(
        within(within(screen.getAllByTestId('simple-dropdown')[0]).getByTestId('dropdown-items')).queryByText(
          'recording2.jfr',
        ),
      ).not.toBeInTheDocument(),
    );
  });

  it('renders correctly', async () => {
    const { container } = renderPage();
    await waitFor(() => expect(screen.getByText('Analytics')).toBeInTheDocument());
    expect(container).toMatchSnapshot();
  });
});
