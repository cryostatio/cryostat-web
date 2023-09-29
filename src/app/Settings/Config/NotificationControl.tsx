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

import { NotificationCategory } from '@app/Shared/Services/api.types';
import { messageKeys } from '@app/Shared/Services/api.utils';
import { ServiceContext } from '@app/Shared/Services/Services';
import { useSubscriptions } from '@app/utils/hooks/useSubscriptions';
import {
  ExpandableSection,
  Switch,
  Stack,
  StackItem,
  NumberInput,
  FormGroup,
  HelperText,
  HelperTextItem,
} from '@patternfly/react-core';
import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { SettingTab, UserSetting } from '../types';

const min = 0;
const max = 10;

const Component = () => {
  const [t] = useTranslation();
  const context = React.useContext(ServiceContext);
  const addSubscription = useSubscriptions();
  const [state, setState] = React.useState(context.settings.notificationsEnabled());
  const [visibleNotificationsCount, setVisibleNotificationsCount] = React.useState(5);
  const [expanded, setExpanded] = React.useState(false);

  React.useEffect(() => {
    addSubscription(context.settings.visibleNotificationsCount().subscribe(setVisibleNotificationsCount));
  }, [addSubscription, context.settings, setVisibleNotificationsCount]);

  const handleCheckboxChange = React.useCallback(
    (checked, element) => {
      state.set(NotificationCategory[element.target.id], checked);
      context.settings.setNotificationsEnabled(state);
      setState(new Map(state));
    },
    [state, setState, context.settings],
  );

  const handleCheckAll = React.useCallback(
    (checked) => {
      const newState = new Map();
      Array.from(state.entries()).forEach((v) => newState.set(v[0], checked));
      context.settings.setNotificationsEnabled(newState);
      setState(newState);
    },
    [context.settings, setState, state],
  );

  const handleChange = React.useCallback(
    (evt) => {
      let value = isNaN(evt.target.value) ? visibleNotificationsCount : Number(evt.target.value);
      if (value < min) {
        value = min;
      } else if (value > max) {
        value = max;
      }
      context.settings.setVisibleNotificationCount(value);
    },
    [visibleNotificationsCount, context.settings],
  );

  const handleVisibleStep = React.useCallback(
    (delta: number) => () => {
      const v = visibleNotificationsCount + delta;
      context.settings.setVisibleNotificationCount(v);
    },
    [visibleNotificationsCount, context.settings],
  );

  const allChecked = React.useMemo(() => {
    return Array.from(state.entries())
      .map((e) => e[1])
      .reduce((a, b) => a && b);
  }, [state]);

  const labels = React.useMemo(() => {
    const result = new Map<NotificationCategory, string>();
    messageKeys.forEach((v, k) => {
      result.set(k, v?.title || k);
    });
    return result;
  }, []);

  const switches = React.useMemo(() => {
    return Array.from(state.entries(), ([key, value]) => (
      <StackItem key={key}>
        <Switch id={key} label={labels.get(key)} isChecked={value} onChange={handleCheckboxChange} />
      </StackItem>
    ));
  }, [handleCheckboxChange, state, labels]);

  return (
    <>
      <Stack hasGutter>
        <StackItem key="all-notifications">
          <FormGroup>
            <HelperText>
              <HelperTextItem>{t('SETTINGS.NOTIFICATION_CONTROL.INPUT_DESCRIPTION')}</HelperTextItem>
            </HelperText>
            <Switch
              id="all-notifications"
              label={t('SETTINGS.NOTIFICATION_CONTROL.SWITCH_LABEL')}
              isChecked={allChecked}
              onChange={handleCheckAll}
            />
          </FormGroup>
        </StackItem>
        <StackItem key="notifications-notification-count">
          <FormGroup>
            <HelperText>
              <HelperTextItem>{t('SETTINGS.NOTIFICATION_CONTROL.INPUT')}</HelperTextItem>
            </HelperText>
            <NumberInput
              inputName="alert count"
              value={visibleNotificationsCount}
              min={min}
              max={max}
              onChange={handleChange}
              onMinus={handleVisibleStep(-1)}
              onPlus={handleVisibleStep(1)}
            />
          </FormGroup>
        </StackItem>
        <StackItem key={'expandable-noti-switch-list'}>
          <ExpandableSection
            toggleText={(expanded ? t('SHOW_LESS', { ns: 'common' }) : t('SHOW_MORE', { ns: 'common' })) || ''}
            onToggle={setExpanded}
            isExpanded={expanded}
          >
            {switches}
          </ExpandableSection>
        </StackItem>
      </Stack>
    </>
  );
};

export const NotificationControl: UserSetting = {
  titleKey: 'SETTINGS.NOTIFICATION_CONTROL.TITLE',
  descConstruct: 'SETTINGS.NOTIFICATION_CONTROL.DESCRIPTION',
  content: Component,
  category: SettingTab.NOTIFICATION_MESSAGE,
  orderInGroup: 1,
};
