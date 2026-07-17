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
  DualListSelectorControl,
  DualListSelectorControlsWrapper,
  DualListSelectorList,
  DualListSelectorPane,
  DualListSelectorTree,
  DualListSelectorTreeItemData,
  HelperText,
  HelperTextItem,
  SearchInput,
  Spinner,
  Stack,
  StackItem,
} from '@patternfly/react-core';
import AngleDoubleLeftIcon from '@patternfly/react-icons/dist/esm/icons/angle-double-left-icon';
import AngleDoubleRightIcon from '@patternfly/react-icons/dist/esm/icons/angle-double-right-icon';
import AngleLeftIcon from '@patternfly/react-icons/dist/esm/icons/angle-left-icon';
import AngleRightIcon from '@patternfly/react-icons/dist/esm/icons/angle-right-icon';
import * as React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { tap } from 'rxjs';
import { SettingTab, UserSetting } from '../types';

interface ReportRule {
  id: string;
  name: string;
  topic: string;
}

const getLeafIds = (node: DualListSelectorTreeItemData): string[] => {
  if (!node.children?.length) {
    return [node.id];
  }
  return node.children.flatMap(getLeafIds);
};

const Component = () => {
  const context = React.useContext(ServiceContext);
  const addSubscription = useSubscriptions();
  const dispatch = useDispatch();
  const { t } = useCryostatTranslation();
  const [loading, setLoading] = React.useState(false);
  const [allRules, setAllRules] = React.useState([] as DualListSelectorTreeItemData[]);
  const { notIds } = useSelector((state: RootState) => state.topologyConfigs.reportFilter);

  const [checkedLeafIds, setCheckedLeafIds] = React.useState<string[]>([]);
  const [availableFilter, setAvailableFilter] = React.useState('');
  const [chosenFilter, setChosenFilter] = React.useState('');

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
      map.get(r.topic)!.sort((a, b) => (a.name && b.name ? a.name.localeCompare(b.name) : a.id.localeCompare(b.id)));
    });

    return Array.from(map)
      .map((entry) => ({
        id: entry[0],
        text: entry[0],
        isChecked: false,
        defaultExpanded: true,
        hasBadge: true,
        children: entry[1].map((r) => ({
          id: r.id ?? r.name,
          text: r.name ?? r.id,
          isChecked: false,
          parentId: entry[0],
        })),
      }))
      .sort((a, b) => a.id.localeCompare(b.id));
  };

  const allLeafIds = React.useMemo(() => allRules.flatMap(getLeafIds), [allRules]);

  const chosenLeafIds = React.useMemo(() => allLeafIds.filter((id) => notIds.includes(id)), [allLeafIds, notIds]);

  const availableLeafIds = React.useMemo(() => allLeafIds.filter((id) => !notIds.includes(id)), [allLeafIds, notIds]);

  const matchesFilter = React.useCallback((nodeId: string, nodeText: string, filter: string): boolean => {
    const f = filter.trim().toLowerCase();
    return nodeId.toLowerCase().includes(f) || nodeText.toLowerCase().includes(f);
  }, []);

  const leavesById = React.useMemo(() => {
    const map: Record<string, string[]> = {};
    const build = (node: DualListSelectorTreeItemData) => {
      map[node.id] = getLeafIds(node);
      node.children?.forEach(build);
    };
    allRules.forEach(build);
    return map;
  }, [allRules]);

  const nodeTexts = React.useMemo(() => {
    const map: Record<string, string> = {};
    const build = (node: DualListSelectorTreeItemData) => {
      map[node.id] = node.text ?? node.id;
      node.children?.forEach(build);
    };
    allRules.forEach(build);
    return map;
  }, [allRules]);

  const getVisibleLeafIds = React.useCallback(
    (leafIds: string[], filter: string): string[] => {
      if (!filter) {
        return leafIds;
      }
      const matchingNodeIds = Object.keys(leavesById).filter((nodeId) =>
        matchesFilter(nodeId, nodeTexts[nodeId] ?? '', filter),
      );
      const matchingLeafIds = matchingNodeIds.flatMap((nodeId) => leavesById[nodeId]);
      return leafIds.filter((id) => matchingLeafIds.includes(id));
    },
    [leavesById, nodeTexts, matchesFilter],
  );

  const visibleAvailableLeafIds = React.useMemo(
    () => getVisibleLeafIds(availableLeafIds, availableFilter),
    [availableLeafIds, availableFilter, getVisibleLeafIds],
  );

  const visibleChosenLeafIds = React.useMemo(
    () => getVisibleLeafIds(chosenLeafIds, chosenFilter),
    [chosenLeafIds, chosenFilter, getVisibleLeafIds],
  );

  const onAdd = React.useCallback((id: string) => dispatch(topologySetIgnoreReportResultIntent(id, true)), [dispatch]);

  const onDelete = React.useCallback(
    (id: string) => dispatch(topologySetIgnoreReportResultIntent(id, false)),
    [dispatch],
  );

  React.useEffect(() => {
    if (!allRules?.length) {
      return;
    }
    let extraneousIds = [...notIds];
    allRules.forEach((n) => {
      extraneousIds = extraneousIds.filter((i) => i === n.id);
      n?.children?.forEach((c) => {
        extraneousIds = extraneousIds.filter((i) => i === c.id);
      });
    });
    extraneousIds.forEach((id) => onDelete(id));
  }, [allRules, notIds, onDelete]);

  const moveChecked = React.useCallback(
    (toChosen: boolean) => {
      const visibleCheckedAvailable = checkedLeafIds.filter((id) => visibleAvailableLeafIds.includes(id));
      const visibleCheckedChosen = checkedLeafIds.filter((id) => visibleChosenLeafIds.includes(id));
      if (toChosen) {
        visibleCheckedAvailable.forEach(onAdd);
        setCheckedLeafIds((prev) => prev.filter((id) => !visibleCheckedAvailable.includes(id)));
      } else {
        visibleCheckedChosen.forEach(onDelete);
        setCheckedLeafIds((prev) => prev.filter((id) => !visibleCheckedChosen.includes(id)));
      }
    },
    [checkedLeafIds, visibleAvailableLeafIds, visibleChosenLeafIds, onAdd, onDelete],
  );

  const moveAll = React.useCallback(
    (toChosen: boolean) => {
      if (toChosen) {
        visibleAvailableLeafIds.forEach(onAdd);
      } else {
        visibleChosenLeafIds.forEach(onDelete);
      }
    },
    [visibleAvailableLeafIds, visibleChosenLeafIds, onAdd, onDelete],
  );

  const areAllDescendantsChecked = React.useCallback(
    (node: DualListSelectorTreeItemData, isChosen: boolean): boolean => {
      const leaves = leavesById[node.id] ?? [];
      return leaves.every(
        (id) => checkedLeafIds.includes(id) && (isChosen ? chosenLeafIds.includes(id) : availableLeafIds.includes(id)),
      );
    },
    [leavesById, checkedLeafIds, chosenLeafIds, availableLeafIds],
  );

  const areSomeDescendantsChecked = React.useCallback(
    (node: DualListSelectorTreeItemData, isChosen: boolean): boolean => {
      const leaves = leavesById[node.id] ?? [];
      return leaves.some(
        (id) => checkedLeafIds.includes(id) && (isChosen ? chosenLeafIds.includes(id) : availableLeafIds.includes(id)),
      );
    },
    [leavesById, checkedLeafIds, chosenLeafIds, availableLeafIds],
  );

  const isNodeChecked = React.useCallback(
    (node: DualListSelectorTreeItemData, isChosen: boolean): boolean | null => {
      if (areAllDescendantsChecked(node, isChosen)) return true;
      if (areSomeDescendantsChecked(node, isChosen)) return null;
      return false;
    },
    [areAllDescendantsChecked, areSomeDescendantsChecked],
  );

  const onOptionCheck = React.useCallback(
    (
      _event: React.MouseEvent | React.ChangeEvent<HTMLInputElement> | React.KeyboardEvent,
      isChecked: boolean,
      node: DualListSelectorTreeItemData,
      isChosen: boolean,
    ) => {
      const nodeLeaves = (leavesById[node.id] ?? []).filter((id) =>
        isChosen ? visibleChosenLeafIds.includes(id) : visibleAvailableLeafIds.includes(id),
      );
      setCheckedLeafIds((prev) => {
        const others = prev.filter((id) => !nodeLeaves.includes(id));
        return isChecked ? [...others, ...nodeLeaves] : others;
      });
    },
    [leavesById, visibleAvailableLeafIds, visibleChosenLeafIds],
  );

  const buildOptions = React.useCallback(
    (
      isChosen: boolean,
      nodes: DualListSelectorTreeItemData[],
      hasParentMatch: boolean,
    ): DualListSelectorTreeItemData[] => {
      const filter = isChosen ? chosenFilter : availableFilter;
      const paneLeafIds = isChosen ? chosenLeafIds : availableLeafIds;

      return nodes.flatMap((node) => {
        const descendantLeaves = (leavesById[node.id] ?? []).filter((id) => paneLeafIds.includes(id));
        const hasMatchingChildren =
          filter &&
          (leavesById[node.id] ?? []).some(
            (id) => paneLeafIds.includes(id) && matchesFilter(id, nodeTexts[id] ?? '', filter),
          );
        const isFilterMatch =
          filter && matchesFilter(node.id, nodeTexts[node.id] ?? '', filter) && descendantLeaves.length > 0;
        const isDisplayed =
          (!filter && descendantLeaves.length > 0) ||
          hasMatchingChildren ||
          (hasParentMatch && descendantLeaves.length > 0) ||
          isFilterMatch;

        if (isDisplayed) {
          const checked = isNodeChecked(node, isChosen);
          return [
            {
              id: node.id,
              text: node.text,
              isChecked: checked === true,
              checkProps: { 'aria-label': `Select ${node.text ?? node.id}` },
              hasBadge: (node.children?.length ?? 0) > 0,
              badgeProps: { isRead: true },
              defaultExpanded: filter ? true : node.defaultExpanded,
              children: node.children
                ? buildOptions(isChosen, node.children, isFilterMatch || hasParentMatch)
                : undefined,
            },
          ];
        }
        if (node.children?.length) {
          return buildOptions(isChosen, node.children, hasParentMatch);
        }
        return [];
      });
    },
    [
      chosenFilter,
      availableFilter,
      chosenLeafIds,
      availableLeafIds,
      leavesById,
      nodeTexts,
      matchesFilter,
      isNodeChecked,
    ],
  );

  const buildPane = (isChosen: boolean): React.ReactNode => {
    const options = buildOptions(isChosen, allRules, false);
    const visibleLeafIds = isChosen ? visibleChosenLeafIds : visibleAvailableLeafIds;
    const numSelected = checkedLeafIds.filter((id) => visibleLeafIds.includes(id)).length;
    const status = `${numSelected} of ${visibleLeafIds.length} options selected`;
    const filter = isChosen ? chosenFilter : availableFilter;
    const setFilter = isChosen ? setChosenFilter : setAvailableFilter;
    const title = isChosen
      ? t('SETTINGS.TOPOLOGY.CHOSEN_OPTIONS_TITLE')
      : t('SETTINGS.TOPOLOGY.ANALYZED_OPTIONS_TITLE');

    return (
      <DualListSelectorPane
        title={title}
        status={status}
        searchInput={
          <SearchInput
            value={filter}
            onChange={(_evt, val) => setFilter(val)}
            onClear={() => setFilter('')}
            aria-label={isChosen ? 'Search chosen options' : 'Search available options'}
          />
        }
        isChosen={isChosen}
      >
        {options.length > 0 && (
          <DualListSelectorList>
            <DualListSelectorTree
              data={options}
              onOptionCheck={(e, isChecked, itemData) => onOptionCheck(e, isChecked, itemData, isChosen)}
            />
          </DualListSelectorList>
        )}
      </DualListSelectorPane>
    );
  };

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
          <DualListSelector isTree>
            {buildPane(false)}
            <DualListSelectorControlsWrapper>
              <DualListSelectorControl
                isDisabled={!checkedLeafIds.some((id) => visibleAvailableLeafIds.includes(id))}
                onClick={() => moveChecked(true)}
                aria-label="Add selected"
                icon={<AngleRightIcon />}
              />
              <DualListSelectorControl
                isDisabled={visibleAvailableLeafIds.length === 0}
                onClick={() => moveAll(true)}
                aria-label="Add all"
                icon={<AngleDoubleRightIcon />}
              />
              <DualListSelectorControl
                isDisabled={visibleChosenLeafIds.length === 0}
                onClick={() => moveAll(false)}
                aria-label="Remove all"
                icon={<AngleDoubleLeftIcon />}
              />
              <DualListSelectorControl
                isDisabled={!checkedLeafIds.some((id) => visibleChosenLeafIds.includes(id))}
                onClick={() => moveChecked(false)}
                aria-label="Remove selected"
                icon={<AngleLeftIcon />}
              />
            </DualListSelectorControlsWrapper>
            {buildPane(true)}
          </DualListSelector>
        )}
      </StackItem>
      <StackItem>
        <Button onClick={onReset}>{t('SETTINGS.TOPOLOGY.RESET_DEFAULT')}</Button>
      </StackItem>
    </Stack>
  );
};

export const TopologyConfig: UserSetting = {
  titleKey: 'SETTINGS.TOPOLOGY.TITLE',
  descConstruct: 'SETTINGS.TOPOLOGY.DESCRIPTION',
  content: Component,
  category: SettingTab.TOPOLOGY,
};
