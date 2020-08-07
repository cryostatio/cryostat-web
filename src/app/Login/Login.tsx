/*
 * Copyright (c) 2020 Red Hat, Inc.
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
import { useSubscriptions } from '@app/utils/useSubscriptions';
import { Card, CardBody, CardFooter, CardHeader, PageSection, Title } from '@patternfly/react-core';
import { BasicAuthDescriptionText, BasicAuthForm } from './BasicAuthForm';
import { BearerAuthDescriptionText, BearerAuthForm } from './BearerAuthForm';

export const Login = (props) => {
  const context = React.useContext(ServiceContext);

  const [token, setToken] = React.useState('');
  const [authMethod, setAuthMethod] = React.useState('Basic');
  const addSubscription = useSubscriptions();
  const onLoginSuccess = props.onLoginSuccess;

  const checkAuth = React.useCallback(() => {
    let tok = token;
    if (authMethod === 'Basic') {
      tok = window.btoa(token);
    } // else this is Bearer auth and the token is sent as-is
    addSubscription(
      context.api.checkAuth(tok, authMethod).subscribe(v => {
        if (v) {
          onLoginSuccess();
        }
      })
    );
  }, [context.api, token, authMethod, onLoginSuccess]);

  const handleSubmit = (evt, token, authMethod) => {
    setToken(token);
    setAuthMethod(authMethod);
    evt.preventDefault();
  };

  React.useEffect(() => {
    checkAuth();
    const sub = context.api.getAuthMethod().subscribe(authMethod => setAuthMethod(authMethod));
    return () => sub.unsubscribe();
  }, [context.api, checkAuth]);

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
