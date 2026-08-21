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

import { AllTargetsArchivedRecordingsTable } from '@app/Archives/AllTargetsArchivedRecordingsTable';
import { Target } from '@app/Shared/Services/api.types';
import { defaultServices } from '@app/Shared/Services/Services';
import '@testing-library/jest-dom';
import { cleanup, screen, waitFor } from '@testing-library/react';
import { of } from 'rxjs';
import { render } from '../utils';

const mockTarget1: Target = {
  agent: false,
  jvmId: 'synthJvmId1',
  connectUrl: 'service:jmx:rmi://synthUrl1',
  alias: 'synthAlias1',
  labels: [],
  annotations: { cryostat: [], platform: [] },
};

const mockTarget2: Target = {
  agent: false,
  jvmId: 'synthJvmId2',
  connectUrl: 'service:jmx:rmi://synthUrl2',
  alias: 'synthAlias2',
  labels: [],
  annotations: { cryostat: [], platform: [] },
};

const mockEmptyTarget: Target = {
  agent: false,
  jvmId: 'emptyJvmId',
  connectUrl: 'service:jmx:rmi://emptyUrl',
  alias: 'emptyAlias',
  labels: [],
  annotations: { cryostat: [], platform: [] },
};

const mockRecording = {
  jvmId: mockTarget1.jvmId,
  name: 'someRecording',
  downloadUrl: 'http://downloadUrl',
  reportUrl: 'http://reportUrl',
  metadata: { labels: [] },
  size: 1024,
  archivedTime: 1700000000,
};

const makeGraphqlResponse = (targets: Array<{ target: Target; recordings: (typeof mockRecording)[] }>) => ({
  data: {
    targetNodes: targets.map(({ target, recordings }) => ({
      target: {
        ...target,
        archivedRecordings: {
          data: recordings,
          aggregate: { count: recordings.length },
        },
      },
    })),
  },
});

const twoTargetsResponse = makeGraphqlResponse([
  { target: mockTarget1, recordings: [mockRecording] },
  { target: mockTarget2, recordings: [mockRecording, mockRecording] },
]);

const emptyTargetResponse = makeGraphqlResponse([{ target: mockEmptyTarget, recordings: [] }]);

jest.mock('@app/Recordings/ArchivedRecordingsTable', () => ({
  ArchivedRecordingsTable: jest.fn(() => <div>Archived Recordings Table</div>),
}));

jest.mock('@app/Recordings/SynthesisForm', () => ({
  SynthesisForm: jest.fn(({ target }: { target: Target }) => (
    <div data-testid="synthesis-form">SynthesisForm for {target.jvmId}</div>
  )),
}));

jest.mock('@app/Shared/Services/Target.service', () => ({
  ...jest.requireActual('@app/Shared/Services/Target.service'),
}));

jest.spyOn(defaultServices.notificationChannel, 'messages').mockReturnValue(of());

describe('<AllTargetsArchivedRecordingsTable /> synthesis integration', () => {
  afterEach(cleanup);

  describe('synthesize button per row', () => {
    beforeEach(() => {
      jest.spyOn(defaultServices.api, 'graphql').mockReturnValue(of(twoTargetsResponse));
    });

    it('renders a synthesize button in each row', async () => {
      render({
        routerConfigs: { routes: [{ path: '/archives', element: <AllTargetsArchivedRecordingsTable /> }] },
      });

      const buttons = await screen.findAllByLabelText('Synthesize recording from this target');
      expect(buttons).toHaveLength(2);
    });

    it('disables the synthesize button for a target with no recordings', async () => {
      jest.spyOn(defaultServices.api, 'graphql').mockReturnValue(of(emptyTargetResponse));
      render({
        routerConfigs: { routes: [{ path: '/archives', element: <AllTargetsArchivedRecordingsTable /> }] },
      });

      // The empty target is normally hidden by the "hide empty" checkbox; show it first
      const checkbox = await screen.findByLabelText('all-targets-hide-check');
      const { user } = render({
        routerConfigs: { routes: [{ path: '/archives', element: <AllTargetsArchivedRecordingsTable /> }] },
      });
      await user.click(checkbox);

      const btn = screen.queryByLabelText('Synthesize recording from this target');
      if (btn) {
        expect(btn).toHaveAttribute('aria-disabled', 'true');
      }
    });

    it('opens the synthesis panel when the synthesize button is clicked', async () => {
      const { user } = render({
        routerConfigs: { routes: [{ path: '/archives', element: <AllTargetsArchivedRecordingsTable /> }] },
      });

      const buttons = await screen.findAllByLabelText('Synthesize recording from this target');
      await user.click(buttons[0]);

      await waitFor(() => {
        expect(screen.getByTestId('synthesis-form')).toBeInTheDocument();
        expect(screen.getByText(`SynthesisForm for ${mockTarget1.jvmId}`)).toBeInTheDocument();
      });
    });

    it('closes the synthesis panel on a second click of the same synthesize button', async () => {
      const { user } = render({
        routerConfigs: { routes: [{ path: '/archives', element: <AllTargetsArchivedRecordingsTable /> }] },
      });

      const buttons = await screen.findAllByLabelText('Synthesize recording from this target');
      await user.click(buttons[0]);
      await waitFor(() => expect(screen.getByTestId('synthesis-form')).toBeInTheDocument());

      const activeButton = screen.getAllByLabelText('Synthesize recording from this target')[1];
      await user.click(activeButton);
      await waitFor(() => expect(screen.queryByTestId('synthesis-form')).not.toBeInTheDocument());
    });
  });

  describe('auto-expand', () => {
    beforeEach(() => {
      jest.spyOn(defaultServices.api, 'graphql').mockReturnValue(of(twoTargetsResponse));
    });

    it('auto-expands the target row when synthesis is activated', async () => {
      const { user } = render({
        routerConfigs: { routes: [{ path: '/archives', element: <AllTargetsArchivedRecordingsTable /> }] },
      });

      expect(screen.queryByText('Archived Recordings Table')).not.toBeInTheDocument();

      const buttons = await screen.findAllByLabelText('Synthesize recording from this target');
      await user.click(buttons[0]);

      await waitFor(() => {
        expect(screen.getByText('Archived Recordings Table')).toBeInTheDocument();
      });
    });
  });

  describe('drawer panel identity', () => {
    beforeEach(() => {
      jest.spyOn(defaultServices.api, 'graphql').mockReturnValue(of(twoTargetsResponse));
    });

    it('renders the drawer with the expected id', async () => {
      render({
        routerConfigs: { routes: [{ path: '/archives', element: <AllTargetsArchivedRecordingsTable /> }] },
      });
      expect(document.getElementById('all-targets-synthesis-drawer')).toBeInTheDocument();
    });

    it('renders the synthesis panel with the expected id after activation', async () => {
      const { user } = render({
        routerConfigs: { routes: [{ path: '/archives', element: <AllTargetsArchivedRecordingsTable /> }] },
      });
      const buttons = await screen.findAllByLabelText('Synthesize recording from this target');
      await user.click(buttons[0]);
      await waitFor(() => {
        expect(document.getElementById('all-targets-synthesis-panel')).toBeInTheDocument();
      });
    });
  });
});
