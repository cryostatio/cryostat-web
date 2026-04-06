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

import { LineageLabelChain } from '@app/Archives/LineageLabelChain';
import { useTargetLineage } from '@app/utils/hooks/useTargetLineage';
import { extractFilterableLineagePath } from '@app/utils/targetUtils';
import { useCryostatTranslation } from '@i18n/i18nextUtil';
import { Button, Content, Skeleton, Split, SplitItem, Stack, StackItem } from '@patternfly/react-core';
import { InfoCircleIcon } from '@patternfly/react-icons';
import * as React from 'react';

export interface DirectoryNameCellProps {
  jvmId: string;
  connectUrl?: string;
  alias?: string;
  onInfoClick?: () => void;
  showInfoButton?: boolean;
}

export const DirectoryNameCell: React.FC<DirectoryNameCellProps> = ({
  jvmId,
  connectUrl,
  alias,
  onInfoClick,
  showInfoButton = true,
}) => {
  const { displayName, isLoading, targetNode } = useTargetLineage(jvmId, connectUrl, alias);
  const { t } = useCryostatTranslation();

  // Extract lineage path from target node if available
  const lineagePath = React.useMemo(() => {
    if (!targetNode) return [];
    return extractFilterableLineagePath(targetNode);
  }, [targetNode]);

  const showLineage = lineagePath.length > 0;

  return (
    <Split hasGutter>
      <SplitItem>
        {isLoading ? (
          <Skeleton width="30ch" screenreaderText={t('DirectoryNameCell.LOADING_TARGET_INFO')} />
        ) : (
          <Stack>
            <StackItem>
              <Content>{displayName}</Content>
            </StackItem>
            {showLineage && (
              <StackItem>
                <LineageLabelChain lineagePath={lineagePath} />
              </StackItem>
            )}
          </Stack>
        )}
      </SplitItem>
      {showInfoButton && (
        <SplitItem>
          <Button
            variant="plain"
            onClick={onInfoClick}
            isDisabled={!jvmId || jvmId === 'uploads'}
            aria-label={t('DirectoryNameCell.VIEW_TARGET_DETAILS')}
          >
            <InfoCircleIcon />
          </Button>
        </SplitItem>
      )}
    </Split>
  );
};
