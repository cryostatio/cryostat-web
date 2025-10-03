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
import { NullableTarget } from '@app/Shared/Services/api.types';
import {
  DrawerActions,
  DrawerCloseButton,
  DrawerHead,
  DrawerPanelBody,
  DrawerPanelContent,
} from '@patternfly/react-core';
import * as React from 'react';
import { Observable } from 'rxjs';
import { BulkEditHeapDumpLabels } from './BulkEditHeapDumpLabels';

export interface HeapDumpLabelsPanelProps {
  setShowPanel: (showPanel: React.SetStateAction<boolean>) => void;
  checkedIndices: number[];
  target: Observable<NullableTarget>;
}

export const HeapDumpLabelsPanel: React.FC<HeapDumpLabelsPanelProps> = ({
  checkedIndices,
  target: propsTarget,
  setShowPanel,
}) => {
  return (
    <DrawerPanelContent isResizable>
      <DrawerHead>
        <DrawerActions>
          <DrawerCloseButton
            onClick={() => setShowPanel(false)}
            data-testid="hide-table-actions-panel"
            aria-label="hide table actions panel"
          />
        </DrawerActions>
      </DrawerHead>
      <DrawerPanelBody>
        <BulkEditHeapDumpLabels
          checkedIndices={checkedIndices}
          closePanelFn={() => setShowPanel(false)}
          target={propsTarget}
        />
      </DrawerPanelBody>
    </DrawerPanelContent>
  );
};
