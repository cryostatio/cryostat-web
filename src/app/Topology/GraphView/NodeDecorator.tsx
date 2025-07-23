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

import { getPaletteColours, Palette } from '@app/Settings/types';
import { TargetNode, ActiveRecording, RecordingState, AggregateReport } from '@app/Shared/Services/api.types';
import { ServiceContext } from '@app/Shared/Services/Services';
import useDayjs from '@app/utils/hooks/useDayjs';
import { useSubscriptions } from '@app/utils/hooks/useSubscriptions';
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
import {
  REPORT_DANGER_SCORE,
  REPORT_MAX_SCORE,
  REPORT_MIN_SCORE,
  REPORT_WARNING_SCORE,
  useResources,
} from '../Entity/utils';
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
  const context = React.useContext(ServiceContext);
  const addSubscription = useSubscriptions();
  const data: TargetNode = element.getData();
  const decoratorRef = React.useRef<SVGGElement>(null);
  const { x, y } = getDefaultShapeDecoratorCenter(quadrant, element);
  const { t } = useCryostatTranslation();
  const [dayjs, dateTimeFormat] = useDayjs();
  const { resources: report, error, loading } = useResources<AggregateReport>(data, 'report');
  const [palette, setPalette] = React.useState(Palette.DEFAULT);

  React.useEffect(() => {
    addSubscription(context.settings.palette().subscribe(setPalette));
  }, [addSubscription, context.settings, setPalette]);

  const iconConfig = React.useMemo(() => {
    if (loading) {
      return {
        icon: <InProgressIcon className="var(--pf-v5-global--info-color--100)" />,
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
    let fill: string;
    if (REPORT_MIN_SCORE <= score && score < REPORT_WARNING_SCORE) {
      fill = getPaletteColours(palette).primary()[1];
    } else if (REPORT_WARNING_SCORE <= score && score < REPORT_DANGER_SCORE) {
      fill = getPaletteColours(palette).secondary()[1];
    } else if (REPORT_DANGER_SCORE <= score && score <= REPORT_MAX_SCORE) {
      fill = getPaletteColours(palette).tertiary()[1];
    } else {
      console.warn(`Report score ${score} is outside expected [0, 100] range`);
      fill = getPaletteColours(palette).tertiary()[1];
    }
    return {
      icon: <TachometerAltIcon style={{ fill }} />,
      tooltip: t('Topology.NodeDecorator.Report.TOOLTIP', {
        count: report[0].aggregate.count,
        score: score.toFixed(2),
        date: report[0].lastUpdated
          ? dayjs(new Date(report[0].lastUpdated * 1000))
              .tz(dateTimeFormat.timeZone.full)
              .format('LLLL')
          : 'N/A',
      }),
    };
  }, [t, dayjs, dateTimeFormat, error, loading, report, palette]);

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
  const context = React.useContext(ServiceContext);
  const addSubscription = useSubscriptions();
  const data: TargetNode = element.getData();
  const decoratorRef = React.useRef<SVGGElement>(null);
  const { x, y } = getDefaultShapeDecoratorCenter(quadrant, element);
  const { resources: recordings, error, loading } = useResources<ActiveRecording>(data, 'activeRecordings');
  const [palette, setPalette] = React.useState(Palette.DEFAULT);

  React.useEffect(() => {
    addSubscription(context.settings.palette().subscribe(setPalette));
  }, [addSubscription, context.settings, setPalette]);

  const runningRecs = React.useMemo(
    () => recordings.filter((rec) => rec.state === RecordingState.RUNNING),
    [recordings],
  );

  const iconConfig = React.useMemo(() => {
    if (loading) {
      return {
        icon: <InProgressIcon className="var(--pf-v5-global--info-color--100)" />,
        tooltip: 'Retrieving Active Recordings.',
      };
    }
    return runningRecs.length && !error
      ? {
          icon: <RunningIcon style={{ fill: getPaletteColours(palette).primary()[1] }} />,
          tooltip: `${runningRecs.length} running active recording${runningRecs.length > 2 ? 's' : ''}.`,
        }
      : undefined;
  }, [error, loading, runningRecs, palette]);

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
