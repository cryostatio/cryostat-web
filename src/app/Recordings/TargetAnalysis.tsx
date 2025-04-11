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
import { AutomatedAnalysisCardList } from '@app/Dashboard/AutomatedAnalysis/AutomatedAnalysisCardList';
import {
  AutomatedAnalysisFilters,
  AutomatedAnalysisFiltersCategories,
  AutomatedAnalysisGlobalFiltersCategories,
  filterAutomatedAnalysis,
} from '@app/Dashboard/AutomatedAnalysis/AutomatedAnalysisFilters';
import {
  ClickableAutomatedAnalysisLabel,
  clickableAutomatedAnalysisKey,
} from '@app/Dashboard/AutomatedAnalysis/ClickableAutomatedAnalysisLabel';
import { AutomatedAnalysisScoreFilter } from '@app/Dashboard/AutomatedAnalysis/Filters/AutomatedAnalysisScoreFilter';
import { CryostatLink } from '@app/Shared/Components/CryostatLink';
import {
  emptyAutomatedAnalysisFilters,
  TargetAutomatedAnalysisFilters,
} from '@app/Shared/Redux/Filters/AutomatedAnalysisFilterSlice';
import { UpdateFilterOptions } from '@app/Shared/Redux/Filters/Common';
import {
  automatedAnalysisAddFilterIntent,
  automatedAnalysisAddGlobalFilterIntent,
  automatedAnalysisDeleteAllFiltersIntent,
  automatedAnalysisDeleteCategoryFiltersIntent,
  automatedAnalysisDeleteFilterIntent,
  RootState,
  StateDispatch,
} from '@app/Shared/Redux/ReduxStore';
import {
  AggregateReport,
  AnalysisResult,
  CategorizedRuleEvaluations,
  NotificationCategory,
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
  Button,
  Toolbar,
  ToolbarContent,
  Checkbox,
  ToolbarItem,
  ToggleGroup,
  ToggleGroupItem,
  EmptyStateBody,
  EmptyStateFooter,
  EmptyStateActions,
} from '@patternfly/react-core';
import { SearchIcon } from '@patternfly/react-icons';
import * as React from 'react';
import { Trans } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import { Observable } from 'rxjs';
import { concatMap, filter, map, tap } from 'rxjs/operators';

export interface TargetAnalysisProps {
  target: Target;
  refreshRequest?: Observable<void>;
  immediate?: boolean;
}

