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
                  label={'Hour'}
                  selected={is24h ? selected.hour24 : hourIn12HrFormat(selected.hour24)[0]}
                  onChange={handleHourSelect}
                />
              </LevelItem>
              <LevelItem key={'splitter-1'}>
                <div className="datetime-picker__colon-divider">:</div>
              </LevelItem>
              <LevelItem key={'minute'}>
                <TimeSpinner variant={'minute'} label={'Minute'} selected={selected.minute} onChange={onMinuteSelect} />
              </LevelItem>
              <LevelItem key={'splitter-2'}>
                <div className="datetime-picker__colon-divider">:</div>
              </LevelItem>
              <LevelItem key={'second'}>
                <TimeSpinner variant={'second'} label="Second" selected={selected.second} onChange={onSecondSelect} />
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
              <HelperTextItem>{'Use 24-hour time.'}</HelperTextItem>
            </HelperText>
            <Switch label="24-hour" isChecked={is24h} onChange={setIs24h} />
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
  label?: string;
}

const TimeSpinner: React.FC<TimeSpinnerProps> = ({ variant, onChange, selected, label }) => {
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
    <Stack>
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
        <Button className={css('datetime-picker__time-spin-box', 'up')} onClick={handleIncrement}>
          <AngleUpIcon size="md" />
        </Button>
      </StackItem>
      <StackItem key={`${variant}-input`}>
        <TextInput
          id={`${variant}-input`}
          aria-label={`Select ${variant} value`}
          className="datetime-picker__number-input"
          type="number"
          min={computedMin}
          max={computedMax}
          value={format2Digit(selected)}
          onChange={handleValueChange}
        />
      </StackItem>
      <StackItem key={`${variant}-decrement`}>
        <Button className={css('datetime-picker__time-spin-box', 'down')} onClick={handleDecrement}>
          <AngleDownIcon size="md" />
        </Button>
      </StackItem>
    </Stack>
  );
};
