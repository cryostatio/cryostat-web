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

import { DurationPicker } from '@app/DurationPicker/DurationPicker';
import { NullableTarget } from '@app/Shared/Services/api.types';
import { ServiceContext } from '@app/Shared/Services/Services';
import { TargetView } from '@app/TargetView/TargetView';
import { useSubscriptions } from '@app/utils/hooks/useSubscriptions';
import { toPath } from '@app/utils/utils';
import { useCryostatTranslation } from '@i18n/i18nextUtil';
import {
  ActionGroup,
  Bullseye,
  Button,
  Card,
  CardBody,
  Content,
  ContentVariants,
  DualListSelector,
  DualListSelectorControl,
  DualListSelectorControlsWrapper,
  DualListSelectorList,
  DualListSelectorPane,
  DualListSelectorTree,
  DualListSelectorTreeItemData,
  Form,
  FormGroup,
  SearchInput,
  Spinner,
} from '@patternfly/react-core';
import AngleDoubleLeftIcon from '@patternfly/react-icons/dist/esm/icons/angle-double-left-icon';
import AngleDoubleRightIcon from '@patternfly/react-icons/dist/esm/icons/angle-double-right-icon';
import AngleLeftIcon from '@patternfly/react-icons/dist/esm/icons/angle-left-icon';
import AngleRightIcon from '@patternfly/react-icons/dist/esm/icons/angle-right-icon';
import _ from 'lodash';
import * as React from 'react';
import { useNavigate } from 'react-router-dom-v5-compat';
import { filter, map } from 'rxjs';

const MILLIS = 1000;

const getLeafIds = (node: DualListSelectorTreeItemData): string[] => {
  if (!node.children?.length) {
    return [node.id];
  }
  return node.children.flatMap(getLeafIds);
};

export const CreateAsyncProfilerSession: React.FC = () => {
  const { t } = useCryostatTranslation();
  const context = React.useContext(ServiceContext);
  const addSubscription = useSubscriptions();
  const navigate = useNavigate();

  const [target, setTarget] = React.useState<NullableTarget>(undefined);
  const [allEvents, setAllEvents] = React.useState<DualListSelectorTreeItemData[]>([]);
  const [duration, setDuration] = React.useState(0);
  const [durationUnits, setDurationUnits] = React.useState(MILLIS);
  const [loading, setLoading] = React.useState(true);

  const [checkedLeafIds, setCheckedLeafIds] = React.useState<string[]>([]);
  const [chosenLeafIds, setChosenLeafIds] = React.useState<string[]>([]);
  const [availableFilter, setAvailableFilter] = React.useState('');
  const [chosenFilter, setChosenFilter] = React.useState('');

  React.useEffect(() => {
    addSubscription(context.target.target().subscribe((t) => setTarget(t)));
  }, [addSubscription, context, context.target, setTarget]);

  const convertEventsToTree = React.useCallback((rawEvents: string[]): DualListSelectorTreeItemData[] => {
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
  }, []);

  React.useEffect(() => {
    if (!target) {
      return;
    }
    addSubscription(
      context.api
        .getAsyncProfilerAvailableEvents(target)
        .pipe(map(convertEventsToTree))
        .subscribe((e) => {
          setAllEvents(e);
          setLoading(false);
        }),
    );
  }, [addSubscription, target, context.api, convertEventsToTree]);

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
        setChosenLeafIds((prev) => [...prev, ...visibleCheckedAvailable]);
        setCheckedLeafIds((prev) => prev.filter((id) => !visibleCheckedAvailable.includes(id)));
      } else {
        setChosenLeafIds((prev) => prev.filter((id) => !visibleCheckedChosen.includes(id)));
        setCheckedLeafIds((prev) => prev.filter((id) => !visibleCheckedChosen.includes(id)));
      }
    },
    [checkedLeafIds, visibleAvailableLeafIds, visibleChosenLeafIds],
  );

  const moveAll = React.useCallback(
    (toChosen: boolean) => {
      if (toChosen) {
        setChosenLeafIds((prev) => [...prev, ...visibleAvailableLeafIds]);
      } else {
        setChosenLeafIds((prev) => prev.filter((id) => !visibleChosenLeafIds.includes(id)));
      }
    },
    [visibleAvailableLeafIds, visibleChosenLeafIds],
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

  const exitForm = React.useCallback(() => navigate(toPath('/async-profiler')), [navigate]);

  const handleSubmit = React.useCallback(() => {
    if (!target) {
      throw new Error('invalid state: must have a target selection');
    }
    const events = _.sortedUniq(chosenLeafIds.slice().sort());
    if (!events.length) {
      throw new Error('invalid state: no events');
    }
    if (duration < 1) {
      throw new Error('invalid state: duration must be positive');
    }
    addSubscription(
      context.api
        .startAsyncProfile(target, events, (duration * durationUnits) / MILLIS)
        .pipe(filter((e) => e?.ok ?? true))
        .subscribe(() => exitForm()),
    );
  }, [addSubscription, target, context.api, chosenLeafIds, duration, durationUnits, exitForm]);

  return (
    <TargetView pageTitle="Create" breadcrumbs={[{ title: 'async-profiler', path: toPath('/async-profiler') }]}>
      <Card>
        <CardBody>
          {loading ? (
            <Bullseye>
              <Spinner />
            </Bullseye>
          ) : (
            <Form isHorizontal>
              <Content>
                <Content component={ContentVariants.p}>{t('CreateAsyncProfilerSession.DESCRIPTION')}</Content>
              </Content>
              <FormGroup label={t('CreateAsyncProfilerSession.EVENTS')} fieldId="events" isRequired>
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
              </FormGroup>
              <FormGroup label={t('CreateAsyncProfilerSession.DURATION')} fieldId="duration" isRequired>
                <DurationPicker
                  enabled={true}
                  onPeriodChange={setDuration}
                  onUnitScalarChange={setDurationUnits}
                  period={duration}
                  unitScalar={durationUnits}
                />
              </FormGroup>
              <ActionGroup>
                <Button variant="primary" onClick={handleSubmit} isDisabled={!chosenLeafIds.length || duration < 1}>
                  {t('CREATE')}
                </Button>
                <Button variant="secondary" onClick={exitForm}>
                  {t('CANCEL')}
                </Button>
              </ActionGroup>
            </Form>
          )}
        </CardBody>
      </Card>
    </TargetView>
  );
};

export default CreateAsyncProfilerSession;
