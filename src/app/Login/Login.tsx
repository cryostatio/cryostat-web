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
import { Language } from '@app/Settings/Config/Language';
import { FeatureFlag } from '@app/Shared/Components/FeatureFlag';
import { AuthMethod, FeatureLevel } from '@app/Shared/Services/service.types';
import { ServiceContext } from '@app/Shared/Services/Services';
import { useSubscriptions } from '@app/utils/hooks/useSubscriptions';
import {
  Card,
  CardActions,
  CardBody,
  CardFooter,
  CardHeader,
  CardTitle,
  PageSection,
  Text,
} from '@patternfly/react-core';
import * as React from 'react';
import { NotificationsContext } from '../Shared/Services/Notifications.service';
import { BasicAuthDescriptionText, BasicAuthForm } from './BasicAuthForm';
import { ConnectionError } from './ConnectionError';
import { NoopAuthForm } from './NoopAuthForm';
import { OpenShiftAuthDescriptionText, OpenShiftPlaceholderAuthForm } from './OpenShiftPlaceholderAuthForm';

export interface LoginProps {}

export const Login: React.FC<LoginProps> = (_) => {
  const context = React.useContext(ServiceContext);
  const addSubscription = useSubscriptions();
  const notifications = React.useContext(NotificationsContext);
  const [authMethod, setAuthMethod] = React.useState('');

  const handleSubmit = React.useCallback(
    (evt, token, authMethod, rememberMe) => {
      setAuthMethod(authMethod);
      addSubscription(
        context.login.checkAuth(token, authMethod, rememberMe).subscribe((authSuccess) => {
          if (!authSuccess) {
            notifications.danger('Authentication Failure', `${authMethod} authentication failed`);
          }
        }),
      );
      evt.preventDefault();
    },
    [addSubscription, context.login, notifications, setAuthMethod],
  );

  React.useEffect(() => {
    addSubscription(context.login.getAuthMethod().subscribe(setAuthMethod));
  }, [addSubscription, context.login, setAuthMethod]);

  const loginForm = React.useMemo(() => {
    switch (authMethod) {
      case AuthMethod.BASIC:
        return <BasicAuthForm onSubmit={handleSubmit} />;
      case AuthMethod.BEARER:
        return <OpenShiftPlaceholderAuthForm onSubmit={handleSubmit} />;
      case AuthMethod.NONE:
        return <NoopAuthForm onSubmit={handleSubmit} />;
      default:
        return <ConnectionError />;
    }
  }, [handleSubmit, authMethod]);

  const descriptionText = React.useMemo(() => {
    switch (authMethod) {
      case AuthMethod.BASIC:
        return <BasicAuthDescriptionText />;
      case AuthMethod.BEARER:
        return <OpenShiftAuthDescriptionText />;
      default:
        return <Text />;
    }
  }, [authMethod]);

  return (
    <PageSection>
      <Card>
        <CardHeader>
          <CardTitle>Login</CardTitle>
          <CardActions>
            <FeatureFlag level={FeatureLevel.BETA}>{React.createElement(Language.content, null)}</FeatureFlag>
          </CardActions>
        </CardHeader>
        <CardBody>{loginForm}</CardBody>
        <CardFooter>{descriptionText}</CardFooter>
      </Card>
    </PageSection>
  );
};

export default Login;
