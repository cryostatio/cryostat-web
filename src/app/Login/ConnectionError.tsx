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
import { EmptyState, EmptyStateBody, EmptyStateIcon, EmptyStateHeader } from '@patternfly/react-core';
import { ExclamationCircleIcon } from '@patternfly/react-icons';
import * as React from 'react';

export const ConnectionError: React.FC = () => (
  <EmptyState>
    <EmptyStateHeader
      titleText="Unable to connect to the server"
      icon={<EmptyStateIcon icon={ExclamationCircleIcon} />}
      headingLevel="h4"
    />
    <EmptyStateBody>Check your connection and reload the page.</EmptyStateBody>
  </EmptyState>
);
