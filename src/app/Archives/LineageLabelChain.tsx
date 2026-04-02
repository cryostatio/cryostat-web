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

import { LineageNode } from '@app/Shared/Services/api.types';
import { useArchiveFilters } from '@app/utils/hooks/useArchiveFilters';
import { useCryostatTranslation } from '@i18n/i18nextUtil';
import { Button, Flex, FlexItem } from '@patternfly/react-core';
import React from 'react';

export interface LineageLabelChainProps {
  /** The lineage path to display as a label chain */
  lineagePath: LineageNode[];
  /** Optional CSS class name */
  className?: string;
}

/**
 * LineageLabelChain component displays a lineage hierarchy as an interactive label chain.
 *
 * Each node in the chain is clickable and allows users to:
 * - Click to add that node as a filter (filtering to that level of the hierarchy)
 * - See the full path from Realm → Namespace → Deployment → Pod
 *
 * The component automatically adapts to RTL (right-to-left) languages by reversing
 * the display order while maintaining logical hierarchy order.
 *
 * @example
 * <LineageLabelChain
 *   lineagePath={[
 *     { nodeType: 'Realm', name: 'my-cluster' },
 *     { nodeType: 'Namespace', name: 'production' },
 *     { nodeType: 'Deployment', name: 'my-app' }
 *   ]}
 * />
 */
export const LineageLabelChain: React.FC<LineageLabelChainProps> = ({ lineagePath, className }) => {
  const { t, i18n } = useCryostatTranslation();
  const { addLineageFilter, lineageFilters } = useArchiveFilters();

  const handleNodeClick = React.useCallback(
    (node: LineageNode) => {
      addLineageFilter(node);
    },
    [addLineageFilter],
  );

  // Check if a node is already in the active filters
  const isNodeFiltered = React.useCallback(
    (node: LineageNode) => {
      return lineageFilters.some((filter) => filter.nodeType === node.nodeType && filter.name === node.name);
    },
    [lineageFilters],
  );

  // Determine if the current language uses RTL text direction
  const isRTL = React.useMemo(() => {
    const dir = i18n.dir();
    return dir === 'rtl';
  }, [i18n]);

  // Reverse the path for RTL languages to maintain visual hierarchy
  const displayPath = React.useMemo(() => {
    return isRTL ? [...lineagePath].reverse() : lineagePath;
  }, [lineagePath, isRTL]);

  if (!lineagePath || lineagePath.length === 0) {
    return null;
  }

  return (
    <Flex
      className={className}
      direction={{ default: 'row' }}
      spaceItems={{ default: 'spaceItemsSm' }}
      alignItems={{ default: 'alignItemsCenter' }}
      role="navigation"
      aria-label={t('LineageLabelChain.ARIA_LABELS.CHAIN')}
    >
      {displayPath.map((node) => {
        const isFiltered = isNodeFiltered(node);

        return (
          <FlexItem key={`${node.nodeType}-${node.name}`}>
            {isFiltered ? (
              <span aria-label={t('LineageLabelChain.ARIA_LABELS.FILTERED_NODE')}>
                <strong>
                  {node.nodeType}: {node.name}
                </strong>
              </span>
            ) : (
              <Button
                variant="link"
                isInline
                onClick={() => handleNodeClick(node)}
                aria-label={t('LineageLabelChain.ARIA_LABELS.FILTER_BY_NODE', {
                  nodeType: node.nodeType,
                  name: node.name,
                })}
              >
                {node.nodeType}: {node.name}
              </Button>
            )}
          </FlexItem>
        );
      })}
    </Flex>
  );
};
