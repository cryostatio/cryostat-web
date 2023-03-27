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
import { ActiveRecording, RecordingState } from '@app/Shared/Services/Api.service';
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
import { useResources } from '../Shared/Entity/utils';
import { getStatusTargetNode } from '../Shared/utils';
import { TargetNode } from '../typings';

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
    [recordings]
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
