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

import { NullableTarget } from '@app/Shared/Services/api.types';
import { ServiceContext } from '@app/Shared/Services/Services';
import { useSubscriptions } from '@app/utils/hooks/useSubscriptions';
import { useCryostatTranslation } from '@i18n/i18nextUtil';
import {
  DualListSelector,
  DualListSelectorControl,
  DualListSelectorControlsWrapper,
  DualListSelectorList,
  DualListSelectorPane,
  DualListSelectorTree,
  DualListSelectorTreeItemData,
  SearchInput,
} from '@patternfly/react-core';
import AngleDoubleLeftIcon from '@patternfly/react-icons/dist/esm/icons/angle-double-left-icon';
import AngleDoubleRightIcon from '@patternfly/react-icons/dist/esm/icons/angle-double-right-icon';
import AngleLeftIcon from '@patternfly/react-icons/dist/esm/icons/angle-left-icon';
import AngleRightIcon from '@patternfly/react-icons/dist/esm/icons/angle-right-icon';
import * as React from 'react';
import { map } from 'rxjs';

export interface AsyncProfilerEventTreeSelectorProps {
  target: NullableTarget;
  chosenLeafIds: string[];
  onChosenLeafIdsChange: (ids: string[]) => void;
}

const getLeafIds = (node: DualListSelectorTreeItemData): string[] => {
  if (!node.children?.length) {
    return [node.id];
  }
  return node.children.flatMap(getLeafIds);
};

const convertEventsToTree = (rawEvents: string[]): DualListSelectorTreeItemData[] => {
  const out: DualListSelectorTreeItemData[] = [];
  Object.keys(rawEvents).forEach((k) => {
    const category: DualListSelectorTreeItemData = {
      id: k.trim(),
      text: k.trim(),
      isChecked: false,
      hasBadge: true,
      defaultExpanded: true,
      children: rawEvents[k].map((e) => ({
        id: e.trim(),
        text: e.trim(),
        isChecked: false,
      })),
    };
    out.push(category);
  });
  return out;
};

