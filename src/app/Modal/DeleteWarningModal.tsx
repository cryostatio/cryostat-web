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
import { ServiceContext } from '@app/Shared/Services/Services';
import { portalRoot } from '@app/utils/utils';
import { Modal, ModalVariant, Button, Checkbox, Stack, Split } from '@patternfly/react-core';
import * as React from 'react';
import { useState } from 'react';
import { DeleteOrDisableWarningType, getFromWarningMap } from './DeleteWarningUtils';

export interface DeleteWarningProps {
  warningType: DeleteOrDisableWarningType;
  visible: boolean;
  onAccept: () => void;
  onClose: () => void;
}

export const DeleteWarningModal = ({ onAccept, onClose, ...props }: DeleteWarningProps): JSX.Element => {
  const context = React.useContext(ServiceContext);
  const [doNotAsk, setDoNotAsk] = useState(false);

  const realWarningType = getFromWarningMap(props.warningType);

  const onAcceptClose = React.useCallback(
    (ev: React.MouseEvent) => {
      ev.stopPropagation();
      onAccept();
      onClose();
      if (doNotAsk && !!realWarningType) {
        context.settings.setDeletionDialogsEnabledFor(realWarningType.id, false);
      }
    },
    [context.settings, onAccept, onClose, doNotAsk, realWarningType]
  );

  const onInnerClose = React.useCallback(
    (ev?: React.MouseEvent) => {
      ev && ev.stopPropagation();
      onClose();
    },
    [onClose]
  );

  return (
    <Modal
      appendTo={portalRoot}
      title={`${realWarningType?.title}`}
      description={realWarningType?.description}
      aria-label={realWarningType?.ariaLabel}
      titleIconVariant="warning"
      variant={ModalVariant.medium}
      isOpen={props.visible}
      showClose
      onClose={onInnerClose}
      actions={[
        <Stack hasGutter key="modal-footer-stack">
          <Split key="modal-footer-split">
            <Button variant="danger" onClick={onAcceptClose}>
              Delete
            </Button>
            <Button variant="link" onClick={onInnerClose}>
              Cancel
            </Button>
          </Split>
        </Stack>,
      ]}
    >
      <Checkbox id="do-not-ask-enabled" label="Don't ask me again" isChecked={doNotAsk} onChange={setDoNotAsk} />
    </Modal>
  );
};
