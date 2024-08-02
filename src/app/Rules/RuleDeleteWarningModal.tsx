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
import { useTranslation } from 'react-i18next';
import { DeleteWarningProps } from '../Modal/DeleteWarningModal';
import { getFromWarningMap } from '../Modal/utils';

export interface RuleDeleteWarningProps extends DeleteWarningProps {
  ruleName?: string;
  clean: boolean;
  setClean: (clean: boolean) => void;
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
  const { t } = useTranslation();
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
              {t(warningType.match(/disable/i) ? 'DISABLE' : 'DELETE', { ns: 'common' })}
            </Button>
            <Button variant="link" onClick={onClose}>
              {t('CANCEL', { ns: 'common' })}
            </Button>
          </Split>
        </Stack>,
      ]}
    >
      <Stack hasGutter key="modal-checkboxes-stack">
        <Checkbox
          id="clean-rule-enabled"
          label={t('CLEAN', { ns: 'common' })}
          description={t('RuleDeleteWarningModal.CLEAN_DESCRIPTION', { ruleName: ruleName })}
          isChecked={clean}
          onChange={(_, checked) => setClean(checked)}
        />
        <Checkbox
          id="do-not-ask-enabled"
          label={t('DONOT_ASK_AGAIN', { ns: 'common' })}
          isChecked={doNotAsk}
          onChange={(_event, checked) => setDoNotAsk(checked)}
        />
      </Stack>
    </Modal>
  );
};
