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
import { TopologyFilters } from '@app/Shared/Redux/Filters/TopologyFilterSlice';
import { Badge, Label, LabelGroup, TreeViewDataItem } from '@patternfly/react-core';
import * as React from 'react';
import EntityDetails from '../Shared/Entity/EntityDetails';
import {
  COLLAPSE_EXEMPTS,
  getUniqueGroupId,
  getUniqueTargetId,
  isGroupNodeFiltered,
  isTargetNodeFiltered,
  TransformConfig,
} from '../Shared/utils';
import { EnvironmentNode, isTargetNode, NodeType, TargetNode } from '../typings';

const _transformDataGroupedByTopLevel = (universe: EnvironmentNode, filters?: TopologyFilters): TreeViewDataItem[] => {
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
        children: realm.children
          .filter((child: TargetNode) => isTargetNodeFiltered(child, filters?.targetFilters.filters))
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
          <>
            <span className="topology-listview__realm-title">
              {realm.nodeType}: {realm.name}
            </span>
            <Badge>{base.children.length}</Badge>
          </>
        ),
      };
    })
    .filter((_transformRealm) => _transformRealm.children && _transformRealm.children.length);
};

const _buildFullData = (
  node: EnvironmentNode | TargetNode,
  expandMode = true,
  filters?: TopologyFilters
): TreeViewDataItem[] => {
  if (isTargetNode(node)) {
    if (!isTargetNodeFiltered(node, filters?.targetFilters.filters)) {
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
  const children = node.children.reduce((prev, curr) => prev.concat(_buildFullData(curr, expandMode, filters)), INIT);

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
        <>
          <span className="topology-listview__realm-title">
            {node.nodeType}: {node.name}
          </span>
          <Badge>{children.length}</Badge>
        </>
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
  filters?: TopologyFilters
): TreeViewDataItem[] => {
  const _transformedRoot = _buildFullData(root, expandMode, filters)[0];
  return _transformedRoot && _transformedRoot.children ? _transformedRoot.children : [];
};

export const transformData = (
  universe: EnvironmentNode,
  { showOnlyTopGroup = false, expandMode = true }: TransformConfig = {},
  filters?: TopologyFilters
): TreeViewDataItem[] => {
  return showOnlyTopGroup
    ? _transformDataGroupedByTopLevel(universe, filters)
    : _transformDataFull(universe, expandMode, filters);
};
