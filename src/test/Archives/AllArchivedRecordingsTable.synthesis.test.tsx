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

import { AllArchivedRecordingsTable } from '@app/Archives/AllArchivedRecordingsTable';
import { ArchivedRecording, RecordingDirectory } from '@app/Shared/Services/api.types';
import { defaultServices } from '@app/Shared/Services/Services';
import '@testing-library/jest-dom';
import { cleanup, screen, within, waitFor } from '@testing-library/react';
import { of, Observable } from 'rxjs';
import { render } from '../utils';

const mockConnectUrl1 = 'service:jmx:rmi://synthUrl1';
const mockJvmId1 = 'synthJvmId1';
const mockConnectUrl2 = 'service:jmx:rmi://synthUrl2';
const mockJvmId2 = 'synthJvmId2';

const mockRecording: ArchivedRecording = {
  name: 'someRecording',
  downloadUrl: 'http://downloadUrl',
  reportUrl: 'http://reportUrl',
  metadata: { labels: [] },
  size: 1024,
  archivedTime: 1700000000,
};

const mockDirectory1: RecordingDirectory = {
  connectUrl: mockConnectUrl1,
  jvmId: mockJvmId1,
  recordings: [mockRecording],
};

const mockDirectory2: RecordingDirectory = {
  connectUrl: mockConnectUrl2,
  jvmId: mockJvmId2,
  recordings: [mockRecording, mockRecording],
};

const emptyDirectory: RecordingDirectory = {
  connectUrl: 'service:jmx:rmi://emptyUrl',
  jvmId: 'emptyJvmId',
  recordings: [],
};

jest.mock('@app/Recordings/ArchivedRecordingsTable', () => ({
  ArchivedRecordingsTable: jest.fn(() => <div>Archived Recordings Table</div>),
}));

jest.mock('@app/Recordings/SynthesisForm', () => ({
  SynthesisForm: jest.fn(({ target }: { target: string }) => (
    <div data-testid="synthesis-form">SynthesisForm for {target}</div>
  )),
}));

jest.mock('@app/Shared/Services/Target.service', () => ({
  ...jest.requireActual('@app/Shared/Services/Target.service'),
}));

// Audit log/lineage is not needed for synthesis tests; make it fail fast
jest
  .spyOn(defaultServices.api, 'getTargetLineage')
  .mockImplementation(() => new Observable((s) => s.error(new Error('unavailable'))));

jest.spyOn(defaultServices.targetAlias, 'aliasMap').mockReturnValue(of(new Map()));
jest.spyOn(defaultServices.targetAlias, 'fetchAliases').mockImplementation(() => undefined);

// Shared notification mock: all channels return empty (synthesis tests don't need notifications)
jest.spyOn(defaultServices.notificationChannel, 'messages').mockReturnValue(of());

