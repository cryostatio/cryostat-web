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

import { Recording } from '@app/Shared/Services/api.types';
import {
  Button,
  MenuToggle,
  MenuToggleElement,
  Select,
  SelectList,
  SelectOption,
  TextInputGroup,
  TextInputGroupMain,
  TextInputGroupUtilities,
} from '@patternfly/react-core';
import { TimesIcon } from '@patternfly/react-icons';
import _ from 'lodash';
import * as React from 'react';

export interface NameFilterProps {
  recordings: Recording[];
  filteredNames: string[];
  onSubmit: (inputName: string) => void;
}

export const NameFilter: React.FC<NameFilterProps> = ({ recordings, filteredNames, onSubmit }) => {
  const [isExpanded, setIsExpanded] = React.useState(false);
  const [filterValue, setFilterValue] = React.useState('');

  const onSelect = React.useCallback(
    (_, selection: string) => {
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
    return recordings.map((r) => r.name).filter((n) => !filteredNames.includes(n));
  }, [recordings, filteredNames]);

  const filteredNameOptions = React.useMemo(() => {
    const reg = new RegExp(_.escapeRegExp(filterValue), 'i');
    return !filterValue ? nameOptions : nameOptions.filter((n) => reg.test(n));
  }, [filterValue, nameOptions]);

  const selectOptions = React.useMemo(() => {
    if (!filteredNameOptions.length) {
      return <SelectOption isDisabled>No results found</SelectOption>;
    }
    return filteredNameOptions.map((n, index) => (
      <SelectOption key={index} value={n}>
        {n}
      </SelectOption>
    ));
  }, [filteredNameOptions]);

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
            aria-controls="typeahead-name-select"
          />
          <TextInputGroupUtilities>
            {filterValue ? (
              <Button variant="plain" onClick={() => setFilterValue('')} aria-label="Clear input value">
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
      onOpenChange={(isOpen) => setIsExpanded(isOpen)}
      onOpenChangeKeys={['Escape']}
      shouldFocusFirstItemOnOpen={false}
    >
      <SelectList>{selectOptions}</SelectList>
    </Select>
  );
};
