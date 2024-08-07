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

import { useDayjs } from '@app/utils/hooks/useDayjs';
import { supportedTimezones, Timezone } from '@i18n/datetime';
import {
  Button,
  Icon,
  MenuToggle,
  MenuToggleElement,
  Select,
  SelectList,
  SelectOption,
  TextInputGroup,
  TextInputGroupMain,
  TextInputGroupUtilities,
} from '@patternfly/react-core';
import { GlobeIcon, TimesIcon } from '@patternfly/react-icons';
import * as React from 'react';
import { useTranslation } from 'react-i18next';

const DEFAULT_NUM_OPTIONS = 10;

const OPTION_INCREMENT = 15;

export interface TimezonePickerProps {
  isFlipEnabled?: boolean;
  isCompact?: boolean;
  menuAppendTo?: HTMLElement | (() => HTMLElement) | 'inline' | undefined;
  onTimezoneChange?: (timezone: Timezone) => void;
  selected: Timezone;
}

export const TimezonePicker: React.FC<TimezonePickerProps> = ({
  isFlipEnabled = true,
  isCompact,
  menuAppendTo = 'inline',
  selected,
  onTimezoneChange = (_) => undefined,
}) => {
  const { t } = useTranslation();
  const [dayjs, _] = useDayjs();
  const [numOfOptions, setNumOfOptions] = React.useState(DEFAULT_NUM_OPTIONS);
  const [isTimezoneOpen, setIsTimezoneOpen] = React.useState(false);
  const [filterValue, setFilterValue] = React.useState('');

  const onSelect = React.useCallback(
    (_, timezone) => {
      if (timezone) {
        setIsTimezoneOpen(false);
        onTimezoneChange({
          full: timezone.full,
          short: timezone.short,
        });
      }
    },
    [onTimezoneChange, setIsTimezoneOpen],
  );

  const onToggle = React.useCallback(() => setIsTimezoneOpen((isOpen) => !isOpen), [setIsTimezoneOpen]);

  const onInputChange = React.useCallback((_, inputVal: string) => setFilterValue(inputVal), [setFilterValue]);

  const timezones = React.useMemo(() => supportedTimezones(), []);

  const handleViewMore = React.useCallback(
    (_e: React.MouseEvent) => {
      setNumOfOptions((old) => Math.min(old + OPTION_INCREMENT, timezones.length));
    },
    [setNumOfOptions, timezones],
  );

  const mapToSelection = React.useCallback(
    (timezone: Timezone, isCompact?: boolean) => {
      return (
        <SelectOption
          key={timezone.full}
          value={timezone}
          description={isCompact ? timezone.full : timezone.short}
          isSelected={selected.full === timezone.full}
        >
          {isCompact ? timezone.short : `(UTC${dayjs().tz(timezone.full).format('Z')}) ${timezone.full}`}
        </SelectOption>
      );
    },
    [dayjs, selected],
  );

  const filteredTimezones = React.useMemo(() => {
    let _opts = timezones.slice(0, numOfOptions);
    if (filterValue) {
      const matchExp = new RegExp(filterValue.replace(/([+])/gi, `\\$1`), 'i');
      _opts = _opts.filter((tz) => matchExp.test(tz.full) || matchExp.test(tz.short));
    }
    return _opts;
  }, [timezones, numOfOptions, filterValue]);

  const toggle = React.useCallback(
    (toggleRef: React.Ref<MenuToggleElement>) => (
      <MenuToggle
        ref={toggleRef}
        variant="typeahead"
        onClick={onToggle}
        isExpanded={isTimezoneOpen}
        isFullWidth
        icon={
          <Icon>
            <GlobeIcon />
          </Icon>
        }
      >
        <TextInputGroup isPlain>
          <TextInputGroupMain
            value={filterValue}
            onClick={onToggle}
            onChange={onInputChange}
            autoComplete="off"
            placeholder="Filter by name..."
            isExpanded={isTimezoneOpen}
            role="combobox"
            id="typeahead-name-filter"
            aria-controls="typeahead-filter-select"
            aria-label={t('TimezonePicker.ARIA_LABELS.TYPE_AHEAD')}
          />
          <TextInputGroupUtilities>
            {filterValue ? (
              <Button
                variant="plain"
                onClick={() => {
                  setFilterValue('');
                }}
                aria-label="Clear input value"
              >
                <TimesIcon aria-hidden />
              </Button>
            ) : null}
          </TextInputGroupUtilities>
        </TextInputGroup>
      </MenuToggle>
    ),
    [onToggle, isTimezoneOpen, filterValue, onInputChange, setFilterValue, t],
  );

  return (
    <Select
      toggle={toggle}
      popperProps={{
        enableFlip: isFlipEnabled,
        width: isCompact ? '8.5em' : undefined,
        appendTo: menuAppendTo,
      }}
      onSelect={onSelect}
      aria-label={t('TimezonePicker.ARIA_LABELS.SELECT')}
      isOpen={isTimezoneOpen}
    >
      <SelectList>
        {filteredTimezones.map((tz) => mapToSelection(tz, isCompact))}
        {numOfOptions < timezones.length ? (
          <SelectOption key="view-more" onClick={handleViewMore} value={undefined}>
            {t('VIEW_MORE', { ns: 'common' })}
          </SelectOption>
        ) : null}
      </SelectList>
    </Select>
  );
};
