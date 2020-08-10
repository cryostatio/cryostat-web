import * as React from 'react';
import { first } from 'rxjs/operators';
import { ActionGroup, Button, Form, FormGroup, Modal, ModalVariant, Text, TextInput, TextVariants } from '@patternfly/react-core';
import { ServiceContext } from '@app/Shared/Services/Services';

export interface AuthModalProps {
  visible: boolean;
  onDismiss: () => void;
  onSave: () => void;
}

export const AuthModal: React.FunctionComponent<AuthModalProps> = (props) => {
  const context = React.useContext(ServiceContext);
  const [username, setUsername] = React.useState('');
  const [password, setPassword] = React.useState('');

  const clear = () => {
    setUsername('');
    setPassword('');
  };

  const handleSave = () => {
    context.target.target().pipe(first()).subscribe(target => {
      context.target.setCredentials(target, btoa(`${username}:${password}`));
      context.target.setAuthRetry();
      clear();
      props.onSave();
    });
  };

  const handleDeleteCredentials = () => {
    context.target.target().pipe(first()).subscribe(target => {
      context.target.deleteCredentials(target);
      clear();
      props.onSave();
    });
  };

  const handleDismiss = () => {
    clear();
    props.onDismiss();
  };

  return (
    <Modal
      isOpen={props.visible}
      variant={ModalVariant.large}
      showClose={true}
      onClose={props.onDismiss}
      title="Authentication Required"
      description="This Target JVM requires authentication"
    >
      <Form>
        <FormGroup
          isRequired
          label="Username"
          fieldId="username"
        >
          <TextInput
            value={username}
            isRequired
            type="text"
            id="username"
            onChange={setUsername}
          />
        </FormGroup>
        <FormGroup
          isRequired
          label="Password"
          fieldId="password"
        >
          <TextInput
            value={password}
            isRequired
            type="password"
            id="password"
            onChange={setPassword}
          />
        </FormGroup>
        <ActionGroup>
          <Button variant="primary" onClick={handleSave}>Save</Button>
          <Button variant="danger" onClick={handleDeleteCredentials}>Delete</Button>
          <Button variant="secondary" onClick={handleDismiss}>Cancel</Button>
        </ActionGroup>
      </Form>
    </Modal>
  );
}
