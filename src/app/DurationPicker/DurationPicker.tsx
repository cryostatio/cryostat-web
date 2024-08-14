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
import { FormSelect, FormSelectOption, Split, SplitItem, TextInput } from '@patternfly/react-core';
import * as React from 'react';

export interface DurationPickerProps {
  onPeriodChange: (period: number) => void;
  onUnitScalarChange: (unitScalar: number) => void;
  period: number;
  unitScalar: number;
  enabled: boolean;
}

export const DurationPicker: React.FC<DurationPickerProps> = ({
  onPeriodChange,
  onUnitScalarChange,
  period,
  unitScalar,
  enabled,
}) => {
  return (
    <>
      <Split hasGutter={true}>
        <SplitItem isFilled>
          <TextInput
            value={period}
            isRequired
            type="number"
            id="duration-picker-period"
            aria-label="Duration Picker Period Input"
            onChange={(_event, v) => onPeriodChange(Number(v))}
            isDisabled={!enabled}
            min="0"
          />
        </SplitItem>
        <SplitItem>
          <FormSelect
            className="duration-picker__form_select"
            value={unitScalar}
            onChange={(_event, v) => onUnitScalarChange(Number(v))}
            aria-label="Duration Picker Units Input"
            isDisabled={!enabled}
          >
            <FormSelectOption key="1" value={1 * 1000} label="Seconds" />
            <FormSelectOption key="2" value={60 * 1000} label="Minutes" />
            <FormSelectOption key="3" value={60 * 60 * 1000} label="Hours" />
          </FormSelect>
        </SplitItem>
      </Split>
    </>
  );
};
