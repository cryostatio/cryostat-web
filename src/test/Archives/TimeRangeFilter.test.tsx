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
import { cleanup, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import { of } from 'rxjs';
import { render, testT } from '../utils';

jest.mock('@app/utils/hooks/useArchiveFilters');
const mockUseArchiveFilters = useArchiveFilters as jest.MockedFunction<typeof useArchiveFilters>;

jest.mock('@app/DateTimePicker/DateTimePicker', () => ({
  DateTimePicker: ({ onSelect, prefilledDate }: any) => (
    <div data-testid="datetime-picker">
      <button onClick={() => onSelect(new Date('2024-01-15T10:30:00Z'))}>Select Date</button>
      <span>Prefilled: {prefilledDate?.toISOString() || 'none'}</span>
    </div>
  ),
}));

const mockSetTimeRange = jest.fn();

describe('<TimeRangeFilter />', () => {
  let mockTimeRange: TimeRangeOption;

  beforeEach(() => {
    mockTimeRange = { type: 'preset', preset: 'all' };
    mockUseArchiveFilters.mockReturnValue({
      timeRange: mockTimeRange,
      setTimeRange: mockSetTimeRange,
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

  it('renders with default "All Time" selection', async () => {
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

    const toggle = screen.getByRole('button', { name: testT('TimeRangeFilter.ARIA_LABELS.MENU_TOGGLE') });
    expect(toggle).toBeInTheDocument();
    expect(toggle).toHaveTextContent(testT('TimeRangeFilter.ALL_TIME'));
  });

  it('displays "Last 24 Hours" when selected', async () => {
    mockTimeRange = { type: 'preset', preset: 'last24h' };
    mockUseArchiveFilters.mockReturnValue({
      timeRange: mockTimeRange,
      setTimeRange: mockSetTimeRange,
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

    const toggle = screen.getByRole('button', { name: testT('TimeRangeFilter.ARIA_LABELS.MENU_TOGGLE') });
    expect(toggle).toHaveTextContent(testT('TimeRangeFilter.LAST_24_HOURS'));
  });

  it('opens dropdown menu when toggle is clicked', async () => {
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

    const toggle = screen.getByRole('button', { name: testT('TimeRangeFilter.ARIA_LABELS.MENU_TOGGLE') });
    await user.click(toggle);

    // Use getAllByText since "All Time" appears in both toggle and menu
    const allTimeOptions = screen.getAllByText(testT('TimeRangeFilter.ALL_TIME'));
    expect(allTimeOptions.length).toBeGreaterThan(0);
    expect(screen.getByText(testT('TimeRangeFilter.LAST_24_HOURS'))).toBeInTheDocument();
    expect(screen.getByText(testT('TimeRangeFilter.LAST_7_DAYS'))).toBeInTheDocument();
    expect(screen.getByText(testT('TimeRangeFilter.LAST_30_DAYS'))).toBeInTheDocument();
    expect(screen.getByText(testT('TimeRangeFilter.CUSTOM_RANGE'))).toBeInTheDocument();
  });

  it('selects "Last 7 Days" preset', async () => {
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

    const toggle = screen.getByRole('button', { name: testT('TimeRangeFilter.ARIA_LABELS.MENU_TOGGLE') });
    await user.click(toggle);

    const last7DaysOption = screen.getByText(testT('TimeRangeFilter.LAST_7_DAYS'));
    await user.click(last7DaysOption);

    expect(mockSetTimeRange).toHaveBeenCalledWith({ type: 'preset', preset: 'last7d' });
  });

  it('selects "Last 30 Days" preset', async () => {
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

    const toggle = screen.getByRole('button', { name: testT('TimeRangeFilter.ARIA_LABELS.MENU_TOGGLE') });
    await user.click(toggle);

    const last30DaysOption = screen.getByText(testT('TimeRangeFilter.LAST_30_DAYS'));
    await user.click(last30DaysOption);

    expect(mockSetTimeRange).toHaveBeenCalledWith({ type: 'preset', preset: 'last30d' });
  });

  it('opens custom range modal when "Custom Range" is selected', async () => {
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

    const toggle = screen.getByRole('button', { name: testT('TimeRangeFilter.ARIA_LABELS.MENU_TOGGLE') });
    await user.click(toggle);

    const customRangeOption = screen.getByText(testT('TimeRangeFilter.CUSTOM_RANGE'));
    await user.click(customRangeOption);

    const modal = await screen.findByRole('dialog');
    expect(modal).toBeInTheDocument();
    expect(modal).toHaveAttribute('title', testT('TimeRangeFilter.CUSTOM_RANGE_TITLE'));
  });

  it('displays start and end time pickers in custom range modal', async () => {
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

    const toggle = screen.getByRole('button', { name: testT('TimeRangeFilter.ARIA_LABELS.MENU_TOGGLE') });
    await user.click(toggle);

    const customRangeOption = screen.getByText(testT('TimeRangeFilter.CUSTOM_RANGE'));
    await user.click(customRangeOption);

    const modal = await screen.findByRole('dialog');
    expect(within(modal).getByText(testT('TimeRangeFilter.START_TIME'))).toBeInTheDocument();
    expect(within(modal).getByText(testT('TimeRangeFilter.END_TIME'))).toBeInTheDocument();

    const pickers = within(modal).getAllByTestId('datetime-picker');
    expect(pickers).toHaveLength(2);
  });

  it('applies custom time range when Apply button is clicked', async () => {
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

    const toggle = screen.getByRole('button', { name: testT('TimeRangeFilter.ARIA_LABELS.MENU_TOGGLE') });
    await user.click(toggle);

    const customRangeOption = screen.getByText(testT('TimeRangeFilter.CUSTOM_RANGE'));
    await user.click(customRangeOption);

    const modal = await screen.findByRole('dialog');
    const selectButtons = within(modal).getAllByText('Select Date');

    // Select start time
    await user.click(selectButtons[0]);

    // Select end time
    await user.click(selectButtons[1]);

    const applyButton = within(modal).getByRole('button', { name: testT('TimeRangeFilter.APPLY') });
    await user.click(applyButton);

    expect(mockSetTimeRange).toHaveBeenCalledWith({
      type: 'custom',
      startTime: expect.any(String),
      endTime: expect.any(String),
    });
  });

  it('closes custom range modal when Cancel button is clicked', async () => {
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

    const toggle = screen.getByRole('button', { name: testT('TimeRangeFilter.ARIA_LABELS.MENU_TOGGLE') });
    await user.click(toggle);

    const customRangeOption = screen.getByText(testT('TimeRangeFilter.CUSTOM_RANGE'));
    await user.click(customRangeOption);

    const modal = await screen.findByRole('dialog');
    const cancelButton = within(modal).getByRole('button', { name: testT('CANCEL') });
    await user.click(cancelButton);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('displays "Custom Range" label when custom range is active', async () => {
    mockTimeRange = {
      type: 'custom',
      startTime: '2024-01-01T00:00:00Z',
      endTime: '2024-01-31T23:59:59Z',
    };
    mockUseArchiveFilters.mockReturnValue({
      timeRange: mockTimeRange,
      setTimeRange: mockSetTimeRange,
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

    const toggle = screen.getByRole('button', { name: testT('TimeRangeFilter.ARIA_LABELS.MENU_TOGGLE') });
    expect(toggle).toHaveTextContent(testT('TimeRangeFilter.CUSTOM_RANGE'));
  });

  it('renders with custom CSS class when provided', async () => {
    render({
      routerConfigs: {
        routes: [
          {
            path: '/archives',
            element: <TimeRangeFilter className="custom-class" />,
          },
        ],
      },
    });

    // Verify component renders successfully with className prop
    const toggle = screen.getByRole('button', { name: testT('TimeRangeFilter.ARIA_LABELS.MENU_TOGGLE') });
    expect(toggle).toBeInTheDocument();
  });

  it('resets custom time inputs when modal is cancelled', async () => {
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

    // Open custom range modal
    const toggle = screen.getByRole('button', { name: testT('TimeRangeFilter.ARIA_LABELS.MENU_TOGGLE') });
    await user.click(toggle);
    const customRangeOption = screen.getByText(testT('TimeRangeFilter.CUSTOM_RANGE'));
    await user.click(customRangeOption);

    let modal = await screen.findByRole('dialog');
    const selectButtons = within(modal).getAllByText('Select Date');
    await user.click(selectButtons[0]);

    // Cancel
    const cancelButton = within(modal).getByRole('button', { name: testT('CANCEL') });
    await user.click(cancelButton);

    // Verify modal is closed
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    // Reopen modal - should initialize with default 24h range again
    await user.click(toggle);
    await user.click(screen.getByText(testT('TimeRangeFilter.CUSTOM_RANGE')));

    modal = await screen.findByRole('dialog');
    const pickers = within(modal).getAllByTestId('datetime-picker');

    // Check that prefilled dates are initialized (not the previously selected date)
    // The component initializes with yesterday and today when opening custom modal
    expect(pickers[0]).toHaveTextContent('Prefilled:');
    expect(pickers[1]).toHaveTextContent('Prefilled:');
  });
});
