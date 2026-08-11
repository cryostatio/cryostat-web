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
  allowedUnifiedLogFilters,
  UnifiedLogUpdateCategoryIntent,
} from '@app/Shared/Redux/Filters/UnifiedLogFilterSlice';
import { RootState, StateDispatch } from '@app/Shared/Redux/ReduxStore';
import { UnifiedLog, KeyValue, keyValueToString } from '@app/Shared/Services/api.types';
import useDayjs, { Dayjs } from '@app/utils/hooks/useDayjs';
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
import { UnifiedLogLabelFilter } from './UnifiedLogLabelFilter';
import { UnifiedLogNameFilter } from './UnifiedLogNameFilter';

export interface UnifiedLogFiltersCategories {
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

export interface UnifiedLogFiltersProps {
  target: string;
  breakpoint?: 'md' | 'lg' | 'xl' | '2xl';
  logs: UnifiedLog[];
  filters: UnifiedLogFiltersCategories;
  updateFilters: (target: string, updateFilterOptions: UpdateFilterOptions) => void;
}

export const UnifiedLogFilters: React.FC<UnifiedLogFiltersProps> = ({
  target,
  logs,
  filters,
  breakpoint = 'xl',
  updateFilters,
}) => {
  const { t } = useCryostatTranslation();
  const [dayjs] = useDayjs();
  const dispatch = useDispatch<StateDispatch>();

  const currentCategory = useSelector((state: RootState) => {
    const targetUnifiedLogFilters = state.unifiedLogFilters.list.filter(
      (targetFilter) => targetFilter.target === target,
    );
    if (!targetUnifiedLogFilters.length) return 'Name'; // Target is not yet loaded
    return targetUnifiedLogFilters[0].archived.selectedCategory;
  });

  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = React.useState(false);

  const onCategoryToggle = React.useCallback(() => {
    setIsCategoryDropdownOpen((opened) => !opened);
  }, [setIsCategoryDropdownOpen]);

  const onCategorySelect = React.useCallback(
    (category) => {
      setIsCategoryDropdownOpen(false);
      dispatch(UnifiedLogUpdateCategoryIntent(target, category));
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
            aria-label={t('UnifiedLogFilters.ARIA_LABELS.MENU_TOGGLE')}
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
          {allowedUnifiedLogFilters.map((cat) => (
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
      <UnifiedLogNameFilter key={'name'} logs={logs} onSubmit={onNameInput} filteredNames={filters.Name} />,
      <UnifiedLogLabelFilter key={'label'} logs={logs} onSubmit={onLabelInput} filteredLabels={filters.Label} />,
    ],
    [logs, filters.Name, filters.Label, onNameInput, onLabelInput],
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
            className="unified-log-filter__toolbar-filter"
            labels={filters[filterKey].map((v: unknown, index) => {
              const display = getCategoryChipDisplay(t, dayjs, filterKey, v);
              return { node: display, key: index };
            })}
            deleteLabel={onDelete}
            deleteLabelGroup={onDeleteGroup}
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

export const filterUnifiedLogs = (logs: any[], filters: UnifiedLogFiltersCategories) => {
  if (!logs || !logs.length) {
    return logs;
  }

  let filtered = logs;

  if (filters.Name.length) {
    filtered = filtered.filter((r) => filters.Name.includes(r.logId));
  }

  if (filters.Label.length) {
    filtered = filtered.filter((log) => {
      const logLabels = (log.metadata?.labels ?? []).map((label: KeyValue) => keyValueToString(label));
      return filters.Label.some((filterLabel) => logLabels.includes(filterLabel));
    });
  }

  return filtered;
};
