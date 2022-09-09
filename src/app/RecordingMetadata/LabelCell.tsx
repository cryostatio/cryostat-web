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

import { getLabelDisplay } from '@app/Recordings/Filters/LabelFilter';
import { UpdateFilterOptions } from '@app/Shared/Redux/RecordingFilterReducer';
import { Label, Text } from '@patternfly/react-core';
import React from 'react';
import { RecordingLabel } from './RecordingLabel';

export interface LabelCellProps {
  target: string,
  labels: RecordingLabel[];
  // Must be specified along with updateFilters.
  labelFilters?: string[];
  // If undefined, labels are not clickable (i.e. display only).
  updateFilters?: (target: string, updateFilterOptions: UpdateFilterOptions) => void
}

export const LabelCell: React.FunctionComponent<LabelCellProps> = (props) => {
  const labelStyle = React.useMemo(() => (props.updateFilters? {
    cursor: "pointer",
  }: {}), 
  [props.updateFilters]);

  const labelFilterSet = React.useMemo(() => new Set(props.labelFilters), [props.labelFilters]);

  const onLabelSelectToggle = React.useCallback(
    (selectedLabel) => {
      if (props.updateFilters) {
        props.updateFilters(props.target, {filterKey: "Labels", filterValue: selectedLabel, deleted: labelFilterSet.has(selectedLabel)})
      }
    }, 
    [props.updateFilters, props.labelFilters, props.target]);
  
  return (
    <>
      {!!props.labels && props.labels.length? (
        props.labels.map((label) =>
          <Label
            style={labelStyle}
            onClick={() => {onLabelSelectToggle(getLabelDisplay(label))}}
            key={label.key}
            color={labelFilterSet.has(getLabelDisplay(label))? "blue": "grey"}
          >
            {`${label.key}: ${label.value}`}
          </Label>
        )) : (
        <Text>-</Text>
      )}
    </>
  );
};
