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
import { DeleteWarningProps } from '../Modal/DeleteWarningModal';
import { getFromWarningMap } from '../Modal/DeleteWarningUtils';

export interface RuleDeleteWarningProps extends DeleteWarningProps {
  ruleName?: string;
  clean: boolean;
  setClean: React.Dispatch<React.SetStateAction<boolean>>;
}

export const RuleDeleteWarningModal = ({
  visible,
  ruleName,
  warningType,
  onAccept,
  onClose,
  clean,
  setClean,
}: RuleDeleteWarningProps): JSX.Element => {
  const context = React.useContext(ServiceContext);
  const [doNotAsk, setDoNotAsk] = useState(false);

  const warningContents = React.useMemo(() => getFromWarningMap(warningType), [warningType]);

  const onAcceptClose = React.useCallback(() => {
    onAccept();
    onClose();
    if (doNotAsk) {
      context.settings.setDeletionDialogsEnabledFor(warningType, false);
    }
  }, [onAccept, onClose, doNotAsk, context.settings, warningType]);

  return (
    <Modal
      appendTo={portalRoot}
      title={warningContents?.title}
      description={warningContents?.description}
      aria-label={warningContents?.ariaLabel}
      titleIconVariant="warning"
      variant={ModalVariant.small}
      isOpen={visible}
      showClose
      onClose={onClose}
      actions={[
        <Stack hasGutter key="modal-footer-stack">
          <Split key="modal-footer-split">
            <Button variant="danger" onClick={onAcceptClose}>
              {warningType.match(/disable/i) ? 'Disable' : 'Delete'}
            </Button>
            <Button variant="link" onClick={onClose}>
              Cancel
            </Button>
          </Split>
        </Stack>,
      ]}
    >
      <Stack hasGutter key="modal-checkboxes-stack">
        <Checkbox
          id="clean-rule-enabled"
          label="Clean"
          description={`Clean will stop any Active Recordings that ${ruleName} created.`}
          isChecked={clean}
          onChange={setClean}
        />
        <Checkbox id="do-not-ask-enabled" label="Don't ask me again" isChecked={doNotAsk} onChange={setDoNotAsk} />
      </Stack>
    </Modal>
  );
};
