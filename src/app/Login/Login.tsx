/*
 * Copyright The Cryostat Authors
 *
 * The Universal Permissive License (UPL), Version 1.0
 *
 * Subject to the condition set forth below, permission is hereby granted to any
 * person obtaining a copy of this software, associated documentation and/or data
 * (collectively the "Software"), free of charge and under any and all copyright
 * rights in the Software, and any and all patent rights owned or freely
 * licensable by each licensor hereunder covering either (i) the unmodified
 * Software as contributed to or provided by such licensor, or (ii) the Larger
 * Works (as defined below), to deal in both
 *
 * (a) the Software, and
 * (b) any piece of software and/or hardware listed in the lrgrwrks.txt file if
 * one is included with the Software (each a "Larger Work" to which the Software
 * is contributed by such licensors),
 *
 * without restriction, including without limitation the rights to copy, create
 * derivative works of, display, perform, and distribute the Software and make,
 * use, sell, offer for sale, import, export, have made, and have sold the
 * Software and the Larger Work(s), and to sublicense the foregoing rights on
 * either these or other terms.
 *
 * This license is subject to the following condition:
 * The above copyright notice and either this complete permission notice or at
 * a minimum a reference to the UPL must be included in all copies or
 * substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */
import { AuthMethod } from '@app/Shared/Services/Login.service';
import { ServiceContext } from '@app/Shared/Services/Services';
import { useSubscriptions } from '@app/utils/useSubscriptions';
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
import { NotificationsContext } from '../Notifications/Notifications';
import { BasicAuthDescriptionText, BasicAuthForm } from './BasicAuthForm';
import { ConnectionError } from './ConnectionError';
import { NoopAuthForm } from './NoopAuthForm';
import { OpenShiftAuthDescriptionText, OpenShiftPlaceholderAuthForm } from './OpenShiftPlaceholderAuthForm';
import { Language } from '@app/Settings/Language';
import { FeatureFlag } from '@app/Shared/FeatureFlag/FeatureFlag';
import { FeatureLevel } from '@app/Shared/Services/Settings.service';

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
        })
      );
      evt.preventDefault();
    },
    [addSubscription, context.login, notifications, setAuthMethod]
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
