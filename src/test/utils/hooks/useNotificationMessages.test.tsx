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
import { NotificationCategory, NotificationMessage } from '@app/Shared/Services/api.types';
import { ServiceContext } from '@app/Shared/Services/Services';
import { useNotificationMessages } from '@app/utils/hooks/useNotificationMessages';
import { act, render } from '@testing-library/react';
import * as React from 'react';
import { Subject } from 'rxjs';

const mockNotificationChannel = {
  replayableMessages: jest.fn(),
};

const mockContext = {
  notificationChannel: mockNotificationChannel,
} as any;

const makeMsg = (category: string, jobId: string): NotificationMessage =>
  ({
    meta: { category, type: { type: 'application', subType: 'json' } },
    message: { jobId },
  }) as unknown as NotificationMessage;

const TestConsumer: React.FC<{
  categories: NotificationCategory[];
  onMessage: (msg: NotificationMessage) => void;
}> = ({ categories, onMessage }) => {
  useNotificationMessages(categories, onMessage);
  return <div data-testid="consumer" />;
};

describe('useNotificationMessages', () => {
  let subjects: Map<string, Subject<NotificationMessage>>;

  beforeEach(() => {
    subjects = new Map();
    mockNotificationChannel.replayableMessages.mockImplementation((category: string) => {
      if (!subjects.has(category)) {
        subjects.set(category, new Subject<NotificationMessage>());
      }
      return subjects.get(category)!.asObservable();
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('subscribes to each category via replayableMessages on mount', () => {
    const categories = [
      NotificationCategory.RecordingSynthesisComplete,
      NotificationCategory.RecordingSynthesisFailure,
    ];
    render(
      <ServiceContext.Provider value={mockContext}>
        <TestConsumer categories={categories} onMessage={jest.fn()} />
      </ServiceContext.Provider>,
    );
    expect(mockNotificationChannel.replayableMessages).toHaveBeenCalledWith(
      NotificationCategory.RecordingSynthesisComplete,
    );
    expect(mockNotificationChannel.replayableMessages).toHaveBeenCalledWith(
      NotificationCategory.RecordingSynthesisFailure,
    );
  });

  it('calls onMessage when a matching notification arrives', () => {
    const onMessage = jest.fn();
    const categories = [NotificationCategory.RecordingSynthesisComplete];

    render(
      <ServiceContext.Provider value={mockContext}>
        <TestConsumer categories={categories} onMessage={onMessage} />
      </ServiceContext.Provider>,
    );

    const msg = makeMsg(NotificationCategory.RecordingSynthesisComplete, 'job-1');
    act(() => {
      subjects.get(NotificationCategory.RecordingSynthesisComplete)!.next(msg);
    });

    expect(onMessage).toHaveBeenCalledTimes(1);
    expect(onMessage).toHaveBeenCalledWith(msg);
  });

  it('calls onMessage for each emission independently for multiple categories', () => {
    const onMessage = jest.fn();
    const categories = [
      NotificationCategory.RecordingSynthesisComplete,
      NotificationCategory.RecordingSynthesisFailure,
    ];

    render(
      <ServiceContext.Provider value={mockContext}>
        <TestConsumer categories={categories} onMessage={onMessage} />
      </ServiceContext.Provider>,
    );

    act(() => {
      subjects
        .get(NotificationCategory.RecordingSynthesisComplete)!
        .next(makeMsg(NotificationCategory.RecordingSynthesisComplete, 'job-ok'));
      subjects
        .get(NotificationCategory.RecordingSynthesisFailure)!
        .next(makeMsg(NotificationCategory.RecordingSynthesisFailure, 'job-fail'));
    });

    expect(onMessage).toHaveBeenCalledTimes(2);
  });

  it('does not call onMessage after unmount', () => {
    const onMessage = jest.fn();
    const categories = [NotificationCategory.RecordingSynthesisComplete];

    const { unmount } = render(
      <ServiceContext.Provider value={mockContext}>
        <TestConsumer categories={categories} onMessage={onMessage} />
      </ServiceContext.Provider>,
    );

    unmount();

    act(() => {
      subjects
        .get(NotificationCategory.RecordingSynthesisComplete)
        ?.next(makeMsg(NotificationCategory.RecordingSynthesisComplete, 'job-post-unmount'));
    });

    expect(onMessage).not.toHaveBeenCalled();
  });
});
