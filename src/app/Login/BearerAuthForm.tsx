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

export const BearerAuthForm: React.FunctionComponent<FormProps> = (props) => {

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
