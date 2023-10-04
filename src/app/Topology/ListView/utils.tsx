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
import { TopologyFilters } from '@app/Shared/Redux/Filters/TopologyFilterSlice';
import { EnvironmentNode, Target, TargetNode, NodeType } from '@app/Shared/Services/api.types';
import {
  getAllLeaves,
  getUniqueGroupId,
  getUniqueTargetId,
  includesTarget,
  isTargetNode,
} from '@app/Shared/Services/api.utils';
import { Badge, Flex, FlexItem, Label, LabelGroup, TreeViewDataItem } from '@patternfly/react-core';
import { ActionDropdown } from '../Actions/NodeActions';
import { actionFactory } from '../Actions/utils';
import EntityDetails from '../Entity/EntityDetails';
import type { TransformConfig } from '../Shared/types';
import { COLLAPSE_EXEMPTS, isGroupNodeFiltered, isTargetNodeFiltered } from '../Shared/utils';

const _transformDataGroupedByTopLevel = (
  universe: EnvironmentNode,
  filters?: TopologyFilters,
  includeOnlyTargets?: Target[],
): TreeViewDataItem[] => {
  return universe.children
    .filter((realm: EnvironmentNode) => isGroupNodeFiltered(realm, filters?.groupFilters.filters))
    .map((realm: EnvironmentNode) => {
      const base = {
        id: getUniqueGroupId(realm),
        name: (
          <LabelGroup categoryName="Labels">
            {Object.keys(realm.labels)
              .map((k) => `${k}=${realm.labels[k]}`)
              .map((l) => (
                <Label key={l} isCompact color="blue">
                  {l}
                </Label>
              ))}
          </LabelGroup>
        ),
        children: getAllLeaves(realm)
          .filter(
            (child: TargetNode) =>
              isTargetNodeFiltered(child, filters?.targetFilters.filters) &&
              (!includeOnlyTargets || includesTarget(includeOnlyTargets, child.target)),
          )
          .map((child: TargetNode) => ({
            id: `${child.name}-wrapper`,
            name: null,
            children: [
              {
                id: child.name,
                name: (
                  <EntityDetails
                    className="topology__list-view__entity-details"
                    entity={{ getData: () => child }}
                    columnModifier={{ default: '3Col' }}
                  />
                ),
              },
            ],
            title: (
              <>
                {child.target.alias}
                <Badge style={{ marginLeft: '0.5em' }}>{child.nodeType}</Badge>
              </>
            ),
          })),
      };

      return {
        ...base,
        title: (
          <Flex>
            <FlexItem flex={{ default: 'flex_1' }}>
              <span className="topology-listview__realm-title">
                {realm.nodeType}: {realm.name}
              </span>
              <Badge>{base.children.length}</Badge>
            </FlexItem>
            <FlexItem>
              <ActionDropdown
                className="entity-overview__action-menu"
                actions={actionFactory({ getData: () => realm }, 'dropdownItem')}
              />
            </FlexItem>
          </Flex>
        ),
      };
    })
    .filter((_transformRealm) => _transformRealm.children && _transformRealm.children.length);
};

const _buildFullData = (
  node: EnvironmentNode | TargetNode,
  expandMode = true,
  filters?: TopologyFilters,
  includeOnlyTargets?: Target[],
): TreeViewDataItem[] => {
  if (isTargetNode(node)) {
    if (
      !isTargetNodeFiltered(node, filters?.targetFilters.filters) ||
      (includeOnlyTargets && !includesTarget(includeOnlyTargets, node.target))
    ) {
      return [];
    }

    return [
      {
        id: `${node.name}-wrapper`,
        name: null,
        // Break target details to another level to allow expand/collapse
        children: [
          {
            id: getUniqueTargetId(node),
            name: (
              <EntityDetails
                className="topology__list-view__entity-details"
                entity={{ getData: () => node }}
                columnModifier={{ default: '3Col' }}
              />
            ),
          },
        ],
        title: (
          <>
            {node.target.alias}
            <Badge style={{ marginLeft: '0.5em' }}>{node.nodeType}</Badge>
          </>
        ),
      },
    ];
  }

  const INIT: TreeViewDataItem[] = [];
  const children = node.children.reduce(
    (prev, curr) => prev.concat(_buildFullData(curr, expandMode, filters, includeOnlyTargets)),
    INIT,
  );

  // Do show empty or filtered-out groups
  if (
    !children.length ||
    (node.nodeType !== NodeType.UNIVERSE && !isGroupNodeFiltered(node, filters?.groupFilters.filters))
  ) {
    return [];
  }

  // Collapse single-child internal nodes (realms and namespaces are exempt)
  if (!COLLAPSE_EXEMPTS.includes(node.nodeType) && !expandMode && children.length === 1) {
    return [...children];
  }

  return [
    {
      id: getUniqueGroupId(node),
      title: (
        <Flex>
          <FlexItem flex={{ default: 'flex_1' }}>
            <span className="topology-listview__realm-title">
              {node.nodeType}: {node.name}
            </span>
            <Badge>{children.length}</Badge>
          </FlexItem>
          <FlexItem>
            <ActionDropdown
              className="entity-overview__action-menu"
              actions={actionFactory({ getData: () => node }, 'dropdownItem')}
            />
          </FlexItem>
        </Flex>
      ),
      name: (
        <LabelGroup categoryName="Labels">
          {Object.keys(node.labels)
            .map((k) => `${k}=${node.labels[k]}`)
            .map((l) => (
              <Label key={l} isCompact color="blue">
                {l}
              </Label>
            ))}
        </LabelGroup>
      ),
      children: children,
    },
  ];
};

const _transformDataFull = (
  root: EnvironmentNode,
  expandMode = true,
  filters?: TopologyFilters,
  includeOnlyTargets?: Target[],
): TreeViewDataItem[] => {
  const _transformedRoot = _buildFullData(root, expandMode, filters, includeOnlyTargets)[0];
  return _transformedRoot && _transformedRoot.children ? _transformedRoot.children : [];
};

export const transformData = (
  universe: EnvironmentNode,
  { showOnlyTopGroup = false, expandMode = true }: TransformConfig = {},
  filters?: TopologyFilters,
  includeOnlyTargets?: Target[],
): TreeViewDataItem[] => {
  return showOnlyTopGroup
    ? _transformDataGroupedByTopLevel(universe, filters, includeOnlyTargets)
    : _transformDataFull(universe, expandMode, filters, includeOnlyTargets);
};
