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

import { getLabelDisplay } from '@app/RecordingMetadata/utils';
import { Recording } from '@app/Shared/Services/api.types';
import {
  Button,
  Label,
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

export interface LabelFilterProps {
  recordings: Recording[];
  filteredLabels: string[];
  onSubmit: (inputLabel: string) => void;
}

export const LabelFilter: React.FC<LabelFilterProps> = ({ recordings, filteredLabels, onSubmit }) => {
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

  const labelOptions = React.useMemo(() => {
    const labels = new Set<string>();
    recordings.forEach((r) => {
      if (!r || !r.metadata || !r.metadata.labels) return;
      r.metadata.labels.map((label) => labels.add(getLabelDisplay(label)));
    });
    return Array.from(labels)
      .filter((l) => !filteredLabels.includes(l))
      .sort();
  }, [recordings, filteredLabels]);

  const filteredLabelOptions = React.useMemo(() => {
    return !filterValue ? labelOptions : labelOptions.filter((l) => l.includes(filterValue.toLowerCase()));
  }, [filterValue, labelOptions]);

  const selectOptionProps: SelectOptionProps[] = React.useMemo(() => {
    if (!filteredLabelOptions.length) {
      return [{ isDisabled: true, children: `No results found for "${filterValue}"`, value: undefined }];
    }
    return filteredLabelOptions.map((l) => ({ children: l, value: l }));
  }, [filteredLabelOptions, filterValue]);

  const toggle = React.useCallback(
    (toggleRef: React.Ref<MenuToggleElement>) => (
      <MenuToggle ref={toggleRef} variant="typeahead" onClick={onToggle} isExpanded={isExpanded} isFullWidth>
        <TextInputGroup isPlain>
          <TextInputGroupMain
            value={filterValue}
            onClick={onToggle}
            onChange={onInputChange}
            autoComplete="off"
            placeholder="Filter by label..."
            isExpanded={isExpanded}
            role="combobox"
            id="typeahead-label-filter"
            aria-controls="typeahead-label-select"
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
    <Select toggle={toggle} onSelect={onSelect} isOpen={isExpanded} aria-label="Filter by label">
      <SelectList id="typeahead-label-select">
        {selectOptionProps.map(({ value, children }, index) => (
          <SelectOption key={index} value={value}>
            <Label key={value} color="grey">
              {children}
            </Label>
          </SelectOption>
        ))}
      </SelectList>
    </Select>
  );
};
