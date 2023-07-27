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

import { Recording } from '@app/Shared/Services/Api.service';
import { Select, SelectOption, SelectVariant } from '@patternfly/react-core';
import React from 'react';

export interface NameFilterProps {
  recordings: Recording[];
  filteredNames: string[];
  onSubmit: (inputName: string) => void;
}

export const NameFilter: React.FC<NameFilterProps> = ({ recordings, filteredNames, onSubmit }) => {
  const [isExpanded, setIsExpanded] = React.useState(false);

  const onSelect = React.useCallback(
    (_, selection, isPlaceholder) => {
      if (!isPlaceholder) {
        setIsExpanded(false);
        onSubmit(selection);
      }
    },
    [onSubmit, setIsExpanded]
  );

  const nameOptions = React.useMemo(() => {
    return recordings
      .map((r) => r.name)
      .filter((n) => !filteredNames.includes(n))
      .map((option, index) => <SelectOption key={index} value={option} />);
  }, [recordings, filteredNames]);

  return (
    <Select
      variant={SelectVariant.typeahead}
      onToggle={setIsExpanded}
      onSelect={onSelect}
      isOpen={isExpanded}
      typeAheadAriaLabel="Filter by name..."
      placeholderText="Filter by name..."
      aria-label="Filter by name"
      maxHeight="16em"
    >
      {nameOptions}
    </Select>
  );
};
