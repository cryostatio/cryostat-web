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
import {
  ColaLayout,
  ComponentFactory,
  DefaultEdge,
  EdgeModel,
  Graph,
  GraphComponent,
  GraphElement,
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
} from '@patternfly/react-topology';
import {
  actionFactory,
  COLLAPSE_EXEMPTS,
  getAllLeaves,
  getUniqueGroupId,
  getUniqueTargetId,
  isGraphElement,
  isGroupNodeFiltered,
  isTargetNodeFiltered,
  ListElement,
  TransformConfig,
} from '../Shared/utils';
import { EnvironmentNode, isTargetNode, NodeType, TargetNode } from '../typings';
import CustomGroup from './CustomGroup';
import CustomNode from './CustomNode';

// Unit: px
export const DEFAULT_NODE_DIAMETER = 80;

export const DEFAULT_GROUP_PADDING = 30;
export const DEFAULT_NODE_PADDING = 60;

export const DEFAULT_NODE_PADDINGS = [0, DEFAULT_NODE_PADDING];
export const DEFAULT_GROUP_PADDINGS = [
  DEFAULT_GROUP_PADDING,
  DEFAULT_GROUP_PADDING,
  DEFAULT_GROUP_PADDING + 15,
  DEFAULT_GROUP_PADDING,
];

export const RESOURCE_NAME_TRUNCATE_LENGTH = 20;

const _buildFullNodeModel = (
  node: EnvironmentNode | TargetNode,
  expandMode = true,
  filters?: TopologyFilters
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
  filters?: TopologyFilters
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
      return withDragNode(nodeDragSourceSpec('group', false, false))(
        withSelection({ multiSelect: false, controlled: true })(CustomGroup)
      );
    default:
      switch (kind) {
        case ModelKind.graph:
          return withPanZoom()(GraphComponent);
        case ModelKind.node:
          return withContextMenu(actionFactory)(
            withDragNode(nodeDragSourceSpec('node', false, false))(
              withSelection({ multiSelect: false, controlled: true })(CustomNode)
            )
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
          [nodes[0], nodeDistanceToBounds(nodes[0], graphBounds)]
        );

        graph.panIntoView(toPanNode);
      }
    }
  }
};
