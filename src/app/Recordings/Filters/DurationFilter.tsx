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

import { Button, ButtonVariant, Checkbox, Flex, FlexItem, TextInput } from '@patternfly/react-core';
import { SearchIcon } from '@patternfly/react-icons';
import * as React from 'react';
import { useTranslation } from 'react-i18next';

export const CONTINUOUS_INDICATOR = 'continuous';

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
  const { t } = useTranslation();
  const [duration, setDuration] = React.useState(30);
  const isContinuous = React.useMemo(() => durations && durations.includes(CONTINUOUS_INDICATOR), [durations]);

  const handleContinuousCheckBoxChange = React.useCallback(
    (_, checked: boolean) => {
      onContinuousDurationSelect(checked);
    },
    [onContinuousDurationSelect],
  );

  const handleSubmit = React.useCallback(() => onDurationInput(duration), [onDurationInput, duration]);

  const handleEnterKey = React.useCallback(
    (e) => {
      if (e.key && e.key === 'Enter') {
        handleSubmit();
      }
    },
    [handleSubmit],
  );

  return (
    <Flex spaceItems={{ default: 'spaceItemsSm' }}>
      <Flex direction={{ default: 'column' }}>
        <FlexItem>
          <TextInput
            type="number"
            value={duration}
            id="duration-input"
            aria-label="duration filter"
            onChange={(_, value) => setDuration(Number(value))}
            min="0"
            onKeyDown={handleEnterKey}
            style={{ maxWidth: '16ch' }}
          />
        </FlexItem>
        <FlexItem alignSelf={{ default: 'alignSelfFlexStart' }}>
          <Checkbox
            className="duration-filter__continuous-checkbox"
            label="Continuous"
            id="continuous-checkbox"
            isChecked={isContinuous}
            onChange={handleContinuousCheckBoxChange}
          />
        </FlexItem>
      </Flex>
      <FlexItem>
        <Button
          variant={ButtonVariant.control}
          aria-label={t('DurationFilter.ARIA_LABELS.SEARCH_BUTTON') || ''}
          onClick={handleSubmit}
        >
          <SearchIcon />
        </Button>
      </FlexItem>
    </Flex>
  );
};
