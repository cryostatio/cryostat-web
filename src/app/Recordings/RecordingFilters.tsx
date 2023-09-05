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

import { UpdateFilterOptions } from '@app/Shared/Redux/Filters/Common';
import {
  allowedActiveRecordingFilters,
  allowedArchivedRecordingFilters,
} from '@app/Shared/Redux/Filters/RecordingFilterSlice';
import { recordingUpdateCategoryIntent, RootState, StateDispatch } from '@app/Shared/Redux/ReduxStore';
import { Recording, RecordingState } from '@app/Shared/Services/Api.service';
import { useDayjs } from '@app/utils/useDayjs';
import dayjs from '@i18n/datetime';
import {
  Dropdown,
  DropdownItem,
  DropdownPosition,
  DropdownToggle,
  ToolbarFilter,
  ToolbarGroup,
  ToolbarItem,
  ToolbarToggleGroup,
} from '@patternfly/react-core';
import { FilterIcon } from '@patternfly/react-icons';
import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { DateTimeFilter } from './Filters/DatetimeFilter';
import { DurationFilter } from './Filters/DurationFilter';
import { LabelFilter } from './Filters/LabelFilter';
import { NameFilter } from './Filters/NameFilter';
import { RecordingStateFilter } from './Filters/RecordingStateFilter';

export interface RecordingFiltersCategories {
  Name: string[];
  Label: string[];
  State?: RecordingState[];
  StartedBeforeDate?: string[];
  StartedAfterDate?: string[];
  DurationSeconds?: string[];
}

export const categoriesToDisplayNames = {
  Name: 'Name',
  Label: 'Label',
  State: 'Recording State',
  StartedBeforeDate: 'Started Before Date',
  StartedAfterDate: 'Started After Date',
  DurationSeconds: 'Duration (s)',
};

export const categoryIsDate = (fieldKey: string) => /date/i.test(fieldKey);

export interface RecordingFiltersProps {
  target: string;
  breakpoint?: 'md' | 'lg' | 'xl' | '2xl';
  isArchived: boolean;
  recordings: Recording[];
  filters: RecordingFiltersCategories;
  updateFilters: (target: string, updateFilterOptions: UpdateFilterOptions) => void;
}

