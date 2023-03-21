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
import { TopologyControlBar } from '@app/Topology/GraphView/TopologyControlBar';
import EntityDetails, { AlertOptions } from '@app/Topology/Shared/Entity/EntityDetails';
import { useSearchExpression } from '@app/Topology/Shared/utils';
import { TopologySideBar } from '@app/Topology/SideBar/TopologySideBar';
import { NodeType } from '@app/Topology/typings';
import { useSubscriptions } from '@app/utils/useSubscriptions';
import { evaluateTargetWithExpr, hashCode } from '@app/utils/utils';
import {
  Bullseye,
  Button,
  DataList,
  DataListCell,
  DataListContent,
  DataListItem,
  DataListItemCells,
  DataListItemRow,
  DataListToggle,
  EmptyState,
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
  BOTTOM_LAYER,
  DEFAULT_LAYER,
  GraphElement,
  GROUPS_LAYER,
  Model,
  SelectionEventListener,
  SELECTION_EVENT,
  TopologyView,
  TOP_LAYER,
  Visualization,
  VisualizationProvider,
  VisualizationSurface,
} from '@patternfly/react-topology';
import * as React from 'react';
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
      <StackItem isFilled>
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

const GraphView: React.FC<{ alertOptions?: AlertOptions }> = ({ alertOptions, ...props }) => {
  const addSubscription = useSubscriptions();
  const context = React.useContext(ServiceContext);

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
    const model: Model = {
      nodes: _transformedData.nodes,
      edges: _transformedData.edges,
      graph: {
        id: 'cryostat-match-expression-visualizer',
        type: 'graph',
        layout: 'Grid',
        data: {
          id: hashCode(targetNodes.toString()),
          name: 'Universe',
          nodeType: NodeType.UNIVERSE,
          labels: {},
          children: targetNodes,
        },
      },
    };

    // Initialize the controller with model to create nodes
    visualization.fromModel(model, false);
    const _id = setTimeout(action(() => visualization.getGraph().fit()));
    return () => clearTimeout(_id);
  }, [_transformedData, targetNodes, visualization]);

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
    <TopologyView
      {...props}
      id="topology__visualization-container"
      className={css('topology__main-container')}
      controlBar={<TopologyControlBar visualization={visualization} noCollapse />}
      sideBar={sidebar}
      sideBarOpen={selectedIds.length > 0}
      sideBarResizable={true}
      minSideBarSize={`200px`}
      defaultSideBarSize={`400px`}
    >
      <VisualizationProvider controller={visualization}>
        <VisualizationSurface state={{ selectedIds }} />
      </VisualizationProvider>
    </TopologyView>
  );
};

const ListView: React.FC<{ alertOptions?: AlertOptions }> = ({ alertOptions, ...props }) => {
  const addSubscription = useSubscriptions();
  const context = React.useContext(ServiceContext);
  const [matchExpression, setMatchExpression] = useSearchExpression();
  const [targets, setTargets] = React.useState<Target[]>([]);

  const [expanded, setExpanded] = React.useState<string[]>([]);

  React.useEffect(() => {
    addSubscription(context.targets.targets().subscribe(setTargets));
  }, [addSubscription, context.targets, setTargets]);

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

  const targetNodes = React.useMemo(() => targets.map(createTargetNode), [targets]);

  const filtered = React.useMemo(
    () =>
      targetNodes.filter(({ target }) => {
        if (!matchExpression) {
          return true;
        }
        try {
          const res = evaluateTargetWithExpr(target, matchExpression);
          if (typeof res === 'boolean') {
            return res;
          }
          return false;
        } catch (err) {
          return false;
        }
      }),
    [targetNodes, matchExpression]
  );

  const content = React.useMemo(() => {
    if (!filtered || !filtered.length) {
      return (
        <Bullseye>
          <EmptyState variant={EmptyStateVariant.full}>
            <EmptyStateIcon variant="container" component={SearchIcon} />
            <Title headingLevel="h3" size="lg">
              No Targets Matched
            </Title>
            <EmptyStateSecondaryActions>
              <Button variant={'link'} onClick={() => setMatchExpression('')}>
                Clear Match Expression
              </Button>
            </EmptyStateSecondaryActions>
          </EmptyState>
        </Bullseye>
      );
    }
    return filtered.map((tn) => {
      const { connectUrl, alias } = tn.target;
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
                entity={{ getData: () => tn }}
                columnModifier={{ default: '3Col' }}
                alertOptions={alertOptions}
              />
            </DataListContent>
          ) : null}
        </DataListItem>
      );
    });
  }, [filtered, expanded, toggleExpand, setMatchExpression, props, alertOptions]);

  return <DataList aria-label={'Target List'}>{content}</DataList>;
};
