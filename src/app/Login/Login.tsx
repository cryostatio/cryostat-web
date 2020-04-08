import * as React from 'react';
import { PageSection, Title } from '@patternfly/react-core';
import { ServiceContext } from '@app/Shared/Services/Services';

export const Login = (props) => {
  const context = React.useContext(ServiceContext);

  const [token, setToken] = React.useState('');
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

  const handleInputChange = (evt) => {
    const target = evt.target;
    if (target.name === 'token') {
      setToken(target.value);
    }
  };

  const handleSubmit = (evt) => {
    checkAuth(token, authMethod);
    evt.preventDefault();
  };

  React.useEffect(() => {
    checkAuth(token, authMethod);
    const sub = context.api.getAuthMethod().subscribe(authMethod => setAuthMethod(authMethod));
    return () => sub.unsubscribe();
  }, []);

  return (
    <PageSection>
      <Title size="lg">Login</Title>
      <div>{
        authMethod === 'Basic' ?
        <span>Descriptive text of Basic auth</span> :
        <span>Descriptive text of Bearer auth</span>
      }</div>
      <form onSubmit={handleSubmit}>
        <label>
          Token
          <input name="token" type="text" value={token} onChange={handleInputChange} />
        </label>
        <div>Method: {authMethod}</div>
        <input type="submit" value="Login" />
      </form>
    </PageSection>
  );

}
