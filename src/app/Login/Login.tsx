import * as React from 'react';
import { first } from 'rxjs/operators';
import { PageSection, Title } from '@patternfly/react-core';
import { ApiService } from '@app/Shared/Services/Api.service';
import { ServiceContext } from '@app/Shared/Services/Services';

export class Login extends React.Component<any, any> {

  static contextType = ServiceContext;
  state = {
    token: '',
    authMethod: '',
  };

  componentDidMount() {
    this.checkAuth(this.state.token, this.state.authMethod);
    this.context.api.getAuthMethod().pipe(first()).subscribe(authMethod => this.setState({ authMethod }));
  }

  checkAuth(token: string, authMethod: string): void {
    this.setState({ token, authMethod });
    if (authMethod === 'Basic') {
      token = btoa(token);
    } // else this is Bearer auth and the token is sent as-is
    return this.context.api.checkAuth(token, authMethod).subscribe(v => {
      if (v) {
        this.props.onLoginSuccess();
      } else {
        this.setState({ token: '' });
      }
    });
  }

  handleInputChange = (evt) => {
    const target = evt.target;
    if (target.name === 'token') {
      this.setState({ token: target.value });
    }
  };

  handleSubmit = (evt) => {
    this.checkAuth(this.state.token, this.state.authMethod);
    evt.preventDefault();
  };

  render() {
    return (
      <PageSection>
        <Title size="lg">Login</Title>
        <div>{
          this.state.authMethod === 'Basic' ?
          <span>Descriptive text of Basic auth</span> :
          <span>Descriptive text of Bearer auth</span>
        }</div>
        <form onSubmit={this.handleSubmit}>
          <label>
            Token
            <input name="token" type="text" value={this.state.token} onChange={this.handleInputChange} />
          </label>
          <div>Method: {this.state.authMethod}</div>
          <input type="submit" value="Login" />
        </form>
      </PageSection>
    );
  }

}
