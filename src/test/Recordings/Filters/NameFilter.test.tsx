/*
 * Copyright The Cryostat Authors
 *
 * The Universal Permissive License (UPL), Version 1.0
 *
 * Subject to the condition set forth below, permission is hereby granted to any
 * person obtaining a copy of this software, associated documentation and/or data
 * (collectively the "Software"), free of charge and under any and all copyright
 * rights in the Software, and any and all patent rights owned or freely
 * licensable by each licensor hereunder covering either (i) the unmodified
 * Software as contributed to or provided by such licensor, or (ii) the Larger
 * Works (as defined below), to deal in both
 *
 * (a) the Software, and
 * (b) any piece of software and/or hardware listed in the lrgrwrks.txt file if
 * one is included with the Software (each a "Larger Work" to which the Software
 * is contributed by such licensors),
 *
 * without restriction, including without limitation the rights to copy, create
 * derivative works of, display, perform, and distribute the Software and make,
 * use, sell, offer for sale, import, export, have made, and have sold the
 * Software and the Larger Work(s), and to sublicense the foregoing rights on
 * either these or other terms.
 *
 * This license is subject to the following condition:
 * The above copyright notice and either this complete permission notice or at
 * a minimum a reference to the UPL must be included in all copies or
 * substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

import { NameFilter } from '@app/Recordings/Filters/NameFilter';
import { ActiveRecording, RecordingState } from '@app/Shared/Services/Api.service';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import renderer, { act } from 'react-test-renderer';

const mockRecordingLabels = {
  someLabel: 'someValue',
};
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

const onNameInput = jest.fn();

describe("<NameFilter/>", () => {
  afterEach(cleanup);

  it('renders correctly', async () => {
    let tree;
    await act(async () => {
      tree = renderer.create(
        <NameFilter recordings={mockRecordingList} onSubmit={onNameInput} />
      );
    });
    expect(tree.toJSON()).toMatchSnapshot();
  });

  it ('display name selections when text input is clicked', async () => {
    render(
      <NameFilter recordings={mockRecordingList} onSubmit={onNameInput} />
    );
    const nameInput = screen.getByLabelText("Filter by name...");
    expect(nameInput).toBeInTheDocument();
    expect(nameInput).toBeVisible();

    userEvent.click(nameInput);

    const selectMenu = await screen.findByLabelText("Filter by name");
    expect(selectMenu).toBeInTheDocument();
    expect(selectMenu).toBeVisible();

    mockRecordingList.map((r) => {
      const option = within(selectMenu).getByText(r.name);
      expect(option).toBeInTheDocument();
      expect(option).toBeVisible();
    });
  });

  it ('display name selections when dropdown arrow is clicked', async () => {
    render(
      <NameFilter recordings={mockRecordingList} onSubmit={onNameInput} />
    );
    const dropDownArrow = screen.getByRole("button", { name: "Options menu"});
    expect(dropDownArrow).toBeInTheDocument();
    expect(dropDownArrow).toBeVisible();

    userEvent.click(dropDownArrow);

    const selectMenu = await screen.findByLabelText("Filter by name");
    expect(selectMenu).toBeInTheDocument();
    expect(selectMenu).toBeVisible();

    mockRecordingList.map((r) => {
      const option = within(selectMenu).getByText(r.name);
      expect(option).toBeInTheDocument();
      expect(option).toBeVisible();
    });
  });

  it ('selects a name when a name option is clicked', async () => {
    render(
      <NameFilter recordings={mockRecordingList} onSubmit={onNameInput} />
    );
    const nameInput = screen.getByLabelText("Filter by name...");
    expect(nameInput).toBeInTheDocument();
    expect(nameInput).toBeVisible();

    userEvent.click(nameInput);

    const selectMenu = await screen.findByLabelText("Filter by name");
    expect(selectMenu).toBeInTheDocument();
    expect(selectMenu).toBeVisible();

    mockRecordingList.map((r) => {
      const option = within(selectMenu).getByText(r.name);
      expect(option).toBeInTheDocument();
      expect(option).toBeVisible();
    });

    userEvent.click(screen.getByText("someRecording"));

    // Should close menu
    await waitFor(() => expect(selectMenu).not.toBeVisible());
    await waitFor(() => expect(selectMenu).not.toBeInTheDocument());

    expect(onNameInput).toBeCalledTimes(1);
    expect(onNameInput).toBeCalledWith("someRecording");
  });
});
