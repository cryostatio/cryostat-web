import * as React from 'react';
import { ActionGroup, Button, Form, FormGroup, Text, TextInput, TextVariants } from '@patternfly/react-core';
import { FormProps } from './FormProps';

export const BasicAuthForm = (props: FormProps) => {

  const [username, setUsername] = React.useState('');
  const [password, setPassword] = React.useState('');

  const handleUserChange = (evt) => {
    setUsername(evt);
  }

  const handlePasswordChange = (evt) => {
    setPassword(evt);
  }

  const handleSubmit = (evt) => {
    props.onSubmit(evt, `${username}:${password}`, 'Basic');
  }

  // FIXME Patternfly Form component onSubmit is not triggered by Enter keydown when the Form contains
  // multiple FormGroups. This key handler is a workaround to allow keyboard-driven use of the form
  const handleKeyDown = (evt) => {
    if (evt.key === 'Enter') {
      handleSubmit(evt);
    }
  }

  return (
    <Form onSubmit={handleSubmit}>
      <FormGroup
        label="Username"
        isRequired
        fieldId="username"
        helperText="Please provide your username"
      >
        <TextInput
          isRequired
          type="text"
          id="username"
          name="username"
          aria-describedby="username-helper"
          value={username}
          onChange={handleUserChange}
          onKeyDown={handleKeyDown}
        />
      </FormGroup>
      <FormGroup
        label="Password"
        isRequired
        fieldId="password"
        helperText="Please provide your password"
      >
        <TextInput
          isRequired
          type="password"
          id="password"
          name="password"
          aria-describedby="password-helper"
          value={password}
          onChange={handlePasswordChange}
          onKeyDown={handleKeyDown}
        />
      </FormGroup>
      <ActionGroup>
        <Button variant="primary" onClick={handleSubmit}>Login</Button>
      </ActionGroup>
    </Form>
  );

}

export const BasicAuthDescriptionText = () => {
  return (
    <Text component={TextVariants.p}>The ContainerJFR server is configured with Basic authentication.</Text>
  );
}
