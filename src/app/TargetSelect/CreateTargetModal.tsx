/*
 * Copyright The Cryostat Authors
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
import { Target } from '@app/Shared/Services/Target.service';
import { ActionGroup, Button, ButtonType, Form, FormGroup, Modal, ModalVariant, TextInput } from '@patternfly/react-core';
import * as React from 'react';

export interface CreateTargetModalProps {
  visible: boolean;
  onSubmit: (target: Target) => void;
  onDismiss: () => void;
}

export const CreateTargetModal: React.FunctionComponent<CreateTargetModalProps> = (props) => {
  const [connectUrl, setConnectUrl] = React.useState('');
  const [alias, setAlias] = React.useState('');

  const createTarget = React.useCallback(() => {
    props.onSubmit({ connectUrl, alias: alias.trim() || connectUrl });
    setConnectUrl('');
    setAlias('');
  }, [props.onSubmit, connectUrl, alias]);

  const handleKeyDown = React.useCallback((evt) => {
    if (evt.key === 'Enter') {
      createTarget();
    }
  }, [createTarget]);

  return (<>
    <Modal
      isOpen={props.visible}
      variant={ModalVariant.small}
      showClose={true}
      onClose={props.onDismiss}
      title="Create Target"
      description="Create a custom target connection"
    >
      <Form isHorizontal>
        <FormGroup
          label="Connection URL"
          isRequired
          fieldId="connect-url"
          helperText="JMX Service URL, e.g. service:jmx:rmi:///jndi/rmi://localhost:0/jmxrmi"
        >
          <TextInput
            value={connectUrl}
            isRequired
            type="text"
            id="connect-url"
            onChange={setConnectUrl}
            onKeyDown={handleKeyDown}
          />
        </FormGroup>
        <FormGroup
          label="Alias"
          fieldId="alias"
          helperText="Connection Nickname"
        >
          <TextInput
            value={alias}
            type="text"
            id="alias"
            onChange={setAlias}
            onKeyDown={handleKeyDown}
          />
        </FormGroup>
      </Form>
      <ActionGroup>
        <Button variant="primary" type={ButtonType.submit} onClick={createTarget}>Create</Button>
      </ActionGroup>
    </Modal>
  </>);
}
