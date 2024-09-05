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

import { getDurationUnitDisplay } from '@app/Shared/Components/DurationUnitSelect';
import { UpdateFilterOptions } from '@app/Shared/Redux/Filters/Common';
import {
  allowedActiveRecordingFilters,
  allowedArchivedRecordingFilters,
} from '@app/Shared/Redux/Filters/RecordingFilterSlice';
import { recordingUpdateCategoryIntent, RootState, StateDispatch } from '@app/Shared/Redux/ReduxStore';
import { KeyValue, Recording, RecordingState, keyValueToString } from '@app/Shared/Services/api.types';
import dayjs from '@i18n/datetime';
import {
  ToolbarFilter,
  ToolbarGroup,
  ToolbarItem,
  ToolbarToggleGroup,
  Dropdown,
  DropdownItem,
  DropdownList,
  MenuToggle,
  MenuToggleElement,
  Icon,
} from '@patternfly/react-core';
import { FilterIcon } from '@patternfly/react-icons';
import { TFunction } from 'i18next';
import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import { DateTimeFilter } from './Filters/DatetimeFilter';
import { compareDuration, DurationFilter, DurationRange, filterRecordingByDuration } from './Filters/DurationFilter';
import { LabelFilter } from './Filters/LabelFilter';
import { NameFilter } from './Filters/NameFilter';
import { RecordingStateFilter } from './Filters/RecordingStateFilter';

export interface RecordingFiltersCategories {
  Name: string[];
  Label: string[];
  State?: RecordingState[];
  StartedBeforeDate?: string[];
  StartedAfterDate?: string[];
  DurationRange?: DurationRange[];
}

export const getCategoryDisplay = (t: TFunction, category: string): string => {
  switch (category) {
    case 'Name':
      return t('NAME', { ns: 'common' });
    case 'Label':
      return t('LABEL', { ns: 'common' });
    case 'State':
      return t('STATE', { ns: 'common' });
    case 'DurationRange':
      return t('DURATION', { ns: 'common' });
    default:
      return category;
  }
};

export const getCategoryChipDisplay = (t: TFunction, category: string, value: unknown): string => {
  switch (category) {
    case 'DurationRange':
      const range = value as DurationRange;
      if (range.continuous) {
        return t('RecordingFilters.FILTER_CHIP.DURATION_CONTINUOUS');
      } else if (range.from && range.to) {
        if (compareDuration(range.to, range.from) === 0) {
          return t('RecordingFilters.FILTER_CHIP.DURATION_EXACT', {
            value: range.from.value,
            unit: getDurationUnitDisplay(t, range.from.unit, true),
          });
        }
        return t('RecordingFilters.FILTER_CHIP.DURATION_FROM_TO', {
          fromValue: range.from.value,
          fromUnit: getDurationUnitDisplay(t, range.from.unit, true),
          toValue: range.to.value,
          toUnit: getDurationUnitDisplay(t, range.to.unit, true),
        });
      } else if (range.from) {
        return t('RecordingFilters.FILTER_CHIP.DURATION_FROM', {
          value: range.from.value,
          unit: getDurationUnitDisplay(t, range.from.unit, true),
        });
      } else if (range.to) {
        return t('RecordingFilters.FILTER_CHIP.DURATION_TO', {
          value: range.to.value,
          unit: getDurationUnitDisplay(t, range.to.unit, true),
        });
      }
    case 'StartedBeforeDate':
    case 'StartedAfterDate':
      return dayjs(`${value}`).format('L LTS z');
    default:
      return `${value}`;
  }
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
  const { t } = useTranslation();
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
      const index = typeof chip === 'string' ? chip : chip.key;
      updateFilters(target, { filterKey: category, filterValueIndex: index, deleted: true });
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
    (range: DurationRange) => {
      // Remove continuous duration filter
      if (range.continuous !== undefined && !range.continuous) {
        updateFilters(target, {
          filterKey: currentCategory,
          filterValueIndex: filters.DurationRange?.findIndex((val) => val.continuous !== undefined),
          deleted: true,
        });
      } else {
        updateFilters(target, { filterKey: currentCategory, filterValue: range });
      }
    },

    [updateFilters, currentCategory, target, filters.DurationRange],
  );

  const onRecordingStateSelectToggle = React.useCallback(
    (searchState) => {
      const deleted = filters.State && filters.State.includes(searchState);
      updateFilters(target, { filterKey: currentCategory, filterValue: searchState, deleted: deleted });
    },
    [updateFilters, currentCategory, target, filters.State],
  );

  const categoryDropdown = React.useMemo(() => {
    return (
      <Dropdown
        selected={currentCategory}
        toggle={(toggleRef: React.Ref<MenuToggleElement>) => (
          <MenuToggle
            ref={toggleRef}
            icon={
              <Icon>
                <FilterIcon />
              </Icon>
            }
            aria-label={currentCategory}
            onClick={() => onCategoryToggle()}
          >
            {getCategoryDisplay(t, currentCategory)}
          </MenuToggle>
        )}
        onOpenChange={(isOpen) => setIsCategoryDropdownOpen(isOpen)}
        onOpenChangeKeys={['Escape']}
        isOpen={isCategoryDropdownOpen}
        popperProps={{
          position: 'left',
        }}
      >
        <DropdownList>
          {(!isArchived ? allowedActiveRecordingFilters : allowedArchivedRecordingFilters).map((cat) => (
            <DropdownItem key={cat} onClick={() => onCategorySelect(cat)} value={cat}>
              {getCategoryDisplay(t, cat)}
            </DropdownItem>
          ))}
        </DropdownList>
      </Dropdown>
    );
  }, [isArchived, isCategoryDropdownOpen, currentCategory, onCategoryToggle, onCategorySelect, t]);

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
            <DurationFilter key={'duration'} durations={filters.DurationRange} onDurationInput={onDurationInput} />,
          ]
        : []),
    ],
    [
      isArchived,
      recordings,
      filters.Name,
      filters.Label,
      filters.State,
      filters.DurationRange,
      onNameInput,
      onLabelInput,
      onRecordingStateSelectToggle,
      onStartedAfterInput,
      onStartedBeforeInput,
      onDurationInput,
    ],
  );

  return (
    <ToolbarToggleGroup
      toggleIcon={
        <Icon>
          <FilterIcon />
        </Icon>
      }
      breakpoint={breakpoint}
    >
      <ToolbarGroup variant="filter-group">
        <ToolbarItem style={{ alignSelf: 'start' }} key={'category-select'}>
          {categoryDropdown}
        </ToolbarItem>
        {Object.keys(filters).map((filterKey, idx) => (
          <ToolbarFilter
            key={`${filterKey}-filter`}
            className="recording-filter__toolbar-filter"
            chips={filters[filterKey].map((v: unknown, index) => {
              const display = getCategoryChipDisplay(t, filterKey, v);
              return { node: display, key: index }; // Use key to keep value index
            })}
            deleteChip={onDelete}
            deleteChipGroup={onDeleteGroup}
            categoryName={{
              key: filterKey,
              name: getCategoryDisplay(t, filterKey),
            }}
            showToolbarItem={filterKey === currentCategory}
          >
            {filterDropdownItems[idx]}
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

  filtered = filterRecordingByDuration(filtered, filters.DurationRange);

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
    filtered = filtered.filter((recording) => {
      const recordingLabels = recording.metadata.labels.map((label: KeyValue) => keyValueToString(label));
      return filters.Label.some((filterLabel) => recordingLabels.includes(filterLabel));
    });
  }

  return filtered;
};
