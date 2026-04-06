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

import { useArchiveFilters } from '@app/utils/hooks/useArchiveFilters';
import { useCryostatTranslation } from '@i18n/i18nextUtil';
import { Button, TextInput, Tooltip, ToolbarGroup, ToolbarItem } from '@patternfly/react-core';
import { RedoIcon } from '@patternfly/react-icons';
import dayjs from 'dayjs';
import * as React from 'react';

export const TimeRangeFilter: React.FC = () => {
  const { t } = useCryostatTranslation();
  const { timeRange, setTimeRange, clearTimeRange } = useArchiveFilters();

  const [startTime, setStartTime] = React.useState<string>(() => {
    if (timeRange?.startTime) {
      return dayjs(timeRange.startTime).format('YYYY-MM-DDTHH:mm');
    }
    return '';
  });

  const [endTime, setEndTime] = React.useState<string>(() => {
    if (timeRange?.endTime) {
      return dayjs(timeRange.endTime).format('YYYY-MM-DDTHH:mm');
    }
    return '';
  });

  const [validationError, setValidationError] = React.useState('');

  // Update Redux state when inputs change and are valid
  React.useEffect(() => {
    // Don't apply filter if inputs are empty
    if (!startTime || !endTime) {
      setValidationError('');
      return;
    }

    // Parse datetime-local format (YYYY-MM-DDTHH:mm) as local time
    // The datetime-local input gives us a string in the user's local timezone
    const startDate = dayjs(startTime, 'YYYY-MM-DDTHH:mm');
    const endDate = dayjs(endTime, 'YYYY-MM-DDTHH:mm');

    if (!startDate.isValid() || !endDate.isValid()) {
      setValidationError(t('TimeRangeFilter.VALIDATION.INVALID_DATE_FORMAT'));
      return;
    }

    if (endDate.isBefore(startDate) || endDate.isSame(startDate)) {
      setValidationError(t('TimeRangeFilter.VALIDATION.END_BEFORE_START'));
      return;
    }

    setValidationError('');
    // Convert local time to UTC timestamp (milliseconds since epoch)
    const startTimestamp = startDate.valueOf();
    const endTimestamp = endDate.valueOf();

    setTimeRange({
      startTime: startTimestamp,
      endTime: endTimestamp,
    });
  }, [startTime, endTime, setTimeRange, t]);

  const handleReset = React.useCallback(() => {
    setStartTime('');
    setEndTime('');
    setValidationError('');
    clearTimeRange();
  }, [clearTimeRange]);

  const hasCustomRange = React.useMemo(() => {
    return timeRange !== null;
  }, [timeRange]);

  return (
    <ToolbarGroup variant="filter-group">
      <ToolbarItem>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '14px', whiteSpace: 'nowrap' }}>{t('TimeRangeFilter.START_TIME')}:</span>
          <TextInput
            type="datetime-local"
            value={startTime}
            onChange={(_event, value) => setStartTime(value)}
            aria-label={t('TimeRangeFilter.START_TIME')}
            validated={validationError ? 'error' : 'default'}
          />
        </div>
      </ToolbarItem>
      <ToolbarItem style={{ marginLeft: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '14px', whiteSpace: 'nowrap' }}>{t('TimeRangeFilter.END_TIME')}:</span>
          <TextInput
            type="datetime-local"
            value={endTime}
            onChange={(_event, value) => setEndTime(value)}
            aria-label={t('TimeRangeFilter.END_TIME')}
            validated={validationError ? 'error' : 'default'}
          />
        </div>
      </ToolbarItem>
      {hasCustomRange && (
        <ToolbarItem style={{ marginLeft: '16px' }}>
          <Tooltip content={t('TimeRangeFilter.RESET')}>
            <Button
              variant="secondary"
              onClick={handleReset}
              icon={<RedoIcon />}
              aria-label={t('TimeRangeFilter.RESET')}
            />
          </Tooltip>
        </ToolbarItem>
      )}
    </ToolbarGroup>
  );
};
