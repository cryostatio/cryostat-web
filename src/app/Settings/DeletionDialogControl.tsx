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

import { DeleteOrDisableWarningType, getFromWarningMap } from '@app/Modal/DeleteWarningUtils';
import { ServiceContext } from '@app/Shared/Services/Services';
import {
  ExpandableSection,
  FormGroup,
  HelperText,
  HelperTextItem,
  Stack,
  StackItem,
  Switch,
} from '@patternfly/react-core';
import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { SettingTab, UserSetting } from './SettingsUtils';

const Component = () => {
  const [t] = useTranslation();
  const context = React.useContext(ServiceContext);
  const [state, setState] = React.useState(context.settings.deletionDialogsEnabled());
  const [expanded, setExpanded] = React.useState(false);

  const handleCheckboxChange = React.useCallback(
    (checked, element) => {
      state.set(DeleteOrDisableWarningType[element.target.id], checked);
      context.settings.setDeletionDialogsEnabled(state);
      setState(new Map(state));
    },
    [state, setState, context.settings],
  );

  const handleCheckAll = React.useCallback(
    (checked) => {
      const newState = new Map();
      Array.from(state.entries()).forEach((v) => newState.set(v[0], checked));
      context.settings.setDeletionDialogsEnabled(newState);
      setState(newState);
    },
    [context.settings, setState, state],
  );

  const allChecked = React.useMemo(() => {
    return Array.from(state.entries())
      .map((e) => e[1])
      .reduce((a, b) => a && b);
  }, [state]);

  const switches = React.useMemo(() => {
    return Array.from(state.entries(), ([key, value]) => (
      <StackItem key={key}>
        <Switch
          id={key}
          label={getFromWarningMap(key)?.label || key.toString()}
          isChecked={value}
          onChange={handleCheckboxChange}
        />
      </StackItem>
    ));
  }, [handleCheckboxChange, state]);

  return (
    <>
      <Stack hasGutter>
        <StackItem key="all-deletion-warnings">
          <FormGroup>
            <HelperText>
              <HelperTextItem>{t('SETTINGS.DELETION_DIALOG_CONTROL.SWITCH_DESCRIPTION')}</HelperTextItem>
            </HelperText>
            <Switch
              id="all-deletion-warnings"
              label={t('SETTINGS.DELETION_DIALOG_CONTROL.SWITCH_LABEL')}
              isChecked={allChecked}
              onChange={handleCheckAll}
            />
          </FormGroup>
        </StackItem>
        <StackItem key={'expandable-delete-warning-switch-list'}>
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

export const DeletionDialogControl: UserSetting = {
  titleKey: 'SETTINGS.DELETION_DIALOG_CONTROL.TITLE',
  descConstruct: 'SETTINGS.DELETION_DIALOG_CONTROL.DESCRIPTION',
  content: Component,
  category: SettingTab.NOTIFICATION_MESSAGE,
};
