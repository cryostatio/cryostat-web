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

// Mock system time for DatetimePicker
const mockCurrentDate = new Date('14 Sep 2022 00:00:00 UTC');
jest.useFakeTimers('modern').setSystemTime(mockCurrentDate);

import { getCategoryDisplay, RecordingFilters, RecordingFiltersCategories } from '@app/Recordings/RecordingFilters';
import { UpdateFilterOptions } from '@app/Shared/Redux/Filters/Common';
import {
  emptyActiveRecordingFilters,
  emptyArchivedRecordingFilters,
  TargetRecordingFilters,
} from '@app/Shared/Redux/Filters/RecordingFilterSlice';
import { RootState } from '@app/Shared/Redux/ReduxStore';
import { Target, ActiveRecording, RecordingState, ArchivedRecording } from '@app/Shared/Services/api.types';
import { defaultServices } from '@app/Shared/Services/Services';
import { defaultDatetimeFormat } from '@i18n/datetime';
import { Toolbar, ToolbarContent } from '@patternfly/react-core';
import { cleanup, screen, within, act, waitFor } from '@testing-library/react';
import { TFunction } from 'i18next';
import { of } from 'rxjs';
import { basePreloadedState, render, testT } from '../utils';

const mockFooTarget: Target = {
  agent: false,
  connectUrl: 'service:jmx:rmi://someFooUrl',
  alias: 'fooTarget',
  labels: [],
  annotations: {
    cryostat: [],
    platform: [],
  },
};

const mockRecordingLabels = [
  {
    key: 'someLabel',
    value: 'someValue',
  },
];