export const AsyncProfilerEventTreeSelector: React.FC<AsyncProfilerEventTreeSelectorProps> = ({
  target,
  chosenLeafIds,
  onChosenLeafIdsChange,
}) => {
  const { t } = useCryostatTranslation();
  const context = React.useContext(ServiceContext);
  const addSubscription = useSubscriptions();

  const [allEvents, setAllEvents] = React.useState<DualListSelectorTreeItemData[]>([]);
  const [checkedLeafIds, setCheckedLeafIds] = React.useState<string[]>([]);
  const [availableFilter, setAvailableFilter] = React.useState('');
  const [chosenFilter, setChosenFilter] = React.useState('');
  const previousTargetId = React.useRef<number | undefined>(undefined);

  React.useEffect(() => {
    if (!target) {
      setAllEvents([]);
      setCheckedLeafIds([]);
      onChosenLeafIdsChange([]);
      return;
    }

    if (previousTargetId.current !== target.id) {
      setAllEvents([]);
      setCheckedLeafIds([]);
      onChosenLeafIdsChange([]);
      previousTargetId.current = target.id;
    }

    const subscription = context.api
      .getAsyncProfilerAvailableEvents(target)
      .pipe(map(convertEventsToTree))
      .subscribe((e) => {
        if (previousTargetId.current === target.id) {
          setAllEvents(e);
        }
      });

    addSubscription(subscription);
    return () => subscription.unsubscribe();
  }, [addSubscription, target, context.api, onChosenLeafIdsChange]);

  const allLeafIds = React.useMemo(() => allEvents.flatMap(getLeafIds), [allEvents]);

  const availableLeafIds = React.useMemo(
    () => allLeafIds.filter((id) => !chosenLeafIds.includes(id)),
    [allLeafIds, chosenLeafIds],
  );

  const leavesById = React.useMemo(() => {
    const map: Record<string, string[]> = {};
    const build = (node: DualListSelectorTreeItemData) => {
      map[node.id] = getLeafIds(node);
      node.children?.forEach(build);
    };
    allEvents.forEach(build);
    return map;
  }, [allEvents]);

  const nodeTexts = React.useMemo(() => {
    const map: Record<string, string> = {};
    const build = (node: DualListSelectorTreeItemData) => {
      map[node.id] = node.text ?? node.id;
      node.children?.forEach(build);
    };
    allEvents.forEach(build);
    return map;
  }, [allEvents]);

  const matchesFilter = React.useCallback((nodeId: string, nodeText: string, filterVal: string): boolean => {
    const f = filterVal.trim().toLowerCase();
    return nodeId.toLowerCase().includes(f) || nodeText.toLowerCase().includes(f);
  }, []);

  const getVisibleLeafIds = React.useCallback(
    (leafIds: string[], filterVal: string): string[] => {
      if (!filterVal) {
        return leafIds;
      }
      const matchingNodeIds = Object.keys(leavesById).filter((nodeId) =>
        matchesFilter(nodeId, nodeTexts[nodeId] ?? '', filterVal),
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
      const filterVal = isChosen ? chosenFilter : availableFilter;
      const paneLeafIds = isChosen ? chosenLeafIds : availableLeafIds;

      return nodes.flatMap((node) => {
        const descendantLeaves = (leavesById[node.id] ?? []).filter((id) => paneLeafIds.includes(id));
        const hasMatchingChildren =
          filterVal &&
          (leavesById[node.id] ?? []).some(
            (id) => paneLeafIds.includes(id) && matchesFilter(id, nodeTexts[id] ?? '', filterVal),
          );
        const isFilterMatch =
          filterVal && matchesFilter(node.id, nodeTexts[node.id] ?? '', filterVal) && descendantLeaves.length > 0;
        const isDisplayed =
          (!filterVal && descendantLeaves.length > 0) ||
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
              defaultExpanded: filterVal ? true : node.defaultExpanded,
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

  const moveChecked = React.useCallback(
    (toChosen: boolean) => {
      const visibleCheckedAvailable = checkedLeafIds.filter((id) => visibleAvailableLeafIds.includes(id));
      const visibleCheckedChosen = checkedLeafIds.filter((id) => visibleChosenLeafIds.includes(id));
      if (toChosen) {
        onChosenLeafIdsChange([...chosenLeafIds, ...visibleCheckedAvailable]);
        setCheckedLeafIds((prev) => prev.filter((id) => !visibleCheckedAvailable.includes(id)));
      } else {
        onChosenLeafIdsChange(chosenLeafIds.filter((id) => !visibleCheckedChosen.includes(id)));
        setCheckedLeafIds((prev) => prev.filter((id) => !visibleCheckedChosen.includes(id)));
      }
    },
    [checkedLeafIds, visibleAvailableLeafIds, visibleChosenLeafIds, chosenLeafIds, onChosenLeafIdsChange],
  );

  const moveAll = React.useCallback(
    (toChosen: boolean) => {
      if (toChosen) {
        onChosenLeafIdsChange([...chosenLeafIds, ...visibleAvailableLeafIds]);
      } else {
        onChosenLeafIdsChange(chosenLeafIds.filter((id) => !visibleChosenLeafIds.includes(id)));
      }
    },
    [visibleAvailableLeafIds, visibleChosenLeafIds, chosenLeafIds, onChosenLeafIdsChange],
  );

  const buildPane = (isChosen: boolean): React.ReactNode => {
    const options = buildOptions(isChosen, allEvents, false);
    const visibleLeafIds = isChosen ? visibleChosenLeafIds : visibleAvailableLeafIds;
    const numSelected = checkedLeafIds.filter((id) => visibleLeafIds.includes(id)).length;
    const status = `${numSelected} of ${visibleLeafIds.length} options selected`;
    const filterVal = isChosen ? chosenFilter : availableFilter;
    const setFilter = isChosen ? setChosenFilter : setAvailableFilter;

    return (
      <DualListSelectorPane
        title={isChosen ? t('CreateAsyncProfilerSession.CHOSEN_EVENTS') : t('CreateAsyncProfilerSession.EVENTS')}
        status={status}
        searchInput={
          <SearchInput
            value={filterVal}
            onChange={(_evt, val) => setFilter(val)}
            onClear={() => setFilter('')}
            aria-label={isChosen ? 'Search chosen events' : 'Search available events'}
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

  return (
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
  );
};
