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
import { EnvironmentNode, NodeType, TargetNode } from '@app/Shared/Services/api.types';
import { getAllLeaves, getUniqueGroupId, getUniqueTargetId, isTargetNode } from '@app/Shared/Services/api.utils';
import {
  ColaLayout,
  ComponentFactory,
  DefaultEdge,
  EdgeModel,
  Graph,
  GraphComponent,
  isNode,
  Layout,
  LayoutFactory,
  ModelKind,
  nodeDragSourceSpec,
  Node,
  NodeModel,
  NodeShape,
  Rect,
  Visualization,
  withContextMenu,
  withDragNode,
  withPanZoom,
  withSelection,
  GraphElement,
} from '@patternfly/react-topology';
import { actionFactory } from '../Actions/utils';
import { ListElement, TransformConfig } from '../Shared/types';
import { COLLAPSE_EXEMPTS, isGraphElement, isGroupNodeFiltered, isTargetNodeFiltered } from '../Shared/utils';
import { DEFAULT_NODE_DIAMETER, DEFAULT_NODE_PADDINGS, DEFAULT_GROUP_PADDINGS } from './const';
import CustomGroup from './CustomGroup';
import CustomNode from './CustomNode';

const _buildFullNodeModel = (
  node: EnvironmentNode | TargetNode,
  expandMode = true,
  filters?: TopologyFilters,
): NodeModel[] => {
  if (isTargetNode(node)) {
    if (!isTargetNodeFiltered(node, filters?.targetFilters.filters)) {
      return [];
    }
    return [
      {
        id: getUniqueTargetId(node),
        type: 'node',
        label: node.target.alias || node.name,
        shape: NodeShape.ellipse,
        width: DEFAULT_NODE_DIAMETER,
        height: DEFAULT_NODE_DIAMETER,
        style: {
          padding: DEFAULT_NODE_PADDINGS,
        },
        data: {
          ...node,
        },
      },
    ];
  }

  const INIT: NodeModel[] = [];
  const directChildNodes: NodeModel[] = [];
  const allChildNodes = node.children.reduce((prev, curr) => {
    const next = _buildFullNodeModel(curr, expandMode, filters);
    if (next.length) {
      // First nodes are always direct children
      // If direct child is collapsed (i.e. single grandchild node),
      // that single grandchild is used as if it is direct
      directChildNodes.push(next[0]);
    }
    return prev.concat(next);
  }, INIT);

  // Do show empty or filtered-out groups
  // Note: Do not filter universe node
  if (
    !allChildNodes.length ||
    (node.nodeType !== NodeType.UNIVERSE && !isGroupNodeFiltered(node, filters?.groupFilters.filters))
  ) {
    return [];
  }

  // Collapse single-child internal nodes (realms and namespaces are exempt)
  if (!COLLAPSE_EXEMPTS.includes(node.nodeType) && !expandMode && directChildNodes.length === 1) {
    return [...allChildNodes];
  }

  const groupNode: NodeModel = {
    id: getUniqueGroupId(node),
    type: 'group',
    group: true,
    label: node.name, // Name of the node
    children: directChildNodes.map((childNode) => childNode.id),
    style: {
      padding: DEFAULT_GROUP_PADDINGS,
    },
    data: {
      ...node,
    },
  };

  return [groupNode, ...allChildNodes];
};

const _transformDataGroupedByTopLevel = (root: EnvironmentNode, filters?: TopologyFilters) => {
  let nodes: NodeModel[] = [];
  const edges: EdgeModel[] = [];

  // First layer of internal nodes
  const groupNodes = root.children
    .filter((realm: EnvironmentNode) => isGroupNodeFiltered(realm, filters?.groupFilters.filters)) // Do not show filtered-out groups
    .map((group) => {
      const realmNode: NodeModel = {
        id: getUniqueGroupId(group as EnvironmentNode),
        type: 'group',
        group: true,
        label: group.name, // Name of the node
        children: [],
        style: {
          padding: DEFAULT_GROUP_PADDINGS,
        },
        data: {
          ...group,
        },
      };
      return realmNode;
    });

  // Extract all leaves
  let leafNodes: NodeModel[] = [];
  groupNodes.forEach((groupNode) => {
    const _tNodes: NodeModel[] = getAllLeaves(groupNode.data)
      .filter((tn) => isTargetNodeFiltered(tn, filters?.targetFilters.filters))
      .map((leaf: TargetNode) => {
        return {
          id: getUniqueTargetId(leaf),
          type: 'node',
          label: leaf.target.alias || leaf.name,
          shape: NodeShape.ellipse,
          width: DEFAULT_NODE_DIAMETER,
          height: DEFAULT_NODE_DIAMETER,
          style: {
            padding: DEFAULT_NODE_PADDINGS,
          },
          data: {
            ...leaf,
          },
        };
      });

    groupNode.children = _tNodes.map((n) => n.id); // Add nodes id to group
    leafNodes = leafNodes.concat(_tNodes);
  });

  nodes = nodes.concat(groupNodes.filter((gn) => gn.children && gn.children.length)); // Do not empty groups
  nodes = nodes.concat(leafNodes);

  return {
    nodes: nodes,
    edges: edges,
  };
};

