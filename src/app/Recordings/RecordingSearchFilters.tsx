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
  Bullseye,
  Button,
  ButtonVariant,
  CalendarMonth,
  Checkbox,
  DatePicker,
  Dropdown,
  DropdownItem,
  DropdownPosition,
  DropdownToggle,
  Flex,
  FlexItem,
  InputGroup,
  Level,
  Popover,
  Select,
  SelectOption,
  SelectVariant,
  Text,
  TextInput,
  TimePicker,
  ToolbarFilter,
  ToolbarGroup,
  ToolbarItem,
  ToolbarToggleGroup,
  yyyyMMddFormat,
} from '@patternfly/react-core';
import { FilterIcon, OutlinedCalendarAltIcon, OutlinedClockIcon, SearchIcon } from '@patternfly/react-icons';
import React from 'react';

export interface RecordingSearchFiltersProps {
  recordings: ActiveRecording[];
  setFilteredRecordings: (recordings: ActiveRecording[]) => void;
  clearFiltersToggle: boolean;
}

export const RecordingSearchFilters: React.FunctionComponent<RecordingSearchFiltersProps> = (props) => {
  const [currentCategory, setCurrentCategory] = React.useState('Name');
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = React.useState(false);
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = React.useState(false);
  const [filters, setFilters] = React.useState({
    Name: [] as string[],
    TimeRange: [],
    Duration: [] as string[],
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

  const onDelete = React.useCallback((type = '', id = '') => {
    if (type) {
      setFilters(old => {
        return { ...old, [type]: old[type].filter(val => val !== id) };
      });
    } else {
      setFilters(() => {
        return {
          Name: [],
          TimeRange: [],
          Duration: [],
          State: [],
          Labels: [],
        }
      });
    }
  }, []);

  const onNameInput = React.useCallback(
    (e) => {
      if (e.key && e.key !== 'Enter') {
        return;
      }

      setFilters((old) => {
        return { ...old, Name: old.Name.includes(searchName) ? old.Name : [...old.Name, searchName] };
      });
    },
    [searchName]
  );

  const onDurationInput = React.useCallback(
    (e) => {
      if (e.key && e.key !== 'Enter') {
        return;
      }

      setFilters((old) => {
        return { ...old, Duration: [duration.toString()] };
      });
    },
    [duration]
  );

  const onRecordingStateSelect = React.useCallback(
    (state: RecordingState) => {
      setFilters((old) => {
        return { ...old, ['State']: old.State.includes(state) ? old.State : [...old.State, state] };
      });
    },
    [RecordingState]
  );

  React.useEffect(() => {
    onDelete(null);
  }, [props.clearFiltersToggle]);

  React.useEffect(() => {
    props.setFilteredRecordings(props.recordings); //TODO actually filter recordings
  }, [props.recordings, filters]);

  React.useEffect(() => {
    setFilters((old) => {
      return { ...old, Duration: continuous ? ['continuous'] : [] };
    });
  }, [continuous])

  const onStartDateChange = React.useCallback(() => {}, []);
  const onStartTimeChange = React.useCallback(() => {}, []);
  const onStopDateChange = React.useCallback(() => {}, []);
  const onStopTimeChange = React.useCallback(() => {}, []);

  const isValidDate = React.useCallback((date) => {
    return true;
  }, []);

  const stopTimeValidator = React.useCallback((date: Date) => {
    return ''; //or return 'descriptive error message string'
  }, []);

  const [isCalendarOpen, setIsCalendarOpen] = React.useState(false);
  const [isTimeOpen, setIsTimeOpen] = React.useState(false);

  const [startDate, setStartDate] = React.useState('MM-DD-YYYY');
  // const [stopDate, setStopDate] = React.useState('MM-DD-YYYY');

  const [startTime, setStartTime] = React.useState('HH:MM');
  // const [stopTime, setStopTime] = React.useState('HH:MM');

  // fix time options hacky
  const hours = Array.from(new Array(24), (_, i) => i === 0 ? "00" : i);
  const minutes = Array.from(new Array(4), (_, i) => i === 0 ? "00" : i*15);
  const defaultTime = '0:00';
  const dateFormat = (date: Date) =>
    date.toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '-');

  const onToggleCalendar = () => {
    setIsCalendarOpen(!isCalendarOpen);
    setIsTimeOpen(false);
  };

  const onToggleTime = (isOpen) => {
    setIsTimeOpen(isOpen);
    setIsCalendarOpen(false);
  };

  const onSelectCalendar = (newValueDate: Date) => {
    const newValue = dateFormat(newValueDate);
    setStartDate(newValue);
    setIsCalendarOpen(!isCalendarOpen);
    // setting default time when it is not picked
    if (startTime === 'HH:MM') {
      setStartTime(defaultTime);
    }
  };

  const onSelectTime = (e) => {
    setStartTime(e.currentTarget.textContent);
    setIsTimeOpen(!isTimeOpen);
  };

  const timeOptions = hours.map((hrs) =>
    minutes.map((mins) => (
      <DropdownItem key={`${hrs}${mins}`} component="button" value={`${hrs}:${mins}`}>
        {`${hrs}:${mins}`}
      </DropdownItem>
    ))
  );

  const calendar = <CalendarMonth date={new Date(startDate)} onChange={onSelectCalendar} />;

  const timeSelector = (
    <Dropdown
      onSelect={onSelectTime}
      toggle={
        <DropdownToggle
          aria-label="Toggle the time picker menu"
          toggleIndicator={null}
          onToggle={onToggleTime}
          style={{ padding: '6px 16px' }}
        >
          <OutlinedClockIcon />
        </DropdownToggle>
      }
      isOpen={isTimeOpen}
      dropdownItems={timeOptions}
    />
  );

  const calendarButton = React.useMemo(() => {
    return (
      <Button variant="control" aria-label="Toggle the calendar" onClick={onToggleCalendar}>
        <OutlinedCalendarAltIcon />
      </Button>
    );
  }, []);

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
      <Popover
        position="bottom"
        bodyContent={calendar}
        showClose={false}
        isVisible={isCalendarOpen}
        hasNoPadding
        hasAutoWidth
      >
        <InputGroup>
          <TextInput
            type="text"
            id="startTimeAfter"
            label="Started After"
            aria-label="Started after time picker"
            value={startDate + ' ' + startTime}
            isReadOnly
          />
          {calendarButton}
          {timeSelector}
        </InputGroup>
      </Popover>,
      <InputGroup>
        <Flex>
          <FlexItem>
            <TextInput
              value={duration}
              isRequired
              type="number"
              id="durationInput1"
              aria-label="duration filter"
              onChange={(e) => setDuration(Number(e))}
              min="0"
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
        aria-label={Object.keys(filters)[2]}
        onToggle={onFilterToggle}
        selections={filters[2]}
        isOpen={isFilterDropdownOpen}
        placeholderText="Filter by state"
      >
        {Object.values(RecordingState).map((rs) => (
          <SelectOption key={rs} onClick={() => onRecordingStateSelect(rs)}>
            {String(rs)}
          </SelectOption>
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
