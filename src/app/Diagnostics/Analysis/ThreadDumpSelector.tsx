
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
import { ThreadDump } from '@app/Shared/Services/api.types';
import { FormSelect, FormSelectOption, FormSelectOptionGroup, ValidatedOptions } from '@patternfly/react-core';
import * as React from 'react';

export interface ThreadDumpSelectionGroup {
  groupLabel: string;
  disabled?: boolean;
  options: {
    value: string;
    label: string;
    disabled?: boolean;
  }[];
}

export interface ThreadDumpSelectorProps {
  selected: string;
  threadDumps: ThreadDump[];
  disabled?: boolean;
  validated?: ValidatedOptions;
  onSelect: (threadDump?: string) => void;
}

export const ThreadDumpSelector: React.FC<ThreadDumpSelectorProps> = ({
  selected,
  threadDumps,
  disabled,
  validated,
  onSelect,
}) => {
  const groups = React.useMemo(
    () =>
      [
        {
          groupLabel: 'Thread Dumps',
          options: threadDumps
            .map((t) => ({
              value: `${t.threadDumpId}`,
              label: t.threadDumpId,
            })),
        },
      ] as ThreadDumpSelectionGroup[],
    [threadDumps],
  );

  const handleThreadDumpSelect = React.useCallback(
    (_, selected: string) => {
      if (!selected.length) {
        onSelect(undefined);
      } else {
        onSelect(selected);
      }
    },
    [onSelect],
  );

  return (
    <>
      <FormSelect
        isDisabled={disabled}
        value={selected}
        validated={validated || ValidatedOptions.default}
        onChange={handleThreadDumpSelect}
        aria-label="Thread Dump Input"
        id="thread-dump"
        data-quickstart-id="thread-dump-selector"
      >
        <FormSelectOption key="placeholder" label="Select a Thread Dump" isPlaceholder isDisabled />

        {groups.map((group, index) => (
          <FormSelectOptionGroup isDisabled={group.disabled} key={index} label={group.groupLabel}>
            {group.options.length > 0 ? (
              group.options.map((option) => (
                <FormSelectOption
                  key={option.label}
                  label={option.label}
                  value={option.value}
                  isDisabled={option.disabled}
                />
              ))
            ) : (
              <FormSelectOption key="no-thread-dump" label="No thread dumps" isDisabled />
            )}
          </FormSelectOptionGroup>
        ))}
      </FormSelect>
    </>
  );
};