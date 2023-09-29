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

import { Target, TargetNode, NodeType } from '@app/Shared/Services/api.types';
import CustomNode from '@app/Topology/GraphView/CustomNode';
import { hashCode } from '@app/utils/utils';
import {
  ComponentFactory,
  DefaultEdge,
  DefaultGroup,
  EdgeModel,
  Graph,
  GraphComponent,
  GridLayout,
  Layout,
  LayoutFactory,
  ModelKind,
  nodeDragSourceSpec,
  NodeModel,
  NodeShape,
  withDragNode,
  withPanZoom,
  withSelection,
} from '@patternfly/react-topology';

export const layoutFactory: LayoutFactory = (type: string, graph: Graph): Layout | undefined => {
  switch (type) {
    case 'Grid':
      return new GridLayout(graph, { layoutOnDrag: false });
    default:
      console.warn(`${type} layout is not supported`);
      return undefined;
  }
};

// This method lets you customize the components in your topology view (e.g. nodes, groups, and edges)
export const componentFactory: ComponentFactory = (kind: ModelKind, type: string) => {
  switch (type) {
    case 'group':
      return DefaultGroup;
    default:
      switch (kind) {
        case ModelKind.graph:
          return withPanZoom()(GraphComponent);
        case ModelKind.node:
          return withDragNode(nodeDragSourceSpec('node', false, false))(
            withSelection({ multiSelect: false, controlled: true })(CustomNode),
          );
        case ModelKind.edge:
          return DefaultEdge;
        default:
          return undefined;
      }
  }
};

export const createTargetNode = (target: Target): TargetNode => {
  return {
    id: hashCode(JSON.stringify(target)),
    name: target.connectUrl,
    nodeType: NodeType.TARGET,
    labels: {},
    target: target,
  };
};

const DEFAULT_NODE_DIAMETER = 50;
const DEFAULT_NODE_PADDINGS = [0, 35];

export const transformData = (
  targets: TargetNode[],
): {
  nodes: NodeModel[];
  edges: EdgeModel[];
} => {
  return {
    nodes: targets.map((tn) => ({
      id: tn.target.connectUrl,
      type: 'node',
      label: tn.target.alias || tn.target.connectUrl,
      shape: NodeShape.ellipse,
      width: DEFAULT_NODE_DIAMETER,
      height: DEFAULT_NODE_DIAMETER,
      style: {
        padding: DEFAULT_NODE_PADDINGS,
      },
      data: {
        ...tn,
      },
    })),
    edges: [],
  };
};
