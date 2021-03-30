/*
 * Copyright (c) 2020 Red Hat, Inc.
 *
 * The Universal Permissive License (UPL), Version 1.0
 *
 * Subject to the condition set forth below, permission is hereby granted to any
 * person obtaining a copy of this software, associated documentation and/or data
 * (collectively the "Software"), free of charge and under any and all copyright
 * rights in the Software, and any and all patent rights owned or freely
 * licensable by each licensor hereunder covering either (i) the unmodified
 * Software as contributed to or provided by such licensor, or (ii) the Larger
 * Works (as defined below), to deal in both
 *
 * (a) the Software, and
 * (b) any piece of software and/or hardware listed in the lrgrwrks.txt file if
 * one is included with the Software (each a "Larger Work" to which the Software
 * is contributed by such licensors),
 *
 * without restriction, including without limitation the rights to copy, create
 * derivative works of, display, perform, and distribute the Software and make,
 * use, sell, offer for sale, import, export, have made, and have sold the
 * Software and the Larger Work(s), and to sublicense the foregoing rights on
 * either these or other terms.
 *
 * This license is subject to the following condition:
 * The above copyright notice and either this complete permission notice or at
 * a minimum a reference to the UPL must be included in all copies or
 * substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */
import * as React from 'react';
import { ActionGroup, Button, Form, FormGroup, Text, TextInput, TextVariants } from '@patternfly/react-core';
import { FormProps } from './FormProps';

export const BasicAuthForm: React.FunctionComponent<FormProps> = (props) => {

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
    <Text component={TextVariants.p}>The Cryostat server is configured with Basic authentication.</Text>
  );
}
