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
import { MenuToggle, MenuToggleElement, Select, SelectList, SelectOption } from '@patternfly/react-core';
import { TFunction } from 'i18next';
import * as React from 'react';
import { useTranslation } from 'react-i18next';

export enum DurationUnit {
  HOUR,
  MINUTE,
  SECOND,
}

const SupportedDurationUnits = Object.values(DurationUnit).filter((entry) => typeof entry === 'string');

export const convertDurationToSeconds = (duration: number, unit: DurationUnit): number => {
  switch (unit) {
    case DurationUnit.HOUR:
      return duration * 60 * 60;
    case DurationUnit.MINUTE:
      return duration * 60;
    case DurationUnit.SECOND:
      return duration;
    default:
      throw new Error(`Unknown unit enum value: ${unit}`);
  }
};

export const getDurationUnitDisplay = (t: TFunction, unit: DurationUnit, compact?: boolean): string => {
  const suffix = compact ? 'compact' : 'other';
  switch (unit) {
    case DurationUnit.HOUR:
      return t(`HOUR_${suffix}`, { ns: 'common' });
    case DurationUnit.MINUTE:
      return t(`MINUTE_${suffix}`, { ns: 'common' });
    case DurationUnit.SECOND:
      return t(`SECOND_${suffix}`, { ns: 'common' });
    default:
      throw new Error(`Unknown unit enum value: ${unit}`);
  }
};

export interface DurationUnitSelectProps {
  onSelect?: (unit: DurationUnit) => void;
  selected: DurationUnit;
}

export const DurationUnitSelect: React.FC<DurationUnitSelectProps> = ({ onSelect, selected, ...props }) => {
  const { t } = useTranslation();
  const [open, setOpen] = React.useState(false);

  const handleToggle = React.useCallback(() => setOpen((open) => !open), [setOpen]);

  const handleSelect = React.useCallback(
    (e, value: DurationUnit) => {
      setOpen(false);
      onSelect && onSelect(value);
    },
    [onSelect, setOpen],
  );

  const options = React.useMemo(
    () =>
      SupportedDurationUnits.map((unit) => (
        <SelectOption key={unit} value={DurationUnit[unit]}>
          {getDurationUnitDisplay(t, DurationUnit[unit])}
        </SelectOption>
      )),
    [t],
  );

  const toggle = React.useCallback(
    (toggleRef: React.Ref<MenuToggleElement>) => (
      <MenuToggle ref={toggleRef} onClick={handleToggle} isExpanded={open}>
        {getDurationUnitDisplay(t, selected)}
      </MenuToggle>
    ),
    [handleToggle, open, t, selected],
  );

  return (
    <Select
      {...props}
      toggle={toggle}
      isOpen={open}
      selected={selected}
      onSelect={handleSelect}
      onOpenChange={setOpen}
      onOpenChangeKeys={['Escape']}
    >
      <SelectList>{options}</SelectList>
    </Select>
  );
};
