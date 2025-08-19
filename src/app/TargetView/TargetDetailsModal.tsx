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

import { NodeType, NullableTarget } from '@app/Shared/Services/api.types';
import EntityDetails from '@app/Topology/Entity/EntityDetails';
import { Modal, ModalVariant } from '@patternfly/react-core';
import * as React from 'react';

export interface TargetDetailsModalProps {
  visible: boolean;
  onDismiss: () => void;
  target: NullableTarget;
}

export const TargetDetailsModal: React.FC<TargetDetailsModalProps> = ({ visible, onDismiss, target }) => {
  const wrappedTarget = React.useMemo(() => {
    if (!target) {
      return undefined;
    }
    return {
      getData: () => ({
        name: target.alias,
        target,
        nodeType: NodeType.JVM,
        labels: target.labels,
      }),
    };
  }, [target]);

  return (
    <Modal
      isOpen={visible}
      variant={ModalVariant.large}
      showClose={true}
      className="target-details-modal"
      onClose={onDismiss}
    >
      <EntityDetails entity={wrappedTarget} className={'target-details-modal'} />
    </Modal>
  );
};
