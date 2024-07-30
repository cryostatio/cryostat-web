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

import { KeyValue, keyValueToString } from '@app/Shared/Services/api.types';
import { Label } from '@patternfly/react-core';
import * as React from 'react';

export interface ClickableLabelCellProps {
  label: KeyValue;
  isSelected: boolean;
  onLabelClick: (label: KeyValue) => void;
}

export const ClickableLabel: React.FC<ClickableLabelCellProps> = ({ label, isSelected, onLabelClick }) => {
  const [isHoveredOrFocused, setIsHoveredOrFocused] = React.useState(false);
  const labelColor = React.useMemo(() => (isSelected ? 'blue' : 'grey'), [isSelected]);

  const handleHoveredOrFocused = React.useCallback(() => setIsHoveredOrFocused(true), [setIsHoveredOrFocused]);
  const handleNonHoveredOrFocused = React.useCallback(() => setIsHoveredOrFocused(false), [setIsHoveredOrFocused]);

  const style = React.useMemo(() => {
    if (isHoveredOrFocused) {
      const defaultStyle = { cursor: 'pointer', '--pf-c-label__content--before--BorderWidth': '2.5px' };
      if (isSelected) {
        return { ...defaultStyle, '--pf-c-label__content--before--BorderColor': '#06c' };
      }
      return { ...defaultStyle, '--pf-c-label__content--before--BorderColor': '#8a8d90' };
    }
    return {};
  }, [isSelected, isHoveredOrFocused]);

  const handleLabelClicked = React.useCallback(() => onLabelClick(label), [label, onLabelClick]);

  return (
    <>
      <Label
        aria-label={`${label.key}: ${label.value}`}
        style={style}
        isTruncated
        onMouseEnter={handleHoveredOrFocused}
        onMouseLeave={handleNonHoveredOrFocused}
        onFocus={handleHoveredOrFocused}
        onClick={handleLabelClicked}
        key={label.key}
        color={labelColor}
      >
        {keyValueToString(label)}
      </Label>
    </>
  );
};
