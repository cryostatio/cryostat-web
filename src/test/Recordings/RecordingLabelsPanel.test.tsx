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
import { RecordingLabelsPanel } from '@app/Recordings/RecordingLabelsPanel';
import { ArchivedRecording } from '@app/Shared/Services/api.types';
import { Drawer, DrawerContent } from '@patternfly/react-core';
import { screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import * as React from 'react';
import renderer, { act } from 'react-test-renderer';
import { renderDefault } from '../Common';

jest.mock('@app/RecordingMetadata/BulkEditLabels', () => {
  return {
    BulkEditLabels: jest.fn((props) => {
      return (
        <div>
          Bulk Edit Labels
          {props.children}
        </div>
      );
    }),
  };
});

const mockRecordingLabels = {
  someLabel: 'someValue',
};

const mockRecording: ArchivedRecording = {
  name: 'someRecording',
  downloadUrl: 'http://downloadUrl',
  reportUrl: 'http://reportUrl',
  metadata: { labels: mockRecordingLabels },
  size: 2048,
  archivedTime: 2048,
};

describe('<RecordingLabelsPanel />', () => {
  const isTargetRecording = true;
  const checkedIndices = [];
  const recordings = [mockRecording];

  const props = {
    setShowPanel: jest.fn(() => (_showPanel: boolean) => undefined),
    isTargetRecording: isTargetRecording,
    checkedIndices: checkedIndices,
    recordings: recordings,
  };

  it('renders correctly', async () => {
    let tree;
    await act(async () => {
      tree = renderer.create(
        <Drawer isExpanded={true} isInline>
          <DrawerContent panelContent={<RecordingLabelsPanel {...props} />} />
        </Drawer>,
      );
    });
    expect(tree.toJSON()).toMatchSnapshot();
  });

  it('displays the bulk labels editor within the resizeable drawer panel', async () => {
    renderDefault(
      <Drawer isExpanded={true} isInline>
        <DrawerContent panelContent={<RecordingLabelsPanel {...props} />} />
      </Drawer>,
    );
    expect(screen.getByText('Bulk Edit Labels')).toBeInTheDocument();
    expect(screen.getAllByLabelText('Resize').length).toBe(1);
    expect(screen.getAllByLabelText('hide table actions panel').length).toBe(1);
  });
});
