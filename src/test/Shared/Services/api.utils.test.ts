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
import { messageKeys } from '@app/Shared/Services/api.utils';

describe('Event template notifications', () => {
  it.each([
    [NotificationCategory.TemplateUploaded, 'Custom_Profiling was created'],
    [NotificationCategory.TemplateDeleted, 'Custom_Profiling was deleted'],
  ])('includes the template name in %s notifications', (category, expectedMessage) => {
    const notification: NotificationMessage = {
      meta: {
        category,
        type: { type: 'application', subtype: 'json' },
      },
      message: {
        template: 'Custom_Profiling',
      },
    };

    expect(messageKeys.get(category as NotificationCategory)?.body?.(notification)).toBe(expectedMessage);
  });
});
