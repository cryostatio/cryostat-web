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

import { TimeRangeFilter } from '@app/Archives/TimeRangeFilter';
import { TimeRangeOption } from '@app/Shared/Redux/Filters/ArchiveFiltersSlice';
import { useArchiveFilters } from '@app/utils/hooks/useArchiveFilters';
import { cleanup, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import { render, testT } from '../utils';

jest.mock('@app/utils/hooks/useArchiveFilters');
const mockUseArchiveFilters = useArchiveFilters as jest.MockedFunction<typeof useArchiveFilters>;

const mockSetTimeRange = jest.fn();
const mockClearTimeRange = jest.fn();

describe('<TimeRangeFilter />', () => {
  let mockTimeRange: TimeRangeOption | null;

  beforeEach(() => {
    mockTimeRange = null;
    mockUseArchiveFilters.mockReturnValue({
      timeRange: mockTimeRange,
      setTimeRange: mockSetTimeRange,
      clearTimeRange: mockClearTimeRange,
      lineageFilters: [],
      searchText: '',
      hasActiveFilters: false,
      addLineageFilter: jest.fn(),
      removeLineageFilter: jest.fn(),
      clearLineageFilters: jest.fn(),
      setSearchText: jest.fn(),
      clearAllFilters: jest.fn(),
    });
  });

  afterEach(() => {
    cleanup();
    jest.clearAllMocks();
  });

  it('renders start and end time inputs', () => {
    render({
      routerConfigs: {
        routes: [
          {
            path: '/archives',
            element: <TimeRangeFilter />,
          },
        ],
      },
    });

    expect(screen.getByLabelText(testT('TimeRangeFilter.START_TIME'))).toBeInTheDocument();
    expect(screen.getByLabelText(testT('TimeRangeFilter.END_TIME'))).toBeInTheDocument();
  });

  it('does not show reset button when no time range is set', () => {
    render({
      routerConfigs: {
        routes: [
          {
            path: '/archives',
            element: <TimeRangeFilter />,
          },
        ],
      },
    });

    expect(screen.queryByRole('button', { name: testT('TimeRangeFilter.RESET') })).not.toBeInTheDocument();
  });

  it('shows reset button when time range is set', () => {
    mockTimeRange = {
      startTime: new Date('2024-01-01T00:00:00Z').getTime(),
      endTime: new Date('2024-01-31T23:59:59Z').getTime(),
    };
    mockUseArchiveFilters.mockReturnValue({
      timeRange: mockTimeRange,
      setTimeRange: mockSetTimeRange,
      clearTimeRange: mockClearTimeRange,
      lineageFilters: [],
      searchText: '',
      hasActiveFilters: true,
      addLineageFilter: jest.fn(),
      removeLineageFilter: jest.fn(),
      clearLineageFilters: jest.fn(),
      setSearchText: jest.fn(),
      clearAllFilters: jest.fn(),
    });

    render({
      routerConfigs: {
        routes: [
          {
            path: '/archives',
            element: <TimeRangeFilter />,
          },
        ],
      },
    });

    expect(screen.getByRole('button', { name: testT('TimeRangeFilter.RESET') })).toBeInTheDocument();
  });

  it('calls clearTimeRange when reset button is clicked', async () => {
    const user = userEvent.setup();
    mockTimeRange = {
      startTime: new Date('2024-01-01T00:00:00Z').getTime(),
      endTime: new Date('2024-01-31T23:59:59Z').getTime(),
    };
    mockUseArchiveFilters.mockReturnValue({
      timeRange: mockTimeRange,
      setTimeRange: mockSetTimeRange,
      clearTimeRange: mockClearTimeRange,
      lineageFilters: [],
      searchText: '',
      hasActiveFilters: true,
      addLineageFilter: jest.fn(),
      removeLineageFilter: jest.fn(),
      clearLineageFilters: jest.fn(),
      setSearchText: jest.fn(),
      clearAllFilters: jest.fn(),
    });

    render({
      routerConfigs: {
        routes: [
          {
            path: '/archives',
            element: <TimeRangeFilter />,
          },
        ],
      },
    });

    const resetButton = screen.getByRole('button', { name: testT('TimeRangeFilter.RESET') });
    await user.click(resetButton);

    expect(mockClearTimeRange).toHaveBeenCalledTimes(1);
  });

  it('updates Redux state when both valid times are entered', async () => {
    const user = userEvent.setup();
    render({
      routerConfigs: {
        routes: [
          {
            path: '/archives',
            element: <TimeRangeFilter />,
          },
        ],
      },
    });

    const startInput = screen.getByLabelText(testT('TimeRangeFilter.START_TIME'));
    const endInput = screen.getByLabelText(testT('TimeRangeFilter.END_TIME'));

    await user.clear(startInput);
    await user.type(startInput, '2024-01-01T00:00');
    await user.clear(endInput);
    await user.type(endInput, '2024-01-31T23:59');

    // Wait for debounce/validation
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(mockSetTimeRange).toHaveBeenCalledWith({
      startTime: expect.any(Number),
      endTime: expect.any(Number),
    });
  });

  it('does not update Redux state when only start time is entered', async () => {
    const user = userEvent.setup();
    render({
      routerConfigs: {
        routes: [
          {
            path: '/archives',
            element: <TimeRangeFilter />,
          },
        ],
      },
    });

    const startInput = screen.getByLabelText(testT('TimeRangeFilter.START_TIME'));
    await user.clear(startInput);
    await user.type(startInput, '2024-01-01T00:00');

    // Wait for debounce/validation
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Should not call setTimeRange when only one input is filled
    expect(mockSetTimeRange).not.toHaveBeenCalled();
  });

  it('shows error state when end time is before start time', async () => {
    const user = userEvent.setup();
    render({
      routerConfigs: {
        routes: [
          {
            path: '/archives',
            element: <TimeRangeFilter />,
          },
        ],
      },
    });

    const startInput = screen.getByLabelText(testT('TimeRangeFilter.START_TIME')) as HTMLInputElement;
    const endInput = screen.getByLabelText(testT('TimeRangeFilter.END_TIME')) as HTMLInputElement;

    await user.clear(startInput);
    await user.type(startInput, '2024-01-31T23:59');
    await user.clear(endInput);
    await user.type(endInput, '2024-01-01T00:00');

    // Wait for validation
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Check that inputs have error state (aria-invalid attribute)
    expect(startInput).toHaveAttribute('aria-invalid', 'true');
    expect(endInput).toHaveAttribute('aria-invalid', 'true');
  });

  it('populates inputs with existing time range values', () => {
    mockTimeRange = {
      startTime: new Date('2024-01-01T00:00:00Z').getTime(),
      endTime: new Date('2024-01-31T23:59:59Z').getTime(),
    };
    mockUseArchiveFilters.mockReturnValue({
      timeRange: mockTimeRange,
      setTimeRange: mockSetTimeRange,
      clearTimeRange: mockClearTimeRange,
      lineageFilters: [],
      searchText: '',
      hasActiveFilters: true,
      addLineageFilter: jest.fn(),
      removeLineageFilter: jest.fn(),
      clearLineageFilters: jest.fn(),
      setSearchText: jest.fn(),
      clearAllFilters: jest.fn(),
    });

    render({
      routerConfigs: {
        routes: [
          {
            path: '/archives',
            element: <TimeRangeFilter />,
          },
        ],
      },
    });

    const startInput = screen.getByLabelText(testT('TimeRangeFilter.START_TIME')) as HTMLInputElement;
    const endInput = screen.getByLabelText(testT('TimeRangeFilter.END_TIME')) as HTMLInputElement;

    // Inputs should have values (exact format depends on browser/timezone)
    expect(startInput.value).toBeTruthy();
    expect(endInput.value).toBeTruthy();
  });

  it('does not show error state when inputs are empty', async () => {
    render({
      routerConfigs: {
        routes: [
          {
            path: '/archives',
            element: <TimeRangeFilter />,
          },
        ],
      },
    });

    const startInput = screen.getByLabelText(testT('TimeRangeFilter.START_TIME')) as HTMLInputElement;
    const endInput = screen.getByLabelText(testT('TimeRangeFilter.END_TIME')) as HTMLInputElement;

    // Inputs start empty, should not show error
    expect(startInput).toHaveAttribute('aria-invalid', 'false');
    expect(endInput).toHaveAttribute('aria-invalid', 'false');
    expect(startInput.value).toBe('');
    expect(endInput.value).toBe('');
  });

  it('updates both inputs independently', async () => {
    const user = userEvent.setup();
    render({
      routerConfigs: {
        routes: [
          {
            path: '/archives',
            element: <TimeRangeFilter />,
          },
        ],
      },
    });

    const startInput = screen.getByLabelText(testT('TimeRangeFilter.START_TIME'));
    const endInput = screen.getByLabelText(testT('TimeRangeFilter.END_TIME'));

    // Set start time
    await user.clear(startInput);
    await user.type(startInput, '2024-01-01T00:00');

    // Set end time
    await user.clear(endInput);
    await user.type(endInput, '2024-01-31T23:59');

    // Wait for validation
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Should have called setTimeRange with valid range
    expect(mockSetTimeRange).toHaveBeenCalled();
  });
});
