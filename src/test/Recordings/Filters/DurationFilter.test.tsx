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
import { cleanup, screen, waitFor, act } from '@testing-library/react';
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
  duration: 30000,
  continuous: false,
  toDisk: false,
  maxSize: 0,
  maxAge: 0,
};

const durationRangeWithoutUpperLimit = { from: { value: mockRecording.duration / 1000, unit: DurationUnit.SECOND } };
const durationRanegeWithLimits = {
  from: { value: mockRecording.duration / 1000, unit: DurationUnit.SECOND },
  to: { value: mockRecording.duration / 1000 + 30, unit: DurationUnit.SECOND },
};
const durationContinuous = { continuous: true };

const onDurationInput = jest.fn((_durationInput) => undefined);

describe('<DurationFilter />', () => {
  let emptyDurationFilters: DurationRange[];
  let mockDurationFilters: DurationRange[];

  beforeEach(() => {
    emptyDurationFilters = [];
    mockDurationFilters = [durationRanegeWithLimits];
    jest.mocked(onDurationInput).mockClear();
  });

  afterEach(cleanup);

  it('renders correctly', async () => {
    const tree = await renderSnapshot({
      routerConfigs: {
        routes: [
          {
            path: '/recordings',
            element: <DurationFilter durations={emptyDurationFilters} onDurationInput={onDurationInput} />,
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
            element: (
              <DurationFilter
                durations={mockDurationFilters.concat(durationContinuous)}
                onDurationInput={onDurationInput}
              />
            ),
          },
        ],
      },
    });

    const checkBox = screen.getByRole('checkbox', { name: 'Continuous' });
    expect(checkBox).toBeInTheDocument();
    expect(checkBox).toBeVisible();
    expect(checkBox).toHaveAttribute('checked');
  });

  it('should not check continous box if continous is not in filter', async () => {
    render({
      routerConfigs: {
        routes: [
          {
            path: '/recordings',
            element: <DurationFilter durations={mockDurationFilters} onDurationInput={onDurationInput} />,
          },
        ],
      },
    });

    const checkBox = screen.getByRole('checkbox', { name: 'Continuous' });
    expect(checkBox).toBeInTheDocument();
    expect(checkBox).toBeVisible();
    expect(checkBox).not.toHaveAttribute('checked');
  });

  it('should check and disable continous box if duration filters have one entry without upper limit', async () => {
    const { user } = render({
      routerConfigs: {
        routes: [
          {
            path: '/recordings',
            element: <DurationFilter durations={[durationRangeWithoutUpperLimit]} onDurationInput={onDurationInput} />,
          },
        ],
      },
    });

    const checkBox = screen.getByRole('checkbox', { name: 'Continuous' });
    expect(checkBox).toBeInTheDocument();
    expect(checkBox).toBeVisible();
    expect(checkBox).toHaveAttribute('checked');
    expect(checkBox).toHaveAttribute('disabled');

    await act(async () => {
      await user.hover(checkBox);
    });

    await waitFor(() =>
      expect(screen.getByText(testT('DurationFilter.TOOLTIP.CHECKBOX_DISABLED_CONTENT'))).toBeInTheDocument(),
    );
  });

  it('should add filter with continous when clicking unchecked continuous box', async () => {
    const { user } = render({
      routerConfigs: {
        routes: [
          {
            path: '/recordings',
            element: <DurationFilter durations={mockDurationFilters} onDurationInput={onDurationInput} />,
          },
        ],
      },
    });

    const checkBox = screen.getByRole('checkbox', { name: 'Continuous' });
    expect(checkBox).toBeInTheDocument();
    expect(checkBox).toBeVisible();
    expect(checkBox).not.toHaveAttribute('checked');

    await user.click(checkBox);

    expect(onDurationInput).toHaveBeenCalledTimes(1);
    expect(onDurationInput).toHaveBeenCalledWith(durationContinuous);
  });

  it('should remove filter with continous when clicking checked continuous box', async () => {
    const { user } = render({
      routerConfigs: {
        routes: [
          {
            path: '/recordings',
            element: (
              <DurationFilter
                durations={mockDurationFilters.concat(durationContinuous)}
                onDurationInput={onDurationInput}
              />
            ),
          },
        ],
      },
    });

    const checkBox = screen.getByRole('checkbox', { name: 'Continuous' });
    expect(checkBox).toBeInTheDocument();
    expect(checkBox).toBeVisible();
    expect(checkBox).toHaveAttribute('checked');

    await user.click(checkBox);

    expect(onDurationInput).toHaveBeenCalledTimes(1);
    expect(onDurationInput).toHaveBeenCalledWith({ continuous: false });
  });

  it('should show error text when upper limit is smaller than lower one', async () => {
    const { user, container } = render({
      routerConfigs: {
        routes: [
          {
            path: '/recordings',
            element: <DurationFilter durations={emptyDurationFilters} onDurationInput={onDurationInput} />,
          },
        ],
      },
    });

    const fromInput = container.querySelector("input[aria-label='duration-from'][type='number']") as HTMLInputElement;
    expect(fromInput).toBeInTheDocument();
    expect(fromInput).toBeVisible();

    const toInput = container.querySelector("input[aria-label='duration-to'][type='number']") as HTMLInputElement;
    expect(fromInput).toBeInTheDocument();
    expect(fromInput).toBeVisible();

    await user.type(fromInput, '50');
    await user.type(toInput, '30');

    const errorText = screen.getByText(testT('DurationFilter.HELPER_TEXT.INVALID_UPPER_BOUND'));
    expect(errorText).toBeInTheDocument();
    expect(errorText).toBeVisible();
  });

  it('should add the correct filter when valid inputs are entered and search button is clicked', async () => {
    const { user, container } = render({
      routerConfigs: {
        routes: [
          {
            path: '/recordings',
            element: <DurationFilter durations={emptyDurationFilters} onDurationInput={onDurationInput} />,
          },
        ],
      },
    });

    const fromInput = container.querySelector("input[aria-label='duration-from'][type='number']") as HTMLInputElement;
    expect(fromInput).toBeInTheDocument();
    expect(fromInput).toBeVisible();

    const toInput = container.querySelector("input[aria-label='duration-to'][type='number']") as HTMLInputElement;
    expect(fromInput).toBeInTheDocument();
    expect(fromInput).toBeVisible();

    await user.type(fromInput, '30');
    await user.type(toInput, '50');

    const searchBtn = screen.getByLabelText(testT('DurationFilter.ARIA_LABELS.SEARCH_BUTTON'));
    expect(searchBtn).toBeInTheDocument();
    expect(searchBtn).toBeVisible();

    await user.click(searchBtn);

    expect(onDurationInput).toHaveBeenCalledTimes(1);
    expect(onDurationInput).toHaveBeenCalledWith({
      from: { value: 30, unit: DurationUnit.SECOND },
      to: { value: 50, unit: DurationUnit.SECOND },
    });
  });
});