export const RecordingFilters: React.FC<RecordingFiltersProps> = ({
  target,
  isArchived,
  recordings,
  filters,
  breakpoint = 'xl',
  updateFilters,
}) => {
  const [formatter, _] = useDayjs();
  const dispatch = useDispatch<StateDispatch>();

  const currentCategory = useSelector((state: RootState) => {
    const targetRecordingFilters = state.recordingFilters.list.filter((targetFilter) => targetFilter.target === target);
    if (!targetRecordingFilters.length) return 'Name'; // Target is not yet loaded
    return (isArchived ? targetRecordingFilters[0].archived : targetRecordingFilters[0].active).selectedCategory;
  });

  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = React.useState(false);

  const onCategoryToggle = React.useCallback(() => {
    setIsCategoryDropdownOpen((opened) => !opened);
  }, [setIsCategoryDropdownOpen]);

  const onCategorySelect = React.useCallback(
    (category) => {
      setIsCategoryDropdownOpen(false);
      dispatch(recordingUpdateCategoryIntent(target, category, isArchived));
    },
    [dispatch, setIsCategoryDropdownOpen, target, isArchived],
  );

  const onDelete = React.useCallback(
    (category, chip) => {
      const value = typeof chip === 'string' ? chip : chip.key;
      updateFilters(target, { filterKey: category, filterValue: value, deleted: true });
    },
    [updateFilters, target],
  );

  const onDeleteGroup = React.useCallback(
    (chip) => {
      const category = typeof chip === 'string' ? chip : chip.key;
      updateFilters(target, { filterKey: category, deleted: true, deleteOptions: { all: true } });
    },
    [updateFilters, target],
  );

  const onNameInput = React.useCallback(
    (inputName) => updateFilters(target, { filterKey: currentCategory, filterValue: inputName }),
    [updateFilters, currentCategory, target],
  );

  const onLabelInput = React.useCallback(
    (inputLabel) => updateFilters(target, { filterKey: currentCategory, filterValue: inputLabel }),
    [updateFilters, currentCategory, target],
  );

  const onStartedBeforeInput = React.useCallback(
    (searchDate) => updateFilters(target, { filterKey: currentCategory, filterValue: searchDate }),
    [updateFilters, currentCategory, target],
  );

  const onStartedAfterInput = React.useCallback(
    (searchDate) => updateFilters(target, { filterKey: currentCategory, filterValue: searchDate }),
    [updateFilters, currentCategory, target],
  );

  const onDurationInput = React.useCallback(
    (duration) => updateFilters(target, { filterKey: currentCategory, filterValue: `${duration.toString()} s` }),
    [updateFilters, currentCategory, target],
  );

  const onRecordingStateSelectToggle = React.useCallback(
    (searchState) => {
      const deleted = filters.State && filters.State.includes(searchState);
      updateFilters(target, { filterKey: currentCategory, filterValue: searchState, deleted: deleted });
    },
    [updateFilters, currentCategory, target, filters.State],
  );

  const onContinuousDurationSelect = React.useCallback(
    (cont) => updateFilters(target, { filterKey: currentCategory, filterValue: 'continuous', deleted: !cont }),
    [updateFilters, currentCategory, target],
  );

  const categoryDropdown = React.useMemo(() => {
    return (
      <Dropdown
        aria-label={'Category Dropdown'}
        position={DropdownPosition.left}
        toggle={
          <DropdownToggle aria-label={currentCategory} onToggle={onCategoryToggle}>
            <FilterIcon /> {categoriesToDisplayNames[currentCategory]}
          </DropdownToggle>
        }
        isOpen={isCategoryDropdownOpen}
        dropdownItems={(!isArchived ? allowedActiveRecordingFilters : allowedArchivedRecordingFilters).map((cat) => (
          <DropdownItem aria-label={categoriesToDisplayNames[cat]} key={cat} onClick={() => onCategorySelect(cat)}>
            {categoriesToDisplayNames[cat]}
          </DropdownItem>
        ))}
      />
    );
  }, [isArchived, isCategoryDropdownOpen, currentCategory, onCategoryToggle, onCategorySelect]);

  const filterDropdownItems = React.useMemo(
    () => [
      <NameFilter key={'name'} recordings={recordings} onSubmit={onNameInput} filteredNames={filters.Name} />,
      <LabelFilter key={'label'} recordings={recordings} onSubmit={onLabelInput} filteredLabels={filters.Label} />,
      ...(!isArchived
        ? [
            <RecordingStateFilter
              key={'recording-state'}
              filteredStates={filters.State}
              onSelectToggle={onRecordingStateSelectToggle}
            />,
            <DateTimeFilter key={'datetime-before'} onSubmit={onStartedBeforeInput} />,
            <DateTimeFilter key={'datetime-after'} onSubmit={onStartedAfterInput} />,
            <DurationFilter
              key={'duration'}
              durations={filters.DurationSeconds}
              onContinuousDurationSelect={onContinuousDurationSelect}
              onDurationInput={onDurationInput}
            />,
          ]
        : []),
    ],
    [
      isArchived,
      recordings,
      filters.Name,
      filters.Label,
      filters.State,
      filters.DurationSeconds,
      onNameInput,
      onLabelInput,
      onRecordingStateSelectToggle,
      onStartedAfterInput,
      onStartedBeforeInput,
      onContinuousDurationSelect,
      onDurationInput,
    ],
  );

  return (
    <ToolbarToggleGroup toggleIcon={<FilterIcon />} breakpoint={breakpoint}>
      <ToolbarGroup variant="filter-group">
        <ToolbarItem style={{ alignSelf: 'start' }} key={'category-select'}>
          {categoryDropdown}
        </ToolbarItem>
        {Object.keys(filters).map((filterKey, i) => (
          <ToolbarFilter
            key={`${filterKey}-filter`}
            className="recording-filter__toolbar-filter"
            chips={
              categoryIsDate(filterKey)
                ? filters[filterKey].map((ISOStr: string) => {
                    return {
                      node: formatter(ISOStr).format('L LTS z'),
                      key: ISOStr,
                    };
                  })
                : filters[filterKey].map((v) => ({ node: v, key: v }))
            }
            deleteChip={onDelete}
            deleteChipGroup={onDeleteGroup}
            categoryName={{
              key: filterKey,
              name: categoriesToDisplayNames[filterKey],
            }}
            showToolbarItem={filterKey === currentCategory}
          >
            {filterDropdownItems[i]}
          </ToolbarFilter>
        ))}
      </ToolbarGroup>
    </ToolbarToggleGroup>
  );
};

/* eslint-disable-next-line @typescript-eslint/no-explicit-any */
export const filterRecordings = (recordings: any[], filters: RecordingFiltersCategories) => {
  if (!recordings || !recordings.length) {
    return recordings;
  }

  let filtered = recordings;

  if (filters.Name.length) {
    filtered = filtered.filter((r) => filters.Name.includes(r.name));
  }
  if (!!filters.State && !!filters.State.length) {
    filtered = filtered.filter((r) => !!filters.State && filters.State.includes(r.state));
  }
  if (!!filters.DurationSeconds && !!filters.DurationSeconds.length) {
    filtered = filtered.filter((r) => {
      if (!filters.DurationSeconds) return true;
      return (
        filters.DurationSeconds.includes(`${r.duration / 1000} s`) ||
        (filters.DurationSeconds.includes('continuous') && r.continuous)
      );
    });
  }
  if (!!filters.StartedBeforeDate && !!filters.StartedBeforeDate.length) {
    filtered = filtered.filter((rec) => {
      if (!filters.StartedBeforeDate) return true;

      return filters.StartedBeforeDate.filter((startedBefore) => {
        const beforeDate = dayjs(startedBefore);
        return dayjs(rec.startTime).isBefore(beforeDate);
      }).length;
    });
  }
  if (!!filters.StartedAfterDate && !!filters.StartedAfterDate.length) {
    filtered = filtered.filter((rec) => {
      if (!filters.StartedAfterDate) return true;
      return filters.StartedAfterDate.filter((startedAfter) => {
        const afterDate = dayjs(startedAfter);
        return dayjs(rec.startTime).isSame(afterDate) || dayjs(rec.startTime).isAfter(afterDate);
      }).length;
    });
  }
  if (filters.Label.length) {
    filtered = filtered.filter(
      (r) => Object.entries(r.metadata.labels).filter(([k, v]) => filters.Label.includes(`${k}:${v}`)).length,
    );
  }

  return filtered;
};
