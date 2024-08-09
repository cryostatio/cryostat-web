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

import { EmptyText } from '@app/Shared/Components/EmptyText';
import { UpdateFilterOptions } from '@app/Shared/Redux/Filters/Common';
import { KeyValue, keyValueToString } from '@app/Shared/Services/api.types';
import { Label, LabelGroup } from '@patternfly/react-core';
import * as React from 'react';
import { ClickableLabel } from './ClickableLabel';

export interface LabelCellProps {
  target: string;
  labels: KeyValue[];
  // If undefined, labels are not clickable (i.e. display only) and only displayed in grey.
  clickableOptions?: {
    labelFilters: string[];
    updateFilters: (target: string, updateFilterOptions: UpdateFilterOptions) => void;
  };
}

export const LabelCell: React.FC<LabelCellProps> = ({ target, labels, clickableOptions }) => {
  const isLabelSelected = React.useCallback(
    (label: KeyValue) => {
      if (clickableOptions) {
        const labelFilterSet = new Set(clickableOptions.labelFilters);
        return labelFilterSet.has(keyValueToString(label));
      }
      return false;
    },
    [clickableOptions],
  );

  const getLabelColor = React.useCallback(
    (label: KeyValue) => (isLabelSelected(label) ? 'blue' : 'grey'),
    [isLabelSelected],
  );

  const onLabelSelectToggle = React.useCallback(
    (clickedLabel: KeyValue) => {
      if (clickableOptions) {
        clickableOptions.updateFilters(target, {
          filterKey: 'Label',
          filterValue: keyValueToString(clickedLabel),
          deleted: isLabelSelected(clickedLabel),
        });
      }
    },
    [isLabelSelected, clickableOptions, target],
  );

  return (
    <>
      {labels.length ? (
        <LabelGroup>
          {labels.map((label) =>
            clickableOptions ? (
              <ClickableLabel
                key={label.key}
                label={label}
                isSelected={isLabelSelected(label)}
                onLabelClick={onLabelSelectToggle}
              />
            ) : (
              <Label aria-label={keyValueToString(label)} key={label.key} color={getLabelColor(label)}>
                {keyValueToString(label)}
              </Label>
            ),
          )}
        </LabelGroup>
      ) : (
        <EmptyText text="No labels" />
      )}
    </>
  );
};
