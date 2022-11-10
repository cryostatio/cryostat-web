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
import { ORANGE_SCORE_THRESHOLD, RED_SCORE_THRESHOLD, RuleEvaluation } from '@app/Shared/Services/Report.service';
import { Label, LabelProps, Popover } from '@patternfly/react-core';
import { InfoCircleIcon } from '@patternfly/react-icons';
import { css } from '@patternfly/react-styles';
import styles from '@patternfly/react-styles/css/components/Label/label';
import React from 'react';

export interface ClickableAutomatedAnalysisLabelProps {
  label: RuleEvaluation;
  isSelected: boolean;
}

export const ClickableAutomatedAnalysisLabel: React.FunctionComponent<ClickableAutomatedAnalysisLabelProps> = ({
  label,
  isSelected,
}) => {
  const [isHoveredOrFocused, setIsHoveredOrFocused] = React.useState(false);
  const [isDescriptionVisible, setIsDescriptionVisible] = React.useState(false);

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

  const colorScheme = React.useCallback((): LabelProps['color'] => {
    // TODO: use label color schemes based on settings for accessibility
    // context.settings.etc.
    return label.score == -1
      ? 'grey'
      : label.score < ORANGE_SCORE_THRESHOLD
      ? 'green'
      : label.score < RED_SCORE_THRESHOLD
      ? 'orange'
      : 'red';
  }, [label.score]);

  return (
    <Popover
      aria-label="automated-analysis-description-popover"
      isVisible={isDescriptionVisible}
      shouldOpen={() => setIsDescriptionVisible(true)}
      shouldClose={() => setIsDescriptionVisible(false)}
      bodyContent={
        <div
          style={{
            textAlign: 'center',
            marginLeft: '17%',
          }}
        >
          <p style={{ fontWeight: 'bold', fontStyle: 'italic' }}>{label.name}</p>
          <p style={{ fontWeight: 'bold' }}>{label.score == -1 ? 'N/A' : label.score.toFixed(1)}</p>
          <br />
          <p style={{}}>{label.description}</p>
        </div>
      }
      key={`popover-${label.name}`}
    >
      <Label
        aria-label={`${label.name}`}
        icon={<InfoCircleIcon />}
        color={colorScheme()}
        style={style}
        onMouseEnter={handleHoveredOrFocused}
        onMouseLeave={handleNonHoveredOrFocused}
        onFocus={handleHoveredOrFocused}
        key={label.name}
        isCompact
      >
        <span className={css(styles.labelText)}>{`${label.name}`}</span>
        {
          // this is a hack to get rid of the tooltip (taken from patternfly Label.tsx)
        }
      </Label>
    </Popover>
  );
};
