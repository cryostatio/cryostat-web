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
import { HeapDump } from '@app/Shared/Services/api.types';
import { portalRoot } from '@app/utils/utils';
import { Dropdown, DropdownItem, DropdownList, MenuToggle, MenuToggleElement } from '@patternfly/react-core';
import * as React from 'react';

export interface HeapDumpSelectorProps {
  selected: string;
  heapDumps: HeapDump[];
  onSelect: (heapDump?: string) => void;
}

export const HeapDumpSelector: React.FC<HeapDumpSelectorProps> = ({ selected, heapDumps, onSelect }) => {
  const [isOpen, setIsOpen] = React.useState(false);

  const handleHeapDumpSelect = React.useCallback(
    (_, selected: string) => {
      if (!selected.length) {
        onSelect(undefined);
        setIsOpen(false);
      } else {
        onSelect(selected);
        setIsOpen(false);
      }
    },
    [onSelect],
  );

  const onToggle = React.useCallback(() => setIsOpen((isOpen) => !isOpen), [setIsOpen]);

  const toggle = React.useCallback(
    (toggleRef: React.Ref<MenuToggleElement>) => (
      <MenuToggle
        placeholder={'Select a Heap Dump'}
        ref={toggleRef}
        aria-label="heap dump selector toggle"
        onClick={onToggle}
        isExpanded={isOpen}
      >
        {selected == '' ? 'Select a Heap Dump' : selected}
      </MenuToggle>
    ),
    [onToggle, isOpen, selected],
  );

  return (
    <Dropdown
      popperProps={{
        enableFlip: true,
        appendTo: portalRoot,
        position: 'left',
      }}
      isOpen={isOpen}
      onSelect={handleHeapDumpSelect}
      toggle={toggle}
      onOpenChange={setIsOpen}
      onOpenChangeKeys={['Escape']}
    >
      <DropdownList>
        {heapDumps.map((t: HeapDump) => (
          <DropdownItem name={t.heapDumpId} key={t.heapDumpId} label={t.heapDumpId} value={t.heapDumpId}>
            {t.heapDumpId}
          </DropdownItem>
        ))}
      </DropdownList>
    </Dropdown>
  );
};
