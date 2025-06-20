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

import { ErrorView } from '@app/ErrorView/ErrorView';
import { TargetAnalysis } from '@app/Recordings/TargetAnalysis';
import { LoadingView } from '@app/Shared/Components/LoadingView';
import { automatedAnalysisAddGlobalFilterIntent } from '@app/Shared/Redux/ReduxStore';
import {
  AutomatedAnalysisScore,
  AnalysisResult,
  NullableTarget,
  AggregateReport,
} from '@app/Shared/Services/api.types';
import { isHttpError } from '@app/Shared/Services/api.utils';
import { FeatureLevel } from '@app/Shared/Services/service.types';
import { ServiceContext } from '@app/Shared/Services/Services';
import { useSubscriptions } from '@app/utils/hooks/useSubscriptions';
import { useCryostatTranslation } from '@i18n/i18nextUtil';
import {
  Button,
  CardBody,
  CardExpandableContent,
  CardHeader,
  CardTitle,
  Label,
  LabelGroup,
  Tooltip,
  Flex,
  FlexItem,
} from '@patternfly/react-core';
import {
  CheckCircleIcon,
  ExclamationCircleIcon,
  ExclamationTriangleIcon,
  ProcessAutomationIcon,
} from '@patternfly/react-icons';
import _ from 'lodash';
import * as React from 'react';
import { useDispatch } from 'react-redux';
import { catchError, map, of, Subject, tap } from 'rxjs';
import { DashboardCard } from '../DashboardCard';
import { DashboardCardDescriptor, DashboardCardFC, DashboardCardSizes, DashboardCardTypeProps } from '../types';

export interface AutomatedAnalysisCardProps extends DashboardCardTypeProps {}

export const AutomatedAnalysisCard: DashboardCardFC<AutomatedAnalysisCardProps> = (props) => {
  const context = React.useContext(ServiceContext);
  const addSubscription = useSubscriptions();
  const { t } = useCryostatTranslation();

  const [target, setTarget] = React.useState(undefined as NullableTarget);
  const [results, setResults] = React.useState<AnalysisResult[]>([]);

  const [isCardExpanded, setIsCardExpanded] = React.useState<boolean>(true);
  const [errorMessage, setErrorMessage] = React.useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const [hasSources, setHasSources] = React.useState(false);
  const [hasReport, setHasReport] = React.useState(false);

  const [reportRefresh] = React.useState(new Subject<void>());
  const handleReportRefresh = React.useCallback(() => reportRefresh.next(), [reportRefresh]);

  const onCardExpand = React.useCallback(() => {
    setIsCardExpanded((isCardExpanded) => !isCardExpanded);
  }, [setIsCardExpanded]);

  const refreshButton = React.useMemo(
    () => (
      <Tooltip key={0} content={t('ANALYZE')}>
        <Button
          aria-label="refresh"
          onClick={handleReportRefresh}
          variant="plain"
          icon={<ProcessAutomationIcon />}
          isDisabled={isLoading || !hasSources}
        />
      </Tooltip>
    ),
    [t, handleReportRefresh, isLoading, hasSources],
  );

  const actions = React.useMemo(() => {
    const a = props.actions || [];
    return [refreshButton, ...a];
  }, [props.actions, refreshButton]);

  React.useEffect(() => {
    addSubscription(context.target.target().subscribe((t) => setTarget(t)));
  }, [addSubscription, context.target]);

  React.useEffect(() => {
    if (!target) {
      setHasSources(false);
      setHasReport(false);
      return;
    }
    addSubscription(
      context.api
        .getTargetActiveRecordings(target)
        .pipe(map((a) => !!a.length))
        .subscribe((c) => setHasSources(c)),
    );
  }, [addSubscription, target, context.api, setHasSources]);

  React.useEffect(() => {
    if (!target) {
      return;
    }
    setIsLoading(true);
    addSubscription(
      context.api
        .getCurrentReportForTarget(target)
        .pipe(
          tap(() => setHasReport(true)),
          catchError((err) => {
            if (isHttpError(err) && err.httpResponse.status !== 404) {
              setErrorMessage(err.httpResponse.statusText);
            } else if (!isHttpError(err)) {
              setErrorMessage(JSON.stringify(err));
            }
            setHasReport(false);
            return of([]);
          }),
          tap(() => setIsLoading(false)),
        )
        .subscribe((ar: AggregateReport) => setResults(ar?.aggregate?.count ? ar.data!.map((k) => k.value) : [])),
    );
  }, [addSubscription, target, setIsLoading, setHasReport, context.api]);

  const headerLabels = React.useMemo(() => {
    if (isLoading || errorMessage || !hasSources || !hasReport) return undefined;
    const filtered = results.filter((e) => e.score >= AutomatedAnalysisScore.ORANGE_SCORE_THRESHOLD);
    if (filtered.length === 0) return <AutomatedAnalysisHeaderLabel type="ok" />;
    const [warnings, errors] = _.partition(filtered, (e) => e.score < AutomatedAnalysisScore.RED_SCORE_THRESHOLD);
    return (
      <LabelGroup>
        {errors.length > 0 && <AutomatedAnalysisHeaderLabel type={'critical'} count={errors.length} />}
        {warnings.length > 0 && <AutomatedAnalysisHeaderLabel type={'warning'} count={warnings.length} />}
      </LabelGroup>
    );
  }, [isLoading, errorMessage, results, hasSources, hasReport]);

  const header = React.useMemo(() => {
    return (
      <CardHeader
        actions={{ actions: actions, hasNoOffset: false, className: undefined }}
        onExpand={onCardExpand}
        toggleButtonProps={{
          id: 'automated-analysis-toggle-details',
          'aria-label': 'Details',
          'aria-labelledby': 'automated-analysis-card-title toggle-details',
          'aria-expanded': isCardExpanded,
        }}
      >
        <Flex>
          <FlexItem>
            <CardTitle component="h4">
              {errorMessage ? t('AutomatedAnalysisCard.ERROR_TITLE') : t('AutomatedAnalysisCard.CARD_TITLE')}
            </CardTitle>
          </FlexItem>
          <FlexItem>{headerLabels}</FlexItem>
        </Flex>
      </CardHeader>
    );
  }, [actions, t, onCardExpand, isCardExpanded, headerLabels, errorMessage]);

  return (
    <DashboardCard
      dashboardId={props.dashboardId}
      cardSizes={AutomatedAnalysisCardSizes}
      id="automated-analysis-card"
      isCompact
      isDraggable={props.isDraggable}
      isResizable={props.isResizable}
      isFullHeight={props.isFullHeight}
      isExpanded={isCardExpanded}
      cardHeader={header}
    >
      <CardExpandableContent>
        <CardBody isFilled>
          {isLoading ? (
            <LoadingView />
          ) : !target ? undefined : errorMessage ? (
            <ErrorView title={t('AutomatedAnalysisCard.ERROR_TEXT')} message={errorMessage} />
          ) : (
            <TargetAnalysis target={target} refreshRequest={reportRefresh} />
          )}
        </CardBody>
      </CardExpandableContent>
    </DashboardCard>
  );
};

