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
import { css } from '@patternfly/react-styles';
import {
  action,
  createTopologyControlButtons,
  defaultControlButtonsOptions,
  TopologyControlBar as PFTopologyControlBar,
  Visualization,
} from '@patternfly/react-topology';
import * as React from 'react';
import { CollapseIcon } from '../Shared/CollapseIcon';

export interface TopologyControlBarProps {
  visualization: Visualization;
  noCollapse?: boolean;
  className?: string;
}

export const TopologyControlBar: React.FC<TopologyControlBarProps> = ({
  visualization,
  noCollapse,
  className,
  ...props
}) => {
  const buttonConfigs = React.useMemo(() => {
    const base = [
      ...createTopologyControlButtons({
        ...defaultControlButtonsOptions,
        zoomInCallback: action(() => {
          visualization.getGraph().scaleBy(4 / 3);
        }),
        zoomInTip: 'Zoom in',
        zoomInAriaLabel: 'Zoom in',
        zoomOutCallback: action(() => {
          visualization.getGraph().scaleBy(3 / 4);
        }),
        zoomOutTip: 'Zoom out',
        zoomOutAriaLabel: 'Zoom out',
        fitToScreenCallback: action(() => {
          visualization.getGraph().fit(120);
        }),
        fitToScreenTip: 'Fit to screen',
        fitToScreenAriaLabel: 'Fit to screen',
        resetViewCallback: action(() => {
          visualization.getGraph().reset();
          visualization.getGraph().layout();
        }),
        resetViewTip: 'Reset view',
        resetViewAriaLabel: 'Reset view',
        legend: false,
      }),
    ];

    if (!noCollapse) {
      base.push({
        id: 'collapse-all-group',
        icon: <CollapseIcon />,
        tooltip: 'Collapse all groups',
        callback: action(() => {
          // Close top-level groups
          visualization
            .getGraph()
            .getNodes()
            .forEach((n) => n.setCollapsed(true));
        }),
      });
    }
    return base;
  }, [visualization, noCollapse]);

  return (
    <div className={css('topology-control-bar', className)}>
      <PFTopologyControlBar {...props} controlButtons={buttonConfigs} />
    </div>
  );
};
