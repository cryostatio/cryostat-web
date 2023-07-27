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
import { Button, EmptyState, EmptyStateBody, EmptyStateIcon, Title, StackItem, Stack } from '@patternfly/react-core';
import { ExclamationCircleIcon } from '@patternfly/react-icons';
import * as React from 'react';

export const authFailMessage = 'Authentication failure';

export const missingSSLMessage = 'Bad Gateway';

export const isAuthFail = (message: string) => message === authFailMessage;
export interface ErrorViewProps {
  title: string | React.ReactNode;
  message: string | React.ReactNode;
  retryButtonMessage?: string;
  retry?: () => void;
}

export const ErrorView: React.FC<ErrorViewProps> = (props) => {
  return (
    <>
      <EmptyState>
        <EmptyStateIcon icon={ExclamationCircleIcon} color={'#a30000'} />
        <Title headingLevel="h4" size="lg">
          {props.title}
        </Title>
        <EmptyStateBody>
          <>
            <Stack>
              <StackItem>{props.message}</StackItem>
              {props.retry && (
                <StackItem>
                  <Button variant="link" onClick={props.retry}>
                    {props.retryButtonMessage || 'Retry'}
                  </Button>
                </StackItem>
              )}
            </Stack>
          </>
        </EmptyStateBody>
      </EmptyState>
    </>
  );
};
