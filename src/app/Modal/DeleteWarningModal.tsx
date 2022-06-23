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
import * as React from 'react';
import { Modal, ModalVariant, Button, Title, TitleSizes, Checkbox } from '@patternfly/react-core';
import WarningTriangleIcon from '@patternfly/react-icons/dist/esm/icons/warning-triangle-icon';
import { DeleteActiveRecordings, DeleteArchivedRecordings, DeleteEventTemplates, DeleteAutomatedRules, DeleteJMXCredentials, DeleteWarningType, DeleteWarningEnum, DeleteUndefined } from './DeleteWarningTypes';

export interface DeleteWarningProps {
  warningType: DeleteWarningEnum;
  items?: Array<string>;
  visible: boolean;
  onAccept: () => void;
  onClose: () => void;
  checkbox?: boolean;
  setCheckbox?: React.Dispatch<React.SetStateAction<boolean>>;
}

const delMap : DeleteWarningType[] = [
  DeleteActiveRecordings,
  DeleteArchivedRecordings,
  DeleteAutomatedRules,
  DeleteEventTemplates,
  DeleteJMXCredentials
];

function getFromWarningMap(warning: DeleteWarningEnum) : DeleteWarningType {
  const wt = delMap.find(t => t.id === warning);
  return (wt === undefined) ? DeleteUndefined : wt;
}

export const DeleteWarningModal = ({ warningType , items, visible, onAccept, onClose, checkbox, setCheckbox}: DeleteWarningProps): JSX.Element => {
  const realWarningType : DeleteWarningType = getFromWarningMap(warningType);

  const description = `${realWarningType.description}${(typeof items === 'undefined' || items.length <= 1) ?  "":"s"}: [${items?.join(", ")}] ?`
  
  const footer = (
    <Title headingLevel="h4" size={TitleSizes.md}>
      <WarningTriangleIcon />
      <span className="pf-u-pl-sm">This cannot be undone.</span>
    </Title>
  );

  const onAcceptClose = () => {
    onAccept();
    onClose();
  }
  
  return (
      <Modal
        isOpen={visible}
        aria-label={realWarningType.ariaLabel}
        variant={ModalVariant.small}
        titleIconVariant="warning"
        showClose={true}
        onClose={onClose}
        title={realWarningType.title}
        description={description}
        footer={footer}>
        
        <Button variant="danger" onClick={onAcceptClose}>Delete</Button>
        <Button variant="link" onClick={onClose}>Cancel</Button>
        {(realWarningType === DeleteAutomatedRules) && (typeof setCheckbox !== 'undefined') &&
          <Checkbox id="clean-rule-enabled" 
            label="Enabled" 
            isChecked={checkbox} 
            onChange={(checked) => setCheckbox(checked)}/>
        }
      </Modal>  
  );
};