AutomatedAnalysisCard.cardComponentName = 'AutomatedAnalysisCard';

export type AutomatedAnalysisHeaderLabelType = 'critical' | 'warning' | 'ok';

export interface AutomatedAnalysisHeaderLabelProps {
  type?: AutomatedAnalysisHeaderLabelType;
  count?: number;
}

export const AutomatedAnalysisHeaderLabel: React.FC<AutomatedAnalysisHeaderLabelProps> = (props) => {
  const dispatch = useDispatch();
  const { t } = useCryostatTranslation();

  const [isHoveredOrFocused, setIsHoveredOrFocused] = React.useState(false);
  const handleHoveredOrFocused = React.useCallback(() => setIsHoveredOrFocused(true), [setIsHoveredOrFocused]);
  const handleNonHoveredOrFocused = React.useCallback(() => setIsHoveredOrFocused(false), [setIsHoveredOrFocused]);
  const label = React.useMemo(() => {
    let onClick: () => void;
    let icon: React.ReactNode;
    let color: 'red' | 'orange' | 'green';
    let children: React.ReactNode;
    switch (props.type) {
      case 'critical':
        onClick = () => {
          dispatch(automatedAnalysisAddGlobalFilterIntent('Score', AutomatedAnalysisScore.RED_SCORE_THRESHOLD));
        };
        icon = <ExclamationCircleIcon />;
        color = 'red';
        children = t('AutomatedAnalysisCard.CRITICAL_RESULTS', { count: props.count });
        break;
      case 'warning':
        onClick = () => {
          dispatch(automatedAnalysisAddGlobalFilterIntent('Score', AutomatedAnalysisScore.ORANGE_SCORE_THRESHOLD));
        };
        icon = <ExclamationTriangleIcon />;
        color = 'orange';
        children = t('AutomatedAnalysisCard.WARNING_RESULTS', { count: props.count });
        break;
      default:
        onClick = () => undefined;
        icon = <CheckCircleIcon />;
        color = 'green';
        children = t('AutomatedAnalysisCard.GOOD_RESULTS');
    }
    return { onClick, icon, color, children };
  }, [dispatch, t, props.count, props.type]);

  const { onClick, icon, color, children } = label;

  return (
    <Label
      className={isHoveredOrFocused ? 'clickable-label-hovered' : undefined}
      draggable
      onDragStart={(e) => e.stopPropagation()}
      onClick={onClick}
      onMouseEnter={handleHoveredOrFocused}
      onMouseLeave={handleNonHoveredOrFocused}
      onFocus={handleHoveredOrFocused}
      icon={icon}
      color={color}
    >
      {children}
    </Label>
  );
};

export const AutomatedAnalysisCardSizes: DashboardCardSizes = {
  span: {
    minimum: 4,
    default: 6,
    maximum: 12,
  },
  height: {
    // TODO: implement height resizing
    minimum: Number.NaN,
    default: Number.NaN,
    maximum: Number.NaN,
  },
};

export const AutomatedAnalysisCardDescriptor: DashboardCardDescriptor = {
  featureLevel: FeatureLevel.PRODUCTION,
  title: 'AutomatedAnalysisCard.CARD_TITLE',
  cardSizes: AutomatedAnalysisCardSizes,
  description: 'AutomatedAnalysisCard.CARD_DESCRIPTION',
  descriptionFull: `AutomatedAnalysisCard.CARD_DESCRIPTION_FULL`,
  component: AutomatedAnalysisCard,
  propControls: [],
  icon: <ProcessAutomationIcon />,
  labels: [
    {
      content: 'Evaluation',
      color: 'blue',
    },
  ],
  preview: <AutomatedAnalysisCard span={12} dashboardId={0} isDraggable={false} isResizable={false} />,
};
