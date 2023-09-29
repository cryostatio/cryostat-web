/*
 * Copyright The Cryostat Authors.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { AuthMethod } from '@app/Shared/Services/service.types';
import { ServiceContext } from '@app/Shared/Services/Services';
import { ActionGroup, Button, Checkbox, Form, FormGroup, Text, TextInput, TextVariants } from '@patternfly/react-core';
import { Base64 } from 'js-base64';
import * as React from 'react';
import { map } from 'rxjs/operators';
import { FormProps } from './types';

export const BasicAuthForm: React.FC<FormProps> = ({ onSubmit }) => {
  const context = React.useContext(ServiceContext);
  const [username, setUsername] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [rememberMe, setRememberMe] = React.useState(true);

  React.useEffect(() => {
    const sub = context.login
      .getToken()
      .pipe(map(Base64.decode))
      .subscribe((creds) => {
        if (!creds.includes(':')) {
          setUsername(creds);
          return;
        }
        const parts: string[] = creds.split(':');
        setUsername(parts[0]);
        setPassword(parts[1]);
      });
    return () => sub.unsubscribe();
  }, [context, context.api, setUsername, setPassword]);

  const handleUserChange = React.useCallback(
    (evt) => {
      setUsername(evt);
    },
    [setUsername],
  );

  const handlePasswordChange = React.useCallback(
    (evt) => {
      setPassword(evt);
    },
    [setPassword],
  );

  const handleRememberMeToggle = React.useCallback(
    (evt) => {
      setRememberMe(evt);
    },
    [setRememberMe],
  );

  const handleSubmit = React.useCallback(
    (evt) => {
      onSubmit(evt, `${username}:${password}`, AuthMethod.BASIC, rememberMe);
    },
    [onSubmit, username, password, rememberMe],
  );

  // FIXME Patternfly Form component onSubmit is not triggered by Enter keydown when the Form contains
  // multiple FormGroups. This key handler is a workaround to allow keyboard-driven use of the form
  const handleKeyDown = React.useCallback(
    (evt) => {
      if (evt.key === 'Enter') {
        handleSubmit(evt);
      }
    },
    [handleSubmit],
  );

  return (
    <Form onSubmit={handleSubmit}>
      <FormGroup label="Username" isRequired fieldId="username" helperText="Please provide your username">
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
      <FormGroup label="Password" isRequired fieldId="password" helperText="Please provide your password">
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
      <Checkbox id="remember-me" label="Remember Me" isChecked={rememberMe} onChange={handleRememberMeToggle} />
      <ActionGroup>
        <Button variant="primary" onClick={handleSubmit}>
          Login
        </Button>
      </ActionGroup>
    </Form>
  );
};

export const BasicAuthDescriptionText: React.FC = () => {
  return <Text component={TextVariants.p}>The Cryostat server is configured with Basic authentication.</Text>;
};
