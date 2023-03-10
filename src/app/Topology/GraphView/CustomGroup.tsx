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
import openjdkSvg from '@app/assets/openjdk.svg';
import { RootState } from '@app/Shared/Redux/ReduxStore';
import { DefaultGroup, Node, observer, WithDragNodeProps, WithSelectionProps } from '@patternfly/react-topology';
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

export interface CustomGroupProps extends Partial<WithSelectionProps & WithDragNodeProps> {
  element: Node;
  collapsedWidth?: number;
  collapsedHeight?: number;
}

const CustomGroup: React.FC<CustomGroupProps> = ({
  element,
  onSelect,
  selected,
  dragNodeRef,
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
        } as React.ComponentProps<typeof DefaultGroup>,
        element.isCollapsed() ? collapsedContent : null
      )}
    </g>
  );
};

export default observer(CustomGroup);
