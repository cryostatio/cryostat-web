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
  Tooltip,
  ValidatedOptions,
} from '@patternfly/react-core';
import { SearchIcon } from '@patternfly/react-icons';
import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { DURATION_INPUT_MAXLENGTH } from './const';

export const CONTINUOUS_INDICATOR = 'continuous';

export const filterRecordingByDuration = (recordings: ActiveRecording[], filters?: DurationRange[]) => {
  if (!recordings || !recordings.length || !filters || !filters.length) {
    return recordings;
  }

  return recordings.filter((rec) => {
    return filters.some((range) => {
      if (rec.continuous) {
        return range.continuous || (range.from !== undefined && range.to === undefined);
      }

      if (!range.continuous) {
        return (
          (!range.from || rec.duration / 1000 >= convertDurationToSeconds(range.from.value, range.from.unit)) &&
          (!range.to || rec.duration / 1000 <= convertDurationToSeconds(range.to.value, range.to.unit))
        );
      }
      return false;
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
  from?: Duration; // inclusive
  to?: Duration; // inclusive
  continuous?: boolean;
}

export interface DurationFilterProps {
  durations?: DurationRange[];
  onDurationInput: (range: DurationRange) => void;
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

  const handleContinuousCheckBoxChange = React.useCallback(
    (_, checked: boolean) => onDurationInput({ continuous: checked }),
    [onDurationInput],
  );

  const handleSubmit = React.useCallback(() => {
    onDurationInput({
      from:
        fromDuration !== undefined
          ? {
              value: fromDuration,
              unit: fromDurationUnit,
            }
          : undefined,
      to: toDuration !== undefined ? { value: toDuration, unit: toDurationUnit } : undefined,
    });
  }, [onDurationInput, fromDuration, toDuration, fromDurationUnit, toDurationUnit]);

  const checkBox = React.useMemo(() => {
    const isChecked = durations && durations.some((dur) => dur.continuous || (dur.from && !dur.to));
    const isDisabled = isChecked && durations.some((dur) => dur.from && !dur.to);

    const element = (
      <Checkbox
        className="duration-filter__continuous-checkbox"
        label="Continuous"
        id="continuous-checkbox"
        isChecked={isChecked}
        onChange={handleContinuousCheckBoxChange}
        isDisabled={isDisabled}
      />
    );

    if (isDisabled) {
      return <Tooltip content={t('DurationFilter.TOOLTIP.CHECKBOX_DISABLED_CONTENT')}>{element}</Tooltip>;
    }

    return element;
  }, [durations, handleContinuousCheckBoxChange, t]);

  return (
    <Flex spaceItems={{ default: 'spaceItemsSm' }}>
      <Flex direction={{ default: 'column' }}>
        <FlexItem>
          <InputGroup>
            <InputGroupText>{t('FROM', { ns: 'common' })}</InputGroupText>
            <InputGroupItem>
              <TextInput
                // Uncontrolled input
                type="number"
                id="duration-input-from"
                aria-label={t('DurationFilter.ARIA_LABELS.FROM_DURATION')}
                onChange={(_, value) => setFromDuration(value === '' ? undefined : Number(value))}
                min="0"
                style={{ maxWidth: DURATION_INPUT_MAXLENGTH }}
              />
            </InputGroupItem>
            <InputGroupItem>
              <DurationUnitSelect selected={fromDurationUnit} onSelect={setFromDurationUnit} />
            </InputGroupItem>
            <InputGroupText>{t('TO', { ns: 'common' })}</InputGroupText>
            <InputGroupItem>
              <TextInput
                // Uncontrolled input
                type="number"
                id="duration-input-to"
                aria-label={t('DurationFilter.ARIA_LABELS.TO_DURATION')}
                onChange={(_, value) => setToDuration(value === '' ? undefined : Number(value))}
                min="0"
                style={{ maxWidth: DURATION_INPUT_MAXLENGTH }}
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
        <FlexItem alignSelf={{ default: 'alignSelfFlexStart' }}>{checkBox}</FlexItem>
      </Flex>
      <FlexItem>
        <Button
          variant={ButtonVariant.control}
          aria-label={t('DurationFilter.ARIA_LABELS.SEARCH_BUTTON')}
          onClick={handleSubmit}
          isDisabled={validated == ValidatedOptions.error || (fromDuration === undefined && toDuration === undefined)}
        >
          <SearchIcon />
        </Button>
      </FlexItem>
    </Flex>
  );
};
