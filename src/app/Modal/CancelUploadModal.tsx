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
import { Button, Modal } from '@patternfly/react-core';
import * as React from 'react';

export interface CancelUploadModalProps {
  visible: boolean;
  onYes: () => void;
  onNo: () => void;
  title: string;
  message: string;
}

export const CancelUploadModal: React.FC<CancelUploadModalProps> = (props) => {
  return (
    <Modal
      appendTo={portalRoot}
      width={'40%'}
      isOpen={props.visible}
      showClose={true}
      onClose={props.onNo}
      title={props.title}
      actions={[
        <Button key={'Yes'} variant="primary" onClick={props.onYes}>
          Yes
        </Button>,
        <Button key={'No'} variant="secondary" onClick={props.onNo}>
          No
        </Button>,
      ]}
    >
      {props.message}
    </Modal>
  );
};
