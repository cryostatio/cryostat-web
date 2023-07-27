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
