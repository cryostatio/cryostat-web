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

import { RecordingStateFilter } from '@app/Recordings/Filters/RecordingStateFilter';
import { ActiveRecording, RecordingState } from '@app/Shared/Services/api.types';
import { act, cleanup, screen, waitFor, within } from '@testing-library/react';
import { render, renderSnapshot, testT } from '../../utils';

const mockRecordingLabels = [
  {
    key: 'someLabel',
    value: 'someValue',
  },
];
const mockRecording: ActiveRecording = {
  name: 'someRecording',
  downloadUrl: 'http://downloadUrl',
  reportUrl: 'http://reportUrl',
  metadata: { labels: mockRecordingLabels },
  startTime: 1234567890,
  id: 0,
  state: RecordingState.RUNNING,
  duration: 0,
  continuous: false,
  toDisk: false,
  maxSize: 0,
  maxAge: 0,
  remoteId: 4321,
};
const mockAnotherRecording = {
  ...mockRecording,
  name: 'anotherRecording',
  state: RecordingState.STOPPED,
} as ActiveRecording;

const onStateSelectToggle = jest.fn((_state) => {
  /**Do nothing. Used for checking renders */
});

describe('<RecordingStateFilter />', () => {
  let filteredStates: RecordingState[];
  let emptyFilteredStates: RecordingState[];

  beforeEach(() => {
    emptyFilteredStates = [];
    filteredStates = [mockRecording.state];
  });

  afterEach(cleanup);

  it('renders correctly', async () => {
    const tree = await renderSnapshot({
      routerConfigs: {
        routes: [
          {
            path: '/recordings',
            element: <RecordingStateFilter filteredStates={emptyFilteredStates} onSelectToggle={onStateSelectToggle} />,
          },
        ],
      },
    });
    expect(tree?.toJSON()).toMatchSnapshot();
  });

  it('should display state selections when dropdown is clicked', async () => {
    const { user } = render({
      routerConfigs: {
        routes: [
          {
            path: '/recordings',
            element: <RecordingStateFilter filteredStates={emptyFilteredStates} onSelectToggle={onStateSelectToggle} />,
          },
        ],
      },
    });

    const stateDropDown = screen.getByRole('button', { name: testT('RecordingStateFilter.ARIA_LABELS.MENU_TOGGLE') });
    expect(stateDropDown).toBeInTheDocument();
    expect(stateDropDown).toBeVisible();

    await act(async () => {
      await user.click(stateDropDown);
    });

    const selectMenu = await screen.findByLabelText(testT('RecordingStateFilter.ARIA_LABELS.SELECT'));
    expect(selectMenu).toBeInTheDocument();
    expect(selectMenu).toBeVisible();

    Object.values(RecordingState).forEach((rs) => {
      const selectOption = within(selectMenu).getByText(rs);
      expect(selectOption).toBeInTheDocument();
      expect(selectOption).toBeVisible();
    });
  });

  it('should close state selections when dropdown is toggled', async () => {
    const { user } = render({
      routerConfigs: {
        routes: [
          {
            path: '/recordings',
            element: <RecordingStateFilter filteredStates={emptyFilteredStates} onSelectToggle={onStateSelectToggle} />,
          },
        ],
      },
    });

    const stateDropDown = screen.getByRole('button', { name: testT('RecordingStateFilter.ARIA_LABELS.MENU_TOGGLE') });
    expect(stateDropDown).toBeInTheDocument();
    expect(stateDropDown).toBeVisible();

    await act(async () => {
      await user.click(stateDropDown);
    });

    const selectMenu = await screen.findByLabelText(testT('RecordingStateFilter.ARIA_LABELS.SELECT'));
    expect(selectMenu).toBeInTheDocument();
    expect(selectMenu).toBeVisible();

    Object.values(RecordingState).forEach((rs) => {
      const selectOption = within(selectMenu).getByText(rs);
      expect(selectOption).toBeInTheDocument();
      expect(selectOption).toBeVisible();
    });

    await act(async () => {
      await user.click(stateDropDown);
    });

    await waitFor(() => expect(selectMenu).not.toBeInTheDocument());
    expect(selectMenu).not.toBeVisible();
  });

  it('should display filtered states as checked', async () => {
    const { user } = render({
      routerConfigs: {
        routes: [
          {
            path: '/recordings',
            element: <RecordingStateFilter filteredStates={filteredStates} onSelectToggle={onStateSelectToggle} />,
          },
        ],
      },
    });

    const stateDropDown = screen.getByRole('button', { name: testT('RecordingStateFilter.ARIA_LABELS.MENU_TOGGLE') });
    expect(stateDropDown).toBeInTheDocument();
    expect(stateDropDown).toBeVisible();

    await act(async () => {
      await user.click(stateDropDown);
    });

    const selectMenu = await screen.findByLabelText(testT('RecordingStateFilter.ARIA_LABELS.SELECT'));
    expect(selectMenu).toBeInTheDocument();
    expect(selectMenu).toBeVisible();

    Object.values(RecordingState).forEach((rs) => {
      const selectOption = within(selectMenu).getByText(rs);
      expect(selectOption).toBeInTheDocument();
      expect(selectOption).toBeVisible();
    });

    const selectedOption = within(selectMenu).getByLabelText(`${mockRecording.state} State`);
    expect(selectedOption).toBeInTheDocument();
    expect(selectedOption).toBeVisible();

    const checkedBox = within(selectedOption).getByRole('checkbox');
    expect(checkedBox).toBeInTheDocument();
    expect(checkedBox).toBeVisible();
    expect(checkedBox).toHaveAttribute('checked');
  });

  it('should select a state when clicking unchecked state box', async () => {
    const onRecordingStateToggle = jest.fn((state) => {
      emptyFilteredStates.push(state);
    });

    const { user } = render({
      routerConfigs: {
        routes: [
          {
            path: '/recordings',
            element: (
              <RecordingStateFilter filteredStates={emptyFilteredStates} onSelectToggle={onRecordingStateToggle} />
            ),
          },
        ],
      },
    });

    const stateDropDown = screen.getByRole('button', { name: testT('RecordingStateFilter.ARIA_LABELS.MENU_TOGGLE') });
    expect(stateDropDown).toBeInTheDocument();
    expect(stateDropDown).toBeVisible();

    await act(async () => {
      await user.click(stateDropDown);
    });

    const selectMenu = await screen.findByLabelText(testT('RecordingStateFilter.ARIA_LABELS.SELECT'));
    expect(selectMenu).toBeInTheDocument();
    expect(selectMenu).toBeVisible();

    Object.values(RecordingState).forEach((rs) => {
      const selectOption = within(selectMenu).getByText(rs);
      expect(selectOption).toBeInTheDocument();
      expect(selectOption).toBeVisible();
    });

    const uncheckedBox = within(selectMenu).getByLabelText(mockAnotherRecording.state);
    expect(uncheckedBox).toBeInTheDocument();
    expect(uncheckedBox).toBeVisible();
    expect(uncheckedBox).not.toHaveAttribute('checked');

    await act(async () => {
      await user.click(uncheckedBox);
    });

    expect(onRecordingStateToggle).toHaveBeenCalledTimes(1);
    expect(onRecordingStateToggle).toHaveBeenCalledWith(mockAnotherRecording.state);
    expect(emptyFilteredStates).toStrictEqual([mockAnotherRecording.state]);
  });

  it('should unselect a state when clicking checked state box', async () => {
    const onRecordingStateToggle = jest.fn((state) => {
      filteredStates = filteredStates.filter((rs) => state !== rs);
    });

    const { user } = render({
      routerConfigs: {
        routes: [
          {
            path: '/recordings',
            element: <RecordingStateFilter filteredStates={filteredStates} onSelectToggle={onRecordingStateToggle} />,
          },
        ],
      },
    });

    const stateDropDown = screen.getByRole('button', { name: testT('RecordingStateFilter.ARIA_LABELS.MENU_TOGGLE') });
    expect(stateDropDown).toBeInTheDocument();
    expect(stateDropDown).toBeVisible();

    await act(async () => {
      await user.click(stateDropDown);
    });

    const selectMenu = await screen.findByLabelText(testT('RecordingStateFilter.ARIA_LABELS.SELECT'));
    expect(selectMenu).toBeInTheDocument();
    expect(selectMenu).toBeVisible();

    Object.values(RecordingState).forEach((rs) => {
      const selectOption = within(selectMenu).getByText(rs);
      expect(selectOption).toBeInTheDocument();
      expect(selectOption).toBeVisible();
    });

    const checkedBox = within(selectMenu).getByLabelText(mockRecording.state);
    expect(checkedBox).toBeInTheDocument();
    expect(checkedBox).toBeVisible();
    expect(checkedBox).toHaveAttribute('checked');

    await act(async () => {
      await user.click(checkedBox);
    });

    expect(onRecordingStateToggle).toHaveBeenCalledTimes(1);
    expect(onRecordingStateToggle).toHaveBeenCalledWith(mockRecording.state);
    expect(filteredStates).toStrictEqual([]);
  });
});
