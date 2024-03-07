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
import * as React from 'react';

export interface AutomatedAnalysisNameFilterProps {
  evaluations: CategorizedRuleEvaluations[];
  filteredNames: string[];
  onSubmit: (inputName: string) => void;
}

export const AutomatedAnalysisNameFilter: React.FC<AutomatedAnalysisNameFilterProps> = ({
  onSubmit,
  filteredNames,
  evaluations,
}) => {
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

  const nameOptions = React.useMemo(() => {
    const flatEvalMap: string[] = [] as string[];
    for (const topic of evaluations.map((r) => r[1])) {
      for (const rule of topic) {
        flatEvalMap.push(rule.name);
      }
    }
    return flatEvalMap.filter((n) => !filteredNames.includes(n)).sort();
  }, [evaluations, filteredNames]);

  const filteredNameOptions = React.useMemo(() => {
    return !filterValue ? nameOptions : nameOptions.filter((n) => n.includes(filterValue.toLowerCase()));
  }, [filterValue, nameOptions]);

  const selectOptionProps: SelectOptionProps[] = React.useMemo(() => {
    if (!filteredNameOptions.length) {
      return [{ isDisabled: true, children: `No results found for "${filterValue}"`, value: undefined }];
    }
    return filteredNameOptions.map((n) => ({ children: n, value: n }));
  }, [filteredNameOptions, filterValue]);

  const toggle = React.useCallback(
    (toggleRef: React.Ref<MenuToggleElement>) => (
      <MenuToggle ref={toggleRef} variant="typeahead" onClick={onToggle} isExpanded={isExpanded} isFullWidth>
        <TextInputGroup isPlain>
          <TextInputGroupMain
            value={filterValue}
            onClick={onToggle}
            onChange={onInputChange}
            autoComplete="off"
            placeholder="Filter by name..."
            isExpanded={isExpanded}
            role="combobox"
            id="typeahead-name-filter"
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
      aria-label="Filter by name"
      popperProps={{
        enableFlip: true,
        appendTo: () => document.getElementById('dashboard-grid') || portalRoot,
      }}
    >
      <SelectList id="typeahead-filter-select">
        {selectOptionProps.map(({ value, children }, index) => (
          <SelectOption key={index} value={value}>
            {children}
          </SelectOption>
        ))}
      </SelectList>
    </Select>
  );
};
