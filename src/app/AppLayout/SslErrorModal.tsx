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
import { portalRoot } from '@app/utils/utils';
import { Button, Modal, ModalVariant, Text } from '@patternfly/react-core';
import * as React from 'react';
import { useHistory } from 'react-router-dom';

export interface SslErrorModalProps {
  visible: boolean;
  onDismiss: () => void;
}

export const SslErrorModal: React.FC<SslErrorModalProps> = (props) => {
  const routerHistory = useHistory();

  const handleClick = () => {
    routerHistory.push('/security');
    props.onDismiss();
  };

  return (
    <Modal
      appendTo={portalRoot}
      isOpen={props.visible}
      variant={ModalVariant.medium}
      showClose={true}
      onClose={props.onDismiss}
      title="SSL Error"
      description="The connection failed because the SSL Certificate for the target is not trusted."
    >
      <Text>
        To add the SSL certificate for this target, go to &nbsp;
        <Button variant="primary" onClick={handleClick}>
          Security
        </Button>
      </Text>
    </Modal>
  );
};
