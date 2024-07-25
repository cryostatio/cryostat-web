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
import {
  action,
  createTopologyControlButtons,
  defaultControlButtonsOptions,
  TopologyControlBar as PFTopologyControlBar,
  Visualization,
} from '@patternfly/react-topology';
import * as React from 'react';
import { CollapseIcon } from '../Shared/Components/CollapseIcon';

export interface TopologyControlBarProps {
  visualization: Visualization;
  noCollapse?: boolean;
}

export const TopologyControlBar: React.FC<TopologyControlBarProps> = ({ visualization, noCollapse, ...props }) => {
  const buttonConfigs = React.useMemo(() => {
    const base = createTopologyControlButtons({
      ...defaultControlButtonsOptions,
      zoomInCallback: action(() => {
        // Zoom in by 4 / 3
        visualization.getGraph().scaleBy(4 / 3);
      }),
      zoomOutCallback: action(() => {
        // Zoom out by 3 / 4
        visualization.getGraph().scaleBy(3 / 4);
      }),
      fitToScreenCallback: action(() => {
        // Fit entire graph in the viewable area with an 120px margin
        visualization.getGraph().fit(120);
      }),
      resetViewCallback: action(() => {
        // Scale back to 1, and re-center the graph
        visualization.getGraph().reset();
        // Reset layout
        visualization.getGraph().layout();
      }),
      legend: false,
    });

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

  return <PFTopologyControlBar {...props} controlButtons={buttonConfigs} />;
};
