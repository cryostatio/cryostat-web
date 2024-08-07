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

import cryostatSvg from '@app/assets/cryostat_icon_rgb_default.svg';
import openjdkSvg from '@app/assets/openjdk.svg';
import { RootState } from '@app/Shared/Redux/ReduxStore';
import { TargetNode } from '@app/Shared/Services/api.types';
import { includesTarget } from '@app/Shared/Services/api.utils';
import { useMatchedTargetsSvc } from '@app/utils/hooks/useMatchedTargetsSvc';
import { useSubscriptions } from '@app/utils/hooks/useSubscriptions';
import { ContainerNodeIcon } from '@patternfly/react-icons';
import { css } from '@patternfly/react-styles';
import {
  DefaultNode,
  DEFAULT_LAYER,
  EllipseAnchor,
  Layer,
  Node,
  observer,
  ScaleDetailsLevel,
  TOP_LAYER,
  useAnchor,
  useHover,
  WithContextMenuProps,
  WithDragNodeProps,
  WithSelectionProps,
} from '@patternfly/react-topology';
import * as React from 'react';
import { useSelector } from 'react-redux';
import { map } from 'rxjs';
import { getStatusTargetNode, nodeTypeToAbbr, TOPOLOGY_GRAPH_ID } from '../Shared/utils';
import { NODE_BADGE_COLOR, NODE_ICON_PADDING, RESOURCE_NAME_TRUNCATE_LENGTH } from './const';
import { getNodeDecorators } from './NodeDecorator';

export const renderNodeIcon = (graphic: string, _data: TargetNode, element: Node, useAlt: boolean): React.ReactNode => {
  const { width, height } = element.getDimensions();

  const contentSize = Math.min(width, height) - NODE_ICON_PADDING * 2;
  const mainContentSize = contentSize * (useAlt ? 0.5 : 0.8);
  const [cx, cy] = [width / 2, height / 2];
  const [trueCx, trueCy] = [cx - mainContentSize / 2, cy - mainContentSize / 2];

  return (
    <>
      <circle cx={cx} cy={cy} r={contentSize / 2} fill="var(--pf-v5-global--palette--white)" />
      {useAlt ? (
        <g transform={`translate(${trueCx}, ${trueCy})`}>
          <ContainerNodeIcon width={mainContentSize} height={mainContentSize} />
        </g>
      ) : (
        <image x={trueCx} y={trueCy} width={mainContentSize} height={mainContentSize} xlinkHref={graphic} />
      )}
    </>
  );
};

export interface CustomNodeProps extends Partial<WithSelectionProps & WithDragNodeProps & WithContextMenuProps> {
  element: Node;
}

const CustomNode: React.FC<CustomNodeProps> = ({
  element,
  onSelect,
  selected,
  dragNodeRef,
  contextMenuOpen,
  onContextMenu,
  ...props
}) => {
  useAnchor(EllipseAnchor); // For edges
  const [hover, hoverRef] = useHover(200, 200);

  const [matched, setMatched] = React.useState(true);
  const addSubscription = useSubscriptions();
  const matchedTargetSvc = useMatchedTargetsSvc();

  const displayOptions = useSelector((state: RootState) => state.topologyConfigs.displayOptions);
  const { badge: showBadge, connectionUrl: showConnectUrl, icon: showIcon, status: showStatus } = displayOptions.show;

  const detailsLevel = element.getController().getGraph().getDetailsLevel();
  const labelIcon = React.useMemo(() => <img src={cryostatSvg} />, []);

  const data: TargetNode = element.getData();

  const graphic = React.useMemo(() => (data.target.connectUrl.startsWith('http') ? cryostatSvg : openjdkSvg), [data]);

  const [nodeStatus] = getStatusTargetNode(data);

  const graphId = React.useMemo(() => element.getGraph().getId(), [element]);

  const classNames = React.useMemo(() => css('topology__target-node', matched ? '' : 'search-inactive'), [matched]);

  const nodeDecorators = React.useMemo(() => (showStatus ? getNodeDecorators(element) : null), [element, showStatus]);

  React.useEffect(() => {
    addSubscription(
      matchedTargetSvc
        .pipe(map((ts) => (ts ? includesTarget(ts, data.target) : graphId === TOPOLOGY_GRAPH_ID)))
        .subscribe(setMatched),
    );
  }, [graphId, addSubscription, setMatched, matchedTargetSvc, data.target]);

  return (
    <Layer id={contextMenuOpen ? TOP_LAYER : DEFAULT_LAYER}>
      <g className={classNames} id={'target-node-visual-group'} ref={hoverRef as React.LegacyRef<SVGGElement>}>
        <DefaultNode
          {...props}
          element={element}
          onSelect={onSelect}
          selected={selected}
          dragNodeRef={dragNodeRef}
          contextMenuOpen={contextMenuOpen}
          onContextMenu={onContextMenu}
          scaleNode={(hover || contextMenuOpen) && detailsLevel !== ScaleDetailsLevel.high}
          badge={showBadge ? nodeTypeToAbbr(data.nodeType) : undefined}
          badgeColor={NODE_BADGE_COLOR}
          badgeClassName={css('topology__node-badge')}
          nodeStatus={showStatus ? nodeStatus : undefined}
          showStatusBackground={!hover && detailsLevel === ScaleDetailsLevel.low}
          truncateLength={RESOURCE_NAME_TRUNCATE_LENGTH}
          labelIcon={showIcon ? labelIcon : undefined}
          secondaryLabel={showConnectUrl ? data.target.connectUrl : undefined}
          showLabel
          attachments={nodeDecorators}
        >
          <g id={'target-node-visual-inner-icon'}>{renderNodeIcon(graphic, data, element, !showIcon)}</g>
        </DefaultNode>
      </g>
    </Layer>
  );
};

export default observer(CustomNode);
