import * as React from 'react';
import { ServiceContext } from '@app/Shared/Services/Services';
import { Card, CardBody, CardFooter, CardHeader, PageSection, Title } from '@patternfly/react-core';
import { BasicAuthDescriptionText, BasicAuthForm } from './BasicAuthForm';
import { BearerAuthDescriptionText, BearerAuthForm } from './BearerAuthForm';

export const Login = (props) => {
  const context = React.useContext(ServiceContext);

  const [authMethod, setAuthMethod] = React.useState('Basic');

  const checkAuth = (token: string, authMethod: string): void => {
    if (authMethod === 'Basic') {
      token = btoa(token);
    } // else this is Bearer auth and the token is sent as-is
    context.api.checkAuth(token, authMethod).subscribe(v => {
      if (v) {
        props.onLoginSuccess();
      }
    })
  }

  const handleSubmit = (evt, token, authMethod) => {
    checkAuth(token, authMethod);
    evt.preventDefault();
  };

  React.useEffect(() => {
    checkAuth('', 'Basic');
    const sub = context.api.getAuthMethod().subscribe(authMethod => setAuthMethod(authMethod));
    return () => sub.unsubscribe();
  }, []);

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
