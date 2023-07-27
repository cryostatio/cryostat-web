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
import { MeridiemPicker } from '@app/DateTimePicker/MeridiemPicker';
import { format2Digit, hourIn12HrFormat, hourIn24HrFormat, isHourIn24hAM } from '@i18n/datetimeUtils';
import {
  Button,
  Divider,
  HelperText,
  HelperTextItem,
  Level,
  LevelItem,
  Panel,
  PanelFooter,
  PanelMain,
  PanelMainBody,
  Stack,
  StackItem,
  Switch,
  TextInput,
  Title,
} from '@patternfly/react-core';
import { AngleDownIcon, AngleUpIcon } from '@patternfly/react-icons';
import { css } from '@patternfly/react-styles';
import _ from 'lodash';
import * as React from 'react';
import { useTranslation } from 'react-i18next';

export interface TimePickerProps {
  selected: {
    // controlled
    hour24: number; // In 24h format
    minute: number;
    second: number;
  };
  onHourSelect?: (hrIn24h: number) => void;
  onMinuteSelect?: (minute: number) => void;
  onSecondSelect?: (second: number) => void;
  onMeridiemSelect?: (isAM: boolean) => void;
}

export const TimePicker: React.FC<TimePickerProps> = ({
  onHourSelect,
  onMinuteSelect,
  onSecondSelect,
  onMeridiemSelect,
  selected,
}) => {
  const [t] = useTranslation();
  const [is24h, setIs24h] = React.useState(true);

  const meridiemAM = React.useMemo(() => isHourIn24hAM(selected.hour24), [selected.hour24]);

  const handleHourSelect = React.useCallback(
    (rawHour: number) => {
      const hour = is24h ? rawHour : hourIn24HrFormat(rawHour, meridiemAM);
      onHourSelect && onHourSelect(hour);
    },
    [is24h, onHourSelect, meridiemAM]
  );

  return (
    <>
      <Panel>
        <PanelMain>
          <PanelMainBody>
            <Level hasGutter>
              <LevelItem key={'hour'}>
                <TimeSpinner
                  variant={is24h ? 'hour24' : 'hour12'}
                  label={t('HOUR', { ns: 'common' })}
                  selected={is24h ? selected.hour24 : hourIn12HrFormat(selected.hour24)[0]}
                  onChange={handleHourSelect}
                />
              </LevelItem>
              <LevelItem key={'splitter-1'}>
                <div className="datetime-picker__colon-divider">:</div>
              </LevelItem>
              <LevelItem key={'minute'}>
                <TimeSpinner
                  variant={'minute'}
                  label={t('MINUTE', { ns: 'common' })}
                  selected={selected.minute}
                  onChange={onMinuteSelect}
                />
              </LevelItem>
              <LevelItem key={'splitter-2'}>
                <div className="datetime-picker__colon-divider">:</div>
              </LevelItem>
              <LevelItem key={'second'}>
                <TimeSpinner
                  variant={'second'}
                  label={t('SECOND', { ns: 'common' })}
                  selected={selected.second}
                  onChange={onSecondSelect}
                />
              </LevelItem>
              {is24h ? (
                <></>
              ) : (
                <LevelItem key={'meridiem'}>
                  <MeridiemPicker isAM={meridiemAM} onSelect={onMeridiemSelect} />
                </LevelItem>
              )}
            </Level>
          </PanelMainBody>
          <Divider />
          <PanelFooter>
            <HelperText>
              <HelperTextItem>{t('TimePicker.USE_24HR_TIME')}</HelperTextItem>
            </HelperText>
            <Switch id={'24-hour-switch'} label={t('TimePicker.24HOUR')} isChecked={is24h} onChange={setIs24h} />
          </PanelFooter>
        </PanelMain>
      </Panel>
    </>
  );
};

interface TimeSpinnerProps {
  variant: 'hour12' | 'hour24' | 'minute' | 'second';
  onChange?: (value: number) => void;
  selected: number; // controlled, must be corresponding to variant
  label?: string | null;
}

const TimeSpinner: React.FC<TimeSpinnerProps> = ({ variant, onChange, selected, label }) => {
  const [t] = useTranslation();
  const computedMax = React.useMemo(() => {
    switch (variant) {
      case 'hour12':
        return 12;
      case 'hour24':
        return 23;
      default: // minute, second
        return 59;
    }
  }, [variant]);

  const computedMin = React.useMemo(() => {
    switch (variant) {
      case 'hour12':
        return 1;
      default:
        return 0; // hour24, minute, second
    }
  }, [variant]);

  const _sanitizeValue = React.useCallback(
    (value: number) => {
      return _.clamp(value, computedMin, computedMax);
    },
    [computedMax, computedMin]
  );

  const handleValueChange = React.useCallback(
    (value: string) => {
      if (isNaN(Number(value))) {
        return;
      }
      const newVal = _sanitizeValue(Number(value));
      onChange && onChange(newVal);
    },
    [onChange, _sanitizeValue]
  );

  const handleIncrement = React.useCallback(() => {
    const newVal = _sanitizeValue(selected + 1);
    onChange && onChange(newVal);
  }, [selected, _sanitizeValue, onChange]);

  const handleDecrement = React.useCallback(() => {
    const newVal = _sanitizeValue(selected - 1);
    onChange && onChange(newVal);
  }, [selected, _sanitizeValue, onChange]);

  return (
    <Stack aria-label={label || variant}>
      {label ? (
        <StackItem>
          <Title className="datetime-picker__time-text-top-label" headingLevel={'h4'}>
            {label}
          </Title>
        </StackItem>
      ) : (
        <></>
      )}
      <StackItem key={`${variant}-increment`}>
        <Button
          className={css('datetime-picker__time-spin-box', 'up')}
          onClick={handleIncrement}
          aria-label={t(`TimeSpinner.INCREMENT_${variant.toUpperCase()}_VALUE`) || ''}
        >
          <AngleUpIcon size="md" />
        </Button>
      </StackItem>
      <StackItem key={`${variant}-input`}>
        <TextInput
          id={`${variant}-input`}
          aria-label={t(`TimeSpinner.INPUT_${variant.toUpperCase()}_VALUE`) || ''}
          className="datetime-picker__number-input"
          type="number"
          min={computedMin}
          max={computedMax}
          value={format2Digit(selected)}
          onChange={handleValueChange}
        />
      </StackItem>
      <StackItem key={`${variant}-decrement`}>
        <Button
          className={css('datetime-picker__time-spin-box', 'down')}
          onClick={handleDecrement}
          aria-label={t(`TimeSpinner.DECREMENT_${variant.toUpperCase()}_VALUE`) || ''}
        >
          <AngleDownIcon size="md" />
        </Button>
      </StackItem>
    </Stack>
  );
};

/**
 * t('TimeSpinner.INPUT_HOUR12_VALUE')
 * t('TimeSpinner.INPUT_HOUR24_VALUE')
 * t('TimeSpinner.INPUT_MINUTE_VALUE')
 * t('TimeSpinner.INPUT_SECOND_VALUE')
 * t('TimeSpinner.INCREMENT_HOUR12_VALUE')
 * t('TimeSpinner.INCREMENT_HOUR24_VALUE')
 * t('TimeSpinner.INCREMENT_MINUTE_VALUE')
 * t('TimeSpinner.INCREMENT_SECOND_VALUE')
 * t('TimeSpinner.DECREMENT_HOUR12_VALUE')
 * t('TimeSpinner.DECREMENT_HOUR24_VALUE')
 * t('TimeSpinner.DECREMENT_MINUTE_VALUE')
 * t('TimeSpinner.DECREMENT_SECOND_VALUE')
 */
