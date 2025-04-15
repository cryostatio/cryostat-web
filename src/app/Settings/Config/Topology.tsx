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

import {
  topologyResetReportResultIntent,
  topologySetIgnoreReportResultIntent,
} from '@app/Shared/Redux/Configurations/TopologyConfigSlice';
import { RootState } from '@app/Shared/Redux/ReduxStore';
import { useCryostatTranslation } from '@i18n/i18nextUtil';
import { Button, HelperText, HelperTextItem, Label, LabelGroup, Stack, StackItem } from '@patternfly/react-core';
import { PlusIcon } from '@patternfly/react-icons';
import * as React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { SettingTab, UserSetting } from '../types';

const Component = () => {
  const { notIds } = useSelector((state: RootState) => state.topologyConfigs.reportFilter);
  const dispatch = useDispatch();
  const { t } = useCryostatTranslation();

  const onAdd = React.useCallback(() => {
    dispatch(topologySetIgnoreReportResultIntent(t('SETTINGS.TOPOLOGY.NEW_ITEM_PLACEHOLDER'), true));
  }, [dispatch, t]);

  const onEdit = React.useCallback(
    (id: string, newText: string) => {
      dispatch(topologySetIgnoreReportResultIntent(id, false));
      dispatch(topologySetIgnoreReportResultIntent(newText, true));
    },
    [dispatch],
  );

  const onDelete = React.useCallback(
    (id: string) => {
      dispatch(topologySetIgnoreReportResultIntent(id, false));
    },
    [dispatch],
  );

  const onReset = React.useCallback(() => {
    dispatch(topologyResetReportResultIntent());
  }, [dispatch]);

  return (
    <Stack hasGutter>
      <StackItem>
        <HelperText>
          <HelperTextItem>{t('SETTINGS.TOPOLOGY.HELPER_TEXT')}</HelperTextItem>
        </HelperText>
      </StackItem>
      <LabelGroup
        isEditable
        addLabelControl={
          <Label key="add-action" color="blue" variant="outline" isOverflowLabel onClick={onAdd} icon={<PlusIcon />} />
        }
      >
        {notIds.map((id) => (
          <Label
            key={id}
            id={id}
            color="blue"
            onClose={() => onDelete(id)}
            isEditable
            onEditComplete={(_evt, newText) => onEdit(id, newText)}
          >
            {id}
          </Label>
        ))}
      </LabelGroup>
      <StackItem></StackItem>
      <StackItem>
        <Button onClick={onReset}>{t('SETTINGS.TOPOLOGY.RESET_DEFAULT')}</Button>
      </StackItem>
    </Stack>
  );
};

export const Topology: UserSetting = {
  titleKey: 'SETTINGS.TOPOLOGY.TITLE',
  descConstruct: 'SETTINGS.TOPOLOGY.DESCRIPTION',
  content: Component,
  category: SettingTab.TOPOLOGY,
};
