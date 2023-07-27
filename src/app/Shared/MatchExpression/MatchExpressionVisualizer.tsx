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
import { LoadingView } from '@app/LoadingView/LoadingView';
import { TopologyControlBar } from '@app/Topology/GraphView/TopologyControlBar';
import { SavedGraphPosition, SavedNodePosition } from '@app/Topology/GraphView/TopologyGraphView';
import { getNodeById } from '@app/Topology/GraphView/UtilsFactory';
import EntityDetails, { AlertOptions } from '@app/Topology/Shared/Entity/EntityDetails';
import { MatchedTargetsServiceContext, useExprSvc, useMatchedTargetsSvcSource } from '@app/Topology/Shared/utils';
import { TopologySideBar } from '@app/Topology/SideBar/TopologySideBar';
import { NodeType } from '@app/Topology/typings';
import { getFromLocalStorage, saveToLocalStorage } from '@app/utils/LocalStorage';
import { useSubscriptions } from '@app/utils/useSubscriptions';
import { hashCode } from '@app/utils/utils';
import {
  Bullseye,
  DataList,
  DataListCell,
  DataListContent,
  DataListItem,
  DataListItemCells,
  DataListItemRow,
  DataListToggle,
  EmptyState,
  EmptyStateBody,
  EmptyStateIcon,
  EmptyStateSecondaryActions,
  EmptyStateVariant,
  Flex,
  FlexItem,
  Radio,
  Stack,
  StackItem,
  Title,
} from '@patternfly/react-core';
import { ContainerNodeIcon, SearchIcon } from '@patternfly/react-icons';
import { css } from '@patternfly/react-styles';
import {
  action,
  GraphElement,
  GRAPH_POSITION_CHANGE_EVENT,
  Model,
  NODE_POSITIONED_EVENT,
  SelectionEventListener,
  SELECTION_EVENT,
  TopologyView,
  Visualization,
  VisualizationProvider,
  VisualizationSurface,
} from '@patternfly/react-topology';
import _ from 'lodash';
import * as React from 'react';
import { catchError, combineLatest, of, switchMap, tap } from 'rxjs';
import { ServiceContext } from '../Services/Services';
import { Target } from '../Services/Target.service';
import { componentFactory, createTargetNode, layoutFactory, transformData } from './utils';

export interface MatchExpressionVisualizerProps {
  alertOptions?: AlertOptions;
}

export const MatchExpressionVisualizer: React.FC<MatchExpressionVisualizerProps> = ({ alertOptions, ...props }) => {
  const [isGraph, setIsGraph] = React.useState(true);
  return (
    <Stack {...props} hasGutter>
      <StackItem>
        <LayoutRadioGroup onChange={setIsGraph} />
      </StackItem>
      <StackItem isFilled style={{ overflow: 'auto' }}>
        {isGraph ? <GraphView alertOptions={alertOptions} /> : <ListView alertOptions={alertOptions} />}
      </StackItem>
    </Stack>
  );
};

interface LayoutRadioGroupProps {
  onChange: (isGraph: boolean) => void;
}

const LayoutRadioGroup: React.FC<LayoutRadioGroupProps> = ({ onChange, ...props }) => {
  const [isGraph, setIsGraph] = React.useState(true);
  const configs = React.useMemo(
    () => [
      {
        title: 'Graph View',
        isGraph: true,
      },
      {
        title: 'List View',
        isGraph: false,
      },
    ],
    []
  );

  React.useEffect(() => onChange(isGraph), [isGraph, onChange]);

  return (
    <Flex {...props} alignItems={{ default: 'alignItemsCenter' }}>
      <FlexItem spacer={{ default: 'spacerSm' }}>
        <span style={{ fontWeight: '700' }}>Visualize via:</span>
      </FlexItem>
      {configs.map((conf) => (
        <FlexItem key={conf.title}>
          <Radio
            isChecked={conf.isGraph === isGraph}
            name={conf.title}
            onChange={() => setIsGraph(conf.isGraph)}
            label={conf.title}
            id={conf.title}
          />
        </FlexItem>
      ))}
    </Flex>
  );
};

