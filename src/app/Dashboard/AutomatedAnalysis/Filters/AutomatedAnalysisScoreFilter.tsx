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

import React, { CSSProperties } from 'react';
import { Button, Checkbox, Dropdown, DropdownItem, DropdownToggle, Gallery, GalleryItem, Level, LevelItem, Select, SelectOption, SelectVariant, Slider, Stack, StackItem, Text, TextContent, TextVariants } from '@patternfly/react-core';
import { AutomatedAnalysisScoreState } from '@app/Shared/Services/Api.service';
import { ORANGE_SCORE_THRESHOLD, RED_SCORE_THRESHOLD } from '@app/Shared/Services/Report.service';
import { MinusIcon } from '@patternfly/react-icons';

export interface AutomatedAnalysisScoreFilterProps {
  onChange: (value: number) => void;
}

export const AutomatedAnalysisScoreFilter: React.FunctionComponent<AutomatedAnalysisScoreFilterProps> = (props) => {
  const [value, setValue] = React.useState<number>(100);
  const [inputValue, setInputValue] = React.useState<number>(100);

  const steps = [
    { value: 0, label: '0' },
    { value: ORANGE_SCORE_THRESHOLD, label: String(ORANGE_SCORE_THRESHOLD) },
    { value: RED_SCORE_THRESHOLD, label: String(RED_SCORE_THRESHOLD) },
    { value: 100, label: '100' },
];

  const on100Reset = React.useCallback(() => {
    setValue(100);
    setInputValue(100);
    props.onChange(100);
  }, [setValue, setInputValue, props.onChange]);

  const on0Reset = React.useCallback(() => {
    setValue(0);
    setInputValue(0);
    props.onChange(0);
  }, [setValue, setInputValue, props.onChange]);

  const onChange = React.useCallback((value, inputValue) => {
    value = Math.floor(value);
    let newValue;
      if (inputValue === undefined) { 
        newValue = value;
      } else {
        if (inputValue > 100) {
          newValue = 100;
        } else if (inputValue < 0) {
          newValue = 0;
        } else {
          newValue = Math.floor(inputValue);
        }
      }
    setValue(newValue);
    setInputValue(newValue);
    props.onChange(newValue);
  }, [setValue, setInputValue, props.onChange]);

  const className = React.useMemo(() => {
    if (value >= 75) {
      return "automated-analysis-score-filter-slider automated-analysis-score-filter-slider-critical";
    }
    else if (value >= 50) {
      return "automated-analysis-score-filter-slider automated-analysis-score-filter-slider-warning";
    }
    else {
      return "automated-analysis-score-filter-slider automated-analysis-score-filter-slider-ok";
    }
  }, [value]);

  return (
    <>
      <Text component={TextVariants.small}>Only showing analysis with scores ≥ {value}</Text>
      <Slider 
        leftActions={(
          <Level hasGutter>
            <LevelItem>
              <Text component={TextVariants.small}>Reset:</Text>
            </LevelItem>
            <LevelItem>
              <Button isSmall isInline variant="link" aria-label="Reset score to 0" onClick={on0Reset}>0</Button>
            </LevelItem>
            <LevelItem>
              <Button isSmall isInline variant="link" aria-label="Reset score to 100" onClick={on100Reset}>100</Button>
            </LevelItem>
          </Level>
        )}
        className={className}
        areCustomStepsContinuous
        customSteps={steps} 
        isInputVisible
        inputLabel="Score"
        inputValue={inputValue}
        value={value}  
        onChange={onChange} 
        min={0} 
        max={100} 
      />
    </>

  );
};
