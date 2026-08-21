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
import { useSubscriptions } from '@app/utils/hooks/useSubscriptions';
import * as React from 'react';

/**
 * Subscribes to one or more notification categories via the replayable subject,
 * calling onMessage for every emission (including any replayed within the window).
 * categories must be referentially stable (defined outside the component or in useMemo).
 */
export const useNotificationMessages = (
  categories: NotificationCategory[],
  onMessage: (msg: NotificationMessage) => void,
): void => {
  const context = React.useContext(ServiceContext);
  const addSubscription = useSubscriptions();

  React.useEffect(() => {
    categories.forEach((category) => {
      addSubscription(context.notificationChannel.replayableMessages(category).subscribe(onMessage));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addSubscription, context.notificationChannel, onMessage]);
};
