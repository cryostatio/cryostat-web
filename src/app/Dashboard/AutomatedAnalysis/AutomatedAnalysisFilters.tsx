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
import { allowedAutomatedAnalysisFilters } from '@app/Shared/Redux/Filters/AutomatedAnalysisFilterSlice';
import { UpdateFilterOptions } from '@app/Shared/Redux/Filters/Common';
import { automatedAnalysisUpdateCategoryIntent, RootState, StateDispatch } from '@app/Shared/Redux/ReduxStore';
import { AnalysisResult } from '@app/Shared/Services/api.types';
import {
  ToolbarChipGroup,
  ToolbarFilter,
  ToolbarGroup,
  ToolbarItem,
  ToolbarToggleGroup,
  Dropdown,
  DropdownItem,
  DropdownList,
  MenuToggle,
  MenuToggleElement,
} from '@patternfly/react-core';
import { FilterIcon } from '@patternfly/react-icons';
import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import { AutomatedAnalysisNameFilter } from './Filters/AutomatedAnalysisNameFilter';
import { AutomatedAnalysisTopicFilter } from './Filters/AutomatedAnalysisTopicFilter';

export interface AutomatedAnalysisFiltersCategories {
  Name: string[];
  Topic: string[];
}

export interface AutomatedAnalysisGlobalFiltersCategories {
  Score: number;
}

export interface AutomatedAnalysisFiltersProps {
  target: string;
  evaluations: [string, AnalysisResult[]][];
  filters: AutomatedAnalysisFiltersCategories;
  updateFilters: (target: string, updateFilterOptions: UpdateFilterOptions) => void;
}

export const AutomatedAnalysisFilters: React.FC<AutomatedAnalysisFiltersProps> = ({
  updateFilters,
  target,
  evaluations,
  filters,
  ..._props
}) => {
  const dispatch = useDispatch<StateDispatch>();
  const { t } = useTranslation();

  const currentCategory = useSelector((state: RootState) => {
    const targetAutomatedAnalysisFilters = state.automatedAnalysisFilters.targetFilters.filter(
      (targetFilter) => targetFilter.target === target,
    );
    if (!targetAutomatedAnalysisFilters.length) {
      return 'Name';
    } // Target is not yet loaded
    return targetAutomatedAnalysisFilters[0].selectedCategory;
  });

  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = React.useState(false);

  const onCategoryToggle = React.useCallback(() => {
    setIsCategoryDropdownOpen((opened) => !opened);
  }, [setIsCategoryDropdownOpen]);

  const onCategorySelect = React.useCallback(
    (category) => {
      setIsCategoryDropdownOpen(false);
      dispatch(automatedAnalysisUpdateCategoryIntent(target, category));
    },
    [dispatch, setIsCategoryDropdownOpen, target],
  );

  const onDelete = React.useCallback(
    (category: string | ToolbarChipGroup, value) =>
      updateFilters(target, { filterKey: category as string, filterValue: value, deleted: true }),
    [updateFilters, target],
  );

  const onDeleteGroup = React.useCallback(
    (category: string | ToolbarChipGroup) =>
      updateFilters(target, { filterKey: category as string, deleted: true, deleteOptions: { all: true } }),
    [updateFilters, target],
  );

  const onNameInput = React.useCallback(
    (inputName: string) => updateFilters(target, { filterKey: currentCategory, filterValue: inputName }),
    [updateFilters, currentCategory, target],
  );

  const onTopicInput = React.useCallback(
    (inputTopic: string) => {
      updateFilters(target, { filterKey: currentCategory, filterValue: inputTopic });
    },
    [updateFilters, currentCategory, target],
  );

  const getCategoryDisplay = React.useCallback(
    (category: string) => {
      switch (category) {
        case 'Name':
          return t('FILTER_NAME', { ns: 'common' });
        case 'Topic':
          return t('FILTER_TOPIC', { ns: 'common' });
        default:
          throw new Error(`Unknown automated analysis filter category: ${category}`);
      }
    },
    [t],
  );

  const categoryDropdown = React.useMemo(() => {
    return (
      <Dropdown
        toggle={(toggleRef: React.Ref<MenuToggleElement>) => (
          <MenuToggle ref={toggleRef} aria-label={currentCategory} onClick={onCategoryToggle} icon={<FilterIcon />}>
            {getCategoryDisplay(currentCategory)}
          </MenuToggle>
        )}
        isOpen={isCategoryDropdownOpen}
        onOpenChange={setIsCategoryDropdownOpen}
        onOpenChangeKeys={['Escape']}
        popperProps={{
          position: 'left',
        }}
      >
        <DropdownList>
          {allowedAutomatedAnalysisFilters.map((cat) => (
            <DropdownItem aria-label={cat} key={cat} onClick={() => onCategorySelect(cat)}>
              {cat}
            </DropdownItem>
          ))}
        </DropdownList>
      </Dropdown>
    );
  }, [isCategoryDropdownOpen, currentCategory, onCategoryToggle, onCategorySelect, getCategoryDisplay]);

  const filterDropdownItems = React.useMemo(
    () => [
      <AutomatedAnalysisNameFilter
        key={'name'}
        evaluations={evaluations}
        filteredNames={filters.Name}
        onSubmit={onNameInput}
      />,
      <AutomatedAnalysisTopicFilter
        key={'topic'}
        evaluations={evaluations}
        filteredTopics={filters.Topic}
        onSubmit={onTopicInput}
      />,
    ],
    [evaluations, filters.Name, filters.Topic, onNameInput, onTopicInput],
  );

  return (
    <ToolbarToggleGroup toggleIcon={<FilterIcon />} breakpoint="xl">
      <ToolbarGroup variant="filter-group">
        <ToolbarItem>
          {categoryDropdown}
          {Object.keys(filters)
            .filter((f) => f !== 'Score')
            .map((filterKey, i) => (
              <ToolbarFilter
                key={filterKey}
                chips={filters[filterKey]}
                deleteChip={onDelete}
                deleteChipGroup={onDeleteGroup}
                categoryName={filterKey}
                showToolbarItem={filterKey === currentCategory}
              >
                {filterDropdownItems[i]}
              </ToolbarFilter>
            ))}
        </ToolbarItem>
      </ToolbarGroup>
    </ToolbarToggleGroup>
  );
};

export const filterAutomatedAnalysis = (
  topicEvalTuple: [string, AnalysisResult[]][],
  filters: AutomatedAnalysisFiltersCategories,
  globalFilters: AutomatedAnalysisGlobalFiltersCategories,
  showNAScores: boolean,
) => {
  if (!topicEvalTuple || !topicEvalTuple.length) {
    return topicEvalTuple;
  }

  let filtered = topicEvalTuple;

  if (filters.Name != null && !!filters.Name.length) {
    filtered = filtered.map(([topic, evaluations]) => {
      return [topic, evaluations.filter((evaluation) => filters.Name.includes(evaluation.name))] as [
        string,
        AnalysisResult[],
      ];
    });
  }
  if (globalFilters.Score != null) {
    filtered = filtered.map(([topic, evaluations]) => {
      return [
        topic,
        evaluations.filter((evaluation) => {
          if (showNAScores) {
            return globalFilters.Score <= evaluation.score || evaluation.score == -1;
          }
          return globalFilters.Score <= evaluation.score;
        }),
      ] as [string, AnalysisResult[]];
    });
  }
  if (filters.Topic != null && !!filters.Topic.length) {
    filtered = filtered.map(([topic, evaluations]) => {
      return [topic, evaluations.filter((_) => filters.Topic.includes(topic))] as [string, AnalysisResult[]];
    });
  }

  return filtered;
};