const mockActiveRecording: ActiveRecording = {
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
const mockActiveRecordingList = [
  mockActiveRecording,
  { ...mockActiveRecording, name: 'anotherRecording' } as ActiveRecording,
];

const mockArchivedRecording: ArchivedRecording = {
  name: 'someArchivedRecording',
  downloadUrl: 'http://downloadUrl',
  reportUrl: 'http://reportUrl',
  metadata: { labels: mockRecordingLabels },
  size: 2048,
  archivedTime: 2048,
};
const mockArchivedRecordingList = [
  mockArchivedRecording,
  { ...mockArchivedRecording, name: 'anotherArchivedRecording' } as ArchivedRecording,
];

const activeCategoryOptions = ['Name', 'Label', 'State', 'StartTime', 'Duration'];
const archivedCategoryOptions = ['Name', 'Label'];

const updateFilters = jest.fn((_target: string, _options: UpdateFilterOptions) => undefined);

jest.spyOn(defaultServices.settings, 'datetimeFormat').mockReturnValue(of(defaultDatetimeFormat));

describe('<RecordingFilters />', () => {
  let preloadedState: RootState;
  let activeRecordingFilters: RecordingFiltersCategories;
  let archivedRecordingFilters: RecordingFiltersCategories;

  beforeEach(() => {
    activeRecordingFilters = {
      Name: [mockActiveRecording.name],
      Label: ['someLabel:someValue'],
      State: [],
      StartTime: [],
      Duration: [],
    } as RecordingFiltersCategories;

    archivedRecordingFilters = {
      Name: [mockArchivedRecording.name],
      Label: [],
    } as RecordingFiltersCategories;

    preloadedState = {
      ...basePreloadedState,
      recordingFilters: {
        list: [
          {
            target: mockFooTarget.connectUrl,
            active: {
              selectedCategory: 'Label',
              filters: activeRecordingFilters,
            },
            archived: {
              selectedCategory: 'Name',
              filters: archivedRecordingFilters,
            },
          } as TargetRecordingFilters,
        ],
        _version: '0',
      },
      automatedAnalysisFilters: {
        targetFilters: [],
        globalFilters: {
          filters: {
            Score: 100,
          },
        },
        _version: '0',
      },
    };
  });

  afterEach(cleanup);

  afterAll(jest.useRealTimers);

  it('should display currently selected category for Active Recordings', async () => {
    render({
      routerConfigs: {
        routes: [
          {
            path: '/recordings',
            element: (
              <Toolbar>
                <ToolbarContent>
                  <RecordingFilters
                    target={mockFooTarget.connectUrl}
                    isArchived={false}
                    recordings={mockActiveRecordingList}
                    filters={activeRecordingFilters}
                    updateFilters={updateFilters}
                  />
                </ToolbarContent>
              </Toolbar>
            ),
          },
        ],
      },
      preloadedState: preloadedState,
    });

    const categoryToggle = screen.getByLabelText(testT('RecordingFilters.ARIA_LABELS.MENU_TOGGLE'));
    expect(categoryToggle).toBeInTheDocument();
    expect(categoryToggle).toBeVisible();

    const selectedItem = within(categoryToggle).getByText(testT('LABEL', { ns: 'common' }));
    expect(selectedItem).toBeInTheDocument();
    expect(selectedItem).toBeVisible();
  });

  it('should display currently selected category for Archived Recordings', async () => {
    render({
      routerConfigs: {
        routes: [
          {
            path: '/recordings',
            element: (
              <Toolbar>
                <ToolbarContent>
                  <RecordingFilters
                    target={mockFooTarget.connectUrl}
                    isArchived={true}
                    recordings={mockArchivedRecordingList}
                    filters={archivedRecordingFilters}
                    updateFilters={updateFilters}
                  />
                </ToolbarContent>
              </Toolbar>
            ),
          },
        ],
      },
      preloadedState: preloadedState,
    });

    const categoryToggle = screen.getByLabelText(testT('RecordingFilters.ARIA_LABELS.MENU_TOGGLE'));
    expect(categoryToggle).toBeInTheDocument();
    expect(categoryToggle).toBeVisible();

    const selectedItem = within(categoryToggle).getByText(testT('NAME', { ns: 'common' }));
    expect(selectedItem).toBeInTheDocument();
    expect(selectedItem).toBeVisible();
  });

  it('should display category menu for Active Recordings when clicked', async () => {
    const { user } = render({
      routerConfigs: {
        routes: [
          {
            path: '/recordings',
            element: (
              <Toolbar>
                <ToolbarContent>
                  <RecordingFilters
                    target={mockFooTarget.connectUrl}
                    isArchived={false}
                    recordings={mockActiveRecordingList}
                    filters={activeRecordingFilters}
                    updateFilters={updateFilters}
                  />
                </ToolbarContent>
              </Toolbar>
            ),
          },
        ],
      },
      preloadedState: preloadedState,
      userConfigs: { advanceTimers: jest.advanceTimersByTime },
    });

    const categoryToggle = screen.getByLabelText(testT('RecordingFilters.ARIA_LABELS.MENU_TOGGLE'));
    expect(categoryToggle).toBeInTheDocument();
    expect(categoryToggle).toBeVisible();

    const selectedItem = within(categoryToggle).getByText(testT('LABEL', { ns: 'common' }));
    expect(selectedItem).toBeInTheDocument();
    expect(selectedItem).toBeVisible();

    await act(async () => {
      await user.click(selectedItem);
    });

    const categoryMenu = await screen.findByRole('menu');
    expect(categoryMenu).toBeInTheDocument();
    expect(categoryMenu).toBeVisible();

    activeCategoryOptions.forEach((category) => {
      const option = within(categoryMenu).getByText(getCategoryDisplay(testT as TFunction, category));
      expect(option).toBeInTheDocument();
      expect(option).toBeVisible();
    });
  });

  it('should display category menu for Archived Recordings when clicked', async () => {
    const { user } = render({
      routerConfigs: {
        routes: [
          {
            path: '/recordings',
            element: (
              <Toolbar>
                <ToolbarContent>
                  <RecordingFilters
                    target={mockFooTarget.connectUrl}
                    isArchived={true}
                    recordings={mockArchivedRecordingList}
                    filters={archivedRecordingFilters}
                    updateFilters={updateFilters}
                  />
                </ToolbarContent>
              </Toolbar>
            ),
          },
        ],
      },
      preloadedState: preloadedState,
      userConfigs: { advanceTimers: jest.advanceTimersByTime },
    });

    const categoryToggle = screen.getByLabelText(testT('RecordingFilters.ARIA_LABELS.MENU_TOGGLE'));
    expect(categoryToggle).toBeInTheDocument();
    expect(categoryToggle).toBeVisible();

    const selectedItem = within(categoryToggle).getByText(testT('NAME', { ns: 'common' }));
    expect(selectedItem).toBeInTheDocument();
    expect(selectedItem).toBeVisible();

    await act(async () => {
      await user.click(selectedItem);
    });

    const categoryMenu = await screen.findByRole('menu');
    expect(categoryMenu).toBeInTheDocument();
    expect(categoryMenu).toBeVisible();

    archivedCategoryOptions.forEach((category) => {
      const option = within(categoryMenu).getByText(getCategoryDisplay(testT as TFunction, category));
      expect(option).toBeInTheDocument();
      expect(option).toBeVisible();
    });
  });

  it('should close category menu when toggled', async () => {
    const { user } = render({
      routerConfigs: {
        routes: [
          {
            path: '/recordings',
            element: (
              <Toolbar>
                <ToolbarContent>
                  <RecordingFilters
                    target={mockFooTarget.connectUrl}
                    isArchived={false}
                    recordings={mockActiveRecordingList}
                    filters={activeRecordingFilters}
                    updateFilters={updateFilters}
                  />
                </ToolbarContent>
              </Toolbar>
            ),
          },
        ],
      },
      preloadedState: preloadedState,
      userConfigs: { advanceTimers: jest.advanceTimersByTime },
    });

    const categoryToggle = screen.getByLabelText(testT('RecordingFilters.ARIA_LABELS.MENU_TOGGLE'));
    expect(categoryToggle).toBeInTheDocument();
    expect(categoryToggle).toBeVisible();

    const selectedItem = within(categoryToggle).getByText(testT('LABEL', { ns: 'common' }));
    expect(selectedItem).toBeInTheDocument();
    expect(selectedItem).toBeVisible();

    await act(async () => {
      await user.click(selectedItem);
    });

    const categoryMenu = await screen.findByRole('menu');
    expect(categoryMenu).toBeInTheDocument();
    expect(categoryMenu).toBeVisible();

    await act(async () => {
      await user.click(selectedItem); // Click again
    });

    await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument());
  });

  it('should switch filter input if a category is selected ', async () => {
    const { user, container } = render({
      routerConfigs: {
        routes: [
          {
            path: '/recordings',
            element: (
              <Toolbar>
                <ToolbarContent>
                  <RecordingFilters
                    target={mockFooTarget.connectUrl}
                    isArchived={false}
                    recordings={mockActiveRecordingList}
                    filters={activeRecordingFilters}
                    updateFilters={updateFilters}
                  />
                </ToolbarContent>
              </Toolbar>
            ),
          },
        ],
      },
      preloadedState: preloadedState,
      userConfigs: { advanceTimers: jest.advanceTimersByTime },
    });

    const categoryToggle = screen.getByLabelText(testT('RecordingFilters.ARIA_LABELS.MENU_TOGGLE'));
    expect(categoryToggle).toBeInTheDocument();
    expect(categoryToggle).toBeVisible();

    let selectedItem = within(categoryToggle).getByText(testT('LABEL', { ns: 'common' }));
    expect(selectedItem).toBeInTheDocument();
    expect(selectedItem).toBeVisible();

    await act(async () => {
      await user.click(selectedItem);
    });

    const categoryMenu = await screen.findByRole('menu');
    expect(categoryMenu).toBeInTheDocument();
    expect(categoryMenu).toBeVisible();

    const toSelectItem = within(categoryMenu).getByText(getCategoryDisplay(testT as TFunction, 'Name'));
    expect(toSelectItem).toBeInTheDocument();
    expect(toSelectItem).toBeVisible();

    await act(async () => {
      await user.click(toSelectItem);
    });

    selectedItem = within(categoryToggle).getByText(testT('NAME', { ns: 'common' }));
    expect(selectedItem).toBeInTheDocument();
    expect(selectedItem).toBeVisible();

    const prevSelectedItem = within(categoryToggle).queryByText(testT('LABEL', { ns: 'common' }));
    expect(prevSelectedItem).not.toBeInTheDocument();

    const newFilterTool = container.querySelector("input[placeholder='Filter by name...'][type='text']");
    expect(newFilterTool).toBeInTheDocument();
    expect(newFilterTool).toBeVisible();
  });

  it('should approriate chips for filtered categories', async () => {
    render({
      routerConfigs: {
        routes: [
          {
            path: '/recordings',
            element: (
              <Toolbar>
                <ToolbarContent>
                  <RecordingFilters
                    target={mockFooTarget.connectUrl}
                    isArchived={false}
                    recordings={mockActiveRecordingList}
                    filters={activeRecordingFilters}
                    updateFilters={updateFilters}
                  />
                </ToolbarContent>
              </Toolbar>
            ),
          },
        ],
      },
      preloadedState: preloadedState,
      userConfigs: { advanceTimers: jest.advanceTimersByTime },
    });

    // Label group
    let chipGroup = screen.getByRole('group', { name: testT('LABEL', { ns: 'common' }) });
    expect(chipGroup).toBeInTheDocument();
    expect(chipGroup).toBeVisible();

    let chipGroupName = within(chipGroup).getByText(testT('LABEL', { ns: 'common' }));
    expect(chipGroupName).toBeInTheDocument();
    expect(chipGroupName).toBeVisible();

    let chip = within(chipGroup).getByText('someLabel:someValue');
    expect(chip).toBeInTheDocument();
    expect(chip).toBeVisible();

    // Name group
    chipGroup = screen.getByRole('group', { name: testT('NAME', { ns: 'common' }) });
    expect(chipGroup).toBeInTheDocument();
    expect(chipGroup).toBeVisible();

    chipGroupName = within(chipGroup).getByText(testT('NAME', { ns: 'common' }));
    expect(chipGroupName).toBeInTheDocument();
    expect(chipGroupName).toBeVisible();

    chip = within(chipGroup).getByText(mockActiveRecording.name);
    expect(chip).toBeInTheDocument();
    expect(chip).toBeVisible();
  });

  it('should not display chips when no filters are selected', async () => {
    const emptyPreloadedState = {
      recordingFilters: {
        _version: '0',
        list: [
          {
            target: mockFooTarget.connectUrl,
            active: {
              selectedCategory: 'Label',
              filters: emptyActiveRecordingFilters,
            },
            archived: {
              selectedCategory: 'Name',
              filters: emptyArchivedRecordingFilters,
            },
          } as TargetRecordingFilters,
        ],
      },
    };
    render({
      routerConfigs: {
        routes: [
          {
            path: '/recordings',
            element: (
              <Toolbar>
                <ToolbarContent>
                  <RecordingFilters
                    target={mockFooTarget.connectUrl}
                    isArchived={false}
                    recordings={mockActiveRecordingList}
                    filters={emptyActiveRecordingFilters}
                    updateFilters={updateFilters}
                  />
                </ToolbarContent>
              </Toolbar>
            ),
          },
        ],
      },
      preloadedState: emptyPreloadedState,
      userConfigs: { advanceTimers: jest.advanceTimersByTime },
    });

    const chipGroups = screen.queryAllByRole('group');
    expect(chipGroups).toHaveLength(0);
  });
});
