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

import { BulkEditLabels } from '@app/RecordingMetadata/BulkEditLabels';
import { RecordingDirectory, ArchivedRecording } from '@app/Shared/Services/api.types';
import {
  DrawerActions,
  DrawerCloseButton,
  DrawerHead,
  DrawerPanelBody,
  DrawerPanelContent,
} from '@patternfly/react-core';
import React from 'react';

export interface RecordingLabelsPanelProps {
  setShowPanel: (showPanel: React.SetStateAction<boolean>) => void;
  isTargetRecording: boolean;
  isUploadsTable?: boolean;
  checkedIndices: number[];
  directory?: RecordingDirectory;
  directoryRecordings?: ArchivedRecording[];
}

export const RecordingLabelsPanel: React.FC<RecordingLabelsPanelProps> = (props) => {
  return (
    <DrawerPanelContent isResizable>
      <DrawerHead>
        <DrawerActions>
          <DrawerCloseButton
            onClick={() => props.setShowPanel(false)}
            data-testid="hide-table-actions-panel"
            aria-label="hide table actions panel"
          />
        </DrawerActions>
      </DrawerHead>
      <DrawerPanelBody>
        <BulkEditLabels
          isTargetRecording={props.isTargetRecording}
          checkedIndices={props.checkedIndices}
          isUploadsTable={props.isUploadsTable}
          directory={props.directory}
          directoryRecordings={props.directoryRecordings}
        />
      </DrawerPanelBody>
    </DrawerPanelContent>
  );
};
