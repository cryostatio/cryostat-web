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
import { RootState } from '@app/Shared/Redux/ReduxStore';
import { getFromLocalStorage, saveToLocalStorage } from '@app/utils/LocalStorage';
import { Divider, Stack, StackItem } from '@patternfly/react-core';
import { css } from '@patternfly/react-styles';
import {
  BOTTOM_LAYER,
  DEFAULT_LAYER,
  GraphElement,
  GRAPH_POSITION_CHANGE_EVENT,
  GROUPS_LAYER,
  Model,
  NODE_POSITIONED_EVENT,
  ScaleExtent,
  SelectionEventListener,
  SELECTION_EVENT,
  TopologyView,
  TOP_LAYER,
  Visualization,
  VisualizationProvider,
  VisualizationSurface,
} from '@patternfly/react-topology';
import * as _ from 'lodash';
import * as React from 'react';
import { useSelector } from 'react-redux';
import { QuickSearchContextMenu } from '../Actions/QuickSearchPanel';
import EntityDetails from '../Shared/Entity/EntityDetails';
import { TopologyEmptyState } from '../Shared/TopologyEmptyState';
import { TopologyExceedLimitState } from '../Shared/TopologyExceedLimitState';
import {
  DiscoveryTreeContext,
  MatchedTargetsServiceContext,
  TransformConfig,
  useMatchedTargetsSvcSource,
} from '../Shared/utils';
import { TopologySideBar } from '../SideBar/TopologySideBar';
import { TopologyToolbar, TopologyToolbarVariant } from '../Toolbar/TopologyToolbar';
import { TopologyControlBar } from './TopologyControlBar';
import { componentFactory, getNodeById, layoutFactory, transformData } from './UtilsFactory';

export const MAX_NODE_LIMIT = 100;

export const DEFAULT_SIZEBAR_SIZE = 500;
export const MIN_SIZEBAR_SIZE = 400;

export const TOPOLOGY_GRAPH_ID = 'cryostat-target-topology-graph';

export type SavedGraphPosition = {
  id?: string;
  type?: string;
  x?: number;
  y?: number;
  scale?: number;
  scaleExtent?: ScaleExtent;
};

export type SavedNodePosition = {
  id?: string;
  x?: number;
  y?: number;
  collapsed?: boolean;
};

export interface TopologyGraphViewProps {
  transformConfig?: TransformConfig;
}

