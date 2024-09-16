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

import { NameFilter } from '@app/Recordings/Filters/NameFilter';
import { ActiveRecording, RecordingState } from '@app/Shared/Services/api.types';
import { act, cleanup, screen, waitFor, within } from '@testing-library/react';
import { render, renderSnapshot } from '../../utils';

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
};
const mockAnotherRecording = { ...mockRecording, name: 'anotherRecording' };
const mockRecordingList = [mockRecording, mockAnotherRecording];

const onNameInput = jest.fn((_nameInput) => {
  /**Do nothing. Used for checking renders */
});

describe('<NameFilter />', () => {
  let emptyFilteredNames: string[];
  let filteredNames: string[];

  beforeEach(() => {
    emptyFilteredNames = [];
    filteredNames = [mockRecording.name];
  });

  afterEach(cleanup);

  it('renders correctly', async () => {
    const tree = await renderSnapshot({
      routerConfigs: {
        routes: [
          {
            path: '/recordings',
            element: (
              <NameFilter recordings={mockRecordingList} onSubmit={onNameInput} filteredNames={emptyFilteredNames} />
            ),
          },
        ],
      },
    });
    expect(tree?.toJSON()).toMatchSnapshot();
  });

  it('should display name selections when text input is clicked', async () => {
    const { user, container } = render({
      routerConfigs: {
        routes: [
          {
            path: '/recordings',
            element: (
              <NameFilter recordings={mockRecordingList} onSubmit={onNameInput} filteredNames={emptyFilteredNames} />
            ),
          },
        ],
      },
    });

    const nameInput = container.querySelector("input[placeholder='Filter by name...']") as HTMLInputElement;
    expect(nameInput).toBeInTheDocument();
    expect(nameInput).toBeVisible();

    await act(async () => {
      await user.click(nameInput);
    });

    const selectMenu = await screen.findByRole('listbox');
    expect(selectMenu).toBeInTheDocument();
    expect(selectMenu).toBeVisible();

    mockRecordingList.forEach((r) => {
      const option = within(selectMenu).getByText(r.name);
      expect(option).toBeInTheDocument();
      expect(option).toBeVisible();
    });
  });

  it('should display name selections when dropdown arrow is clicked', async () => {
    const { user } = render({
      routerConfigs: {
        routes: [
          {
            path: '/recordings',
            element: (
              <NameFilter recordings={mockRecordingList} onSubmit={onNameInput} filteredNames={emptyFilteredNames} />
            ),
          },
        ],
      },
    });

    const dropDownArrow = screen.getByRole('button', { name: 'Menu toggle' });
    expect(dropDownArrow).toBeInTheDocument();
    expect(dropDownArrow).toBeVisible();

    await act(async () => {
      await user.click(dropDownArrow);
    });

    const selectMenu = await screen.findByRole('listbox');
    expect(selectMenu).toBeInTheDocument();
    expect(selectMenu).toBeVisible();

    mockRecordingList.forEach((r) => {
      const option = within(selectMenu).getByText(r.name);
      expect(option).toBeInTheDocument();
      expect(option).toBeVisible();
    });
  });

  it('should close selection menu when toggled with dropdown arrow', async () => {
    const { user } = render({
      routerConfigs: {
        routes: [
          {
            path: '/recordings',
            element: (
              <NameFilter recordings={mockRecordingList} onSubmit={onNameInput} filteredNames={emptyFilteredNames} />
            ),
          },
        ],
      },
    });

    const dropDownArrow = screen.getByRole('button', { name: 'Menu toggle' });
    expect(dropDownArrow).toBeInTheDocument();
    expect(dropDownArrow).toBeVisible();

    await act(async () => {
      await user.click(dropDownArrow);
    });

    const selectMenu = await screen.findByRole('listbox');
    expect(selectMenu).toBeInTheDocument();
    expect(selectMenu).toBeVisible();

    mockRecordingList.forEach((r) => {
      const option = within(selectMenu).getByText(r.name);
      expect(option).toBeInTheDocument();
      expect(option).toBeVisible();
    });

    await act(async () => {
      await user.click(dropDownArrow);
    });

    await waitFor(() => expect(selectMenu).not.toBeInTheDocument());
    expect(selectMenu).not.toBeVisible();
  });

  it('should close selection menu when toggled with text input', async () => {
    const { user, container } = render({
      routerConfigs: {
        routes: [
          {
            path: '/recordings',
            element: (
              <NameFilter recordings={mockRecordingList} onSubmit={onNameInput} filteredNames={emptyFilteredNames} />
            ),
          },
        ],
      },
    });

    const nameInput = container.querySelector("input[placeholder='Filter by name...']") as HTMLInputElement;
    expect(nameInput).toBeInTheDocument();
    expect(nameInput).toBeVisible();

    await act(async () => {
      await user.click(nameInput);
    });

    const selectMenu = await screen.findByRole('listbox');
    expect(selectMenu).toBeInTheDocument();
    expect(selectMenu).toBeVisible();

    mockRecordingList.forEach((r) => {
      const option = within(selectMenu).getByText(r.name);
      expect(option).toBeInTheDocument();
      expect(option).toBeVisible();
    });

    await act(async () => {
      await user.click(nameInput);
    });

    await waitFor(() => expect(selectMenu).not.toBeInTheDocument());
    expect(selectMenu).not.toBeVisible();
  });

  it('should not display selected names', async () => {
    const { user, container } = render({
      routerConfigs: {
        routes: [
          {
            path: '/recordings',
            element: <NameFilter recordings={mockRecordingList} onSubmit={onNameInput} filteredNames={filteredNames} />,
          },
        ],
      },
    });

    const nameInput = container.querySelector("input[placeholder='Filter by name...']") as HTMLInputElement;
    expect(nameInput).toBeInTheDocument();
    expect(nameInput).toBeVisible();

    await act(async () => {
      await user.click(nameInput);
    });

    const selectMenu = await screen.findByRole('listbox');
    expect(selectMenu).toBeInTheDocument();
    expect(selectMenu).toBeVisible();

    const notToShowName = within(selectMenu).queryByText(mockRecording.name);
    expect(notToShowName).not.toBeInTheDocument();
  });

  it('should select a name when a name option is clicked', async () => {
    const submitNameInput = jest.fn((nameInput) => emptyFilteredNames.push(nameInput));

    const { user, container } = render({
      routerConfigs: {
        routes: [
          {
            path: '/recordings',
            element: (
              <NameFilter
                recordings={mockRecordingList}
                onSubmit={submitNameInput}
                filteredNames={emptyFilteredNames}
              />
            ),
          },
        ],
      },
    });

    const nameInput = container.querySelector("input[placeholder='Filter by name...']") as HTMLInputElement;
    expect(nameInput).toBeInTheDocument();
    expect(nameInput).toBeVisible();

    await act(async () => {
      await user.click(nameInput);
    });

    const selectMenu = await screen.findByRole('listbox');
    expect(selectMenu).toBeInTheDocument();
    expect(selectMenu).toBeVisible();

    mockRecordingList.forEach((r) => {
      const option = within(selectMenu).getByText(r.name);
      expect(option).toBeInTheDocument();
      expect(option).toBeVisible();
    });

    await act(async () => {
      await user.click(screen.getByText('someRecording'));
    });

    expect(submitNameInput).toBeCalledTimes(1);
    expect(submitNameInput).toBeCalledWith('someRecording');
    expect(emptyFilteredNames).toStrictEqual(['someRecording']);
  });
});
