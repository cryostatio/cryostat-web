/*
 * Copyright The Cryostat Authors
 *
 * The Universal Permissive License (UPL), Version 1.0
 *
 * Subject to the condition set forth below, permission is hereby granted to any
 * person obtaining a copy of this software, associated documentation and/or data
 * (collectively the "Software"), free of charge and under any and all copyright
 * rights in the Software, and any and all patent rights owned or freely
 * licensable by each licensor hereunder covering either (i) the unmodified
 * Software as contributed to or provided by such licensor, or (ii) the Larger
 * Works (as defined below), to deal in both
 *
 * (a) the Software, and
 * (b) any piece of software and/or hardware listed in the lrgrwrks.txt file if
 * one is included with the Software (each a "Larger Work" to which the Software
 * is contributed by such licensors),
 *
 * without restriction, including without limitation the rights to copy, create
 * derivative works of, display, perform, and distribute the Software and make,
 * use, sell, offer for sale, import, export, have made, and have sold the
 * Software and the Larger Work(s), and to sublicense the foregoing rights on
 * either these or other terms.
 *
 * This license is subject to the following condition:
 * The above copyright notice and either this complete permission notice or at
 * a minimum a reference to the UPL must be included in all copies or
 * substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

import { ActiveRecording, RecordingState } from '@app/Shared/Services/Api.service';
import {
  Button,
  ButtonVariant,
  Checkbox,
  Dropdown,
  DropdownItem,
  DropdownPosition,
  DropdownToggle,
  Flex,
  FlexItem,
  InputGroup,
  Select,
  SelectOption,
  SelectVariant,
  TextInput,
  ToolbarFilter,
  ToolbarGroup,
  ToolbarItem,
  ToolbarToggleGroup,
} from '@patternfly/react-core';
import { FilterIcon, SearchIcon } from '@patternfly/react-icons';
import React from 'react';
import { DateTimePicker } from './DateTimePicker';

export interface RecordingFiltersProps {
  recordings: ActiveRecording[];
  setFilteredRecordings: (recordings: ActiveRecording[]) => void;
  clearFiltersToggle: boolean;
}

export const RecordingFilters: React.FunctionComponent<RecordingFiltersProps> = (props) => {
  const [currentCategory, setCurrentCategory] = React.useState('Name');
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = React.useState(false);
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = React.useState(false);
  const [filters, setFilters] = React.useState({
    Name: [] as string[],
    DateRange: [] as string[],
    DurationSeconds: [] as string[],
    State: [] as RecordingState[],
    Labels: [],
  });
  const [searchName, setSearchName] = React.useState('');
  const [searchLabel, setSearchLabel] = React.useState('');
  const [continuous, setContinuous] = React.useState(false);
  const [duration, setDuration] = React.useState(30);
  const [startDateTime, setStartDateTime] = React.useState(new Date());
  const [stopDateTime, setStopDateTime] = React.useState(new Date());

  const onCategoryToggle = React.useCallback(() => {
    setIsCategoryDropdownOpen((opened) => !opened);
  }, [setIsCategoryDropdownOpen]);

  const onCategorySelect = React.useCallback((curr) => {
    setCurrentCategory(curr);
  }, [setCurrentCategory]);

  const onFilterToggle = React.useCallback(() => {
    setIsFilterDropdownOpen((opened) => !opened);
  }, [setIsFilterDropdownOpen]);

  const onDelete = React.useCallback((type = '', id = '') => {
    if (type) {
      setFilters((old) => {
        return { ...old, [type]: old[type].filter((val) => val !== id) };
      });
    } else {
      setFilters(() => {
        return {
          Name: [],
          DateRange: [],
          DurationSeconds: [],
          State: [],
          Labels: [],
        };
      });
    }
  }, [setFilters]);

  const onNameInput = React.useCallback(
    (e) => {
      if (e.key && e.key !== 'Enter') {
        return;
      }

      setFilters((old) => {
        return { ...old, Name: old.Name.includes(searchName) ? old.Name : [...old.Name, searchName] };
      });
    },
    [searchName, setFilters]
  );

  const onDateRangeInput = React.useCallback(() => {
    setFilters((old) => {
      const newRange = `${startDateTime.toISOString()} to ${stopDateTime.toString()}`;
      return { ...old, DateRange: old.DateRange.includes(newRange) ? old.DateRange : [...old.DateRange, newRange] };
    });
  }, [startDateTime, stopDateTime, setFilters]);

  const onDurationInput = React.useCallback(
    (e) => {
      if (e.key && e.key !== 'Enter') {
        return;
      }

      setFilters((old) => {
        return { ...old, DurationSeconds: [`${duration.toString()} s`] };
      });
    },
    [duration, setFilters]
  );

  const onRecordingStateSelect = React.useCallback(
    (e, state) => {
      setFilters((old) => {
        return { ...old, State: old.State.includes(state) ? old.State.filter((v) => v != state) : [...old.State, state] };
      });
    },
    [setFilters]
  );

  React.useEffect(() => {
    onDelete(null);
  }, [props.clearFiltersToggle, onDelete]);

  React.useEffect(() => {
    props.setFilteredRecordings(props.recordings); //TODO actually filter recordings
  }, [props.recordings, filters, props.setFilteredRecordings]);

  React.useEffect(() => {
    setFilters((old) => {
      return { ...old, DurationSeconds: continuous ? ['continuous'] : [] };
    });
  }, [continuous, setFilters]);

  const categoryDropdown = React.useMemo(() => {
    return (
      <ToolbarItem>
        <Dropdown
          position={DropdownPosition.left}
          toggle={
            <DropdownToggle onToggle={onCategoryToggle}>
              <FilterIcon /> {currentCategory}
            </DropdownToggle>
          }
          isOpen={isCategoryDropdownOpen}
          dropdownItems={[
            Object.keys(filters).map((cat) => (
              <DropdownItem key={cat} onClick={() => onCategorySelect(cat)}>
                {cat}
              </DropdownItem>
            )),
          ]}
        ></Dropdown>
      </ToolbarItem>
    );
  }, [isCategoryDropdownOpen, onCategoryToggle, onCategorySelect]);

  const filterDropdownItems = React.useMemo(
    () => [
      <InputGroup>
        <TextInput
          name="nameInput"
          id="nameInput1"
          type="search"
          aria-label="name filter"
          onChange={(name) => setSearchName(name)}
          value={searchName}
          placeholder="Filter by name..."
          onKeyDown={onNameInput}
        />
        <Button variant={ButtonVariant.control} aria-label="search button for name search input" onClick={onNameInput}>
          <SearchIcon />
        </Button>
      </InputGroup>,
      <InputGroup>
        <DateTimePicker
          start={startDateTime}
          setStart={setStartDateTime}
          end={stopDateTime}
          setEnd={setStopDateTime}
          onSubmit={onDateRangeInput}
        />
      </InputGroup>,
      <InputGroup>
        <Flex>
          <FlexItem>
            <TextInput
              type='number'
              value={duration}
              id="durationInput1"
              aria-label="duration filter"
              onChange={(e) => setDuration(Number(e))}
              min='0'
              isDisabled={continuous}
              onKeyDown={onDurationInput}
            />
          </FlexItem>
          <FlexItem>
            <Checkbox
              label="Continuous"
              id="continuous-checkbox"
              isChecked={continuous}
              onChange={(checked) => setContinuous(checked)}
            />
          </FlexItem>
        </Flex>
      </InputGroup>,
      <Select
        variant={SelectVariant.checkbox}
        aria-label={'State'}
        onToggle={onFilterToggle}
        onSelect={onRecordingStateSelect}
        selections={filters.State}
        isOpen={isFilterDropdownOpen}
        placeholderText="Filter by state"
      >
        {Object.values(RecordingState).map((rs) => (
          <SelectOption key={rs} value={rs} />
        ))}
      </Select>,
      <InputGroup>
        <TextInput
          name="labelInput"
          id="labelInput1"
          type="search"
          aria-label="label filter"
          onChange={(label) => setSearchLabel(label)}
          value={searchName}
          placeholder="Filter by label..."
          onKeyDown={onNameInput}
        />
        <Button variant={ButtonVariant.control} aria-label="search button for label search input" onClick={onNameInput}>
          <SearchIcon />
        </Button>
      </InputGroup>,
    ],
    [Object.keys(filters)]
  );

  return (
    <ToolbarToggleGroup toggleIcon={<FilterIcon />} breakpoint="xl">
      <ToolbarGroup variant="filter-group">
        {categoryDropdown}
        {Object.keys(filters).map((filterKey, i) => (
          <ToolbarFilter
            chips={filters[filterKey]}
            deleteChip={onDelete}
            categoryName={filterKey}
            showToolbarItem={currentCategory === filterKey}
          >
            {filterDropdownItems[i]}
          </ToolbarFilter>
        ))}
      </ToolbarGroup>
    </ToolbarToggleGroup>
  );
};