export const TopologyGraphView: React.FC<TopologyGraphViewProps> = ({ transformConfig, ...props }) => {
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]); // selectedIds is exactly matched by VisualizationSurface
  const [selectedEntity, setSelectedEntity] = React.useState<GraphElement>();
  const [showGraphAnyway, setShowGraphAnyway] = React.useState(false);
  const matchedTargetsSvcSource = useMatchedTargetsSvcSource();

  const filters = useSelector((state: RootState) => state.topologyFilters);

  const handleDrawerClose = React.useCallback(() => setSelectedIds([]), [setSelectedIds]);

  const discoveryTree = React.useContext(DiscoveryTreeContext);
  const _transformData = React.useMemo(
    () => transformData(discoveryTree, transformConfig, filters),
    [discoveryTree, transformConfig, filters]
  );

  const exceedLimit = React.useMemo(() => _transformData.nodes.length > MAX_NODE_LIMIT, [_transformData]);

  const isEmptyGraph = React.useMemo(
    () => !_transformData.nodes.some((node) => node.type === 'node'),
    [_transformData]
  );

  const _createVisualization = React.useCallback(() => {
    const _newVisualization = new Visualization();

    // Register factory for a layout variant
    _newVisualization.registerLayoutFactory(layoutFactory);

    // Register factory for each node variant
    _newVisualization.registerComponentFactory(componentFactory);

    // Selection event
    _newVisualization.addEventListener<SelectionEventListener>(SELECTION_EVENT, (ids) => {
      setSelectedIds(ids);
      setSelectedEntity(ids[0] ? _newVisualization.getElementById(ids[0]) : undefined);
    });

    _newVisualization.addEventListener(
      GRAPH_POSITION_CHANGE_EVENT,
      _.debounce(() => {
        const { graph } = _newVisualization.toModel();
        if (graph) {
          const saved: SavedGraphPosition = {
            id: graph.id,
            type: graph.type,
            x: graph.x,
            y: graph.y,
            scale: graph.scale,
            scaleExtent: graph.scaleExtent,
          };
          saveToLocalStorage('TOPOLOGY_GRAPH_POSITONS', saved);
        }
      }, 200)
    );

    _newVisualization.addEventListener(
      NODE_POSITIONED_EVENT,
      _.debounce(() => {
        const { nodes } = _newVisualization.toModel();
        if (nodes) {
          const savedPos: SavedNodePosition[] = nodes.map((n) => ({
            id: n.id,
            x: n.x,
            y: n.y,
            collapsed: n.collapsed,
          }));
          saveToLocalStorage('TOPOLOGY_NODE_POSITIONS', savedPos);
        }
      }, 200)
    );
    return _newVisualization;
  }, [setSelectedIds, setSelectedEntity]);

  const visualizationRef = React.useRef(_createVisualization());
  const visualization = visualizationRef.current;

  React.useEffect(() => {
    const graphData: SavedGraphPosition = getFromLocalStorage('TOPOLOGY_GRAPH_POSITONS', {});
    const nodePositions: SavedNodePosition[] = getFromLocalStorage('TOPOLOGY_NODE_POSITIONS', []);

    const model: Model = {
      nodes: _transformData.nodes.map((n) => {
        const savedData = nodePositions.find((ps) => ps.id === n.id);
        if (savedData) {
          n = {
            ...n,
            x: savedData.x,
            y: savedData.y,
            collapsed: savedData.collapsed,
          };
        }
        return n;
      }),
      edges: _transformData.edges,
      graph: {
        id: TOPOLOGY_GRAPH_ID,
        type: 'graph',
        layout: 'Cola',
        layers: [BOTTOM_LAYER, GROUPS_LAYER, DEFAULT_LAYER, TOP_LAYER],
        data: { ...discoveryTree },
        x: graphData.x,
        y: graphData.y,
        scale: graphData.scale,
        scaleExtent: graphData.scaleExtent,
      },
    };

    // Initialize the controller with model to create nodes
    visualization.fromModel(model, false);
  }, [_transformData, visualization, discoveryTree]);

  // Note: Do not reorder. Must be called after registering model
  React.useEffect(() => {
    // Clear selection when discovery tree is updated and entity (target) is lost
    setSelectedIds((old) => {
      if (!getNodeById(_transformData.nodes, old[0])) {
        setSelectedEntity(undefined);
        return [];
      }
      setSelectedEntity(old[0] ? visualization.getElementById(old[0]) : undefined);
      return old;
    });
  }, [setSelectedIds, setSelectedEntity, _transformData, visualization]);

  React.useEffect(() => {
    const hideMenu = (_: MouseEvent) => {
      const contextMenu = document.getElementById('topology-context-menu');
      if (contextMenu) {
        contextMenu.style.display = 'none';
      }
    };
    const showMenu = (e: MouseEvent) => {
      e.preventDefault();

      const contextMenu = document.getElementById('topology-context-menu');
      if (contextMenu) {
        contextMenu.style.display = 'block';
        contextMenu.style.top = `${e.clientY}px`;
        contextMenu.style.left = `${e.clientX}px`;
      }
    };

    // Visualize surface needs time to intialize.
    // Workaround: find drawer body which is already ready and tightly wraps the surface.
    const container: HTMLElement | null = document.querySelector(
      '#topology__visualization-container .pf-c-drawer__content'
    );
    if (container) {
      container.addEventListener('contextmenu', showMenu);
    }
    document.addEventListener('click', hideMenu);
    return () => document.removeEventListener('click', hideMenu);
  }, []);

  const sidebar = React.useMemo(
    () => (
      <TopologySideBar onClose={handleDrawerClose}>
        <EntityDetails entity={selectedEntity} />
      </TopologySideBar>
    ),
    [handleDrawerClose, selectedEntity]
  );

  return (
    <>
      <Stack>
        <StackItem>
          <TopologyToolbar
            variant={TopologyToolbarVariant.Graph}
            visualization={visualization}
            isDisabled={exceedLimit && !showGraphAnyway}
          />
        </StackItem>
        <StackItem>
          <Divider />
        </StackItem>
        <StackItem isFilled>
          {isEmptyGraph ? (
            <TopologyEmptyState />
          ) : exceedLimit && !showGraphAnyway ? (
            <TopologyExceedLimitState onShowTopologyAnyway={() => setShowGraphAnyway(true)} />
          ) : (
            <MatchedTargetsServiceContext.Provider value={matchedTargetsSvcSource}>
              <TopologyView
                {...props}
                id="topology__visualization-container"
                className={css('topology__main-container')}
                controlBar={<TopologyControlBar visualization={visualization} />}
                sideBar={sidebar}
                sideBarOpen={selectedIds.length > 0}
                sideBarResizable={true}
                minSideBarSize={`${MIN_SIZEBAR_SIZE}px`}
                defaultSideBarSize={`${DEFAULT_SIZEBAR_SIZE}px`}
              >
                <VisualizationProvider controller={visualization}>
                  <VisualizationSurface state={{ selectedIds }} />
                </VisualizationProvider>
              </TopologyView>
            </MatchedTargetsServiceContext.Provider>
          )}
        </StackItem>
      </Stack>
      <QuickSearchContextMenu id={'topology-context-menu'} />
    </>
  );
};
