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
import { portalRoot } from '@app/utils/utils';
import {
  Dropdown,
  DropdownItem,
  DropdownList,
  MenuToggle,
  MenuToggleElement,
  ValidatedOptions,
} from '@patternfly/react-core';
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

export const ThreadDumpSelector: React.FC<ThreadDumpSelectorProps> = ({ selected, threadDumps, onSelect }) => {
  const [selectedThreadDump, setSelectedThreadDump] = React.useState<string>(selected);
  const [isOpen, setIsOpen] = React.useState(false);

  const handleThreadDumpSelect = React.useCallback(
    (_, selected: string) => {
      if (!selected.length) {
        onSelect(undefined);
        setSelectedThreadDump('');
        setIsOpen(false);
      } else {
        onSelect(selected);
        setSelectedThreadDump(selected);
        setIsOpen(false);
      }
    },
    [onSelect, setSelectedThreadDump],
  );

  const onToggle = React.useCallback(() => setIsOpen((isOpen) => !isOpen), [setIsOpen]);

  const toggle = React.useCallback(
    (toggleRef: React.Ref<MenuToggleElement>) => (
      <MenuToggle
        placeholder={'Select a Thread Dump'}
        ref={toggleRef}
        aria-label="thread dump selector toggle"
        onClick={onToggle}
        isExpanded={isOpen}
      >
        {selectedThreadDump == '' ? 'Select a Thread Dump' : selectedThreadDump}
      </MenuToggle>
    ),
    [onToggle, isOpen, selectedThreadDump],
  );

  return (
    <Dropdown
      popperProps={{
        enableFlip: true,
        appendTo: portalRoot,
        position: 'left',
      }}
      isOpen={isOpen}
      onSelect={handleThreadDumpSelect}
      toggle={toggle}
      onOpenChange={setIsOpen}
      onOpenChangeKeys={['Escape']}
    >
      <DropdownList>
        {threadDumps.map((t: ThreadDump) => (
          <DropdownItem name={t.threadDumpId} key={t.threadDumpId} label={t.threadDumpId} value={t.threadDumpId}>
            {t.threadDumpId}
          </DropdownItem>
        ))}
      </DropdownList>
    </Dropdown>
  );
};
