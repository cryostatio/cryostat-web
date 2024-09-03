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

import { CategorizedRuleEvaluations } from '@app/Shared/Services/api.types';
import { portalRoot } from '@app/utils/utils';
import {
  Button,
  MenuToggle,
  MenuToggleElement,
  Select,
  SelectList,
  SelectOption,
  SelectOptionProps,
  TextInputGroup,
  TextInputGroupMain,
  TextInputGroupUtilities,
} from '@patternfly/react-core';
import { TimesIcon } from '@patternfly/react-icons';
import _ from 'lodash';
import * as React from 'react';

export interface AutomatedAnalysisTopicFilterProps {
  evaluations: CategorizedRuleEvaluations[];
  filteredTopics: string[];
  onSubmit: (inputName: string) => void;
}

export const AutomatedAnalysisTopicFilter: React.FC<AutomatedAnalysisTopicFilterProps> = ({ onSubmit, ...props }) => {
  const [isExpanded, setIsExpanded] = React.useState(false);
  const [filterValue, setFilterValue] = React.useState('');

  const onSelect = React.useCallback(
    (_, selection) => {
      if (selection) {
        setIsExpanded(false);
        onSubmit(selection);
      }
    },
    [onSubmit, setIsExpanded],
  );

  const onToggle = React.useCallback(() => setIsExpanded((isExpanded) => !isExpanded), [setIsExpanded]);

  const onInputChange = React.useCallback((_, inputVal: string) => setFilterValue(inputVal), [setFilterValue]);

  const topicOptions = React.useMemo(() => {
    return props.evaluations.map((r) => r[0]).filter((n) => !props.filteredTopics.includes(n));
  }, [props.evaluations, props.filteredTopics]);

  const filteredTopicOptions = React.useMemo(() => {
    const reg = new RegExp(_.escapeRegExp(filterValue), 'i');
    return !filterValue ? topicOptions : topicOptions.filter((topic) => reg.test(topic));
  }, [filterValue, topicOptions]);

  const selectOptionProps: SelectOptionProps[] = React.useMemo(() => {
    if (!filteredTopicOptions.length) {
      return [{ isDisabled: true, children: `No results found for "${filterValue}"`, value: undefined }];
    }
    return filteredTopicOptions.map((n) => ({ children: n, value: n }));
  }, [filteredTopicOptions, filterValue]);

  const toggle = React.useCallback(
    (toggleRef: React.Ref<MenuToggleElement>) => (
      <MenuToggle ref={toggleRef} variant="typeahead" onClick={onToggle} isExpanded={isExpanded} isFullWidth>
        <TextInputGroup isPlain>
          <TextInputGroupMain
            value={filterValue}
            onClick={onToggle}
            onChange={onInputChange}
            autoComplete="off"
            placeholder="Filter by topic..."
            isExpanded={isExpanded}
            role="combobox"
            id="typeahead-topic-filter"
            aria-controls="typeahead-filter-select"
          />
          <TextInputGroupUtilities>
            {filterValue ? (
              <Button
                variant="plain"
                onClick={() => {
                  setFilterValue('');
                }}
                aria-label="Clear input value"
              >
                <TimesIcon aria-hidden />
              </Button>
            ) : null}
          </TextInputGroupUtilities>
        </TextInputGroup>
      </MenuToggle>
    ),
    [onToggle, isExpanded, filterValue, onInputChange, setFilterValue],
  );

  return (
    <Select
      toggle={toggle}
      onSelect={onSelect}
      isOpen={isExpanded}
      aria-label="Filter by topic"
      popperProps={{
        appendTo: () => document.getElementById('dashboard-grid') || portalRoot,
      }}
      onOpenChange={setIsExpanded}
      onOpenChangeKeys={['Escape']}
      shouldFocusFirstItemOnOpen={false}
      isScrollable
      maxMenuHeight={'30vh'}
    >
      <SelectList id="typeahead-topic-filter">
        {selectOptionProps.map(({ value, children }, index) => (
          <SelectOption key={index} value={value}>
            {children}
          </SelectOption>
        ))}
      </SelectList>
    </Select>
  );
};
