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

import { ServiceContext } from '@app/Shared/Services/Services';
import {
  FormGroup,
  FormHelperText,
  HelperText,
  HelperTextItem,
  NumberInput,
  Stack,
  StackItem,
} from '@patternfly/react-core';
import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { SettingTab, UserSetting } from '../types';

const min = 1;

const Component = () => {
  const { t } = useTranslation();
  const context = React.useContext(ServiceContext);

  const [minRefresh, setMinRefresh] = React.useState(context.settings.chartControllerConfig().minRefresh);

  const handleChange = React.useCallback(
    (evt) => {
      setMinRefresh((prev) => {
        let value = isNaN(evt.target.value) ? prev : Number(evt.target.value);
        if (value < min) {
          value = min;
        }
        context.settings.setChartControllerConfig({ minRefresh: value });
        return value;
      });
    },
    [setMinRefresh, context.settings],
  );

  const handleVisibleStep = React.useCallback(
    (delta: number) => () => {
      const v = minRefresh + delta;
      context.settings.setChartControllerConfig({ minRefresh: v });
      setMinRefresh(v);
    },
    [minRefresh, context.settings],
  );

  return (
    <Stack hasGutter>
      <StackItem>
        <FormGroup>
          <FormHelperText>
            <HelperText>
              <HelperTextItem>{t('SETTINGS.CHARTS_CONFIG.REFRESH_RATE_SETTING')}</HelperTextItem>
            </HelperText>
          </FormHelperText>
          <NumberInput
            inputName="minRefresh"
            value={minRefresh}
            min={min}
            onChange={handleChange}
            onMinus={handleVisibleStep(-1)}
            onPlus={handleVisibleStep(1)}
            unit={t('SECOND_other', { ns: 'common' })}
          />
        </FormGroup>
      </StackItem>
    </Stack>
  );
};

export const ChartCards: UserSetting = {
  titleKey: 'SETTINGS.CHARTS_CONFIG.TITLE',
  descConstruct: 'SETTINGS.CHARTS_CONFIG.DESCRIPTION',
  content: Component,
  category: SettingTab.DASHBOARD,
};
