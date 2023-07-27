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

import { getLabelDisplay } from '@app/Recordings/Filters/LabelFilter';
import { UpdateFilterOptions } from '@app/Shared/Redux/Filters/Common';
import { Label, Text } from '@patternfly/react-core';
import React from 'react';
import { ClickableLabel } from './ClickableLabel';
import { RecordingLabel } from './RecordingLabel';

export interface LabelCellProps {
  target: string;
  labels: RecordingLabel[];
  clickableOptions?: {
    // If undefined, labels are not clickable (i.e. display only) and only displayed in grey.
    labelFilters: string[];
    updateFilters: (target: string, updateFilterOptions: UpdateFilterOptions) => void;
  };
}

export const LabelCell: React.FC<LabelCellProps> = (props) => {
  const isLabelSelected = React.useCallback(
    (label: RecordingLabel) => {
      if (props.clickableOptions) {
        const labelFilterSet = new Set(props.clickableOptions.labelFilters);
        return labelFilterSet.has(getLabelDisplay(label));
      }
      return false;
    },
    [props.clickableOptions]
  );

  const getLabelColor = React.useCallback(
    (label: RecordingLabel) => (isLabelSelected(label) ? 'blue' : 'grey'),
    [isLabelSelected]
  );
  const onLabelSelectToggle = React.useCallback(
    (clickedLabel: RecordingLabel) => {
      if (props.clickableOptions) {
        props.clickableOptions.updateFilters(props.target, {
          filterKey: 'Label',
          filterValue: getLabelDisplay(clickedLabel),
          deleted: isLabelSelected(clickedLabel),
        });
      }
    },
    [isLabelSelected, props.clickableOptions, props.target]
  );

  return (
    <>
      {!!props.labels && props.labels.length ? (
        props.labels.map((label) =>
          props.clickableOptions ? (
            <ClickableLabel
              key={label.key}
              label={label}
              isSelected={isLabelSelected(label)}
              onLabelClick={onLabelSelectToggle}
            />
          ) : (
            <Label aria-label={`${label.key}: ${label.value}`} key={label.key} color={getLabelColor(label)}>
              {`${label.key}: ${label.value}`}
            </Label>
          )
        )
      ) : (
        <Text>-</Text>
      )}
    </>
  );
};
