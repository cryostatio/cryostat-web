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
  DatePicker,
  Dropdown,
  DropdownItem,
  DropdownPosition,
  DropdownToggle,
  InputGroup,
  Select,
  SelectVariant,
  Text,
  TextInput,
  ToolbarFilter,
  ToolbarGroup,
  ToolbarItem,
  ToolbarToggleGroup,
} from '@patternfly/react-core';
import { FilterIcon, SearchIcon } from '@patternfly/react-icons';
import React from 'react';

export interface RecordingSearchFiltersProps {
  recordings: ActiveRecording[];
  setFilteredRecordings: (recordings: ActiveRecording[]) => void;
}

export const RecordingSearchFilters: React.FunctionComponent<RecordingSearchFiltersProps> = (props) => {
  const [currentCategory, setCurrentCategory] = React.useState('Name');
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = React.useState(false);
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = React.useState(false);
  const [filters, setFilters] = React.useState({
    Name: [] as string[],
    Datetime: [],
    Duration: [],
    State: [] as RecordingState[],
    Labels: [],
  });
  const [searchName, setSearchName] = React.useState('');
  const [searchLabel, setSearchLabel] = React.useState('');
  const [continuous, setContinuous] = React.useState(false);
  const [duration, setDuration] = React.useState(30);

  const onCategoryToggle = React.useCallback(() => {
    setIsCategoryDropdownOpen((opened) => !opened);
  }, [setIsCategoryDropdownOpen]);

  const onCategorySelect = React.useCallback((curr) => {
    console.log(curr);
    setCurrentCategory(curr);
  }, []);

  const onFilterToggle = React.useCallback(() => {
    setIsFilterDropdownOpen((opened) => !opened);
  }, [setIsFilterDropdownOpen]);

  const onDelete = React.useCallback(() => {}, []);

  const onNameInput = React.useCallback(
    (e) => {
      if (e.key && e.key !== 'Enter') {
        return;
      }

      setFilters((old) => {
        return { ...old, ['Name']: old.Name.includes(searchName) ? old.Name : [...old.Name, searchName] };
      });
    },
    [searchName]
  );

  const onRecordingStateSelect = React.useCallback((state: RecordingState) => {
    setFilters((old) => {
      return { ...old, ['State']: old.State.includes(state) ? old.State : [...old.State, state] };
    });
  }, [RecordingState]);

  React.useEffect(() => {
    props.setFilteredRecordings(props.recordings); //TODO actually filter recordings
  }, [props.recordings, filters]);

  const categoryDropdown = React.useMemo(() => {
    return (
      <ToolbarItem>
        <Dropdown
          position={DropdownPosition.left}
          toggle={
            <DropdownToggle onToggle={onCategoryToggle} style={{ width: '100%' }}>
              <FilterIcon /> {currentCategory}
            </DropdownToggle>
          }
          isOpen={isCategoryDropdownOpen}
          dropdownItems={[Object.keys(filters).map((cat) => <DropdownItem key={cat} onClick={() => onCategorySelect(cat)}>{cat}</DropdownItem>)]}
          style={{ width: '100%' }}
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
        <DatePicker
          id="startTimeInput1"
          aria-label="start time filter"
          helperText="Start"
          onChange={(str, date) => console.log('onChange', str, date)}
        />
        <DatePicker
          id="endTimeInput1"
          aria-label="end time filter"
          helperText="End"
          onChange={(str, date) => console.log('onChange', str, date)}
        />
      </InputGroup>,
      <InputGroup>
        <Checkbox
          label="Continuous"
          id="continuous-checkbox"
          isChecked={continuous}
          onChange={(checked) => setContinuous(checked)}
        />
        <TextInput
          value={duration}
          isRequired
          type="number"
          id="durationInput1"
          aria-label="duration filter"
          onChange={(e) => setDuration(Number(e))}
          min="0"
          isDisabled={continuous}
        />
      </InputGroup>,
      <Select
        variant={SelectVariant.checkbox}
        aria-label={Object.keys(filters)[2]}
        onToggle={onFilterToggle}
        selections={filters[2]}
        isOpen={isFilterDropdownOpen}
        placeholderText="Filter by state"
      >
        {Object.values(RecordingState).map((rs) => (
          <DropdownItem key={rs} onClick={() => onRecordingStateSelect(rs)}>{rs}</DropdownItem>
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
        {filterDropdownItems.map((inputField, i) => (
          <ToolbarFilter
            chips={filters[i]}
            deleteChip={onDelete}
            categoryName={Object.keys(filters)[i]}
            showToolbarItem={currentCategory === Object.keys(filters)[i]}
          >
            {inputField}
          </ToolbarFilter>
        ))}
      </ToolbarGroup>
    </ToolbarToggleGroup>
  );
};
