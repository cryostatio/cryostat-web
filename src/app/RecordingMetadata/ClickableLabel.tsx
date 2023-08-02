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

import { Label } from '@patternfly/react-core';
import React from 'react';
import { RecordingLabel } from './RecordingLabel';

export interface ClickableLabelCellProps {
  label: RecordingLabel;
  isSelected: boolean;
  onLabelClick: (label: RecordingLabel) => void;
}

export const ClickableLabel: React.FC<ClickableLabelCellProps> = ({ onLabelClick, ...props }) => {
  const [isHoveredOrFocused, setIsHoveredOrFocused] = React.useState(false);
  const labelColor = React.useMemo(() => (props.isSelected ? 'blue' : 'grey'), [props.isSelected]);

  const handleHoveredOrFocused = React.useCallback(() => setIsHoveredOrFocused(true), [setIsHoveredOrFocused]);
  const handleNonHoveredOrFocused = React.useCallback(() => setIsHoveredOrFocused(false), [setIsHoveredOrFocused]);

  const style = React.useMemo(() => {
    if (isHoveredOrFocused) {
      const defaultStyle = { cursor: 'pointer', '--pf-c-label__content--before--BorderWidth': '2.5px' };
      if (props.isSelected) {
        return { ...defaultStyle, '--pf-c-label__content--before--BorderColor': '#06c' };
      }
      return { ...defaultStyle, '--pf-c-label__content--before--BorderColor': '#8a8d90' };
    }
    return {};
  }, [props.isSelected, isHoveredOrFocused]);

  const handleLabelClicked = React.useCallback(() => onLabelClick(props.label), [props.label, onLabelClick]);

  return (
    <>
      <Label
        aria-label={`${props.label.key}: ${props.label.value}`}
        style={style}
        onMouseEnter={handleHoveredOrFocused}
        onMouseLeave={handleNonHoveredOrFocused}
        onFocus={handleHoveredOrFocused}
        onClick={handleLabelClicked}
        key={props.label.key}
        color={labelColor}
      >
        {`${props.label.key}: ${props.label.value}`}
      </Label>
    </>
  );
};
