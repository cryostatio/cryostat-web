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
import { NotificationCategory, messageKeys } from '@app/Shared/Services/NotificationChannel.service';
import { ServiceContext } from '@app/Shared/Services/Services';
import { useSubscriptions } from '@app/utils/useSubscriptions';
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
import { UserSetting } from './SettingsUtils';

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
    [state, setState, context.settings]
  );

  const handleCheckAll = React.useCallback(
    (checked) => {
      const newState = new Map();
      Array.from(state.entries()).forEach((v) => newState.set(v[0], checked));
      context.settings.setNotificationsEnabled(newState);
      setState(newState);
    },
    [context.settings, setState, state]
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
    [visibleNotificationsCount, context.settings]
  );

  const handleVisibleStep = React.useCallback(
    (delta: number) => () => {
      const v = visibleNotificationsCount + delta;
      context.settings.setVisibleNotificationCount(v);
    },
    [visibleNotificationsCount, context.settings]
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
  category: 'SETTINGS.CATEGORIES.NOTIFICATION_MESSAGE',
  orderInGroup: 1,
};
