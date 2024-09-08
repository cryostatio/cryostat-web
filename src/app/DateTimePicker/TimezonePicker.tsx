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
import { portalRoot } from '@app/utils/utils';
import { supportedTimezones, Timezone } from '@i18n/datetime';
import {
  Divider,
  Icon,
  MenuSearch,
  MenuSearchInput,
  MenuToggle,
  MenuToggleElement,
  SearchInput,
  Select,
  SelectList,
  SelectOption,
} from '@patternfly/react-core';
import { GlobeIcon } from '@patternfly/react-icons';
import { css } from '@patternfly/react-styles';
import _ from 'lodash';
import * as React from 'react';
import { useTranslation } from 'react-i18next';

const DEFAULT_NUM_OPTIONS = 10;

const OPTION_INCREMENT = 15;

export interface TimezonePickerProps {
  isFlipEnabled?: boolean;
  onTimezoneChange?: (timezone: Timezone) => void;
  selected: Timezone;
}

export const TimezonePicker: React.FC<TimezonePickerProps> = ({
  isFlipEnabled = true,
  selected,
  onTimezoneChange = (_) => undefined,
}) => {
  const { t } = useTranslation();
  const [dayjs, _dateFormat] = useDayjs();
  const [numOfOptions, setNumOfOptions] = React.useState(DEFAULT_NUM_OPTIONS);
  const [isTimezoneOpen, setIsTimezoneOpen] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState('');

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

  const onInputChange = React.useCallback((_, inputVal: string) => setSearchTerm(inputVal), [setSearchTerm]);

  const timezones = React.useMemo(() => supportedTimezones(), []);

  const handleViewMore = React.useCallback(
    (_e: React.MouseEvent) => {
      setNumOfOptions((old) => Math.min(old + OPTION_INCREMENT, timezones.length));
    },
    [setNumOfOptions, timezones],
  );

  const getTimezoneDisplay = React.useCallback(
    (timezone: Timezone) => `(UTC${dayjs().tz(timezone.full).format('Z')}) ${timezone.full}`,
    [dayjs],
  );

  const mapToSelection = React.useCallback(
    (timezone: Timezone) => {
      return (
        <SelectOption
          key={timezone.full}
          value={timezone}
          description={timezone.short}
          isSelected={selected.full === timezone.full}
        >
          {getTimezoneDisplay(timezone)}
        </SelectOption>
      );
    },
    [selected, getTimezoneDisplay],
  );

  const filteredTimezones = React.useMemo(() => {
    let _opts = timezones;
    if (searchTerm) {
      const matchExp = new RegExp(_.escapeRegExp(searchTerm), 'i');
      _opts = _opts.filter((tz) => matchExp.test(getTimezoneDisplay(tz)));
    }
    return _opts.slice(0, numOfOptions);
  }, [timezones, numOfOptions, searchTerm, getTimezoneDisplay]);

  const toggle = React.useCallback(
    (toggleRef: React.Ref<MenuToggleElement>) => (
      <MenuToggle
        ref={toggleRef}
        onClick={onToggle}
        isExpanded={isTimezoneOpen}
        isFullWidth
        icon={
          <Icon>
            <GlobeIcon />
          </Icon>
        }
      >
        {selected.full}
      </MenuToggle>
    ),
    [onToggle, isTimezoneOpen, selected.full],
  );

  return (
    <Select
      toggle={toggle}
      popperProps={{
        enableFlip: isFlipEnabled,
        preventOverflow: true,
        appendTo: portalRoot,
      }}
      onSelect={onSelect}
      aria-label={t('TimezonePicker.ARIA_LABELS.SELECT')}
      isOpen={isTimezoneOpen}
      onOpenChange={(isOpen) => setIsTimezoneOpen(isOpen)}
      onOpenChangeKeys={['Escape']}
      isScrollable
      maxMenuHeight="40vh"
    >
      <MenuSearch>
        <MenuSearchInput>
          <SearchInput
            placeholder={t('TimezonePicker.SEARCH_PLACEHOLDER')}
            value={searchTerm}
            onChange={onInputChange}
            aria-label={t('TimezonePicker.ARIA_LABELS.TYPE_AHEAD')}
          />
        </MenuSearchInput>
      </MenuSearch>
      <Divider />
      <SelectList>
        {filteredTimezones.length > 0 ? (
          filteredTimezones.map(mapToSelection)
        ) : (
          <SelectOption isDisabled>No results found</SelectOption>
        )}
        {numOfOptions < timezones.length && filteredTimezones.length > 0 ? (
          <SelectOption key="view-more" onClick={handleViewMore} value={undefined}>
            <span className={css('pf-v5-c-button', 'pf-m-link', 'pf-m-inline')}>
              {t('VIEW_MORE', { ns: 'common' })}
            </span>
          </SelectOption>
        ) : null}
      </SelectList>
    </Select>
  );
};
