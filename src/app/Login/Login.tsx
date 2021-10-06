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
import * as React from 'react';
import { ServiceContext } from '@app/Shared/Services/Services';
import { NotificationsContext } from '../Notifications/Notifications';
import { CloseStatus } from '@app/Shared/Services/NotificationChannel.service';
import { useSubscriptions } from '@app/utils/useSubscriptions';
import { Card, CardBody, CardFooter, CardHeader, PageSection, Title } from '@patternfly/react-core';
import { combineLatest, timer } from 'rxjs';
import { debounceTime, first } from 'rxjs/operators';
import { Base64 } from 'js-base64';
import { BasicAuthDescriptionText, BasicAuthForm } from './BasicAuthForm';
import { BearerAuthDescriptionText, BearerAuthForm } from './BearerAuthForm';

export const Login = () => {
  const serviceContext = React.useContext(ServiceContext);
  const notifications = React.useContext(NotificationsContext);
  const [authMethod, setAuthMethod] = React.useState('');
  const addSubscription = useSubscriptions();

  const checkAuth = React.useCallback((token, authMethod, rememberMe = false, userSubmission = false) => {
    let tok = token;

    if (authMethod === 'Basic') {
      tok = Base64.encodeURL(token);
    } // else this is Bearer auth and the token is sent as-is
    addSubscription(
      serviceContext.login.checkAuth(tok, authMethod)
      .pipe(first())
      .subscribe(v => {
        if(v && rememberMe) {
          serviceContext.login.rememberToken(tok);
        } else if (v && !rememberMe && userSubmission) {
          serviceContext.login.forgetToken();
        }

        if (!v && userSubmission) {
          notifications.danger('Authentication Failure', `${authMethod} authentication failed`);
        }
      })
    );
  }, [serviceContext, serviceContext.login, addSubscription,  notifications, authMethod]);

  const handleSubmit = React.useCallback((evt, token, authMethod, rememberMe) => {
    setAuthMethod(authMethod);
    checkAuth(token, authMethod, rememberMe, true);
    evt.preventDefault();
  }, [setAuthMethod, checkAuth]);

  React.useEffect(() => {
    const sub = serviceContext.login.getAuthMethod().subscribe(setAuthMethod);
    checkAuth('', 'Basic'); // check auth once at component load to query the server's auth method
    return () => sub.unsubscribe();
  }, [serviceContext, serviceContext.login, setAuthMethod, checkAuth]);

  React.useEffect(() => {
    const sub =
      combineLatest(serviceContext.login.getToken(), serviceContext.login.getAuthMethod(),  serviceContext.notificationChannel.isReady(), timer(0, 5000))
      .pipe(debounceTime(1000))
      .subscribe(parts => {
        let token = parts[0];
        let authMethod = parts[1];
        let ready = parts[2];
        if (authMethod === 'Basic') {
          token = Base64.decode(token);
        }

        const hasInvalidCredentials = !!ready.code && ready.code === CloseStatus.PROTOCOL_FAILURE;
        const shouldRetryLogin = (!hasInvalidCredentials && !ready.ready)
          || (!!token && ready.ready);

        if (shouldRetryLogin) {
          checkAuth(token, authMethod);
        }
    });
    return () => sub.unsubscribe();
  }, [serviceContext, serviceContext.login, checkAuth]);

  return (
    <PageSection>
      <Card>
        <CardHeader>
          <Title headingLevel="h1" size="lg">Login</Title>
        </CardHeader>
        <CardBody>
          {
            authMethod === 'Basic' ?
            <BasicAuthForm onSubmit={handleSubmit} />
            : <BearerAuthForm onSubmit={handleSubmit} />
          }
        </CardBody>
        <CardFooter>
          {
            authMethod === 'Basic' ? <BasicAuthDescriptionText /> : <BearerAuthDescriptionText />
          }
        </CardFooter>
      </Card>
    </PageSection>
  );

}
