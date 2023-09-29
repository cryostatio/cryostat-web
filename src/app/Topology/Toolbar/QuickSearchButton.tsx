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

import { Button, Tooltip } from '@patternfly/react-core';
import * as React from 'react';
import QuickSearchIcon from '../../Shared/Components/QuickSearchIcon';

export interface QuickSearchButtonProps {
  onClick: () => void;
  tooltipContent?: React.ReactNode;
}

export const QuickSearchButton: React.FC<QuickSearchButtonProps> = ({ onClick, tooltipContent, ...props }) => {
  const catalogRef = React.useRef<HTMLDivElement>(null);
  const handleClick = React.useCallback(() => {
    onClick();
    catalogRef.current?.blur(); // Remove focus on the catalog button
  }, [onClick]);

  return (
    <div id="topology-quicksearch-btn-wrapper">
      <Tooltip
        {...props}
        content={tooltipContent}
        appendTo={() => document.getElementById('topology-quicksearch-btn-wrapper') || document.body}
      >
        <Button
          variant="plain"
          onClick={handleClick}
          style={{ padding: 0 }}
          data-quickstart-id={'topology-catalog-btn'}
          ref={catalogRef}
        >
          <QuickSearchIcon />
        </Button>
      </Tooltip>
    </div>
  );
};