export const _transformDataFull = (root: EnvironmentNode, expandMode = true, filters?: TopologyFilters) => {
  const edges: EdgeModel[] = [];
  const nodes = _buildFullNodeModel(root, expandMode, filters).slice(1); // Remove universe node
  return {
    nodes: nodes,
    edges: edges,
  };
};

export const transformData = (
  universe: EnvironmentNode,
  { showOnlyTopGroup = false, expandMode = true }: TransformConfig = {},
  filters?: TopologyFilters,
): {
  nodes: NodeModel[];
  edges: EdgeModel[];
} => {
  return showOnlyTopGroup
    ? _transformDataGroupedByTopLevel(universe, filters)
    : _transformDataFull(universe, expandMode, filters);
};

export const getNodeById = (nodes: NodeModel[], id?: string) => {
  if (id === undefined) return undefined;
  return nodes.find((node) => node.id === id);
};

// This method sets the layout of your topology view (e.g. Force, Dagre, Cola, etc.).
// OCP is supporting only Cola
export const layoutFactory: LayoutFactory = (type: string, graph: Graph): Layout | undefined => {
  switch (type) {
    case 'Cola':
      return new ColaLayout(graph, { layoutOnDrag: false });
    default:
      console.warn(`${type} layout is not supported`);
      return undefined;
  }
};

// This method lets you customize the components in your topology view (e.g. nodes, groups, and edges)
export const componentFactory: ComponentFactory = (kind: ModelKind, type: string) => {
  switch (type) {
    case 'group':
      return withContextMenu(actionFactory)(
        withDragNode(nodeDragSourceSpec('group', false, false))(
          withSelection({ multiSelect: false, controlled: true })(CustomGroup),
        ),
      );
    default:
      switch (kind) {
        case ModelKind.graph:
          return withPanZoom()(GraphComponent);
        case ModelKind.node:
          return withContextMenu(actionFactory)(
            withDragNode(nodeDragSourceSpec('node', false, false))(
              withSelection({ multiSelect: false, controlled: true })(CustomNode),
            ),
          );
        case ModelKind.edge:
          return DefaultEdge;
        default:
          return undefined;
      }
  }
};

// Support only node details
export const isRenderable = (entity: GraphElement | ListElement) => {
  if (isGraphElement(entity)) {
    return isNode(entity);
  }
  return entity.getData() !== undefined;
};

export const nodeDistanceToBounds = (node: Node, bounds: Rect): number => {
  const nodeBounds = node.getBounds();
  const nodeX = nodeBounds.x + nodeBounds.width / 2;
  const nodeY = nodeBounds.y + nodeBounds.height / 2;

  const dx = Math.max(bounds.x - nodeX, 0, nodeX - (bounds.x + bounds.width));
  const dy = Math.max(bounds.y - nodeY, 0, nodeY - (bounds.y + bounds.height));
  return Math.sqrt(dx * dx + dy * dy);
};

// Ensure some nodes are within views in case stored locations are off screen
// FIXME: Seems to always pan into view
export const ensureGraphVisible = (visualization: Visualization) => {
  if (visualization.hasGraph()) {
    const graph = visualization.getGraph();
    const nodes = visualization.getElements().filter(isNode);

    if (nodes.length) {
      const anyVisible = nodes.find((n) => graph.isNodeInView(n, { padding: 0 }));
      if (!anyVisible) {
        const graphBounds = graph.getBounds();

        const [toPanNode, _] = nodes.reduce(
          ([closestNode, closestDistance], nextNode) => {
            const distance = nodeDistanceToBounds(nextNode, graphBounds);
            if (distance < closestDistance) {
              return [nextNode, distance];
            }
            return [closestNode, closestDistance];
          },
          [nodes[0], nodeDistanceToBounds(nodes[0], graphBounds)],
        );

        graph.panIntoView(toPanNode);
      }
    }
  }
};
