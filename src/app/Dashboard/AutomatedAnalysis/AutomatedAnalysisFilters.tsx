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
import { RuleEvaluation } from '@app/Shared/Services/Report.service';
import {
  Dropdown,
  DropdownItem,
  DropdownPosition,
  DropdownToggle,
  ToolbarChipGroup,
  ToolbarFilter,
  ToolbarGroup,
  ToolbarItem,
  ToolbarToggleGroup,
} from '@patternfly/react-core';
import { FilterIcon } from '@patternfly/react-icons';
import React from 'react';
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
  evaluations: [string, RuleEvaluation[]][];
  filters: AutomatedAnalysisFiltersCategories;
  updateFilters: (target: string, updateFilterOptions: UpdateFilterOptions) => void;
}

export const AutomatedAnalysisFilters: React.FC<AutomatedAnalysisFiltersProps> = ({ updateFilters, ...props }) => {
  const dispatch = useDispatch<StateDispatch>();

  const currentCategory = useSelector((state: RootState) => {
    const targetAutomatedAnalysisFilters = state.automatedAnalysisFilters.targetFilters.filter(
      (targetFilter) => targetFilter.target === props.target
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
      dispatch(automatedAnalysisUpdateCategoryIntent(props.target, category));
    },
    [dispatch, setIsCategoryDropdownOpen, props.target]
  );

  const onDelete = React.useCallback(
    (category: string | ToolbarChipGroup, value) =>
      updateFilters(props.target, { filterKey: category as string, filterValue: value, deleted: true }),
    [updateFilters, props.target]
  );

  const onDeleteGroup = React.useCallback(
    (category: string | ToolbarChipGroup) =>
      updateFilters(props.target, { filterKey: category as string, deleted: true, deleteOptions: { all: true } }),
    [updateFilters, props.target]
  );

  const onNameInput = React.useCallback(
    (inputName: string) => updateFilters(props.target, { filterKey: currentCategory, filterValue: inputName }),
    [updateFilters, currentCategory, props.target]
  );

  const onTopicInput = React.useCallback(
    (inputTopic: string) => {
      updateFilters(props.target, { filterKey: currentCategory, filterValue: inputTopic });
    },
    [updateFilters, currentCategory, props.target]
  );

  const categoryDropdown = React.useMemo(() => {
    return (
      <Dropdown
        aria-label={'Category Dropdown'}
        position={DropdownPosition.left}
        toggle={
          <DropdownToggle aria-label={currentCategory} onToggle={onCategoryToggle}>
            <FilterIcon /> {currentCategory}
          </DropdownToggle>
        }
        isOpen={isCategoryDropdownOpen}
        dropdownItems={allowedAutomatedAnalysisFilters.map((cat) => (
          <DropdownItem aria-label={cat} key={cat} onClick={() => onCategorySelect(cat)}>
            {cat}
          </DropdownItem>
        ))}
      />
    );
  }, [isCategoryDropdownOpen, currentCategory, onCategoryToggle, onCategorySelect]);

  const filterDropdownItems = React.useMemo(
    () => [
      <AutomatedAnalysisNameFilter
        key={'name'}
        evaluations={props.evaluations}
        filteredNames={props.filters.Name}
        onSubmit={onNameInput}
      />,
      <AutomatedAnalysisTopicFilter
        key={'topic'}
        evaluations={props.evaluations}
        filteredTopics={props.filters.Topic}
        onSubmit={onTopicInput}
      ></AutomatedAnalysisTopicFilter>,
    ],
    [props.evaluations, props.filters.Name, props.filters.Topic, onNameInput, onTopicInput]
  );

  return (
    <ToolbarToggleGroup toggleIcon={<FilterIcon />} breakpoint="xl">
      <ToolbarGroup variant="filter-group">
        <ToolbarItem>
          {categoryDropdown}
          {Object.keys(props.filters)
            .filter((f) => f !== 'Score')
            .map((filterKey, i) => (
              <ToolbarFilter
                key={filterKey}
                chips={props.filters[filterKey]}
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
  topicEvalTuple: [string, RuleEvaluation[]][],
  filters: AutomatedAnalysisFiltersCategories,
  globalFilters: AutomatedAnalysisGlobalFiltersCategories,
  showNAScores: boolean
) => {
  if (!topicEvalTuple || !topicEvalTuple.length) {
    return topicEvalTuple;
  }

  let filtered = topicEvalTuple;

  if (filters.Name != null && !!filters.Name.length) {
    filtered = filtered.map(([topic, evaluations]) => {
      return [topic, evaluations.filter((evaluation) => filters.Name.includes(evaluation.name))] as [
        string,
        RuleEvaluation[]
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
      ] as [string, RuleEvaluation[]];
    });
  }
  if (filters.Topic != null && !!filters.Topic.length) {
    filtered = filtered.map(([topic, evaluations]) => {
      return [topic, evaluations.filter((_) => filters.Topic.includes(topic))] as [string, RuleEvaluation[]];
    });
  }

  return filtered;
};
