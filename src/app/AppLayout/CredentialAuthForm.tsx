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
import { LoadingProps } from '@app/Shared/Components/types';
import { ActionGroup, Button, Form, FormGroup, TextInput } from '@patternfly/react-core';
import * as React from 'react';

export interface AuthCredential {
  username: string;
  password: string;
}

export interface CredentialAuthFormProps {
  onDismiss: () => void;
  onSave: (username: string, password: string) => void;
  focus?: boolean;
  loading?: boolean;
  isDisabled?: boolean;
  children?: React.ReactNode;
  onCredentialChange?: (credential: AuthCredential) => void;
}

export const CredentialAuthForm: React.FC<CredentialAuthFormProps> = ({
  onDismiss,
  onSave,
  onCredentialChange,
  loading,
  isDisabled,
  focus,
  children,
  ...props
}) => {
  const [username, setUsername] = React.useState('');
  const [password, setPassword] = React.useState('');

  const handleSave = React.useCallback(() => {
    onSave(username, password);
  }, [onSave, username, password]);

  const handleDismiss = React.useCallback(() => {
    // Do not set state as form is unmounted after cancel
    onDismiss();
  }, [onDismiss]);

  const handleKeyUp = React.useCallback(
    (event: React.KeyboardEvent): void => {
      if (event.code === 'Enter' && username !== '' && password !== '') {
        handleSave();
      }
    },
    [handleSave, username, password],
  );

  const saveButtonLoadingProps = React.useMemo(
    () =>
      ({
        spinnerAriaValueText: 'Saving',
        spinnerAriaLabel: 'saving-credentials',
        isLoading: loading,
      }) as LoadingProps,
    [loading],
  );

  return (
    <Form {...props}>
      {children}
      <FormGroup isRequired label="Username" fieldId="username">
        <TextInput
          value={username}
          isDisabled={isDisabled || loading}
          isRequired
          type="text"
          id="username"
          onChange={(_event, v) => {
            setUsername(v);
            onCredentialChange &&
              onCredentialChange({
                username: v,
                password: password,
              });
          }}
          onKeyUp={handleKeyUp}
          autoFocus={focus}
        />
      </FormGroup>
      <FormGroup isRequired label="Password" fieldId="password">
        <TextInput
          value={password}
          isDisabled={isDisabled || loading}
          isRequired
          type="password"
          id="password"
          onChange={(_event, v) => {
            setPassword(v);
            onCredentialChange &&
              onCredentialChange({
                username: username,
                password: v,
              });
          }}
          onKeyUp={handleKeyUp}
        />
      </FormGroup>
      <ActionGroup>
        <Button
          variant="primary"
          onClick={handleSave}
          {...saveButtonLoadingProps}
          isDisabled={isDisabled || loading || username === '' || password === ''}
        >
          {loading ? 'Saving' : 'Save'}
        </Button>
        <Button variant="secondary" onClick={handleDismiss} isDisabled={isDisabled || loading}>
          Cancel
        </Button>
      </ActionGroup>
    </Form>
  );
};