describe('<AllArchivedRecordingsTable /> synthesis integration', () => {
  afterEach(cleanup);

  describe('synthesize button per row', () => {
    beforeEach(() => {
      jest.spyOn(defaultServices.api, 'doGet').mockReturnValue(of([mockDirectory1, mockDirectory2]));
    });

    it('renders a synthesize button in each row', async () => {
      render({
        routerConfigs: { routes: [{ path: '/archives', element: <AllArchivedRecordingsTable /> }] },
      });

      const buttons = await screen.findAllByLabelText('Synthesize recording from this target');
      expect(buttons).toHaveLength(2);
    });

    it('disables the synthesize button for a directory with no recordings', async () => {
      jest.spyOn(defaultServices.api, 'doGet').mockReturnValueOnce(of([emptyDirectory]));
      render({
        routerConfigs: { routes: [{ path: '/archives', element: <AllArchivedRecordingsTable /> }] },
      });

      const btn = await screen.findByLabelText('Synthesize recording from this target');
      expect(btn).toBeDisabled();
    });

    it('opens the synthesis panel when the synthesize button is clicked', async () => {
      const { user } = render({
        routerConfigs: { routes: [{ path: '/archives', element: <AllArchivedRecordingsTable /> }] },
      });

      const buttons = await screen.findAllByLabelText('Synthesize recording from this target');
      await user.click(buttons[0]);

      // The SynthesisForm mock should appear with the correct jvmId
      await waitFor(() => {
        expect(screen.getByTestId('synthesis-form')).toBeInTheDocument();
        expect(screen.getByText(`SynthesisForm for ${mockJvmId1}`)).toBeInTheDocument();
      });
    });

    it('closes the synthesis panel on a second click of the same synthesize button', async () => {
      const { user } = render({
        routerConfigs: { routes: [{ path: '/archives', element: <AllArchivedRecordingsTable /> }] },
      });

      const buttons = await screen.findAllByLabelText('Synthesize recording from this target');
      await user.click(buttons[0]);
      await waitFor(() => expect(screen.getByTestId('synthesis-form')).toBeInTheDocument());

      // Click the same row's button again → panel dismissed
      await user.click(buttons[0]);
      await waitFor(() => expect(screen.queryByTestId('synthesis-form')).not.toBeInTheDocument());
    });
  });

  describe('row promotion', () => {
    beforeEach(() => {
      jest.spyOn(defaultServices.api, 'doGet').mockReturnValue(of([mockDirectory1, mockDirectory2]));
    });

    it('promotes the selected synthesis target row to position 0', async () => {
      const { user } = render({
        routerConfigs: { routes: [{ path: '/archives', element: <AllArchivedRecordingsTable /> }] },
      });

      const buttons = await screen.findAllByLabelText('Synthesize recording from this target');
      // Click the second row's synthesize button
      await user.click(buttons[1]);

      await waitFor(() => {
        const tableBody = screen.getAllByRole('rowgroup')[1];
        const rows = within(tableBody).getAllByRole('row');
        // After promotion the first data row should contain mockJvmId2
        const firstRow = rows[0];
        expect(within(firstRow).getByText(`${mockConnectUrl2} (${mockJvmId2})`)).toBeInTheDocument();
      });
    });

    it('switches promoted row when a different target is selected', async () => {
      const { user } = render({
        routerConfigs: { routes: [{ path: '/archives', element: <AllArchivedRecordingsTable /> }] },
      });

      const buttons = await screen.findAllByLabelText('Synthesize recording from this target');
      // First select target 2
      await user.click(buttons[1]);
      await waitFor(() => expect(screen.getByTestId('synthesis-form')).toBeInTheDocument());

      // Now select target 1 using the new first-position synthesize button
      const newButtons = screen.getAllByLabelText('Synthesize recording from this target');
      await user.click(newButtons[1]); // the non-active row is now at index 1
      await waitFor(() => {
        expect(screen.getByText(`SynthesisForm for ${mockJvmId1}`)).toBeInTheDocument();
      });
    });
  });

  describe('auto-expand', () => {
    beforeEach(() => {
      jest.spyOn(defaultServices.api, 'doGet').mockReturnValue(of([mockDirectory1, mockDirectory2]));
    });

    it('auto-expands the target row when synthesis is activated', async () => {
      const { user } = render({
        routerConfigs: { routes: [{ path: '/archives', element: <AllArchivedRecordingsTable /> }] },
      });

      const buttons = await screen.findAllByLabelText('Synthesize recording from this target');
      // Before click: ArchivedRecordingsTable not visible
      expect(screen.queryByText('Archived Recordings Table')).not.toBeInTheDocument();

      await user.click(buttons[0]);

      await waitFor(() => {
        expect(screen.getByText('Archived Recordings Table')).toBeInTheDocument();
      });
    });

    it('collapses the auto-expanded row when synthesis panel is closed', async () => {
      const { user } = render({
        routerConfigs: { routes: [{ path: '/archives', element: <AllArchivedRecordingsTable /> }] },
      });

      const buttons = await screen.findAllByLabelText('Synthesize recording from this target');
      await user.click(buttons[0]);
      await waitFor(() => expect(screen.getByText('Archived Recordings Table')).toBeInTheDocument());

      // Toggle off
      await user.click(screen.getAllByLabelText('Synthesize recording from this target')[0]);
      await waitFor(() => {
        expect(screen.queryByTestId('synthesis-form')).not.toBeInTheDocument();
      });
    });
  });

  describe('drawer panel identity', () => {
    beforeEach(() => {
      jest.spyOn(defaultServices.api, 'doGet').mockReturnValue(of([mockDirectory1]));
    });

    it('renders the drawer with the expected id', async () => {
      render({
        routerConfigs: { routes: [{ path: '/archives', element: <AllArchivedRecordingsTable /> }] },
      });
      expect(document.getElementById('all-archives-synthesis-drawer')).toBeInTheDocument();
    });

    it('renders the synthesis panel with the expected id after activation', async () => {
      const { user } = render({
        routerConfigs: { routes: [{ path: '/archives', element: <AllArchivedRecordingsTable /> }] },
      });
      const btn = await screen.findByLabelText('Synthesize recording from this target');
      await user.click(btn);
      await waitFor(() => {
        expect(document.getElementById('all-archives-synthesis-panel')).toBeInTheDocument();
      });
    });
  });
});
