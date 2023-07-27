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
import { Tooltip } from '@patternfly/react-core';
import { css } from '@patternfly/react-styles';
import * as React from 'react';

export const EntityTitle: React.FC<{
  content: React.ReactNode;
  badge?: React.ReactNode;
  badgeTooltipContent?: React.ReactNode;
}> = ({ content, badge, badgeTooltipContent, ...props }) => {
  return (
    <div className={css('entity-overview__entity-title-wrapper')} {...props}>
      {badge ? (
        <Tooltip content={badgeTooltipContent} appendTo={portalRoot}>
          <span className="entity-overview__entity-title-badge">{badge}</span>
        </Tooltip>
      ) : (
        <></>
      )}
      {content}
    </div>
  );
};
