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
import { NotificationsContext } from '@app/Notifications/Notifications';
import { AuthMethod, SessionState } from '@app/Shared/Services/Login.service';
import { ServiceContext } from '@app/Shared/Services/Services';
import { useSubscriptions } from '@app/utils/useSubscriptions';
import { Button, EmptyState, EmptyStateBody, EmptyStateIcon, Text, TextVariants, Title } from '@patternfly/react-core';
import { LockIcon } from '@patternfly/react-icons';
import * as React from 'react';
import { combineLatest } from 'rxjs';
import { FormProps } from './FormProps';

export const OpenShiftPlaceholderAuthForm: React.FC<FormProps> = ({ onSubmit }) => {
  const context = React.useContext(ServiceContext);
  const notifications = React.useContext(NotificationsContext);
  const [showPermissionDenied, setShowPermissionDenied] = React.useState(false);
  const addSubscription = useSubscriptions();

  React.useEffect(() => {
    addSubscription(
      combineLatest([context.login.getSessionState(), notifications.problemsNotifications()]).subscribe((parts) => {
        const sessionState = parts[0];
        const errors = parts[1];
        const missingCryostatPermissions = errors.find((error) => error.title.includes('401')) !== undefined;
        setShowPermissionDenied(sessionState === SessionState.NO_USER_SESSION && missingCryostatPermissions);
      })
    );
  }, [addSubscription, notifications, context.login, setShowPermissionDenied]);

  const handleSubmit = React.useCallback(
    (evt) => {
      // Triggers a redirect to OpenShift Container Platform login page
      onSubmit(evt, 'anInvalidToken', AuthMethod.BEARER, true);
    },
    [onSubmit]
  );

  const permissionDenied = (
    <EmptyState>
      <EmptyStateIcon variant="container" component={LockIcon} />
      <Title size="lg" headingLevel="h4">
        Access permissions required
      </Title>
      <EmptyStateBody>
        <Text>
          {`To continue, add permissions to your current account or login with a
        different account. For more information, see the User Authentication section of the `}
        </Text>
        <Text
          component={TextVariants.a}
          target="_blank"
          href="https://github.com/cryostatio/cryostat-operator#user-authentication"
        >
          Cryostat Operator README.
        </Text>
      </EmptyStateBody>
      <Button variant="primary" onClick={handleSubmit}>
        Retry Login
      </Button>
    </EmptyState>
  );

  return <>{showPermissionDenied && permissionDenied}</>;
};

export const OpenShiftAuthDescriptionText = () => {
  return (
    <Text component={TextVariants.p}>The Cryostat server is configured to use OpenShift OAuth authentication.</Text>
  );
};
