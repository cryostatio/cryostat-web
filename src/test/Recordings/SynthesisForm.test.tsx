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
import { SynthesisForm } from '@app/Recordings/SynthesisForm';
import { ArchivedRecording, NotificationCategory, NotificationMessage, Target } from '@app/Shared/Services/api.types';
import { defaultServices } from '@app/Shared/Services/Services';
import '@testing-library/jest-dom';
import { act, cleanup, screen, waitFor } from '@testing-library/react';
import { of, Observable, Subject } from 'rxjs';
import { render } from '../utils';

const mockJvmId = 'test-jvm-id';
const mockAlias = 'my-app';

const mockTarget: Target = {
  agent: false,
  connectUrl: 'service:jmx:rmi://someUrl',
  alias: mockAlias,
  jvmId: mockJvmId,
  labels: [],
  annotations: { cryostat: [], platform: [] },
};

const NOW_MS = 1_700_000_000_000; // arbitrary fixed "now"

const makeRecording = (startMs: number, durationMs: number, name: string): ArchivedRecording => ({
  name,
  downloadUrl: '',
  reportUrl: '',
  metadata: {
    labels: [
      { key: 'startTime', value: String(startMs) },
      { key: 'duration', value: String(durationMs) },
    ],
  },
  size: 1024,
  archivedTime: Math.floor((startMs + durationMs) / 1000),
});

// A recording inside the "last 5 min" preset window
const windowStartMs = NOW_MS - 5 * 60 * 1000;
const mockRecordingInWindow = makeRecording(windowStartMs + 30_000, 60_000, 'rec-in-window');
const mockRecordingOutside = makeRecording(NOW_MS - 2 * 60 * 60 * 1000, 1000, 'rec-outside');

// Replayable messages subjects keyed by category
let replayableSubjects: Map<string, Subject<NotificationMessage>>;

const makeWsMsg = (category: NotificationCategory, jobId: string): NotificationMessage =>
  ({
    meta: { category, type: { type: 'application', subType: 'json' } },
    message: { jobId },
  }) as unknown as NotificationMessage;

const makeWsMsgFailure = (jobId: string, error: string): NotificationMessage =>
  ({
    meta: { category: NotificationCategory.RecordingSynthesisFailure, type: { type: 'application', subType: 'json' } },
    message: { jobId, error },
  }) as unknown as NotificationMessage;

beforeEach(() => {
  replayableSubjects = new Map();

  jest.spyOn(defaultServices.notificationChannel, 'replayableMessages').mockImplementation((category: string) => {
    if (!replayableSubjects.has(category)) {
      replayableSubjects.set(category, new Subject<NotificationMessage>());
    }
    return replayableSubjects.get(category)!.asObservable();
  });

  jest.spyOn(defaultServices.targetAlias, 'aliasMap').mockReturnValue(of(new Map([[mockJvmId, mockAlias]])));
  jest.spyOn(defaultServices.targetAlias, 'fetchAliases').mockImplementation(() => undefined);

  // Freeze Date.now() so preset buttons produce deterministic inputs
  jest.spyOn(Date, 'now').mockReturnValue(NOW_MS);
});

afterEach(() => {
  jest.restoreAllMocks();
  cleanup();
});

const renderForm = (overrideProps: Partial<React.ComponentProps<typeof SynthesisForm>> = {}) => {
  const props: React.ComponentProps<typeof SynthesisForm> = {
    target: mockTarget,
    recordings: [mockRecordingInWindow, mockRecordingOutside],
    onSuccess: jest.fn(),
    onDismiss: jest.fn(),
    onHighlightChange: jest.fn(),
    ...overrideProps,
  };
  return {
    ...render({
      routerConfigs: {
        routes: [{ path: '/test', element: <SynthesisForm {...props} /> }],
      },
    }),
    props,
  };
};

