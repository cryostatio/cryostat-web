import * as React from 'react';
import { ServiceContext } from '@app/Shared/Services/Services';
import { Card, CardBody, CardFooter, CardHeader, PageSection, Title } from '@patternfly/react-core';
import { BasicAuthDescriptionText, BasicAuthForm } from './BasicAuthForm';
import { BearerAuthDescriptionText, BearerAuthForm } from './BearerAuthForm';

export const Login = (props) => {
  const context = React.useContext(ServiceContext);

  const [token, setToken] = React.useState('');
  const [authMethod, setAuthMethod] = React.useState('Basic');
  const onLoginSuccess = props.onLoginSuccess;

  const checkAuth = React.useCallback(() => {
    let tok = token;
    if (authMethod === 'Basic') {
      tok = btoa(token);
    } // else this is Bearer auth and the token is sent as-is
    context.api.checkAuth(tok, authMethod).subscribe(v => {
      if (v) {
        onLoginSuccess();
      }
    })
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
          <Title size="lg">Login</Title>
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
