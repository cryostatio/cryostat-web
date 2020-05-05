import * as React from 'react';
import { ActionGroup, Button, Form, FormGroup, Text, TextInput, TextVariants } from '@patternfly/react-core';
import { FormProps } from './FormProps';

export const BearerAuthForm = (props: FormProps) => {

  const [token, setToken] = React.useState('');

  const handleTokenChange = (evt) => {
    setToken(evt);
  }

  const handleSubmit = (evt) => {
    props.onSubmit(evt, token, 'Bearer');
  }

  return (
    <Form onSubmit={handleSubmit}>
      <FormGroup
        label="Token"
        isRequired
        fieldId="token"
        helperText="Please provide your authorization token"
      >
        <TextInput
          isRequired
          type="text"
          id="token"
          name="token"
          aria-describedby="token-helper"
          value={token}
          onChange={handleTokenChange}
        />
      </FormGroup>
      <ActionGroup>
        <Button variant="primary" onClick={handleSubmit}>Login</Button>
      </ActionGroup>
    </Form>
  );

}

export const BearerAuthDescriptionText = () => {
  return (
    <Text component={TextVariants.p}>
      The ContainerJFR server is configured with Bearer token authentication. If this is an OpenShift deployment,
      you can use <Text component={TextVariants.pre}>oc whoami --show-token</Text> to retrieve your user account token.
    </Text>
  );
}
