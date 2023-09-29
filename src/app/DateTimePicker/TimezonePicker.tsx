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
import { Select, SelectOption, SelectVariant } from '@patternfly/react-core';
import { GlobeIcon } from '@patternfly/react-icons';
import { css } from '@patternfly/react-styles';
import * as React from 'react';
import { useTranslation } from 'react-i18next';

const DEFAULT_NUM_OPTIONS = 10;

const OPTION_INCREMENT = 15;

export interface TimezonePickerProps {
  isFlipEnabled?: boolean;
  isCompact?: boolean;
  menuAppendTo?: HTMLElement | (() => HTMLElement) | 'inline' | 'parent' | undefined;
  onTimezoneChange?: (timezone: Timezone) => void;
  selected: Timezone;
}

export const TimezonePicker: React.FC<TimezonePickerProps> = ({
  isFlipEnabled = true,
  isCompact,
  menuAppendTo = 'parent',
  selected,
  onTimezoneChange = (_) => undefined,
}) => {
  const [t] = useTranslation();
  const [dayjs, _] = useDayjs();
  const [numOfOptions, setNumOfOptions] = React.useState(DEFAULT_NUM_OPTIONS);
  const [isTimezoneOpen, setIsTimezoneOpen] = React.useState(false);

  const onSelect = React.useCallback(
    (_, timezone, isPlaceholder) => {
      if (isPlaceholder) {
        return;
      }
      setIsTimezoneOpen(false);
      onTimezoneChange({
        full: timezone.full,
        short: timezone.short,
      });
    },
    [onTimezoneChange, setIsTimezoneOpen],
  );

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
          value={{
            ...timezone,
            toString: () => timezone.full,
            compareTo: (val) => timezone.full === val.full,
          }}
          description={isCompact ? timezone.full : timezone.short}
        >
          {isCompact ? timezone.short : `(UTC${dayjs().tz(timezone.full).format('Z')}) ${timezone.full}`}
        </SelectOption>
      );
    },
    [dayjs],
  );

  const options = React.useMemo(() => {
    return timezones
      .slice(0, numOfOptions)
      .map((timezone) => mapToSelection(timezone, isCompact))
      .concat(
        numOfOptions < timezones.length
          ? [
              <SelectOption key="view-more" isPlaceholder onClick={handleViewMore}>
                <span className={css('pf-c-button', 'pf-m-link', 'pf-m-inline')}>
                  {t('VIEW_MORE', { ns: 'common' })}
                </span>
              </SelectOption>,
            ]
          : [],
      );
  }, [isCompact, timezones, numOfOptions, t, handleViewMore, mapToSelection]);

  const onFilter = React.useCallback(
    (_: React.ChangeEvent<HTMLInputElement> | null, value: string) => {
      if (!value) {
        return options;
      }
      const matchExp = new RegExp(value.replace(/([+])/gi, `\\$1`), 'i');
      return timezones
        .filter((op) => matchExp.test(op.full) || matchExp.test(op.short))
        .map((t) => mapToSelection(t, isCompact));
    },
    [timezones, options, isCompact, mapToSelection],
  );

  return (
    <Select
      variant={SelectVariant.single}
      onToggle={setIsTimezoneOpen}
      isFlipEnabled={isFlipEnabled}
      menuAppendTo={menuAppendTo}
      maxHeight="16em"
      width={isCompact ? '8.5em' : undefined}
      selections={{
        ...selected,
        toString: () => selected.full,
        compareTo: (val) => selected.full === val.full,
      }}
      onSelect={onSelect}
      onFilter={onFilter}
      hasInlineFilter
      aria-label={t('TimezonePicker.ARIA_LABELS.SELECT') || ''}
      typeAheadAriaLabel={t('TimezonePicker.ARIA_LABELS.TYPE_AHEAD') || ''}
      isOpen={isTimezoneOpen}
      toggleIndicator={<GlobeIcon />}
    >
      {options}
    </Select>
  );
};
