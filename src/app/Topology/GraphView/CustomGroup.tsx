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
import openjdkSvg from '@app/assets/openjdk.svg';
import { RootState } from '@app/Shared/Redux/ReduxStore';
import {
  DefaultGroup,
  Node,
  observer,
  WithContextMenuProps,
  WithDragNodeProps,
  WithSelectionProps,
} from '@patternfly/react-topology';
import * as React from 'react';
import { useSelector } from 'react-redux';
import { EnvironmentNode, NodeType } from '../typings';
import { NODE_ICON_PADDING } from './CustomNode';

const DEFAULT_NODE_COLLAPSED_DIAMETER = 100;

export const renderIcon = (width: number, height: number): React.ReactNode => {
  const contentSize = Math.min(width, height) - NODE_ICON_PADDING * 2;
  const mainContentSize = contentSize * 0.8;
  const [cx, cy] = [width / 2, height / 2];

  return (
    <>
      <circle cx={cx} cy={cy} r={contentSize / 2} fill="var(--pf-global--palette--white)" />
      <image
        x={cx - mainContentSize / 2}
        y={cy - mainContentSize / 2}
        width={mainContentSize}
        height={mainContentSize}
        xlinkHref={openjdkSvg}
      />
    </>
  );
};

export interface CustomGroupProps extends Partial<WithSelectionProps & WithDragNodeProps & WithContextMenuProps> {
  element: Node;
  collapsedWidth?: number;
  collapsedHeight?: number;
}

const CustomGroup: React.FC<CustomGroupProps> = ({
  element,
  onSelect,
  selected,
  dragNodeRef,
  contextMenuOpen,
  onContextMenu,
  collapsedHeight = DEFAULT_NODE_COLLAPSED_DIAMETER,
  collapsedWidth = DEFAULT_NODE_COLLAPSED_DIAMETER,
  ...props
}) => {
  const positionRef = React.useRef(element.getPosition());
  const data: EnvironmentNode = element.getData();

  const displayOptions = useSelector((state: RootState) => state.topologyConfigs.displayOptions);
  const { badge: showBadge } = displayOptions.show;

  const collapsedContent = React.useMemo(
    () => <g id={'topology-visual-collapsed-icon'}>{renderIcon(collapsedWidth, collapsedHeight)}</g>,
    [collapsedWidth, collapsedHeight]
  );

  React.useEffect(() => {
    positionRef.current = element.getPosition();
  });

  return (
    <g id={'topology-visual-group'}>
      {React.createElement(
        DefaultGroup,
        {
          ...props,
          element: element,
          selected: selected,
          onSelect: onSelect,
          className: data.nodeType === NodeType.REALM ? 'topology__realm-group' : undefined,
          dragNodeRef: dragNodeRef,
          collapsible: true,
          // Workaround to keep group positions between collapses
          onCollapseChange: (group, _) => {
            group.setPosition(positionRef.current);
          },
          collapsedHeight: collapsedHeight,
          collapsedWidth: collapsedWidth,
          badge: showBadge ? data.nodeType : undefined,
          showLabel: true,
          contextMenuOpen: contextMenuOpen,
          onContextMenu: onContextMenu,
        } as React.ComponentProps<typeof DefaultGroup>,
        element.isCollapsed() ? collapsedContent : null
      )}
    </g>
  );
};

export default observer(CustomGroup);
