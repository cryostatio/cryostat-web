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
import { ServiceContext } from '@app/Shared/Services/Services';
import { useSubscriptions } from '@app/utils/useSubscriptions';
import { Level, LevelItem, Stack, StackItem, TextInput } from '@patternfly/react-core';
import { AngleDownIcon, AngleUpIcon } from '@patternfly/react-icons';
import * as React from 'react';
import { MeridiemPicker } from '@app/DateTimePicker/MeridiemPicker';

export interface TimePickerProps {
  onSelect?: (hour: number, minute: number, second: number) => void;
}

export const TimePicker: React.FC<TimePickerProps> = ({ onSelect }) => {
  const context = React.useContext(ServiceContext);
  const addSubcription = useSubscriptions();
  const [is24h, setIs24h] = React.useState(true);

  React.useEffect(() => {
    addSubcription(context.settings.datetimeFormat().subscribe((f) => setIs24h(f.timeFormat === '24h')));
  }, [addSubcription, context.settings, setIs24h]);

  const handleHourChange = React.useCallback((hour: number) => {}, []);

  const handleMinuteChange = React.useCallback((minute: number) => {}, []);

  const handleSecondChange = React.useCallback((second: number) => {}, []);

  return (
    // TODO: Handle change
    <Level hasGutter>
      <LevelItem key={'hour'}>
        <TimeSpinner variant={is24h ? 'hour24' : 'hour12'} />
      </LevelItem>
      <LevelItem key={'splitter-1'}>
        <div style={{ fontSize: '2em' }}>:</div>
      </LevelItem>
      <LevelItem key={'minute'}>
        <TimeSpinner variant={'minute'} />
      </LevelItem>
      <LevelItem key={'splitter-2'}>
        <div style={{ fontSize: '2em' }}>:</div>
      </LevelItem>
      <LevelItem key={'second'}>
        <TimeSpinner variant={'second'} />
      </LevelItem>
      {is24h ? <></> : <MeridiemPicker />}
    </Level>
  );
};

export interface TimeSpinnerProps {
  variant: 'hour12' | 'hour24' | 'minute' | 'second';
  onChange?: (value: number) => void;
  selected?: {
    hour: number;
    minute: number;
    second: number;
  };
}

export const TimeSpinner: React.FC<TimeSpinnerProps> = ({
  variant,
  onChange,
  selected = { hour: 0, minute: 0, second: 0 },
}) => {
  const [hovered, setHovered] = React.useState<{ up: boolean; down: boolean }>({ up: false, down: false });

  const handleHover = React.useCallback((direction: 'up' | 'down', hovered: boolean) => {}, []);

  return (
    <Stack hasGutter>
      <StackItem key={`${variant}-increment`}>
        <AngleUpIcon
          size="lg"
          onMouseEnter={() => handleHover('up', true)}
          onMouseLeave={() => handleHover('up', false)}
        />
      </StackItem>
      <StackItem key={`${variant}-input`}>
        <TextInput className="datetime-picker__number-input" type="number" min={0} max={24} />
      </StackItem>
      <StackItem key={`${variant}-decrement`}>
        <AngleDownIcon
          size="lg"
          onMouseEnter={() => handleHover('down', true)}
          onMouseLeave={() => handleHover('down', false)}
        />
      </StackItem>
    </Stack>
  );
};