export const MATCH_EXPRES_VIS_GRAPH_ID = 'cryostat-match-expression-visualizer';

const GraphView: React.FC<{ alertOptions?: AlertOptions }> = ({ alertOptions, ...props }) => {
  const addSubscription = useSubscriptions();
  const context = React.useContext(ServiceContext);
  const matchedTargetsSvcSource = useMatchedTargetsSvcSource();

  const [selectedIds, setSelectedIds] = React.useState<string[]>([]); // selectedIds is exactly matched by VisualizationSurface
  const [selectedEntity, setSelectedEntity] = React.useState<GraphElement>();
  const [targets, setTargets] = React.useState<Target[]>([]);

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
          saveToLocalStorage('MATCH_EXPRES_VIS_GRAPH_POSITIONS', saved);
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
          saveToLocalStorage('MATCH_EXPRES_VIS_NODE_POSITIONS', savedPos);
        }
      }, 200)
    );

    return _newVisualization;
  }, [setSelectedIds, setSelectedEntity]);

  const visualizationRef = React.useRef(_createVisualization());
  const visualization = visualizationRef.current;

  const targetNodes = React.useMemo(() => targets.map(createTargetNode), [targets]);
  const _transformedData = React.useMemo(() => transformData(targetNodes), [targetNodes]);

  React.useEffect(() => {
    addSubscription(context.targets.targets().subscribe(setTargets));
  }, [addSubscription, context.targets, setTargets]);

  React.useEffect(() => {
    const graphData: SavedGraphPosition = getFromLocalStorage('MATCH_EXPRES_VIS_GRAPH_POSITIONS', {});
    const nodePositions: SavedNodePosition[] = getFromLocalStorage('MATCH_EXPRES_VIS_NODE_POSITIONS', []);

    const model: Model = {
      nodes: _transformedData.nodes.map((n) => {
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
      edges: _transformedData.edges,
      graph: {
        id: MATCH_EXPRES_VIS_GRAPH_ID,
        type: 'graph',
        layout: 'Grid',
        data: {
          id: hashCode(targetNodes.toString()),
          name: 'Universe',
          nodeType: NodeType.UNIVERSE,
          labels: {},
          children: targetNodes,
        },
        x: graphData.x,
        y: graphData.y,
        scale: graphData.scale,
        scaleExtent: graphData.scaleExtent,
      },
    };

    // Initialize the controller with model to create nodes
    visualization.fromModel(model, false);

    const _id = setTimeout(
      action(() => {
        if (!graphData.id || !graphData.x || !graphData.y) {
          visualization.getGraph().fit();
        }
      })
    );
    return () => clearTimeout(_id);
  }, [_transformedData, targetNodes, visualization]);

  // Note: Do not reorder. Must be called after registering model
  React.useEffect(() => {
    // Clear selection when discovery tree is updated and entity (target) is lost
    setSelectedIds((old) => {
      if (!getNodeById(_transformedData.nodes, old[0])) {
        setSelectedEntity(undefined);
        return [];
      }
      setSelectedEntity(old[0] ? visualization.getElementById(old[0]) : undefined);
      return old;
    });
  }, [setSelectedIds, setSelectedEntity, _transformedData, visualization]);

  const handleDrawerClose = React.useCallback(() => setSelectedIds([]), [setSelectedIds]);

  const sidebar = React.useMemo(() => {
    if (!selectedEntity) {
      return null;
    }
    return (
      <TopologySideBar onClose={handleDrawerClose}>
        <EntityDetails entity={selectedEntity} alertOptions={alertOptions} />
      </TopologySideBar>
    );
  }, [handleDrawerClose, selectedEntity, alertOptions]);

  return (
    <MatchedTargetsServiceContext.Provider value={matchedTargetsSvcSource}>
      <TopologyView
        {...props}
        id="match-expression__visualization-container"
        className={css('topology__main-container')}
        controlBar={<TopologyControlBar visualization={visualization} noCollapse />}
        sideBar={sidebar}
        sideBarOpen={selectedIds.length > 0}
        sideBarResizable={true}
        minSideBarSize={`200px`}
        defaultSideBarSize={`425px`}
      >
        <VisualizationProvider controller={visualization}>
          <VisualizationSurface state={{ selectedIds }} />
        </VisualizationProvider>
      </TopologyView>
    </MatchedTargetsServiceContext.Provider>
  );
};

const ListView: React.FC<{ alertOptions?: AlertOptions }> = ({ alertOptions, ...props }) => {
  const addSubscription = useSubscriptions();
  const context = React.useContext(ServiceContext);
  const matchExprService = useExprSvc();

  const [matchedExpr, setMatchExpr] = React.useState('');
  const [matchedTargets, setMatchedTargets] = React.useState<Target[]>([]);
  const [expanded, setExpanded] = React.useState<string[]>([]);
  const [loading, setLoading] = React.useState(false);

  const toggleExpand = React.useCallback(
    (id: string) => {
      setExpanded((old) => {
        if (old.includes(id)) {
          return old.filter((_id) => _id !== id);
        }
        return [...old, id];
      });
    },
    [setExpanded]
  );

  React.useEffect(() => {
    addSubscription(
      combineLatest([
        matchExprService.searchExpression().pipe(tap((exp) => setMatchExpr(exp))),
        context.targets.targets(),
      ])
        .pipe(
          tap(() => setLoading(true)),
          switchMap(([input, targets]) =>
            input ? context.api.matchTargetsWithExpr(input, targets).pipe(catchError((_) => of([]))) : of([])
          )
        )
        .subscribe((ts) => {
          setLoading(false);
          setMatchedTargets(ts);
        })
    );
  }, [matchExprService, context.api, context.targets, setMatchedTargets, setLoading, addSubscription]);

  const content = React.useMemo(() => {
    if (loading) {
      return <LoadingView />;
    }
    if (!matchedTargets || !matchedTargets.length) {
      return (
        <Bullseye>
          <EmptyState variant={EmptyStateVariant.full}>
            <EmptyStateIcon variant="container" component={SearchIcon} />
            <Title headingLevel="h3" size="lg">
              No Targets Matched
            </Title>
            <EmptyStateSecondaryActions>
              <EmptyStateBody>{`${
                matchedExpr === '' ? 'Enter another' : 'Clear'
              } Match Expression and try again.`}</EmptyStateBody>
            </EmptyStateSecondaryActions>
          </EmptyState>
        </Bullseye>
      );
    }
    return matchedTargets.map((target) => {
      const { connectUrl, alias } = target;
      return (
        <DataListItem {...props} key={connectUrl} isExpanded={expanded.includes(connectUrl)}>
          <DataListItemRow>
            <DataListToggle
              onClick={() => toggleExpand(connectUrl)}
              isExpanded={expanded.includes(connectUrl)}
              id={`${connectUrl}-expand-toggle`}
              aria-controls={`${connectUrl}-expand`}
            />
            <DataListItemCells
              dataListCells={[
                <DataListCell isIcon key="icon">
                  <ContainerNodeIcon />
                </DataListCell>,
                <DataListCell key={`${connectUrl}-identifier`}>
                  {!alias || alias === connectUrl ? `${connectUrl}` : `${alias} (${connectUrl})`}
                </DataListCell>,
              ]}
            />
          </DataListItemRow>
          {expanded.includes(connectUrl) ? (
            <DataListContent
              aria-label={`${connectUrl} Details`}
              id={`${connectUrl}-expand`}
              isHidden={!expanded.includes(connectUrl)}
            >
              <EntityDetails
                entity={{ getData: () => target }}
                columnModifier={{ default: '3Col' }}
                alertOptions={alertOptions}
                className="topology__list-view__entity-details"
              />
            </DataListContent>
          ) : null}
        </DataListItem>
      );
    });
  }, [matchedTargets, loading, expanded, matchedExpr, toggleExpand, props, alertOptions]);

  return (
    <DataList aria-label={'Target List'} style={{ height: '100%' }}>
      {content}
    </DataList>
  );
};
