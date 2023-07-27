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

import { DrawerActions, DrawerCloseButton, DrawerHead, DrawerPanelBody } from '@patternfly/react-core';
import * as React from 'react';

export interface TopologySideBarProps {
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
}

// Parent will wrap this element in <DrawPaneContent />
export const TopologySideBar: React.FC<TopologySideBarProps> = ({ children, onClose, className, ...props }) => {
  return (
    <>
      <DrawerHead hasNoPadding>
        <DrawerActions>
          <DrawerCloseButton className="entity-overview__entity-close-button" onClick={onClose} />
        </DrawerActions>
      </DrawerHead>
      <DrawerPanelBody {...props} hasNoPadding className={className}>
        {children}
      </DrawerPanelBody>
    </>
  );
};
