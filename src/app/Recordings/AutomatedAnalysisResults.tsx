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
  ClickableAutomatedAnalysisLabel,
  clickableAutomatedAnalysisKey,
} from '@app/Dashboard/AutomatedAnalysis/ClickableAutomatedAnalysisLabel';
import {
  AggregateReport,
  AnalysisResult,
  CategorizedRuleEvaluations,
  NotificationCategory,
  NullableTarget,
  Target,
} from '@app/Shared/Services/api.types';
import { ServiceContext } from '@app/Shared/Services/Services';
import { useSubscriptions } from '@app/utils/hooks/useSubscriptions';
import {
  Bullseye,
  Grid,
  GridItem,
  LabelGroup,
  Spinner,
  EmptyState,
  EmptyStateHeader,
  EmptyStateIcon,
} from '@patternfly/react-core';
import { SearchIcon } from '@patternfly/react-icons';
import * as React from 'react';
import { Observable } from 'rxjs';
import { concatMap, filter, map, tap } from 'rxjs/operators';

export interface TargetAnalysisProps {
  target: Observable<NullableTarget>;
}

export const TargetAnalysis: React.FC<TargetAnalysisProps> = ({ target }) => {
  const context = React.useContext(ServiceContext);
  const addSubscription = useSubscriptions();
  const [loading, setLoading] = React.useState(true);
  const [report, setReport] = React.useState(undefined as AggregateReport | undefined);

  const fetchReport = React.useCallback(
    (target: Target) => {
      setLoading(true);
      return context.api.getCurrentReportForTarget(target).pipe(tap(() => setLoading(false)));
    },
    [setLoading, context.api],
  );

  // TODO check for active recordings, display empty state if none. listen for active recording notifications to update state.
  // have a toolbar, with a button to create a source recording (reuse automated analysis dashboard card settings and function) and a button to refresh report by issuing `POST /api/v4.1/targets/{id}/reports` request

  React.useEffect(() => {
    addSubscription(
      target
        .pipe(
          filter((t) => !!t),
          concatMap((t) => fetchReport(t)),
        )
        .subscribe((report) => setReport(report)),
    );
  }, [target, addSubscription, fetchReport, setReport]);

  React.useEffect(() => {
    addSubscription(
      target
        .pipe(
          filter((t) => !!t),
          concatMap((t) =>
            context.notificationChannel.messages(NotificationCategory.ReportSuccess).pipe(
              filter((msg) => msg.message.jvmId === t.jvmId),
              map(() => t),
            ),
          ),
          concatMap((t) => fetchReport(t)),
        )
        .subscribe((report) => setReport(report)),
    );
  }, [target, context.notificationChannel, addSubscription, fetchReport]);

  const empty = React.useMemo(() => !report?.aggregate?.count, [report]);

  const categorizedEvaluations = React.useMemo(() => {
    if (loading || empty) {
      return [];
    }
    const map = new Map<string, AnalysisResult[]>();
    report!
      .data!.map((e) => e.value)
      .forEach((evaluation) => {
        const topicValue = map.get(evaluation.topic);
        if (topicValue === undefined) {
          map.set(evaluation.topic, [evaluation]);
        } else {
          topicValue.push(evaluation);
          topicValue.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
        }
      });
    return (Array.from(map) as CategorizedRuleEvaluations[]).sort();
  }, [loading, empty, report]);

  return (
    <>
      {loading ? (
        <Bullseye>
          <Spinner />
        </Bullseye>
      ) : empty ? (
        <EmptyState>
          <EmptyStateHeader
            titleText="Report Unavailable"
            icon={<EmptyStateIcon icon={SearchIcon} />}
            headingLevel="h4"
          />
        </EmptyState>
      ) : (
        <AutomatedAnalysisResults analyses={categorizedEvaluations} />
      )}
    </>
  );
};

export interface AutomatedAnalysisResultsProps {
  analyses: CategorizedRuleEvaluations[];
}

export const AutomatedAnalysisResults: React.FC<AutomatedAnalysisResultsProps> = ({ analyses }) => {
  return (
    <>
      <Grid>
        {analyses.map(([topic, evaluations]) => (
          <GridItem className="automated-analysis-grid-item" span={2} key={`gridItem-${topic}`}>
            <LabelGroup
              className="automated-analysis-topic-label-groups"
              categoryName={topic}
              isVertical
              numLabels={2}
              isCompact
              key={topic}
            >
              {evaluations.map((evaluation) => (
                <ClickableAutomatedAnalysisLabel result={evaluation} key={clickableAutomatedAnalysisKey} />
              ))}
            </LabelGroup>
          </GridItem>
        ))}
      </Grid>
    </>
  );
};
