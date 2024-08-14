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

import { Checkbox, Flex, FlexItem, TextInput } from '@patternfly/react-core';
import * as React from 'react';

export interface DurationFilterProps {
  durations: string[] | undefined;
  onDurationInput: (e: number) => void;
  onContinuousDurationSelect: (checked: boolean) => void;
}

export const DurationFilter: React.FC<DurationFilterProps> = ({
  durations,
  onDurationInput,
  onContinuousDurationSelect,
}) => {
  const [duration, setDuration] = React.useState(30);
  const isContinuous = React.useMemo(() => durations && durations.includes('continuous'), [durations]);

  const handleContinuousCheckBoxChange = React.useCallback(
    (_, checked: boolean) => {
      onContinuousDurationSelect(checked);
    },
    [onContinuousDurationSelect],
  );

  const handleEnterKey = React.useCallback(
    (e) => {
      if (e.key && e.key !== 'Enter') {
        return;
      }
      onDurationInput(duration);
    },
    [onDurationInput, duration],
  );

  return (
    <Flex>
      <FlexItem flex={{ default: 'flex_1' }}>
        <TextInput
          type="number"
          value={duration}
          id="duration-input"
          aria-label="duration filter"
          onChange={(e, value) => setDuration(Number(value))}
          min="0"
          onKeyDown={handleEnterKey}
        />
      </FlexItem>
      <FlexItem alignSelf={{ default: 'alignSelfCenter' }}>
        <Checkbox
          className="duration-filter__continuous-checkbox"
          label="Continuous"
          id="continuous-checkbox"
          isChecked={isContinuous}
          onChange={handleContinuousCheckBoxChange}
        />
      </FlexItem>
    </Flex>
  );
};
