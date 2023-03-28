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

import cryostatSvg from '@app/assets/cryostat_icon_rgb_default.svg';
import openjdkSvg from '@app/assets/openjdk.svg';
import { RootState } from '@app/Shared/Redux/ReduxStore';
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
import { getStatusTargetNode, isTargetMatched, nodeTypeToAbbr, useSearchExpression } from '../Shared/utils';
import { TargetNode } from '../typings';
import { getNodeDecorators } from './NodeDecorator';
import { RESOURCE_NAME_TRUNCATE_LENGTH } from './UtilsFactory';

export const NODE_ICON_PADDING = 5;

export const renderIcon = (data: TargetNode, element: Node, useAlt: boolean): React.ReactNode => {
  const { width, height } = element.getDimensions();

  const contentSize = Math.min(width, height) - NODE_ICON_PADDING * 2;
  const mainContentSize = contentSize * (useAlt ? 0.5 : 0.8);
  const [cx, cy] = [width / 2, height / 2];
  const [trueCx, trueCy] = [cx - mainContentSize / 2, cy - mainContentSize / 2];

  return (
    <>
      <circle cx={cx} cy={cy} r={contentSize / 2} fill="var(--pf-global--palette--white)" />
      {useAlt ? (
        <g transform={`translate(${trueCx}, ${trueCy})`}>
          <ContainerNodeIcon width={mainContentSize} height={mainContentSize} />
        </g>
      ) : (
        <image x={trueCx} y={trueCy} width={mainContentSize} height={mainContentSize} xlinkHref={openjdkSvg} />
      )}
    </>
  );
};

export interface CustomNodeProps extends Partial<WithSelectionProps & WithDragNodeProps & WithContextMenuProps> {
  element: Node;
}

export const NODE_BADGE_COLOR = 'var(--pf-global--palette--blue-500)';

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
  const [expression] = useSearchExpression();

  const displayOptions = useSelector((state: RootState) => state.topologyConfigs.displayOptions);
  const { badge: showBadge, connectionUrl: showConnectUrl, icon: showIcon, status: showStatus } = displayOptions.show;

  const detailsLevel = element.getController().getGraph().getDetailsLevel();
  const labelIcon = React.useMemo(() => <img src={cryostatSvg} />, []);

  const data: TargetNode = element.getData();
  const [nodeStatus] = getStatusTargetNode(data);

  const classNames = React.useMemo(() => {
    const additional = expression === '' || isTargetMatched(data, expression) ? '' : 'search-inactive';
    return css('topology__target-node', additional);
  }, [data, expression]);

  const nodeDecorators = React.useMemo(() => (showStatus ? getNodeDecorators(element) : null), [element, showStatus]);

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
          badgeClassName={'topology__node-badge'}
          nodeStatus={showStatus ? nodeStatus : undefined}
          showStatusBackground={!hover && detailsLevel === ScaleDetailsLevel.low}
          truncateLength={RESOURCE_NAME_TRUNCATE_LENGTH}
          labelIcon={showIcon ? labelIcon : undefined}
          secondaryLabel={showConnectUrl ? data.target.connectUrl : undefined}
          showLabel
          attachments={nodeDecorators}
        >
          <g id={'target-node-visual-inner-icon'}>{renderIcon(data, element, !showIcon)}</g>
        </DefaultNode>
      </g>
    </Layer>
  );
};

export default observer(CustomNode);
