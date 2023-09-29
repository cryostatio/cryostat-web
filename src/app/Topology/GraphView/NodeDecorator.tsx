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

import { TargetNode, ActiveRecording, RecordingState } from '@app/Shared/Services/api.types';
import { portalRoot } from '@app/utils/utils';
import { Tooltip } from '@patternfly/react-core';
import { InProgressIcon, RunningIcon, WarningTriangleIcon } from '@patternfly/react-icons';
import { css } from '@patternfly/react-styles';
import {
  Decorator,
  DEFAULT_DECORATOR_RADIUS,
  getDefaultShapeDecoratorCenter,
  Node,
  TopologyQuadrant,
} from '@patternfly/react-topology';
import * as React from 'react';
import { useResources } from '../Entity/utils';
import { getStatusTargetNode } from '../Shared/utils';

export const getNodeDecorators = (element: Node) => {
  return (
    <>
      <ActiveRecordingDecorator element={element} quadrant={TopologyQuadrant.upperRight} />,
      <StatusDecorator element={element} quadrant={TopologyQuadrant.lowerLeft} />
    </>
  );
};

interface DecoratorProps {
  element: Node;
  quadrant: TopologyQuadrant;
}

export const ActiveRecordingDecorator: React.FC<DecoratorProps> = ({ element, quadrant, ...props }) => {
  const data: TargetNode = element.getData();
  const { x, y } = getDefaultShapeDecoratorCenter(quadrant, element);
  const { resources: recordings, error, loading } = useResources<ActiveRecording>(data, 'activeRecordings');

  const runningRecs = React.useMemo(
    () => recordings.filter((rec) => rec.state === RecordingState.RUNNING),
    [recordings],
  );

  const iconConfig = React.useMemo(() => {
    const base = 'topology__node-decorator-icon';
    if (loading) {
      return {
        icon: <InProgressIcon className={css(base, 'progress')} />,
        tooltip: 'Retrieving active recordings.',
      };
    }
    return runningRecs.length && !error
      ? {
          icon: <RunningIcon className={css(base, 'success')} />,
          tooltip: `${runningRecs.length} running active recording${runningRecs.length > 2 ? 's' : ''}.`,
        }
      : undefined;
  }, [error, loading, runningRecs]);

  return iconConfig ? (
    <Tooltip {...props} content={iconConfig.tooltip} appendTo={portalRoot}>
      <Decorator x={x} y={y} radius={DEFAULT_DECORATOR_RADIUS} showBackground icon={iconConfig.icon} />
    </Tooltip>
  ) : null;
};

export const StatusDecorator: React.FC<DecoratorProps> = ({ element, quadrant, ...props }) => {
  const data: TargetNode = element.getData();
  const [nodeStatus, extra] = getStatusTargetNode(data);
  const { x, y } = getDefaultShapeDecoratorCenter(quadrant, element);
  return nodeStatus ? (
    <Tooltip {...props} content={extra?.title} appendTo={portalRoot}>
      <Decorator
        x={x}
        y={y}
        radius={DEFAULT_DECORATOR_RADIUS}
        showBackground
        icon={<WarningTriangleIcon className={css('topology__node-decorator-icon', 'warning')} />}
      />
    </Tooltip>
  ) : null;
};
