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
import { useCryostatTranslation } from '@i18n/i18nextUtil';
import { css } from '@patternfly/react-styles';
import * as React from 'react';

export interface MeridiemPickerProps {
  onSelect?: (isAM: boolean) => void;
  isAM?: boolean;
}

export const MeridiemPicker: React.FC<MeridiemPickerProps> = ({ onSelect = () => undefined, isAM = true }) => {
  const { t } = useCryostatTranslation();
  const handleSelectAM = React.useCallback(() => {
    onSelect(true);
  }, [onSelect]);

  const handleSelectPM = React.useCallback(() => {
    onSelect(false);
  }, [onSelect]);

  return (
    <div
      role={'listbox'}
      aria-label={t('MeridiemPicker.ARIA_LABELS.LISTBOX') || ''}
      className="datetime-picker__meridiem-title-stack"
    >
      <div className={css('datetime-picker__meridiem-tile', `${isAM ? '' : 'un'}selected`)} onClick={handleSelectAM}>
        {t('MERIDIEM_AM')}
      </div>
      <div className={css('datetime-picker__meridiem-tile', `${isAM ? 'un' : ''}selected`)} onClick={handleSelectPM}>
        {t('MERIDIEM_PM')}
      </div>
    </div>
  );
};
