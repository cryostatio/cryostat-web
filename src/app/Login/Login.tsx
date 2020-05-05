import * as React from 'react';
import { Card, CardBody, CardHeader, CardFooter, PageSection, Title } from '@patternfly/react-core';
import { ServiceContext } from '@app/Shared/Services/Services';
import { BasicAuthForm, BasicAuthDescriptionText } from './BasicAuthForm';
import { BearerAuthForm, BearerAuthDescriptionText } from './BearerAuthForm';

export interface LoginProps {
  onLoginSuccess: () => void;
}

export const Login: React.FunctionComponent<LoginProps> = (props) => {
  const context = React.useContext(ServiceContext);

  const [authMethod, setAuthMethod] = React.useState('Basic');
  const onLoginSuccess = props.onLoginSuccess;

  const checkAuth = React.useCallback((token: string, authMethod: string): void => {
    if (authMethod === 'Basic') {
      token = window.btoa(token);
    } // else this is Bearer auth and the token is sent as-is
    context.api.checkAuth(token, authMethod).subscribe(v => {
      if (v) {
        onLoginSuccess();
      }
    })
  }, [onLoginSuccess, context.api]);

  const handleSubmit = (evt, token, authMethod) => {
    checkAuth(token, authMethod);
    evt.preventDefault();
  };

  React.useEffect(() => {
    checkAuth('', 'Basic');
    const sub = context.api.getAuthMethod().subscribe(authMethod => setAuthMethod(authMethod));
    return () => sub.unsubscribe();
  }, [checkAuth, context.api]);

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
