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

import { parseLabels, RecordingLabel } from '@app/RecordingMetadata/RecordingLabel';
import { Recording } from '@app/Shared/Services/Api.service';
import { Label, Select, SelectOption, SelectVariant } from '@patternfly/react-core';
import React from 'react';

export interface LabelFilterProps {
  recordings: Recording[];
  filteredLabels: string[];
  onSubmit: (inputLabel: string) => void;
}

export const getLabelDisplay = (label: RecordingLabel) => `${label.key}:${label.value}`;

export const LabelFilter: React.FC<LabelFilterProps> = ({ recordings, filteredLabels, onSubmit }) => {
  const [isExpanded, setIsExpanded] = React.useState(false);

  const onSelect = React.useCallback(
    (_, selection, isPlaceholder) => {
      if (!isPlaceholder) {
        setIsExpanded(false);
        onSubmit(selection);
      }
    },
    [onSubmit, setIsExpanded],
  );

  const labels = React.useMemo(() => {
    const labels = new Set<string>();
    recordings.forEach((r) => {
      if (!r || !r.metadata || !r.metadata.labels) return;
      parseLabels(r.metadata.labels).map((label) => labels.add(getLabelDisplay(label)));
    });
    return Array.from(labels)
      .filter((l) => !filteredLabels.includes(l))
      .sort();
  }, [recordings, filteredLabels]);

  return (
    <Select
      variant={SelectVariant.typeahead}
      onToggle={setIsExpanded}
      onSelect={onSelect}
      isOpen={isExpanded}
      aria-label="Filter by label"
      typeAheadAriaLabel="Filter by label..."
      placeholderText="Filter by label..."
      maxHeight="16em"
    >
      {labels.map((option, index) => (
        <SelectOption key={index} value={option}>
          <Label key={option} color="grey">
            {option}
          </Label>
        </SelectOption>
      ))}
    </Select>
  );
};
