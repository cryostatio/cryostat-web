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

import CustomNode from '@app/Topology/GraphView/CustomNode';
import { NodeType, TargetNode } from '@app/Topology/typings';
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
import { Target } from '../Services/Target.service';

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
            withSelection({ multiSelect: false, controlled: true })(CustomNode)
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
  targets: TargetNode[]
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
