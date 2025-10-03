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

import { LabelFilter } from '@app/Diagnostics/Filters/LabelFilter';
import { HeapDump } from '@app/Shared/Services/api.types';
import { act, cleanup, screen, waitFor, within } from '@testing-library/react';
import { render, renderSnapshot } from '../../utils';

const mockHeapDumpLabels = [
  {
    key: 'someLabel',
    value: 'someValue',
  },
];
const mockAnotherHeapDumpLabels = [
  {
    key: 'anotherLabel',
    value: 'anotherValue',
  },
];
const mockHeapDumpLabelList = ['someLabel=someValue', 'anotherLabel=anotherValue'];

const mockHeapDump: HeapDump = {
  heapDumpId: 'someHeapDump',
  downloadUrl: 'http://downloadUrl',
  metadata: { labels: mockHeapDumpLabels },
  lastModified: 1234567890,
  size: 6543,
};
const mockAnotherHeapDump = {
  ...mockHeapDump,
  name: 'anotherHeapDump',
  metadata: { labels: mockAnotherHeapDumpLabels },
} as HeapDump;
const mockHeapDumpWithoutLabel = {
  ...mockHeapDump,
  name: 'noLabelHeapDump',
  metadata: { labels: [] },
} as HeapDump;
const mockHeapDumpList = [mockHeapDump, mockAnotherHeapDump, mockHeapDumpWithoutLabel];

const onLabelInput = jest.fn((_label) => {
  /**Do nothing. Used for checking renders */
});

describe('<LabelFilter />', () => {
  let emptyFilteredLabels: string[];
  let filteredLabels: string[];

  beforeEach(() => {
    emptyFilteredLabels = [];
    filteredLabels = [`someLabel:someValue`];
  });

  afterEach(cleanup);

  it('renders correctly', async () => {
    const tree = await renderSnapshot({
      routerConfigs: {
        routes: [
          {
            path: '/heapdumps',
            element: (
              <LabelFilter heapDumps={mockHeapDumpList} filteredLabels={emptyFilteredLabels} onSubmit={onLabelInput} />
            ),
          },
        ],
      },
    });
    expect(tree?.toJSON()).toMatchSnapshot();
  });

  it('should display label selections when text input is clicked', async () => {
    const { user, container } = render({
      routerConfigs: {
        routes: [
          {
            path: '/heapdumps',
            element: (
              <LabelFilter heapDumps={mockHeapDumpList} onSubmit={onLabelInput} filteredLabels={emptyFilteredLabels} />
            ),
          },
        ],
      },
    });

    const labelInput = container.querySelector("input[placeholder='Filter by label...']") as HTMLInputElement;
    expect(labelInput).toBeInTheDocument();
    expect(labelInput).toBeVisible();

    await act(async () => {
      await user.click(labelInput);
    });

    const selectMenu = await screen.findByRole('listbox');
    expect(selectMenu).toBeInTheDocument();
    expect(selectMenu).toBeVisible();

    mockHeapDumpLabelList.forEach((label) => {
      const option = within(selectMenu).getByText(label);
      expect(option).toBeInTheDocument();
      expect(option).toBeVisible();
    });
  });

  it('should display label selections when dropdown arrow is clicked', async () => {
    const { user } = render({
      routerConfigs: {
        routes: [
          {
            path: '/heapdumps',
            element: (
              <LabelFilter heapDumps={mockHeapDumpList} onSubmit={onLabelInput} filteredLabels={emptyFilteredLabels} />
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

    mockHeapDumpLabelList.forEach((label) => {
      const option = within(selectMenu).getByText(label);
      expect(option).toBeInTheDocument();
      expect(option).toBeVisible();
    });
  });

  it('should close selection menu when toggled with dropdown arrow', async () => {
    const { user } = render({
      routerConfigs: {
        routes: [
          {
            path: '/heapdumps',
            element: (
              <LabelFilter heapDumps={mockHeapDumpList} onSubmit={onLabelInput} filteredLabels={emptyFilteredLabels} />
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

    mockHeapDumpLabelList.forEach((label) => {
      const option = within(selectMenu).getByText(label);
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
              <LabelFilter heapDumps={mockHeapDumpList} onSubmit={onLabelInput} filteredLabels={emptyFilteredLabels} />
            ),
          },
        ],
      },
    });

    const labelInput = container.querySelector("input[placeholder='Filter by label...']") as HTMLInputElement;
    expect(labelInput).toBeInTheDocument();
    expect(labelInput).toBeVisible();

    await act(async () => {
      await user.click(labelInput);
    });

    const selectMenu = await screen.findByRole('listbox');
    expect(selectMenu).toBeInTheDocument();
    expect(selectMenu).toBeVisible();

    mockHeapDumpLabelList.forEach((label) => {
      const option = within(selectMenu).getByText(label);
      expect(option).toBeInTheDocument();
      expect(option).toBeVisible();
    });

    await act(async () => {
      await user.click(labelInput);
    });

    await waitFor(() => expect(selectMenu).not.toBeInTheDocument());
    expect(selectMenu).not.toBeVisible();
  });

  it('should not display selected Labels', async () => {
    const { user, container } = render({
      routerConfigs: {
        routes: [
          {
            path: '/heapdumps',
            element: (
              <LabelFilter heapDumps={mockHeapDumpList} onSubmit={onLabelInput} filteredLabels={filteredLabels} />
            ),
          },
        ],
      },
    });

    const labelInput = container.querySelector("input[placeholder='Filter by label...']") as HTMLInputElement;
    expect(labelInput).toBeInTheDocument();
    expect(labelInput).toBeVisible();

    await act(async () => {
      await user.click(labelInput);
    });

    const selectMenu = await screen.findByRole('listbox');
    expect(selectMenu).toBeInTheDocument();
    expect(selectMenu).toBeVisible();

    const notToShowLabel = within(selectMenu).queryByText('someLabel:someValue');
    expect(notToShowLabel).not.toBeInTheDocument();
  });

  it('should select a name when a name option is clicked', async () => {
    const submitLabelInput = jest.fn((labelInput) => emptyFilteredLabels.push(labelInput));

    const { user, container } = render({
      routerConfigs: {
        routes: [
          {
            path: '/heapdumps',
            element: (
              <LabelFilter
                heapDumps={mockHeapDumpList}
                onSubmit={submitLabelInput}
                filteredLabels={emptyFilteredLabels}
              />
            ),
          },
        ],
      },
    });

    const labelInput = container.querySelector("input[placeholder='Filter by label...']") as HTMLInputElement;
    expect(labelInput).toBeInTheDocument();
    expect(labelInput).toBeVisible();

    await act(async () => {
      await user.click(labelInput);
    });

    const selectMenu = await screen.findByRole('listbox');
    expect(selectMenu).toBeInTheDocument();
    expect(selectMenu).toBeVisible();

    mockHeapDumpLabelList.forEach((label) => {
      const option = within(selectMenu).getByText(label);
      expect(option).toBeInTheDocument();
      expect(option).toBeVisible();
    });

    await act(async () => {
      await user.click(screen.getByText('someLabel=someValue'));
    });

    // LabelFilter's parent rebuilds to close menu by default.

    expect(submitLabelInput).toHaveBeenCalledTimes(1);
    expect(submitLabelInput).toHaveBeenCalledWith('someLabel=someValue');
    expect(emptyFilteredLabels).toStrictEqual(['someLabel=someValue']);
  });
});
