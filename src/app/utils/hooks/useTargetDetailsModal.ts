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

import { EnvironmentNode, TargetNode } from '@app/Shared/Services/api.types';
import { ServiceContext } from '@app/Shared/Services/Services';
import { useSubscriptions } from '@app/utils/hooks/useSubscriptions';
import { findInnermostTargetNode } from '@app/utils/targetUtils';
import * as React from 'react';

interface UseTargetDetailsModalResult {
  showDetailsModal: boolean;
  setShowDetailsModal: (show: boolean) => void;
  selectedJvmId: string;
  setSelectedJvmId: (jvmId: string) => void;
  loadingLineage: boolean;
  wrappedTarget: { getData: () => TargetNode } | undefined;
}

export const useTargetDetailsModal = (): UseTargetDetailsModalResult => {
  const context = React.useContext(ServiceContext);
  const addSubscription = useSubscriptions();

  const [showDetailsModal, setShowDetailsModal] = React.useState(false);
  const [selectedJvmId, setSelectedJvmId] = React.useState<string>('');
  const [lineageRoot, setLineageRoot] = React.useState<EnvironmentNode | undefined>(undefined);
  const [loadingLineage, setLoadingLineage] = React.useState(false);

  React.useEffect(() => {
    if (!showDetailsModal || !selectedJvmId) {
      return;
    }
    setLoadingLineage(true);
    setLineageRoot(undefined);
    addSubscription(
      context.api.getTargetLineage(selectedJvmId).subscribe({
        next: (root) => {
          setLineageRoot(root);
          setLoadingLineage(false);
        },
        error: (_) => {
          setLineageRoot(undefined);
          setLoadingLineage(false);
        },
      }),
    );
  }, [showDetailsModal, selectedJvmId, addSubscription, context.api]);

  const wrappedTarget = React.useMemo(() => {
    if (!lineageRoot) {
      return undefined;
    }
    const targetNode = findInnermostTargetNode(lineageRoot);
    if (!targetNode) {
      return undefined;
    }
    return {
      getData: () => targetNode,
    };
  }, [lineageRoot]);

  return {
    showDetailsModal,
    setShowDetailsModal,
    selectedJvmId,
    setSelectedJvmId,
    loadingLineage,
    wrappedTarget,
  };
};
