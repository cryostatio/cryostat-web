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
import { formatTimeRangeLabel } from '@app/utils/archiveFilters';
import { useArchiveFilters } from '@app/utils/hooks/useArchiveFilters';
import { getColorForNodeType } from '@app/utils/targetUtils';
import { useCryostatTranslation } from '@i18n/i18nextUtil';
import { Button, Label, LabelGroup, Toolbar, ToolbarContent, ToolbarItem } from '@patternfly/react-core';
import * as React from 'react';

export interface ArchiveFilterBarProps {
  className?: string;
}

/**
 * Displays active archive filters as removable chips.
 * Shows lineage filters, time range filter, and search text filter.
 * Provides "Clear All" button when filters are active.
 */
export const ArchiveFilterBar: React.FC<ArchiveFilterBarProps> = ({ className, ...props }) => {
  const { t } = useCryostatTranslation();
  const {
    lineageFilters,
    timeRange,
    searchText,
    hasActiveFilters,
    removeLineageFilter,
    setTimeRange,
    setSearchText,
    clearAllFilters,
  } = useArchiveFilters();

  const handleRemoveLineageFilter = React.useCallback(
    (node: Pick<LineageNode, 'nodeType' | 'name'>) => {
      removeLineageFilter(node);
    },
    [removeLineageFilter],
  );

  const handleClearTimeRange = React.useCallback(() => {
    setTimeRange({ type: 'preset', preset: 'all' });
  }, [setTimeRange]);

  const handleClearSearchText = React.useCallback(() => {
    setSearchText('');
  }, [setSearchText]);

  const hasTimeRangeFilter = timeRange.type !== 'preset' || timeRange.preset !== 'all';

  if (!hasActiveFilters) {
    return null;
  }

  return (
    <Toolbar {...props} className={className} isSticky>
      <ToolbarContent>
        {lineageFilters.length > 0 && (
          <ToolbarItem>
            <LabelGroup
              categoryName={t('ArchiveFilterBar.LINEAGE')}
              isClosable
              onClick={() => lineageFilters.forEach((node) => handleRemoveLineageFilter(node))}
            >
              {lineageFilters.map((node, index) => (
                <Label
                  key={`${node.nodeType}-${node.name}-${index}`}
                  color={getColorForNodeType(node.nodeType) as any}
                  onClose={() => handleRemoveLineageFilter(node)}
                >
                  {`${node.nodeType}: ${node.name}`}
                </Label>
              ))}
            </LabelGroup>
          </ToolbarItem>
        )}

        {hasTimeRangeFilter && (
          <ToolbarItem>
            <LabelGroup categoryName={t('ArchiveFilterBar.TIME_RANGE')} isClosable onClick={handleClearTimeRange}>
              <Label color="blue" onClose={handleClearTimeRange}>
                {formatTimeRangeLabel(timeRange)}
              </Label>
            </LabelGroup>
          </ToolbarItem>
        )}

        {searchText.length > 0 && (
          <ToolbarItem>
            <LabelGroup categoryName={t('ArchiveFilterBar.SEARCH')} isClosable onClick={handleClearSearchText}>
              <Label color="blue" onClose={handleClearSearchText}>
                {searchText}
              </Label>
            </LabelGroup>
          </ToolbarItem>
        )}

        <ToolbarItem>
          <Button variant="link" onClick={clearAllFilters}>
            {t('ArchiveFilterBar.CLEAR_ALL_FILTERS')}
          </Button>
        </ToolbarItem>
      </ToolbarContent>
    </Toolbar>
  );
};
