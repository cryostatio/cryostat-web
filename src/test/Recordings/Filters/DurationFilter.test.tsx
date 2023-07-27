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

import { DurationFilter } from '@app/Recordings/Filters/DurationFilter';
import { ActiveRecording, RecordingState } from '@app/Shared/Services/Api.service';
import { cleanup, screen } from '@testing-library/react';
import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { renderDefault } from '../../Common';

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
  duration: 30,
  continuous: false,
  toDisk: false,
  maxSize: 0,
  maxAge: 0,
};

const onDurationInput = jest.fn((_durationInput) => undefined);
const onContinuousSelect = jest.fn((_continuous) => undefined);

describe('<DurationFilter />', () => {
  let emptyFilteredDuration: string[];
  let filteredDurationsWithCont: string[];
  let filteredDurationsWithoutCont: string[];

  beforeEach(() => {
    emptyFilteredDuration = [];
    filteredDurationsWithCont = [`${mockRecording.duration}`, 'continuous'];
    filteredDurationsWithoutCont = [`${mockRecording.duration}`];
  });

  afterEach(cleanup);

  it('renders correctly', async () => {
    let tree;
    await act(async () => {
      tree = renderer.create(
        <DurationFilter
          durations={emptyFilteredDuration}
          onContinuousDurationSelect={onContinuousSelect}
          onDurationInput={onDurationInput}
        />
      );
    });
    expect(tree.toJSON()).toMatchSnapshot();
  });

  it('should check continous box if continous is in filter', async () => {
    renderDefault(
      <DurationFilter
        durations={filteredDurationsWithCont}
        onContinuousDurationSelect={onContinuousSelect}
        onDurationInput={onDurationInput}
      />
    );

    const checkBox = screen.getByRole('checkbox', { name: 'Continuous' });
    expect(checkBox).toBeInTheDocument();
    expect(checkBox).toBeVisible();
    expect(checkBox).toHaveAttribute('checked');
  });

  it('should not check continous box if continous is in filter', async () => {
    renderDefault(
      <DurationFilter
        durations={filteredDurationsWithoutCont}
        onContinuousDurationSelect={onContinuousSelect}
        onDurationInput={onDurationInput}
      />
    );

    const checkBox = screen.getByRole('checkbox', { name: 'Continuous' });
    expect(checkBox).toBeInTheDocument();
    expect(checkBox).toBeVisible();
    expect(checkBox).not.toHaveAttribute('checked');
  });

  it('should select continous when clicking unchecked continuous box', async () => {
    const submitContinuous = jest.fn((_continous) => {
      filteredDurationsWithoutCont.push('continuous');
    });

    const { user } = renderDefault(
      <DurationFilter
        durations={filteredDurationsWithoutCont}
        onContinuousDurationSelect={submitContinuous}
        onDurationInput={onDurationInput}
      />
    );

    const checkBox = screen.getByRole('checkbox', { name: 'Continuous' });
    expect(checkBox).toBeInTheDocument();
    expect(checkBox).toBeVisible();
    expect(checkBox).not.toHaveAttribute('checked');

    await user.click(checkBox);

    expect(submitContinuous).toHaveBeenCalledTimes(1);
    expect(submitContinuous).toHaveBeenCalledWith(true);

    expect(filteredDurationsWithoutCont).toStrictEqual([`${mockRecording.duration}`, 'continuous']);
  });

  it('should unselect continous when clicking checked continuous box', async () => {
    const submitContinuous = jest.fn((_continous) => {
      filteredDurationsWithCont = filteredDurationsWithCont.filter((v) => v !== 'continuous');
    });

    const { user } = renderDefault(
      <DurationFilter
        durations={filteredDurationsWithCont}
        onContinuousDurationSelect={submitContinuous}
        onDurationInput={onDurationInput}
      />
    );

    const checkBox = screen.getByRole('checkbox', { name: 'Continuous' });
    expect(checkBox).toBeInTheDocument();
    expect(checkBox).toBeVisible();
    expect(checkBox).toHaveAttribute('checked');

    await user.click(checkBox);

    expect(submitContinuous).toHaveBeenCalledTimes(1);
    expect(submitContinuous).toHaveBeenCalledWith(false);
    expect(filteredDurationsWithCont).toStrictEqual([`${mockRecording.duration}`]);
  });

  it('should select a duration when pressing Enter', async () => {
    const submitDuration = jest.fn((duration) => {
      emptyFilteredDuration.push(duration);
    });

    const { user } = renderDefault(
      <DurationFilter
        durations={emptyFilteredDuration}
        onContinuousDurationSelect={onContinuousSelect}
        onDurationInput={submitDuration}
      />
    );

    const durationInput = screen.getByLabelText('duration filter');
    expect(durationInput).toBeInTheDocument();
    expect(durationInput).toBeVisible();

    await user.clear(durationInput);
    await user.type(durationInput, '50');

    // Press enter
    await user.type(durationInput, '{enter}');

    expect(submitDuration).toHaveBeenCalledTimes(1);
    expect(submitDuration).toHaveBeenCalledWith(Number('50'));
    expect(emptyFilteredDuration).toStrictEqual([50]);
  });

  it('should not select a duration when pressing other keys', async () => {
    const submitDuration = jest.fn((duration) => {
      emptyFilteredDuration.push(duration);
    });

    const { user } = renderDefault(
      <DurationFilter
        durations={emptyFilteredDuration}
        onContinuousDurationSelect={onContinuousSelect}
        onDurationInput={submitDuration}
      />
    );

    const durationInput = screen.getByLabelText('duration filter');
    expect(durationInput).toBeInTheDocument();
    expect(durationInput).toBeVisible();

    await user.clear(durationInput);
    await user.type(durationInput, '50');

    // Press shift
    await user.type(durationInput, '{shift}');

    expect(submitDuration).toHaveBeenCalledTimes(0);
    expect(emptyFilteredDuration).toStrictEqual([]);
  });
});
