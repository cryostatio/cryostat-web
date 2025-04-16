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
import { ServiceContext } from '@app/Shared/Services/Services';
import { useSubscriptions } from '@app/utils/hooks/useSubscriptions';
import { useCryostatTranslation } from '@i18n/i18nextUtil';
import {
  Bullseye,
  Button,
  DualListSelector,
  DualListSelectorTreeItemData,
  HelperText,
  HelperTextItem,
  Spinner,
  Stack,
  StackItem,
} from '@patternfly/react-core';
import * as React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { tap } from 'rxjs';
import { SettingTab, UserSetting } from '../types';

interface ReportRule {
  id: string;
  name: string;
  topic: string;
}

const Component = () => {
  const context = React.useContext(ServiceContext);
  const addSubscription = useSubscriptions();
  const dispatch = useDispatch();
  const { t } = useCryostatTranslation();
  const [loading, setLoading] = React.useState(false);
  const [allRules, setAllRules] = React.useState([] as DualListSelectorTreeItemData[]);
  const { notIds } = useSelector((state: RootState) => state.topologyConfigs.reportFilter);

  React.useEffect(() => {
    setLoading(true);
    addSubscription(
      context.api
        .doGet<ReportRule[]>('/reports_rules', 'v4.1')
        .pipe(tap(() => setLoading(false)))
        .subscribe((v) => setAllRules(treeify(v))),
    );
  }, [addSubscription, context.api, setAllRules]);

  const treeify = (rules: ReportRule[]): DualListSelectorTreeItemData[] => {
    const map = new Map<string, ReportRule[]>();
    rules.forEach((r) => {
      if (!map.has(r.topic)) {
        map.set(r.topic, []);
      }
      map.get(r.topic)!.push(r);
    });

    return Array.from(map).map((entry) => ({
      id: entry[0],
      text: entry[0],
      isChecked: false,
      defaultExpanded: true,
      hasBadge: true,
      children: entry[1].map((r) => ({
        id: r.id,
        text: r.name,
        isChecked: false,
        parentId: entry[0],
      })),
    }));
  };

  const filterTree = (
    tree: DualListSelectorTreeItemData[],
    predicate: (i: DualListSelectorTreeItemData) => boolean,
  ): DualListSelectorTreeItemData[] => {
    const a: DualListSelectorTreeItemData[] = [];
    tree.forEach((node) => {
      if (node.children?.some(predicate)) {
        a.push({
          ...node,
          children: node.children.filter(predicate),
        });
      }
    });
    return a;
  };

  const availableRules = React.useMemo(() => filterTree(allRules, (r) => !notIds.includes(r.id)), [allRules, notIds]);

  const selectedRules = React.useMemo(() => filterTree(allRules, (r) => notIds.includes(r.id)), [allRules, notIds]);

  const onAdd = React.useCallback((id: string) => dispatch(topologySetIgnoreReportResultIntent(id, true)), [dispatch]);

  const onDelete = React.useCallback(
    (id: string) => dispatch(topologySetIgnoreReportResultIntent(id, false)),
    [dispatch],
  );

  const onFilter = (option: DualListSelectorTreeItemData, input: string): boolean => {
    const attrs = [option.id, option.text];
    const isParent = (option?.children?.length ?? 0) > 0;
    const childAttrs = [...(option?.children?.map((c) => c.id) || []), ...(option?.children?.map((c) => c.text) || [])];
    return (
      attrs.some((e) => e.toLowerCase().includes(input)) ||
      (isParent && childAttrs.some((e) => e.toLowerCase().includes(input)))
    );
  };

  const onListChange = React.useCallback(
    (_evt, newAvailableOptions: DualListSelectorTreeItemData[], newChosenOptions: DualListSelectorTreeItemData[]) => {
      newAvailableOptions.forEach((n) => {
        onDelete(n.id);
        n?.children?.forEach((v) => onDelete(v.id));
      });
      newChosenOptions.forEach((n) => {
        onAdd(n.id);
        n?.children?.forEach((v) => onAdd(v.id));
      });
    },
    [onAdd, onDelete],
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
      <StackItem isFilled>
        {loading ? (
          <Bullseye>
            <Spinner />
          </Bullseye>
        ) : (
          <DualListSelector
            isTree
            isSearchable
            filterOption={onFilter}
            availableOptionsTitle={t('SETTINGS.TOPOLOGY.ANALYZED_OPTIONS_TITLE')}
            chosenOptionsTitle={t('SETTINGS.TOPOLOGY.CHOSEN_OPTIONS_TITLE')}
            availableOptions={availableRules}
            chosenOptions={selectedRules}
            onListChange={onListChange}
          />
        )}
      </StackItem>
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
