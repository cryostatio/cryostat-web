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

import { DurationFilter, DurationRange } from '@app/Recordings/Filters/DurationFilter';
import { DurationUnit } from '@app/Shared/Components/DurationUnitSelect';
import { ActiveRecording, RecordingState } from '@app/Shared/Services/api.types';
import { cleanup, screen } from '@testing-library/react';
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
  duration: 30,
  continuous: false,
  toDisk: false,
  maxSize: 0,
  maxAge: 0,
};

const onDurationInput = jest.fn((_durationInput) => undefined);

describe('<DurationFilter />', () => {
  let emptyFilteredDuration: DurationRange[];
  let filteredDurationsWithCont: DurationRange[];
  let filteredDurationsWithoutCont: DurationRange[];

  beforeEach(() => {
    emptyFilteredDuration = [];
    filteredDurationsWithCont = [
      { from: { value: mockRecording.duration, unit: DurationUnit.SECOND } },
      { continuous: true },
    ];
    filteredDurationsWithoutCont = [{ from: { value: mockRecording.duration, unit: DurationUnit.SECOND } }];
  });

  afterEach(cleanup);

  it('renders correctly', async () => {
    const tree = await renderSnapshot({
      routerConfigs: {
        routes: [
          {
            path: '/recordings',
            element: <DurationFilter durations={emptyFilteredDuration} onDurationInput={onDurationInput} />,
          },
        ],
      },
    });
    expect(tree?.toJSON()).toMatchSnapshot();
  });

  it('should check continous box if continous is in filter', async () => {
    render({
      routerConfigs: {
        routes: [
          {
            path: '/recordings',
            element: <DurationFilter durations={filteredDurationsWithCont} onDurationInput={onDurationInput} />,
          },
        ],
      },
    });

    const checkBox = screen.getByRole('checkbox', { name: 'Continuous' });
    expect(checkBox).toBeInTheDocument();
    expect(checkBox).toBeVisible();
    expect(checkBox).toHaveAttribute('checked');
  });

  it('should not check continous box if continous is in filter', async () => {
    render({
      routerConfigs: {
        routes: [
          {
            path: '/recordings',
            element: <DurationFilter durations={filteredDurationsWithoutCont} onDurationInput={onDurationInput} />,
          },
        ],
      },
    });

    const checkBox = screen.getByRole('checkbox', { name: 'Continuous' });
    expect(checkBox).toBeInTheDocument();
    expect(checkBox).toBeVisible();
    expect(checkBox).not.toHaveAttribute('checked');
  });

  it('should select continous when clicking unchecked continuous box', async () => {
    const submitContinuous = jest.fn((_continous) => {
      filteredDurationsWithoutCont.push({ continuous: true });
    });

    const { user } = render({
      routerConfigs: {
        routes: [
          {
            path: '/recordings',
            element: <DurationFilter durations={filteredDurationsWithoutCont} onDurationInput={onDurationInput} />,
          },
        ],
      },
    });

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
      filteredDurationsWithCont = filteredDurationsWithCont.filter((v) => !v.continuous);
    });

    const { user } = render({
      routerConfigs: {
        routes: [
          {
            path: '/recordings',
            element: <DurationFilter durations={filteredDurationsWithCont} onDurationInput={onDurationInput} />,
          },
        ],
      },
    });

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

    const { user } = render({
      routerConfigs: {
        routes: [
          {
            path: '/recordings',
            element: <DurationFilter durations={emptyFilteredDuration} onDurationInput={submitDuration} />,
          },
        ],
      },
    });

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

    const { user } = render({
      routerConfigs: {
        routes: [
          {
            path: '/recordings',
            element: <DurationFilter durations={emptyFilteredDuration} onDurationInput={submitDuration} />,
          },
        ],
      },
    });

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
