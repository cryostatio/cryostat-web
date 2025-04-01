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

import { TargetNode, ActiveRecording, RecordingState, AggregateReport } from '@app/Shared/Services/api.types';
import { portalRoot } from '@app/utils/utils';
import { useCryostatTranslation } from '@i18n/i18nextUtil';
import { Tooltip } from '@patternfly/react-core';
import { InProgressIcon, RunningIcon, TachometerAltIcon, WarningTriangleIcon } from '@patternfly/react-icons';
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
      <ReportDecorator element={element} quadrant={TopologyQuadrant.upperLeft} />,
      <ActiveRecordingDecorator element={element} quadrant={TopologyQuadrant.upperRight} />,
      <ConnectionStatusDecorator element={element} quadrant={TopologyQuadrant.lowerLeft} />
    </>
  );
};

interface DecoratorProps {
  element: Node;
  quadrant: TopologyQuadrant;
}

export const ReportDecorator: React.FC<DecoratorProps> = ({ element, quadrant, ...props }) => {
  const data: TargetNode = element.getData();
  const decoratorRef = React.useRef<SVGGElement>(null);
  const { x, y } = getDefaultShapeDecoratorCenter(quadrant, element);
  const { t } = useCryostatTranslation();
  const { resources: report, error, loading } = useResources<AggregateReport>(data, 'report');

  const iconConfig = React.useMemo(() => {
    const base = 'topology__node-decorator-icon';
    if (loading) {
      return {
        icon: <InProgressIcon className={css(base, 'progress')} />,
        tooltip: 'Retrieving Active Recordings.',
      };
    }
    if (error) {
      return undefined;
    }
    if (!report.length || !report[0]?.aggregate?.count) {
      return undefined;
    }
    if (report[0]?.aggregate?.max <= -1) {
      return undefined;
    }
    const score = report[0].aggregate.max;
    let style: string;
    if (0 <= score && score < 25) {
      style = 'success';
    } else if (25 <= score && score < 75) {
      style = 'warning';
    } else if (75 <= score && score <= 100) {
      style = 'danger';
    } else {
      console.warn(`Report score ${score} is outside expected [0, 100] range`);
      style = 'danger';
    }
    return {
      icon: <TachometerAltIcon className={css(base, style)} />,
      tooltip: t('Topology.NodeDecorator.Report.TOOLTIP', {
        count: report[0].aggregate.count,
        score: score.toFixed(2),
      }),
    };
  }, [t, error, loading, report]);

  return iconConfig ? (
    <Tooltip content={iconConfig.tooltip} triggerRef={decoratorRef} appendTo={portalRoot}>
      <Decorator
        innerRef={decoratorRef}
        {...props}
        x={x}
        y={y}
        radius={DEFAULT_DECORATOR_RADIUS}
        showBackground
        icon={iconConfig.icon}
      />
    </Tooltip>
  ) : null;
};

export const ActiveRecordingDecorator: React.FC<DecoratorProps> = ({ element, quadrant, ...props }) => {
  const data: TargetNode = element.getData();
  const decoratorRef = React.useRef<SVGGElement>(null);
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
        tooltip: 'Retrieving Active Recordings.',
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
    <Tooltip content={iconConfig.tooltip} triggerRef={decoratorRef} appendTo={portalRoot}>
      <Decorator
        innerRef={decoratorRef}
        {...props}
        x={x}
        y={y}
        radius={DEFAULT_DECORATOR_RADIUS}
        showBackground
        icon={iconConfig.icon}
      />
    </Tooltip>
  ) : null;
};

export const ConnectionStatusDecorator: React.FC<DecoratorProps> = ({ element, quadrant, ...props }) => {
  const decoratorRef = React.useRef<SVGGElement>(null);
  const data: TargetNode = element.getData();
  const [nodeStatus, extra] = getStatusTargetNode(data);
  const { x, y } = getDefaultShapeDecoratorCenter(quadrant, element);
  return nodeStatus ? (
    <Tooltip content={extra?.title} triggerRef={decoratorRef} appendTo={portalRoot}>
      <Decorator
        {...props}
        innerRef={decoratorRef}
        x={x}
        y={y}
        radius={DEFAULT_DECORATOR_RADIUS}
        showBackground
        icon={<WarningTriangleIcon className={css('topology__node-decorator-icon', 'warning')} />}
      />
    </Tooltip>
  ) : null;
};
