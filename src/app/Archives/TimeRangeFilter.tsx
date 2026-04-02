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

import { DateTimePicker } from '@app/DateTimePicker/DateTimePicker';
import { useArchiveFilters } from '@app/utils/hooks/useArchiveFilters';
import { useCryostatTranslation } from '@i18n/i18nextUtil';
import {
  ActionGroup,
  Button,
  Dropdown,
  DropdownItem,
  DropdownList,
  Form,
  FormGroup,
  MenuToggle,
  MenuToggleElement,
  Modal,
  ModalVariant,
} from '@patternfly/react-core';
import { CalendarAltIcon } from '@patternfly/react-icons';
import React from 'react';

export interface TimeRangeFilterProps {
  /** Optional CSS class name */
  className?: string;
}

/**
 * TimeRangeFilter component for selecting time ranges to filter archived recordings.
 *
 * Provides:
 * - Preset time ranges (Last 24 Hours, Last 7 Days, Last 30 Days, All Time)
 * - Custom time range picker with start and end date/time selection
 *
 * @example
 * <TimeRangeFilter />
 */
export const TimeRangeFilter: React.FC<TimeRangeFilterProps> = ({ className }) => {
  const { t } = useCryostatTranslation();
  const { timeRange, setTimeRange } = useArchiveFilters();

  const [isOpen, setIsOpen] = React.useState(false);
  const [isCustomModalOpen, setIsCustomModalOpen] = React.useState(false);
  const [customStartTime, setCustomStartTime] = React.useState<string>('');
  const [customEndTime, setCustomEndTime] = React.useState<string>('');

  // Preset options
  const presetOptions = React.useMemo(
    () => [
      { key: 'all', label: t('TimeRangeFilter.ALL_TIME') },
      { key: 'last24h', label: t('TimeRangeFilter.LAST_24_HOURS') },
      { key: 'last7d', label: t('TimeRangeFilter.LAST_7_DAYS') },
      { key: 'last30d', label: t('TimeRangeFilter.LAST_30_DAYS') },
    ],
    [t],
  );

  // Get current selection label
  const currentLabel = React.useMemo(() => {
    if (timeRange.type === 'custom') {
      return t('TimeRangeFilter.CUSTOM_RANGE');
    }
    const option = presetOptions.find((opt) => opt.key === timeRange.preset);
    return option?.label || t('TimeRangeFilter.ALL_TIME');
  }, [timeRange, presetOptions, t]);

  const handleToggle = React.useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  const handleSelect = React.useCallback(
    (_event: React.MouseEvent<Element, MouseEvent> | undefined, value: string | number | undefined) => {
      if (value === 'custom') {
        setIsOpen(false);
        setIsCustomModalOpen(true);
        // Initialize with current custom range if exists
        if (timeRange.type === 'custom') {
          setCustomStartTime(timeRange.startTime);
          setCustomEndTime(timeRange.endTime);
        } else {
          // Default to last 24 hours
          const now = new Date();
          const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          setCustomStartTime(yesterday.toISOString());
          setCustomEndTime(now.toISOString());
        }
      } else if (typeof value === 'string') {
        setTimeRange({ type: 'preset', preset: value as 'all' | 'last24h' | 'last7d' | 'last30d' });
        setIsOpen(false);
      }
    },
    [timeRange, setTimeRange],
  );

  const handleCustomRangeApply = React.useCallback(() => {
    if (customStartTime && customEndTime) {
      setTimeRange({
        type: 'custom',
        startTime: customStartTime,
        endTime: customEndTime,
      });
      setIsCustomModalOpen(false);
    }
  }, [customStartTime, customEndTime, setTimeRange]);

  const handleCustomRangeCancel = React.useCallback(() => {
    setIsCustomModalOpen(false);
    setCustomStartTime('');
    setCustomEndTime('');
  }, []);

  return (
    <>
      <Dropdown
        className={className}
        isOpen={isOpen}
        onSelect={handleSelect}
        onOpenChange={setIsOpen}
        toggle={(toggleRef: React.Ref<MenuToggleElement>) => (
          <MenuToggle
            ref={toggleRef}
            onClick={handleToggle}
            isExpanded={isOpen}
            icon={<CalendarAltIcon />}
            aria-label={t('TimeRangeFilter.ARIA_LABELS.MENU_TOGGLE')}
          >
            {currentLabel}
          </MenuToggle>
        )}
      >
        <DropdownList>
          {presetOptions.map((option) => (
            <DropdownItem key={option.key} value={option.key}>
              {option.label}
            </DropdownItem>
          ))}
          <DropdownItem key="custom" value="custom">
            {t('TimeRangeFilter.CUSTOM_RANGE')}
          </DropdownItem>
        </DropdownList>
      </Dropdown>

      <Modal
        variant={ModalVariant.small}
        title={t('TimeRangeFilter.CUSTOM_RANGE_TITLE')}
        isOpen={isCustomModalOpen}
        onClose={handleCustomRangeCancel}
      >
        <Form>
          <FormGroup label={t('TimeRangeFilter.START_TIME')}>
            <DateTimePicker
              onSelect={(date) => setCustomStartTime(date.toISOString())}
              onDismiss={() => {}}
              prefilledDate={customStartTime ? new Date(customStartTime) : undefined}
            />
          </FormGroup>
          <FormGroup label={t('TimeRangeFilter.END_TIME')}>
            <DateTimePicker
              onSelect={(date) => setCustomEndTime(date.toISOString())}
              onDismiss={() => {}}
              prefilledDate={customEndTime ? new Date(customEndTime) : undefined}
            />
          </FormGroup>
          <ActionGroup>
            <Button variant="primary" onClick={handleCustomRangeApply}>
              {t('TimeRangeFilter.APPLY')}
            </Button>
            <Button variant="link" onClick={handleCustomRangeCancel}>
              {t('CANCEL')}
            </Button>
          </ActionGroup>
        </Form>
      </Modal>
    </>
  );
};
