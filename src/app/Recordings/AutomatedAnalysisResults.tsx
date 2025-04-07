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

import { CustomRecordingFormData } from '@app/CreateRecording/types';
import {
  ClickableAutomatedAnalysisLabel,
  clickableAutomatedAnalysisKey,
} from '@app/Dashboard/AutomatedAnalysis/ClickableAutomatedAnalysisLabel';
import { CryostatLink } from '@app/Shared/Components/CryostatLink';
import {
  AggregateReport,
  AnalysisResult,
  CategorizedRuleEvaluations,
  NotificationCategory,
  NullableTarget,
  Target,
  TemplateType,
} from '@app/Shared/Services/api.types';
import { ServiceContext } from '@app/Shared/Services/Services';
import useDayjs from '@app/utils/hooks/useDayjs';
import { useSubscriptions } from '@app/utils/hooks/useSubscriptions';
import { useCryostatTranslation } from '@i18n/i18nextUtil';
import {
  Bullseye,
  Grid,
  GridItem,
  LabelGroup,
  Spinner,
  EmptyState,
  EmptyStateHeader,
  EmptyStateIcon,
  Text,
  Stack,
  StackItem,
} from '@patternfly/react-core';
import { SearchIcon } from '@patternfly/react-icons';
import * as React from 'react';
import { Observable } from 'rxjs';
import { concatMap, filter, map, tap } from 'rxjs/operators';

export interface TargetAnalysisProps {
  target: Observable<NullableTarget>;
  refreshRequest?: Observable<void>;
  immediate?: boolean;
}

export const TargetAnalysis: React.FC<TargetAnalysisProps> = ({ target, refreshRequest, immediate }) => {
  const context = React.useContext(ServiceContext);
  const addSubscription = useSubscriptions();
  const [loading, setLoading] = React.useState(false);
  const [sourceCount, setSourceCount] = React.useState(0);
  const [report, setReport] = React.useState(undefined as AggregateReport | undefined);

  const emptyReport = React.useMemo(() => !report?.aggregate?.count, [report]);
  const hasSources = React.useMemo(() => sourceCount > 0, [sourceCount]);

  const fetchReport = React.useCallback(
    (target: Target) => {
      setLoading(true);
      return context.api.getCurrentReportForTarget(target).pipe(tap(() => setLoading(false)));
    },
    [setLoading, context.api],
  );

  React.useEffect(() => {
    addSubscription(
      target
        .pipe(
          filter((t) => !!t),
          concatMap((t) => context.api.getTargetActiveRecordings(t)),
          map((a) => a.filter((r) => !r.name.toLowerCase().startsWith('snapshot'))),
          map((a) => a.length),
        )
        .subscribe((count) => {
          setSourceCount(count);

          addSubscription(
            target
              .pipe(
                filter((t) => !!t),
                concatMap((t) =>
                  context.notificationChannel.messages(NotificationCategory.ActiveRecordingCreated).pipe(
                    filter((msg) => msg.message.jvmId === t.jvmId),
                    filter((msg) => !msg.message.recording.name.toLowerCase().startsWith('snapshot')),
                  ),
                ),
              )
              .subscribe(() => setSourceCount((prev) => prev + 1)),
          );
          addSubscription(
            target
              .pipe(
                filter((t) => !!t),
                concatMap((t) =>
                  context.notificationChannel.messages(NotificationCategory.ActiveRecordingDeleted).pipe(
                    filter((msg) => msg.message.jvmId === t.jvmId),
                    filter((msg) => !msg.message.recording.name.toLowerCase().startsWith('snapshot')),
                  ),
                ),
              )
              .subscribe(() => setSourceCount((prev) => prev - 1)),
          );
        }),
    );
  }, [target, addSubscription, context.api, context.notificationChannel, setSourceCount]);

  const handleRefresh = React.useCallback(() => {
    if (!hasSources) {
      return;
    }
    setLoading(true);
    addSubscription(
      target
        .pipe(
          filter((t) => !!t),
          concatMap((t) =>
            context.api.sendRequest('v4.1', `/targets/${t.id}/reports`, {
              method: 'POST',
            }),
          ),
        )
        // this will trigger a ReportSuccess notification which we are listening for,
        // and the response body with the job ID is not particularly relevant
        .subscribe(),
    );
  }, [target, hasSources, addSubscription, context.api, setLoading]);

  React.useEffect(() => {
    if (immediate && hasSources) {
      handleRefresh();
    }
  }, [immediate, hasSources, handleRefresh]);

  React.useEffect(() => {
    if (!refreshRequest) {
      return;
    }
    addSubscription(refreshRequest.subscribe(() => handleRefresh()));
  }, [addSubscription, refreshRequest, handleRefresh]);

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

  const categorizedEvaluations = React.useMemo(() => {
    if (loading || emptyReport) {
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
  }, [loading, emptyReport, report]);

  return (
    <>
      {!hasSources ? (
        <Text>
          <CryostatLink
            state={
              {
                name: 'analysis',
                continuous: true,
                restart: true,
                template: { name: 'Continuous', type: 'TARGET' as TemplateType },
                maxAge: 10,
                maxAgeUnit: 60,
                maxSize: 20,
                maxSizeUnit: 1024 * 1024,
                toDisk: true,
              } as Partial<CustomRecordingFormData>
            }
            to="/recordings/create"
          >
            Create a Recording
          </CryostatLink>{' '}
          to enable analysis
        </Text>
      ) : undefined}
      {loading ? (
        <Bullseye>
          <Spinner />
        </Bullseye>
      ) : (
        <AutomatedAnalysisResults timestamp={report?.lastUpdated} analyses={categorizedEvaluations} />
      )}
    </>
  );
};

export interface AutomatedAnalysisResultsProps {
  timestamp?: number;
  analyses: CategorizedRuleEvaluations[];
}

export const AutomatedAnalysisResults: React.FC<AutomatedAnalysisResultsProps> = ({ timestamp, analyses }) => {
  const { t } = useCryostatTranslation();
  const [dayjs, dateTimeFormat] = useDayjs();
  return (
    <>
      {!analyses.length ? (
        <EmptyState>
          <EmptyStateHeader
            titleText="Report Unavailable"
            icon={<EmptyStateIcon icon={SearchIcon} />}
            headingLevel="h4"
          />
        </EmptyState>
      ) : (
        <>
          <Stack hasGutter>
            <StackItem>
              <Text>
                {t('AutomatedAnalysisResults.LAST_UPDATE', {
                  datetime: timestamp
                    ? dayjs(new Date(timestamp * 1000))
                        .tz(dateTimeFormat.timeZone.full)
                        .format('LLLL')
                    : 'unknown',
                })}
              </Text>
            </StackItem>
            <StackItem isFilled>
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
            </StackItem>
          </Stack>
        </>
      )}
    </>
  );
};
