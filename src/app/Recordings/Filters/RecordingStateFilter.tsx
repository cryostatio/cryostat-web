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

import { RecordingState } from '@app/Shared/Services/api.types';
import { Badge, MenuToggle, MenuToggleElement, Select, SelectOption } from '@patternfly/react-core';
import * as React from 'react';
import { useTranslation } from 'react-i18next';

export interface RecordingStateFilterProps {
  filteredStates: RecordingState[] | undefined;
  onSelectToggle: (state: RecordingState) => void;
}

export const RecordingStateFilter: React.FC<RecordingStateFilterProps> = ({ filteredStates, onSelectToggle }) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = React.useState(false);

  const onSelect = React.useCallback(
    (_, selection: RecordingState) => {
      setIsOpen(false);
      onSelectToggle(selection);
    },
    [setIsOpen, onSelectToggle],
  );

  const toggle = React.useCallback(
    (toggleRef: React.Ref<MenuToggleElement>) => (
      <MenuToggle
        aria-label={t('RecordingStateFilter.ARIA_LABELS.MENU_TOGGLE')}
        ref={toggleRef}
        badge={filteredStates?.length ? <Badge isRead>{filteredStates.length}</Badge> : null}
        onClick={() => setIsOpen((isOpen) => !isOpen)}
        isExpanded={isOpen}
      >
        {t('RecordingStateFilter.FILTER_BY_STATE')}
      </MenuToggle>
    ),
    [filteredStates, setIsOpen, isOpen],
  );

  return (
    <Select
      toggle={toggle}
      onSelect={onSelect}
      selected={filteredStates}
      isOpen={isOpen}
      aria-label={t('RecordingStateFilter.ARIA_LABELS.SELECT')}
      onOpenChange={(isOpen) => setIsOpen(isOpen)}
      onOpenChangeKeys={['Escape']}
    >
      {Object.values(RecordingState).map((rs) => (
        <SelectOption
          aria-label={`${rs} State`}
          key={rs}
          value={rs}
          hasCheckbox
          isSelected={filteredStates?.some((s) => s === rs)}
        >
          {rs}
        </SelectOption>
      ))}
    </Select>
  );
};
