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

import { convertDurationToSeconds, DurationUnit, DurationUnitSelect } from '@app/Shared/Components/DurationUnitSelect';
import { ActiveRecording } from '@app/Shared/Services/api.types';
import {
  Button,
  ButtonVariant,
  Checkbox,
  Flex,
  FlexItem,
  HelperText,
  HelperTextItem,
  InputGroup,
  InputGroupItem,
  InputGroupText,
  TextInput,
  ValidatedOptions,
} from '@patternfly/react-core';
import { SearchIcon } from '@patternfly/react-icons';
import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { _INPUT_MAXLENGTH } from './const';

export const CONTINUOUS_INDICATOR = 'continuous';

export const filterRecordingByDuration = (recordings: ActiveRecording[], filters?: DurationRange[]) => {
  if (!recordings || !recordings.length || !filters || !filters.length) {
    return recordings;
  }

  return recordings.filter((rec) => {
    return filters.some((range) => {
      if (rec.continuous && range.continuous) {
        return true;
      }
      return (
        (!range.from || rec.duration >= convertDurationToSeconds(range.from.value, range.from.unit)) &&
        (!range.to || rec.duration <= convertDurationToSeconds(range.to.value, range.to.unit))
      );
    });
  });
};

export const compareDuration = (d1: Duration, d2: Duration): -1 | 0 | 1 => {
  const _d1 = convertDurationToSeconds(d1.value, d1.unit);
  const _d2 = convertDurationToSeconds(d2.value, d2.unit);
  return _d1 > _d2 ? 1 : _d1 < _d2 ? -1 : 0;
};

export interface Duration {
  value: number;
  unit: DurationUnit;
}

export interface DurationRange {
  from?: Duration;
  to?: Duration;
  continuous?: boolean;
}

export interface DurationFilterProps {
  durations?: DurationRange[];
  onDurationInput: (range: DurationRange) => void; // [from, to] range
}

export const DurationFilter: React.FC<DurationFilterProps> = ({ durations, onDurationInput }) => {
  const { t } = useTranslation();
  const [fromDuration, setFromDuration] = React.useState<number | undefined>();
  const [fromDurationUnit, setFromDurationUnit] = React.useState(DurationUnit.SECOND);

  const [toDuration, setToDuration] = React.useState<number | undefined>();
  const [toDurationUnit, setToDurationUnit] = React.useState(DurationUnit.SECOND);

  const validated = React.useMemo(
    () =>
      toDuration === undefined ||
      fromDuration === undefined ||
      compareDuration({ value: toDuration, unit: toDurationUnit }, { value: fromDuration, unit: fromDurationUnit }) >= 0
        ? ValidatedOptions.default
        : ValidatedOptions.error,
    [toDuration, fromDuration, toDurationUnit, fromDurationUnit],
  );

  const isContinuous = React.useMemo(() => durations && durations.some((dur) => dur.continuous), [durations]);

  const handleContinuousCheckBoxChange = React.useCallback(
    () => onDurationInput({ continuous: true }),
    [onDurationInput],
  );

  const handleSubmit = React.useCallback(
    () =>
      onDurationInput({
        from: fromDuration
          ? {
              value: fromDuration,
              unit: fromDurationUnit,
            }
          : undefined,
        to: toDuration ? { value: toDuration, unit: toDurationUnit } : undefined,
      }),
    [onDurationInput, fromDuration, toDuration, fromDurationUnit, toDurationUnit],
  );

  return (
    <Flex spaceItems={{ default: 'spaceItemsSm' }}>
      <Flex direction={{ default: 'column' }}>
        <FlexItem>
          <InputGroup>
            <InputGroupText>{t('FROM', { ns: 'common' })}</InputGroupText>
            <InputGroupItem>
              <TextInput
                type="number"
                value={fromDuration}
                id="duration-input-from"
                aria-label={t('DurationFilter.ARIA_LABELS.FROM_DURATION')}
                onChange={(_, value) => setFromDuration(Number(value))}
                min="0"
                style={{ maxWidth: _INPUT_MAXLENGTH }}
              />
            </InputGroupItem>
            <InputGroupItem>
              <DurationUnitSelect selected={fromDurationUnit} onSelect={setFromDurationUnit} />
            </InputGroupItem>
            <InputGroupText>{t('TO', { ns: 'common' })}</InputGroupText>
            <InputGroupItem>
              <TextInput
                type="number"
                value={toDuration}
                id="duration-input-to"
                aria-label={t('DurationFilter.ARIA_LABELS.TO_DURATION')}
                onChange={(_, value) => setToDuration(Number(value))}
                min="0"
                style={{ maxWidth: _INPUT_MAXLENGTH }}
                validated={validated}
              />
            </InputGroupItem>
            <InputGroupItem>
              <DurationUnitSelect selected={toDurationUnit} onSelect={setToDurationUnit} />
            </InputGroupItem>
          </InputGroup>
        </FlexItem>
        {validated === ValidatedOptions.error ? (
          <FlexItem>
            <HelperText>
              <HelperTextItem variant="error" hasIcon>
                {t('DurationFilter.HELPER_TEXT.INVALID_UPPER_BOUND')}
              </HelperTextItem>
            </HelperText>
          </FlexItem>
        ) : null}
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
          aria-label={t('DurationFilter.ARIA_LABELS.SEARCH_BUTTON')}
          onClick={handleSubmit}
          isDisabled={validated == ValidatedOptions.error || (!fromDuration && !toDuration)}
        >
          <SearchIcon />
        </Button>
      </FlexItem>
    </Flex>
  );
};
