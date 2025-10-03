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
  allowedThreadDumpFilters,
  ThreadDumpUpdateCategoryIntent,
} from '@app/Shared/Redux/Filters/ThreadDumpFilterSlice';
import { RootState, StateDispatch } from '@app/Shared/Redux/ReduxStore';
import { ThreadDump, KeyValue, keyValueToString } from '@app/Shared/Services/api.types';
import useDayjs, { Dayjs } from '@app/utils/hooks/useDayjs';
// import dayjs from '@i18n/datetime';
import { useCryostatTranslation } from '@i18n/i18nextUtil';
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
import { useDispatch, useSelector } from 'react-redux';
import { ThreadDumpLabelFilter } from './ThreadDumpLabelFilter';
import { ThreadDumpNameFilter } from './ThreadDumpNameFilter';

export interface ThreadDumpFiltersCategories {
  Name: string[];
  Label: string[];
}

export const getCategoryDisplay = (t: TFunction, category: string): string => {
  switch (category) {
    case 'Name':
      return t('NAME');
    case 'Label':
      return t('LABEL');
    default:
      return category;
  }
};

export const getCategoryChipDisplay = (t: TFunction, dayjs: Dayjs, category: string, value: unknown): string => {
  return `${value}`;
};

export const categoryIsDate = (fieldKey: string) => /date/i.test(fieldKey);

export interface ThreadDumpFiltersProps {
  target: string;
  breakpoint?: 'md' | 'lg' | 'xl' | '2xl';
  threadDumps: ThreadDump[];
  filters: ThreadDumpFiltersCategories;
  updateFilters: (target: string, updateFilterOptions: UpdateFilterOptions) => void;
}

export const ThreadDumpFilters: React.FC<ThreadDumpFiltersProps> = ({
  target,
  threadDumps,
  filters,
  breakpoint = 'xl',
  updateFilters,
}) => {
  const { t } = useCryostatTranslation();
  const [dayjs] = useDayjs();
  const dispatch = useDispatch<StateDispatch>();

  const currentCategory = useSelector((state: RootState) => {
    const targetThreadDumpFilters = state.threadDumpFilters.list.filter(
      (targetFilter) => targetFilter.target === target,
    );
    if (!targetThreadDumpFilters.length) return 'Name'; // Target is not yet loaded
    return targetThreadDumpFilters[0].archived.selectedCategory;
  });

  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = React.useState(false);

  const onCategoryToggle = React.useCallback(() => {
    setIsCategoryDropdownOpen((opened) => !opened);
  }, [setIsCategoryDropdownOpen]);

  const onCategorySelect = React.useCallback(
    (category) => {
      setIsCategoryDropdownOpen(false);
      dispatch(ThreadDumpUpdateCategoryIntent(target, category));
    },
    [dispatch, setIsCategoryDropdownOpen, target],
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
            aria-label={t('ThreadDumpFilters.ARIA_LABELS.MENU_TOGGLE')}
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
          {allowedThreadDumpFilters.map((cat) => (
            <DropdownItem key={cat} onClick={() => onCategorySelect(cat)} value={cat}>
              {getCategoryDisplay(t, cat)}
            </DropdownItem>
          ))}
        </DropdownList>
      </Dropdown>
    );
  }, [isCategoryDropdownOpen, currentCategory, onCategoryToggle, onCategorySelect, t]);

  const filterDropdownItems = React.useMemo(
    () => [
      <ThreadDumpNameFilter
        key={'name'}
        threadDumps={threadDumps}
        onSubmit={onNameInput}
        filteredNames={filters.Name}
      />,
      <ThreadDumpLabelFilter
        key={'label'}
        threadDumps={threadDumps}
        onSubmit={onLabelInput}
        filteredLabels={filters.Label}
      />,
    ],
    [threadDumps, filters.Name, filters.Label, onNameInput, onLabelInput],
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
            className="thread-dump-filter__toolbar-filter"
            chips={filters[filterKey].map((v: unknown, index) => {
              const display = getCategoryChipDisplay(t, dayjs, filterKey, v);
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

export const filterThreadDumps = (threadDumps: any[], filters: ThreadDumpFiltersCategories) => {
  if (!threadDumps || !threadDumps.length) {
    return threadDumps;
  }

  let filtered = threadDumps;

  if (filters.Name.length) {
    filtered = filtered.filter((r) => filters.Name.includes(r.threadDumpId));
  }

  if (filters.Label.length) {
    filtered = filtered.filter((threadDump) => {
      const threadDumpLabels = threadDump.metadata.labels.map((label: KeyValue) => keyValueToString(label));
      return filters.Label.some((filterLabel) => threadDumpLabels.includes(filterLabel));
    });
  }

  return filtered;
};