describe('<SynthesisForm />', () => {
  describe('target display', () => {
    it('shows alias when a full Target object is supplied', async () => {
      renderForm({ target: mockTarget });
      expect(screen.getByText(mockAlias)).toBeInTheDocument();
    });

    it('shows jvmId directly when target is a string and alias has resolved', async () => {
      renderForm({ target: mockJvmId });
      // aliasMap mock returns entry immediately → alias shown
      await waitFor(() => expect(screen.queryByText(mockAlias)).toBeInTheDocument());
    });
  });

  describe('preset buttons', () => {
    it('renders the four preset buttons', () => {
      renderForm();
      for (const label of ['Last 5 minutes', 'Last 15 minutes', 'Last 1 hour', 'Last 6 hours']) {
        expect(screen.getByText(label)).toBeInTheDocument();
      }
    });

    it('clicking "Last 5 minutes" populates the datetime inputs', async () => {
      const { user } = renderForm();
      const btn = screen.getByText('Last 5 minutes');
      await user.click(btn);

      const fromInput = screen.getByLabelText('From date and time') as HTMLInputElement;
      const toInput = screen.getByLabelText('To date and time') as HTMLInputElement;

      expect(fromInput.value).not.toBe('');
      expect(toInput.value).not.toBe('');
      // "to" should be after "from"
      expect(new Date(toInput.value).getTime()).toBeGreaterThan(new Date(fromInput.value).getTime());
    });
  });

  describe('submit button state', () => {
    it('submit button is aria-disabled before any time range is entered', () => {
      renderForm();
      const submitBtn = screen.getByText('Submit').closest('button');
      // isAriaDisabled → aria-disabled="true"
      expect(submitBtn).toHaveAttribute('aria-disabled', 'true');
    });

    it('submit button becomes enabled after preset fills a range with candidates', async () => {
      const { user } = renderForm({ recordings: [mockRecordingInWindow] });
      await user.click(screen.getByText('Last 5 minutes'));
      const submitBtn = screen.getByText('Submit').closest('button');
      await waitFor(() => {
        expect(submitBtn).not.toHaveAttribute('aria-disabled', 'true');
      });
    });

    it('submit button remains aria-disabled when no candidates fall in the selected range', async () => {
      const { user } = renderForm({ recordings: [mockRecordingOutside] });
      // "Last 5 minutes" won't contain mockRecordingOutside (which is 2 hrs ago)
      await user.click(screen.getByText('Last 5 minutes'));
      const submitBtn = screen.getByText('Submit').closest('button');
      await waitFor(() => {
        expect(submitBtn).toHaveAttribute('aria-disabled', 'true');
      });
    });

    it('shows a warning alert when range is set but no candidates match', async () => {
      const { user } = renderForm({ recordings: [mockRecordingOutside] });
      await user.click(screen.getByText('Last 5 minutes'));
      await waitFor(() => {
        expect(screen.getByText('No recordings found in the selected range')).toBeInTheDocument();
      });
    });
  });

  describe('heuristic display', () => {
    it('shows candidate count and coverage bar after range is set', async () => {
      const { user } = renderForm({ recordings: [mockRecordingInWindow] });
      await user.click(screen.getByText('Last 5 minutes'));

      await waitFor(() => {
        expect(screen.getByText(/Candidates:/)).toBeInTheDocument();
        // Coverage progress bar
        expect(screen.getByLabelText('Coverage of requested time window by recordings')).toBeInTheDocument();
      });
    });

    it('emits onHighlightChange with candidate names when range changes', async () => {
      const onHighlightChange = jest.fn();
      const { user } = renderForm({ recordings: [mockRecordingInWindow], onHighlightChange });

      await user.click(screen.getByText('Last 5 minutes'));

      await waitFor(() => {
        const calls = onHighlightChange.mock.calls;
        const lastCall = calls[calls.length - 1][0] as Set<string>;
        expect(lastCall.has('rec-in-window')).toBe(true);
      });
    });

    it('emits onHighlightChange with an empty set on unmount', async () => {
      const onHighlightChange = jest.fn();
      const { user, unmount } = renderForm({ recordings: [mockRecordingInWindow], onHighlightChange });

      await user.click(screen.getByText('Last 5 minutes'));
      onHighlightChange.mockClear();

      unmount();

      // The cleanup effect fires with empty set
      const lastCall = onHighlightChange.mock.calls[onHighlightChange.mock.calls.length - 1];
      expect(lastCall[0]).toEqual(new Set());
    });
  });

  describe('dismiss button', () => {
    it('calls onDismiss when the dismiss button is clicked', async () => {
      const onDismiss = jest.fn();
      const { user } = renderForm({ onDismiss });
      await user.click(screen.getByText('Clear'));
      expect(onDismiss).toHaveBeenCalledTimes(1);
    });

    it('uses custom dismissLabel prop', () => {
      renderForm({ dismissLabel: 'Close Panel' });
      expect(screen.getByText('Close Panel')).toBeInTheDocument();
    });
  });

  describe('HTTP 200 immediate success', () => {
    it('calls onSuccess immediately and does not show spinner', async () => {
      const onSuccess = jest.fn();
      // Mock sendRequest to return a Response with status 200
      const mockResponse = { status: 200, ok: true, text: jest.fn() } as unknown as Response;
      jest.spyOn(defaultServices.api, 'sendRequest').mockReturnValue(of(mockResponse));

      const { user } = renderForm({ recordings: [mockRecordingInWindow], onSuccess });
      await user.click(screen.getByText('Last 5 minutes'));

      const submitBtn = await screen.findByText('Submit');
      await user.click(submitBtn.closest('button')!);

      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalledTimes(1);
      });
      // No spinner/loading state should linger
      expect(screen.queryByText('Submitting')).not.toBeInTheDocument();
    });
  });

  describe('HTTP 202 async job', () => {
    it('shows loading state while awaiting WS notification', async () => {
      const jobId = 'job-async-123';
      const mockResponse202 = {
        status: 202,
        ok: true,
        text: jest.fn().mockResolvedValue(jobId),
      } as unknown as Response;
      jest.spyOn(defaultServices.api, 'sendRequest').mockReturnValue(of(mockResponse202));

      const { user } = renderForm({ recordings: [mockRecordingInWindow] });
      await user.click(screen.getByText('Last 5 minutes'));
      const submitBtn = screen.getByText('Submit').closest('button')!;
      await user.click(submitBtn);

      // While waiting for WS, button shows loading text
      await waitFor(() => {
        expect(screen.getByText('Submitting')).toBeInTheDocument();
      });
    });

    it('calls onSuccess when the matching WS complete notification arrives', async () => {
      const jobId = 'job-async-456';
      const onSuccess = jest.fn();
      const mockResponse202 = {
        status: 202,
        ok: true,
        text: jest.fn().mockResolvedValue(jobId),
      } as unknown as Response;
      jest.spyOn(defaultServices.api, 'sendRequest').mockReturnValue(of(mockResponse202));

      const { user } = renderForm({ recordings: [mockRecordingInWindow], onSuccess });
      await user.click(screen.getByText('Last 5 minutes'));
      await user.click(screen.getByText('Submit').closest('button')!);

      await waitFor(() => screen.getByText('Submitting'));

      act(() => {
        replayableSubjects
          .get(NotificationCategory.RecordingSynthesisComplete)!
          .next(makeWsMsg(NotificationCategory.RecordingSynthesisComplete, jobId));
      });

      await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
      expect(screen.queryByText('Submitting')).not.toBeInTheDocument();
    });

    it('shows an error alert when the WS failure notification arrives for the pending job', async () => {
      const jobId = 'job-async-fail';
      const errorMsg = 'Backend synthesis error';
      const mockResponse202 = {
        status: 202,
        ok: true,
        text: jest.fn().mockResolvedValue(jobId),
      } as unknown as Response;
      jest.spyOn(defaultServices.api, 'sendRequest').mockReturnValue(of(mockResponse202));

      const { user } = renderForm({ recordings: [mockRecordingInWindow] });
      await user.click(screen.getByText('Last 5 minutes'));
      await user.click(screen.getByText('Submit').closest('button')!);

      await waitFor(() => screen.getByText('Submitting'));

      act(() => {
        replayableSubjects.get(NotificationCategory.RecordingSynthesisFailure)!.next(makeWsMsgFailure(jobId, errorMsg));
      });

      await waitFor(() => {
        expect(screen.getByText('Synthesis error')).toBeInTheDocument();
        expect(screen.getByText(errorMsg)).toBeInTheDocument();
      });
      expect(screen.queryByText('Submitting')).not.toBeInTheDocument();
    });

    it('ignores WS notifications for a different jobId', async () => {
      const jobId = 'job-mine';
      const otherJobId = 'job-someone-else';
      const onSuccess = jest.fn();
      const mockResponse202 = {
        status: 202,
        ok: true,
        text: jest.fn().mockResolvedValue(jobId),
      } as unknown as Response;
      jest.spyOn(defaultServices.api, 'sendRequest').mockReturnValue(of(mockResponse202));

      const { user } = renderForm({ recordings: [mockRecordingInWindow], onSuccess });
      await user.click(screen.getByText('Last 5 minutes'));
      await user.click(screen.getByText('Submit').closest('button')!);

      await waitFor(() => screen.getByText('Submitting'));

      act(() => {
        replayableSubjects
          .get(NotificationCategory.RecordingSynthesisComplete)!
          .next(makeWsMsg(NotificationCategory.RecordingSynthesisComplete, otherJobId));
      });

      // Should still be submitting; onSuccess not called
      expect(screen.getByText('Submitting')).toBeInTheDocument();
      expect(onSuccess).not.toHaveBeenCalled();
    });
  });

  describe('HTTP request error', () => {
    it('shows an error alert when the HTTP request fails', async () => {
      jest
        .spyOn(defaultServices.api, 'sendRequest')
        .mockReturnValue(new Observable((sub) => sub.error(new Error('Network failure'))));

      const { user } = renderForm({ recordings: [mockRecordingInWindow] });
      await user.click(screen.getByText('Last 5 minutes'));
      await user.click(screen.getByText('Submit').closest('button')!);

      await waitFor(() => {
        expect(screen.getByText('Synthesis error')).toBeInTheDocument();
        expect(screen.getByText('Network failure')).toBeInTheDocument();
      });
      expect(screen.queryByText('Submitting')).not.toBeInTheDocument();
    });
  });
});
