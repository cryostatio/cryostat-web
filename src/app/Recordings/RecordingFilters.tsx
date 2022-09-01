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

import { ArchivedRecording } from '@app/Shared/Services/Api.service';
import {
  Checkbox,
  Dropdown,
  DropdownItem,
  DropdownPosition,
  DropdownToggle,
  Flex,
  FlexItem,
  InputGroup,
  TextInput,
  ToolbarFilter,
  ToolbarGroup,
  ToolbarItem,
  ToolbarToggleGroup,
} from '@patternfly/react-core';
import { FilterIcon } from '@patternfly/react-icons';
import React, { Dispatch, SetStateAction } from 'react';
import { RecordingFiltersCategories } from './ActiveRecordingsTable';
import { DateTimePicker } from './DateTimePicker';
import { LabelFilter } from './LabelFilter';
import { NameFilter } from './NameFilter';
import { RecordingStateFilter } from './RecordingStateFilter';

export interface RecordingFiltersProps {
  recordings: ArchivedRecording[];
  filters: RecordingFiltersCategories;
  setFilters: Dispatch<SetStateAction<RecordingFiltersCategories>>;
}

export const RecordingFilters: React.FunctionComponent<RecordingFiltersProps> = (props) => {
  const [currentCategory, setCurrentCategory] = React.useState('Name');
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = React.useState(false);
  const [continuous, setContinuous] = React.useState(false);
  const [duration, setDuration] = React.useState(30);

  const onCategoryToggle = React.useCallback(() => {
    setIsCategoryDropdownOpen((opened) => !opened);
  }, [setIsCategoryDropdownOpen]);

  const onCategorySelect = React.useCallback(
    (curr) => {
      setCurrentCategory(curr);
      setIsCategoryDropdownOpen(false);
    },[setCurrentCategory, setIsCategoryDropdownOpen]
  );

  const onDelete = React.useCallback(
    (type = '', id = '') => {
      if (type) {
        props.setFilters((old) => {
          return { ...old, [type]: old[type].filter((val) => val !== id) };
        });
      } else {
        props.setFilters(() => {
          return {
            Name: [],
            Labels: [],
            State: [],
            StartedBeforeDate: [],
            StartedAfterDate: [],
            DurationSeconds: [],
          };
        });
      }
    },
    [props.setFilters]
  );

  const onNameInput = React.useCallback(
    (inputName) => {
      props.setFilters((old) => {
        const names = new Set(old.Name);
        names.add(inputName);
        return { ...old, Name: Array.from(names) };
      });
    },
    [props.setFilters]
  );

  const onLabelInput = React.useCallback(
    (inputLabel) => {
      props.setFilters((old) => {
        const labels = new Set(old.Labels);
        labels.add(inputLabel);
        return { ...old, Labels: Array.from(labels) };     
      });
    },
    [props.setFilters]
  );

  const onStartedBeforeInput = React.useCallback((searchDate) => {
    props.setFilters((old) => {
      if (!old.StartedBeforeDate) return old;

      const dates = new Set(old.StartedBeforeDate);
      dates.add(searchDate);
      return { ...old, StartedBeforeDate: Array.from(dates) };    
    });
  }, [props.setFilters]);

  const onStartedAfterInput = React.useCallback((searchDate) => {
    props.setFilters((old) => {
      if (!old.StartedAfterDate) return old;

      const dates = new Set(old.StartedAfterDate);
      dates.add(searchDate);
      return { ...old, StartedAfterDate: Array.from(dates) };      
    });
  }, [props.setFilters]);

  const onDurationInput = React.useCallback(
    (e) => {
      if (e.key && e.key !== 'Enter') {
        return;
      }

      props.setFilters((old) => {        
        if (!old.DurationSeconds) return old;
        const dur = `${duration.toString()} s`;

        const durations = new Set(old.DurationSeconds);
        durations.add(dur);
        return { ...old, DurationSeconds: Array.from(durations) };
      });
    },
    [duration, props.setFilters]
  );

  const onRecordingStateSelect = React.useCallback(
    (searchState) => {
      props.setFilters((old) => {
        if (!old.State) return old;

        const states = new Set(old.State);
        states.add(searchState);
        return { ...old, State: Array.from(states) };    
      });
    },
    [props.setFilters]
  );

  const onContinuousDurationSelect = React.useCallback(
    (cont) => {
      setContinuous(cont);
      props.setFilters((old) => {
        if (!old.DurationSeconds) return old;
        return {
          ...old,
          DurationSeconds: cont
            ? [...old.DurationSeconds, 'continuous']
            : old.DurationSeconds.filter((v) => v != 'continuous'),
        };
      });
    },
    [setContinuous, props.setFilters]
  );

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
          dropdownItems={
            Object.keys(props.filters).map((cat) => (
              <DropdownItem key={cat} onClick={() => onCategorySelect(cat)}>
                {cat}
              </DropdownItem>
            ))
          }
        ></Dropdown>
      </ToolbarItem>
    );
  }, [Object.keys(props.filters), isCategoryDropdownOpen, onCategoryToggle, onCategorySelect]);

  const filterDropdownItems = React.useMemo(
    () => [
      <InputGroup>
        <NameFilter recordings={props.recordings} onSubmit={onNameInput} />
      </InputGroup>,
      <InputGroup>
        <LabelFilter recordings={props.recordings} onSubmit={onLabelInput} />
      </InputGroup>,
      <InputGroup>
        <RecordingStateFilter states={props.filters.State} onSubmit={onRecordingStateSelect} />
      </InputGroup>,
      <InputGroup>
        <DateTimePicker onSubmit={onStartedBeforeInput} />
      </InputGroup>,
      <InputGroup>
      <DateTimePicker onSubmit={onStartedAfterInput} />
    </InputGroup>,
      <InputGroup>
        <Flex>
          <FlexItem>
            <TextInput
              type="number"
              value={duration}
              id="durationInput1"
              aria-label="duration filter"
              onChange={(e) => setDuration(Number(e))}
              min="0"
              onKeyDown={onDurationInput}
            />
          </FlexItem>
          <FlexItem>
            <Checkbox
              label="Continuous"
              id="continuous-checkbox"
              isChecked={continuous}
              onChange={(checked) => onContinuousDurationSelect(checked)}
            />
          </FlexItem>
        </Flex>
      </InputGroup>,
    ],
    [Object.keys(props.filters)]
  );

  return (
    <ToolbarToggleGroup toggleIcon={<FilterIcon />} breakpoint="xl">
      <ToolbarGroup variant="filter-group">
        {categoryDropdown}
        {Object.keys(props.filters).map((filterKey, i) => (
          <ToolbarFilter
            key={filterKey}
            chips={props.filters[filterKey]}
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

export const filterRecordings = (recordings, filters) => {
  if (!recordings || !recordings.length) {
    return recordings;
  }

  let filtered = recordings;

  if (!!filters.Name.length) {
    filtered = filtered.filter((r) => filters.Name.includes(r.name));
  }
  if (!!filters.State && !!filters.State.length) {
    filtered = filtered.filter((r) => !!filters.State && filters.State.includes(r.state));
  }
  if (!!filters.DurationSeconds && !!filters.DurationSeconds.length) {
    filtered = filtered.filter(
      (r) => {
      if (!filters.DurationSeconds) return true;
        return filters.DurationSeconds.includes(`${r.duration / 1000} s`) ||
        (filters.DurationSeconds.includes('continuous') && r.continuous);
      });
  }
  if (!!filters.StartedBeforeDate && !!filters.StartedBeforeDate.length) {
    filtered = filtered.filter((rec) => {
      if (!filters.StartedBeforeDate) return true;

      return filters.StartedBeforeDate.filter((startedBefore) => {
        const beforeDate = new Date(startedBefore);
        return rec.startTime < beforeDate.getTime();
      }).length;
    });
  }
  if (!!filters.StartedAfterDate && !!filters.StartedAfterDate.length) {
    filtered = filtered.filter((rec) => {
      if (!filters.StartedAfterDate) return true;
      return filters.StartedAfterDate.filter((startedAfter) => {
        const afterDate = new Date(startedAfter);

        return rec.startTime > afterDate.getTime();
      }).length;
    });
  }
  if (!!filters.Labels.length) {
    filtered = filtered.filter((r) =>
      Object.entries(r.metadata.labels)
        .filter(([k,v]) => filters.Labels.includes(`${k}:${v}`)).length
      );
  }

  return filtered;
}
