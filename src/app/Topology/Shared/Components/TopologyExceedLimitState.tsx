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
import {
  Bullseye,
  Button,
  EmptyState,
  EmptyStateBody,
  EmptyStateIcon,
  EmptyStateActions,
  EmptyStateHeader,
  EmptyStateFooter,
} from '@patternfly/react-core';
import { TopologyIcon } from '@patternfly/react-icons';
import * as React from 'react';

export interface TopologyExceedLimitStateProps {
  onShowTopologyAnyway: () => void;
}

export const TopologyExceedLimitState: React.FC<TopologyExceedLimitStateProps> = ({
  onShowTopologyAnyway,
  ...props
}) => {
  return (
    <Bullseye {...props}>
      <EmptyState>
        <EmptyStateHeader
          titleText="Loading of application topology is taking longer than expected"
          icon={<EmptyStateIcon icon={TopologyIcon} />}
          headingLevel="h4"
        />
        <EmptyStateBody>
          We are working on loading the topology of your applications. Since the data to be displayed is large, the
          rendering is taking more time. To see a smaller subset of your applications, use the filters to select the
          parameters or click Continue to keep waiting.
        </EmptyStateBody>
        <EmptyStateFooter>
          <EmptyStateActions>
            <Button variant="link" onClick={onShowTopologyAnyway}>
              Continue
            </Button>
          </EmptyStateActions>
        </EmptyStateFooter>
      </EmptyState>
    </Bullseye>
  );
};
