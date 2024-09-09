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
import { Panel, PanelMain, PanelMainBody } from '@patternfly/react-core';
import * as React from 'react';

export interface ScrollableMenuContentProps {
  maxHeight?: string;
}

// Use case: Menu footer or search bar needs to be sticky.
export const ScrollableMenuContent: React.FC<ScrollableMenuContentProps> = ({ children, maxHeight }) => {
  return (
    <Panel isScrollable>
      <PanelMain maxHeight={maxHeight}>
        <PanelMainBody style={{ padding: 0 }}>{children}</PanelMainBody>
      </PanelMain>
    </Panel>
  );
};