export const TargetAnalysis: React.FC<TargetAnalysisProps> = ({ target, refreshRequest, immediate }) => {
  const { t } = useCryostatTranslation();
  const context = React.useContext(ServiceContext);
  const addSubscription = useSubscriptions([target]);
  const [loading, setLoading] = React.useState(false);
  const [sourceCount, setSourceCount] = React.useState(0);
  const [report, setReport] = React.useState(undefined as AggregateReport | undefined);

  const emptyReport = React.useMemo(() => !report?.aggregate?.count, [report]);
  const hasSources = React.useMemo(() => !!target && sourceCount > 0, [target, sourceCount]);

  const fetchReport = React.useCallback(
    (target: Target) => {
      setLoading(true);
      return context.api.getCurrentReportForTarget(target).pipe(tap(() => setLoading(false)));
    },
    [setLoading, context.api],
  );

  React.useEffect(() => {
    if (!target) {
      return;
    }
    addSubscription(
      context.api
        .getTargetActiveRecordings(target)
        .pipe(
          map((a) => a.filter((r) => !r.name.toLowerCase().startsWith('snapshot'))),
          map((a) => a.length),
        )
        .subscribe((count) => {
          setSourceCount(count);

          addSubscription(
            context.notificationChannel
              .messages(NotificationCategory.ActiveRecordingCreated)
              .pipe(
                filter((msg) => msg.message.jvmId === target.jvmId),
                filter((msg) => !msg.message.recording.name.toLowerCase().startsWith('snapshot')),
              )
              .subscribe(() => setSourceCount((prev) => prev + 1)),
          );
          addSubscription(
            context.notificationChannel
              .messages(NotificationCategory.ActiveRecordingDeleted)
              .pipe(
                filter((msg) => msg.message.jvmId === target.jvmId),
                filter((msg) => !msg.message.recording.name.toLowerCase().startsWith('snapshot')),
              )
              .subscribe(() => setSourceCount((prev) => prev - 1)),
          );
        }),
    );
  }, [target, addSubscription, context.api, context.notificationChannel, setSourceCount]);

  const handleRefresh = React.useCallback(() => {
    if (!target || !hasSources) {
      return;
    }
    setLoading(true);
    // this will trigger a ReportSuccess notification which we are listening for,
    // and the response body with the job ID is not particularly relevant
    addSubscription(
      context.api
        .sendRequest('v4.1', `/targets/${target.id}/reports`, {
          method: 'POST',
        })
        .subscribe(),
    );
  }, [target, hasSources, addSubscription, context.api, setLoading]);

  React.useEffect(() => {
    if (!!target && immediate && hasSources) {
      handleRefresh();
    }
  }, [target, immediate, hasSources, handleRefresh]);

  React.useEffect(() => {
    if (!target || !refreshRequest) {
      return;
    }
    addSubscription(refreshRequest.subscribe(() => handleRefresh()));
  }, [target, addSubscription, refreshRequest, handleRefresh]);

  React.useEffect(() => {
    if (!target) {
      return;
    }
    addSubscription(fetchReport(target).subscribe((report) => setReport(report)));
  }, [target, addSubscription, fetchReport, setReport]);

  React.useEffect(() => {
    if (!target) {
      return;
    }
    addSubscription(
      context.notificationChannel
        .messages(NotificationCategory.ReportSuccess)
        .pipe(
          filter((msg) => msg.message.jvmId === target.jvmId),
          concatMap(() => fetchReport(target)),
        )
        .subscribe((report) => setReport(report)),
    );
  }, [target, context.notificationChannel, addSubscription, fetchReport]);

  const categorizedEvaluations = React.useMemo(() => {
    if (emptyReport) {
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
  }, [emptyReport, report]);

  return (
    <>
      {!target ? (
        <EmptyState>
          <EmptyStateHeader
            titleText={t('TargetAnalysis.REPORT_UNAVAILABLE')}
            icon={<EmptyStateIcon icon={SearchIcon} />}
            headingLevel="h4"
          />
        </EmptyState>
      ) : undefined}
      {loading ? (
        <Bullseye>
          <Spinner />
        </Bullseye>
      ) : (
        <AutomatedAnalysisResults
          target={target}
          hasSources={hasSources}
          timestamp={report?.lastUpdated}
          analyses={categorizedEvaluations}
        />
      )}
    </>
  );
};

interface AutomatedAnalysisResultsProps {
  target: Target;
  hasSources: boolean;
  timestamp?: number;
  analyses: CategorizedRuleEvaluations[];
}

const AutomatedAnalysisResults: React.FC<AutomatedAnalysisResultsProps> = ({
  target,
  hasSources,
  timestamp,
  analyses,
}) => {
  const dispatch = useDispatch<StateDispatch>();
  const { t } = useCryostatTranslation();
  const [dayjs, dateTimeFormat] = useDayjs();

  const [showListView, setShowListView] = React.useState(false);
  const [showNAScores, setShowNAScores] = React.useState<boolean>(false);
  const [filteredCategorizedEvaluation, setFilteredCategorizedEvaluation] = React.useState<
    CategorizedRuleEvaluations[]
  >([]);

  const showUnavailableScores = React.useCallback(() => {
    setShowNAScores(true);
  }, [setShowNAScores]);

  const targetAutomatedAnalysisFilters = useSelector((state: RootState) => {
    const filters = state.automatedAnalysisFilters.targetFilters.filter(
      (targetFilter: TargetAutomatedAnalysisFilters) => targetFilter.target === target.connectUrl,
    );
    return filters.length > 0 ? filters[0].filters : emptyAutomatedAnalysisFilters;
  }) as AutomatedAnalysisFiltersCategories;

  const targetAutomatedAnalysisGlobalFilters = useSelector((state: RootState) => {
    return state.automatedAnalysisFilters.globalFilters.filters;
  }) as AutomatedAnalysisGlobalFiltersCategories;

  const updateFilters = React.useCallback(
    (target, { filterValue, filterKey, deleted = false, deleteOptions }: UpdateFilterOptions) => {
      if (deleted) {
        if (deleteOptions && deleteOptions.all) {
          dispatch(automatedAnalysisDeleteCategoryFiltersIntent(target, filterKey));
        } else {
          dispatch(automatedAnalysisDeleteFilterIntent(target, filterKey, filterValue));
        }
      } else {
        dispatch(automatedAnalysisAddFilterIntent(target, filterKey, filterValue));
      }
    },
    [dispatch],
  );

  const handleClearFilters = React.useCallback(() => {
    dispatch(automatedAnalysisDeleteAllFiltersIntent(target.connectUrl));
  }, [dispatch, target]);

  const handleResetScoreFilter = React.useCallback(() => {
    dispatch(automatedAnalysisAddGlobalFilterIntent('Score', 0));
  }, [dispatch]);

  React.useEffect(() => {
    setFilteredCategorizedEvaluation(
      filterAutomatedAnalysis(
        analyses,
        targetAutomatedAnalysisFilters,
        targetAutomatedAnalysisGlobalFilters,
        showNAScores,
      ),
    );
  }, [
    analyses,
    targetAutomatedAnalysisFilters,
    targetAutomatedAnalysisGlobalFilters,
    showNAScores,
    setFilteredCategorizedEvaluation,
  ]);

  const toolbar = React.useMemo(() => {
    return (
      <Toolbar
        id="automated-analysis-toolbar"
        aria-label={t('AutomatedAnalysisCard.TOOLBAR.LABEL')}
        clearAllFilters={handleClearFilters}
        clearFiltersButtonText={t('CLEAR_FILTERS')}
        isFullHeight
      >
        <ToolbarContent>
          <AutomatedAnalysisFilters
            target={target.connectUrl}
            evaluations={analyses}
            filters={targetAutomatedAnalysisFilters}
            updateFilters={updateFilters}
          />
          <ToolbarItem>
            <Checkbox
              label={t('AutomatedAnalysisCard.TOOLBAR.CHECKBOX.SHOW_NA.LABEL')}
              isChecked={showNAScores}
              onChange={(_, checked: boolean) => setShowNAScores(checked)}
              id="show-na-scores"
              name="show-na-scores"
              style={{ alignSelf: 'center' }}
            />
          </ToolbarItem>
          <ToolbarItem variant="separator" />
          <ToolbarItem>
            <ToggleGroup>
              <ToggleGroupItem
                aria-label={t('AutomatedAnalysisCard.TOOLBAR.ARIA_LABELS.GRID_VIEW')}
                text="Grid view"
                buttonId="grid-view-btn"
                isSelected={!showListView}
                onClick={() => setShowListView(false)}
              />
              <ToggleGroupItem
                aria-label={t('AutomatedAnalysisCard.TOOLBAR.ARIA_LABELS.LIST_VIEW')}
                text="List view"
                buttonId="list-view-btn"
                isSelected={showListView}
                onClick={() => setShowListView(true)}
              />
            </ToggleGroup>
          </ToolbarItem>
        </ToolbarContent>
      </Toolbar>
    );
  }, [
    t,
    showNAScores,
    showListView,
    target,
    analyses,
    targetAutomatedAnalysisFilters,
    setShowNAScores,
    setShowListView,
    handleClearFilters,
    updateFilters,
  ]);

  const filteredCategorizedLabels = React.useMemo(() => {
    const filtered = filteredCategorizedEvaluation.filter(([_, evaluations]) => evaluations.length > 0);
    if (filtered.length === 0) {
      return (
        <EmptyState>
          <EmptyStateHeader
            titleText={<>{t(`AutomatedAnalysisCard.NO_RESULTS`)}</>}
            icon={<EmptyStateIcon icon={SearchIcon} />}
            headingLevel="h4"
          />
          <EmptyStateBody>{t('AutomatedAnalysisCard.NO_RESULTS_BODY')}</EmptyStateBody>
          <EmptyStateFooter>
            <EmptyStateActions>
              <Button variant="link" onClick={handleClearFilters}>
                {t('CLEAR_FILTERS')}
              </Button>
              <Button variant="link" onClick={showUnavailableScores}>
                {t('AutomatedAnalysisCard.TOOLBAR.CHECKBOX.SHOW_NA.LABEL')}
              </Button>
              <Button variant="link" onClick={handleResetScoreFilter}>
                {t('AutomatedAnalysisScoreFilter.SLIDER.RESET0.LABEL')}
              </Button>
            </EmptyStateActions>
          </EmptyStateFooter>
        </EmptyState>
      );
    }
    if (showListView) {
      return <AutomatedAnalysisCardList evaluations={filtered} />;
    }
    return (
      <Grid>
        {filtered.map(([topic, evaluations]) => {
          return (
            <GridItem className="automated-analysis-grid-item" span={3} key={`gridItem-${topic}`}>
              <LabelGroup
                className="automated-analysis-topic-label-groups"
                categoryName={topic}
                isVertical
                numLabels={3}
                isCompact
                key={topic}
              >
                {evaluations.map((evaluation) => {
                  return <ClickableAutomatedAnalysisLabel result={evaluation} key={clickableAutomatedAnalysisKey} />;
                })}
              </LabelGroup>
            </GridItem>
          );
        })}
      </Grid>
    );
  }, [
    t,
    handleClearFilters,
    showUnavailableScores,
    handleResetScoreFilter,
    filteredCategorizedEvaluation,
    showListView,
  ]);

  return (
    <>
      {!analyses.length ? (
        <EmptyState>
          <EmptyStateHeader
            titleText={t('TargetAnalysis.REPORT_UNAVAILABLE')}
            icon={<EmptyStateIcon icon={SearchIcon} />}
            headingLevel="h4"
          />
          {!hasSources ? (
            <Text>
              <Trans
                t={t}
                components={[
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
                  />,
                ]}
              >
                TargetAnalysis.CREATE_RECORDING
              </Trans>
            </Text>
          ) : undefined}
        </EmptyState>
      ) : (
        <>
          <Stack hasGutter>
            <StackItem>
              <Text>
                {t('TargetAnalysis.LAST_UPDATE', {
                  datetime: timestamp
                    ? dayjs(new Date(timestamp * 1000))
                        .tz(dateTimeFormat.timeZone.full)
                        .format('LLLL')
                    : 'unknown',
                })}
              </Text>
            </StackItem>
            <StackItem>{toolbar}</StackItem>
            <StackItem>
              <AutomatedAnalysisScoreFilter />
            </StackItem>
            <StackItem isFilled>{filteredCategorizedLabels}</StackItem>
          </Stack>
        </>
      )}
    </>
  );
};
