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
import { authFailMessage, isAuthFail, missingSSLMessage } from '@app/ErrorView/types';
import { LoadingView } from '@app/Shared/Components/LoadingView';
import {
  emptyAutomatedAnalysisFilters,
  TargetAutomatedAnalysisFilters,
} from '@app/Shared/Redux/Filters/AutomatedAnalysisFilterSlice';
import { UpdateFilterOptions } from '@app/Shared/Redux/Filters/Common';
import {
  automatedAnalysisAddFilterIntent,
  automatedAnalysisAddTargetIntent,
  automatedAnalysisDeleteAllFiltersIntent,
  automatedAnalysisDeleteCategoryFiltersIntent,
  automatedAnalysisDeleteFilterIntent,
  automatedAnalysisAddGlobalFilterIntent,
  RootState,
  StateDispatch,
} from '@app/Shared/Redux/ReduxStore';
import {
  ArchivedRecording,
  Recording,
  Target,
  CategorizedRuleEvaluations,
  automatedAnalysisRecordingName,
  NO_RECORDINGS_MESSAGE,
  FAILED_REPORT_MESSAGE,
  TEMPLATE_UNSUPPORTED_MESSAGE,
  RECORDING_FAILURE_MESSAGE,
  AutomatedAnalysisScore,
  AnalysisResult,
} from '@app/Shared/Services/api.types';
import { isGraphQLAuthError, isGraphQLError, isGraphQLSSLError } from '@app/Shared/Services/api.utils';
import { FeatureLevel } from '@app/Shared/Services/service.types';
import { automatedAnalysisConfigToRecordingAttributes } from '@app/Shared/Services/service.utils';
import { ServiceContext } from '@app/Shared/Services/Services';
import { useSubscriptions } from '@app/utils/hooks/useSubscriptions';
import { calculateAnalysisTimer, portalRoot } from '@app/utils/utils';
import {
  Button,
  CardBody,
  CardExpandableContent,
  CardHeader,
  CardTitle,
  Checkbox,
  EmptyState,
  EmptyStateBody,
  EmptyStateIcon,
  Grid,
  GridItem,
  Label,
  LabelGroup,
  Stack,
  StackItem,
  Text,
  TextContent,
  TextVariants,
  Toolbar,
  ToolbarContent,
  ToolbarGroup,
  ToolbarItem,
  Tooltip,
  EmptyStateActions,
  EmptyStateHeader,
  EmptyStateFooter,
  Flex,
  FlexItem,
  ToggleGroup,
  ToggleGroupItem,
} from '@patternfly/react-core';
import {
  CheckCircleIcon,
  ExclamationCircleIcon,
  ExclamationTriangleIcon,
  InfoCircleIcon,
  OutlinedQuestionCircleIcon,
  ProcessAutomationIcon,
  SearchIcon,
  Spinner2Icon,
  TrashIcon,
} from '@patternfly/react-icons';
import _ from 'lodash';
import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import { concatMap, filter, first, map, tap } from 'rxjs';
import { DashboardCard } from '../DashboardCard';
import { DashboardCardDescriptor, DashboardCardFC, DashboardCardSizes, DashboardCardTypeProps } from '../types';
import { AutomatedAnalysisCardList } from './AutomatedAnalysisCardList';
import { AutomatedAnalysisConfigDrawer } from './AutomatedAnalysisConfigDrawer';
import { AutomatedAnalysisConfigForm } from './AutomatedAnalysisConfigForm';
import {
  AutomatedAnalysisFilters,
  AutomatedAnalysisFiltersCategories,
  AutomatedAnalysisGlobalFiltersCategories,
  filterAutomatedAnalysis,
} from './AutomatedAnalysisFilters';
import { clickableAutomatedAnalysisKey, ClickableAutomatedAnalysisLabel } from './ClickableAutomatedAnalysisLabel';
import { AutomatedAnalysisScoreFilter } from './Filters/AutomatedAnalysisScoreFilter';

export interface AutomatedAnalysisCardProps extends DashboardCardTypeProps {}

export const AutomatedAnalysisCard: DashboardCardFC<AutomatedAnalysisCardProps> = (props) => {
  const context = React.useContext(ServiceContext);
  const addSubscription = useSubscriptions();
  const dispatch = useDispatch<StateDispatch>();
  const { t } = useTranslation();

  const [targetConnectURL, setTargetConnectURL] = React.useState('');
  const [results, setResults] = React.useState<AnalysisResult[]>([]);

  const [categorizedEvaluation, setCategorizedEvaluation] = React.useState<CategorizedRuleEvaluations[]>([]);
  const [filteredCategorizedEvaluation, setFilteredCategorizedEvaluation] = React.useState<
    CategorizedRuleEvaluations[]
  >([]);
  const [isCardExpanded, setIsCardExpanded] = React.useState<boolean>(true);
  const [errorMessage, setErrorMessage] = React.useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const [reportStalenessTimer, setReportStalenessTimer] = React.useState<number>(0);
  const [reportStalenessTimerUnits, setReportStalenessTimerUnits] = React.useState<string>('second');
  const [reportTime, setReportTime] = React.useState<number>(0);
  const [usingArchivedReport, setUsingArchivedReport] = React.useState<boolean>(false);
  const [usingCachedReport, setUsingCachedReport] = React.useState<boolean>(false);
  const [showNAScores, setShowNAScores] = React.useState<boolean>(false);
  const [report, setReport] = React.useState<string>('automated-analysis');
  const [showListView, setShowListView] = React.useState<boolean>(false);

  const targetAutomatedAnalysisFilters = useSelector((state: RootState) => {
    const filters = state.automatedAnalysisFilters.targetFilters.filter(
      (targetFilter: TargetAutomatedAnalysisFilters) => targetFilter.target === targetConnectURL,
    );
    return filters.length > 0 ? filters[0].filters : emptyAutomatedAnalysisFilters;
  }) as AutomatedAnalysisFiltersCategories;

  const targetAutomatedAnalysisGlobalFilters = useSelector((state: RootState) => {
    return state.automatedAnalysisFilters.globalFilters.filters;
  }) as AutomatedAnalysisGlobalFiltersCategories;

  const categorizeEvaluation = React.useCallback(
    (arr: AnalysisResult[]) => {
      setResults(arr);
      const map = new Map<string, AnalysisResult[]>();
      arr.forEach((evaluation) => {
        const topicValue = map.get(evaluation.topic);
        if (topicValue === undefined) {
          map.set(evaluation.topic, [evaluation]);
        } else {
          topicValue.push(evaluation);
          topicValue.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
        }
      });
      const sorted = (Array.from(map) as CategorizedRuleEvaluations[]).sort();
      setCategorizedEvaluation(sorted);
    },
    [setCategorizedEvaluation, setResults],
  );

  // Will perform analysis on the first ActiveRecording which has
  // name: 'automated-analysis'; label: 'origin=automated-analysis'
  // Query NEEDS 'state' so that isActiveRecording(result) is valid
  const queryActiveRecordings = React.useCallback(
    (targetId: number) => {
      /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
      return context.api.graphql<any>(
        `
      query ActiveRecordingsForAutomatedAnalysis($id: BigInteger!) {
        targetNodes(filter: { targetIds: [$id] }) {
          target {
            activeRecordings(filter: {
              name: "${automatedAnalysisRecordingName}",
              labels: ["origin=${automatedAnalysisRecordingName}"],
            }) {
              data {
                state
                name
                downloadUrl
                reportUrl
                metadata {
                  labels {
                    key
                    value
                  }
                }
              }
            }
          }
        }
      }`,
        { id: targetId },
      );
    },
    [context.api],
  );

  const queryArchivedRecordings = React.useCallback(
    (targetId: number) => {
      /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
      return context.api.graphql<any>(
        `query ArchivedRecordingsForAutomatedAnalysis($id: BigInteger!) {
          targetNodes(filter: { targetIds: [$id] }) {
            target {
              archivedRecordings {
                data {
                  name
                  downloadUrl
                  reportUrl
                  metadata {
                    labels {
                      key
                      value
                    }
                  }
                  size
                  archivedTime
                }
              }
            }
          }
      }`,
        { id: targetId },
      );
    },
    [context.api],
  );

  const handleStateErrors = React.useCallback(
    (errorMessage: string) => {
      setErrorMessage(errorMessage);
      setIsLoading(false);
      setUsingArchivedReport(false);
      setUsingCachedReport(false);
    },
    [setErrorMessage, setIsLoading, setUsingArchivedReport, setUsingCachedReport],
  );

  const handleLoading = React.useCallback(() => {
    setErrorMessage(undefined);
    setIsLoading(true);
    setUsingArchivedReport(false);
    setUsingCachedReport(false);
  }, [setErrorMessage, setIsLoading, setUsingArchivedReport, setUsingCachedReport]);

  const handleArchivedRecordings = React.useCallback(
    (recordings: ArchivedRecording[]) => {
      const freshestRecording = recordings.reduce((prev, current) =>
        prev?.archivedTime > current?.archivedTime ? prev : current,
      );
      addSubscription(
        context.target
          .target()
          .pipe(
            filter((target) => !!target),
            first(),
          )
          .subscribe((target: Target) => {
            context.reports
              .reportJson(freshestRecording, target.connectUrl)
              .pipe(first())
              .subscribe({
                next: (report) => {
                  setReport(freshestRecording.name);
                  setUsingArchivedReport(true);
                  setReportTime(freshestRecording.archivedTime);
                  categorizeEvaluation(report);
                  setIsLoading(false);
                },
                error: (err) => {
                  handleStateErrors(err.message);
                },
              });
          }),
      );
    },
    [
      addSubscription,
      context.target,
      context.reports,
      categorizeEvaluation,
      handleStateErrors,
      setUsingArchivedReport,
      setReportTime,
      setIsLoading,
      setReport,
    ],
  );

  // try generating report on cached or archived recordings
  const handleEmptyRecordings = React.useCallback(
    (target: Target) => {
      const cachedReportAnalysis = context.reports.getCachedAnalysisReport(target.connectUrl);
      if (cachedReportAnalysis.report.length > 0) {
        setReport(automatedAnalysisRecordingName);
        setUsingCachedReport(true);
        setReportTime(cachedReportAnalysis.timestamp);
        categorizeEvaluation(cachedReportAnalysis.report);
        setIsLoading(false);
      } else {
        addSubscription(
          queryArchivedRecordings(target.id!)
            .pipe(
              first(),
              map((v) => (v.data?.targetNodes[0]?.target?.archivedRecordings?.data as ArchivedRecording[]) ?? []),
            )
            .subscribe({
              next: (recordings) => {
                if (recordings.length > 0) {
                  handleArchivedRecordings(recordings);
                } else {
                  handleStateErrors(NO_RECORDINGS_MESSAGE);
                }
              },
              error: (err) => {
                handleStateErrors(err.message);
              },
            }),
        );
      }
    },
    [
      addSubscription,
      context.reports,
      categorizeEvaluation,
      queryArchivedRecordings,
      handleArchivedRecordings,
      handleStateErrors,
      setUsingCachedReport,
      setReportTime,
      setReport,
      setIsLoading,
    ],
  );

  const generateReport = React.useCallback(() => {
    handleLoading();
    addSubscription(
      context.target
        .target()
        .pipe(
          filter((target) => !!target),
          first(),
        )
        .subscribe((target: Target) => {
          addSubscription(
            queryActiveRecordings(target.id!)
              .pipe(
                first(),
                tap((resp) => {
                  if (isGraphQLError(resp)) {
                    if (isGraphQLAuthError(resp)) {
                      context.target.setAuthFailure();
                      throw new Error(authFailMessage);
                    } else if (isGraphQLSSLError(resp)) {
                      context.target.setSslFailure();
                      throw new Error(missingSSLMessage);
                    } else {
                      throw new Error(resp.errors[0].message);
                    }
                  }
                }),
                map((v) => v.data?.targetNodes[0]?.target?.activeRecordings?.data[0] as Recording),
                tap((recording) => {
                  if (recording === null || recording === undefined) {
                    throw new Error(NO_RECORDINGS_MESSAGE);
                  }
                }),
              )
              .subscribe({
                next: (recording) => {
                  context.reports
                    .reportJson(recording, target.connectUrl)
                    .pipe(first())
                    .subscribe({
                      next: (report) => {
                        setReport(recording.name);
                        categorizeEvaluation(report);
                        setIsLoading(false);
                      },
                      error: (_) => {
                        handleStateErrors(FAILED_REPORT_MESSAGE);
                      },
                    });
                },
                error: (err) => {
                  if (isAuthFail(err.message)) {
                    handleStateErrors(authFailMessage);
                  } else {
                    handleEmptyRecordings(target);
                  }
                },
              }),
          );
        }),
    );
  }, [
    addSubscription,
    context.target,
    context.reports,
    setIsLoading,
    setReport,
    categorizeEvaluation,
    queryActiveRecordings,
    handleEmptyRecordings,
    handleLoading,
    handleStateErrors,
  ]);

  const startProfilingRecording = React.useCallback(() => {
    const config = context.settings.automatedAnalysisRecordingConfig();
    const attributes = automatedAnalysisConfigToRecordingAttributes(config);

    addSubscription(
      context.api.createRecording(attributes).subscribe((resp) => {
        if (resp) {
          if (resp.ok || resp.status === 400) {
            // in-case the recording already exists
            generateReport();
          } else if (resp.status === 500) {
            handleStateErrors(TEMPLATE_UNSUPPORTED_MESSAGE);
          }
        } else {
          handleStateErrors(RECORDING_FAILURE_MESSAGE);
        }
      }),
    );
  }, [addSubscription, context.api, context.settings, generateReport, handleStateErrors]);

  const getMessageAndRetry = React.useCallback(
    (errorMessage: string | undefined): [string | undefined, undefined | (() => void)] => {
      if (errorMessage) {
        if (errorMessage === NO_RECORDINGS_MESSAGE) {
          return [undefined, undefined];
        } else if (isAuthFail(errorMessage)) {
          return [t('RETRY', { ns: 'common' }), generateReport];
        } else if (errorMessage === RECORDING_FAILURE_MESSAGE) {
          return [t('AutomatedAnalysisCard.RETRY_STARTING'), startProfilingRecording];
        } else if (errorMessage === FAILED_REPORT_MESSAGE) {
          return [t('AutomatedAnalysisCard.RETRY_LOADING'), generateReport];
        } else if (errorMessage === TEMPLATE_UNSUPPORTED_MESSAGE) {
          return [undefined, undefined];
        } else {
          return [t('RETRY', { ns: 'common' }), generateReport];
        }
      }
      return [undefined, undefined];
    },
    [t, startProfilingRecording, generateReport],
  );

  React.useEffect(() => {
    addSubscription(
      context.reports.getJobIds().subscribe(() => {
        generateReport();
      }),
    );
  }, [addSubscription, context.notificationChannel, context.reports, context.reports.getJobIds, generateReport]);

  React.useEffect(() => {
    addSubscription(context.target.authRetry().subscribe(generateReport));
  }, [addSubscription, context.target, generateReport]);

  React.useEffect(() => {
    context.target.target().subscribe((target) => {
      setTargetConnectURL(target?.connectUrl || '');
      dispatch(automatedAnalysisAddTargetIntent(target?.connectUrl || ''));
      generateReport();
    });
  }, [context.target, generateReport, setTargetConnectURL, dispatch]);

  React.useEffect(() => {
    if (reportTime == 0 || !(usingArchivedReport || usingCachedReport)) {
      return;
    }
    const analysisTimer = calculateAnalysisTimer(reportTime);
    setReportStalenessTimer(analysisTimer.quantity);
    setReportStalenessTimerUnits(analysisTimer.unit);
    const timer = setInterval(() => {
      setReportStalenessTimer((reportStalenessTimer) => reportStalenessTimer + 1);
    }, analysisTimer.interval);
    return () => clearInterval(timer);
  }, [
    setReportStalenessTimer,
    setReportStalenessTimerUnits,
    reportTime,
    reportStalenessTimer,
    usingArchivedReport,
    usingCachedReport,
  ]);

  React.useEffect(() => {
    setFilteredCategorizedEvaluation(
      filterAutomatedAnalysis(
        categorizedEvaluation,
        targetAutomatedAnalysisFilters,
        targetAutomatedAnalysisGlobalFilters,
        showNAScores,
      ),
    );
  }, [
    categorizedEvaluation,
    targetAutomatedAnalysisFilters,
    targetAutomatedAnalysisGlobalFilters,
    showNAScores,
    setFilteredCategorizedEvaluation,
  ]);

  const onCardExpand = React.useCallback(() => {
    setIsCardExpanded((isCardExpanded) => !isCardExpanded);
  }, [setIsCardExpanded]);

  const showUnavailableScores = React.useCallback(() => {
    setShowNAScores(true);
  }, [setShowNAScores]);

  const clearAnalysis = React.useCallback(() => {
    if (usingArchivedReport) {
      handleStateErrors(NO_RECORDINGS_MESSAGE);
      return;
    }
    setIsLoading(true);
    context.reports.deleteCachedAnalysisReport(targetConnectURL);
    if (usingCachedReport) {
      generateReport();
    } else {
      addSubscription(
        context.target
          .target()
          .pipe(
            filter((t) => !!t),
            concatMap((t) => context.api.targetRecordingRemoteIdByOrigin(t!, automatedAnalysisRecordingName)),
            concatMap((id) => context.api.deleteRecording(id!)),
          )
          .subscribe({
            next: () => {
              generateReport();
            },
            error: (error) => {
              handleStateErrors(error.message);
            },
          }),
      );
    }
  }, [
    addSubscription,
    context.api,
    context.reports,
    context.target,
    targetConnectURL,
    usingCachedReport,
    usingArchivedReport,
    setIsLoading,
    generateReport,
    handleStateErrors,
  ]);

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
    dispatch(automatedAnalysisDeleteAllFiltersIntent(targetConnectURL));
  }, [dispatch, targetConnectURL]);

  const handleResetScoreFilter = React.useCallback(() => {
    dispatch(automatedAnalysisAddGlobalFilterIntent('Score', 0));
  }, [dispatch]);

  const reportStalenessText = React.useMemo(() => {
    if (isLoading || !(usingArchivedReport || usingCachedReport)) {
      return undefined;
    }
    return (
      <TextContent style={{ marginBottom: '1em' }}>
        <Text className="stale-report-text" component={TextVariants.p}>
          <span style={{ marginRight: '0.3rem' }}>
            {t('AutomatedAnalysisCard.STALE_REPORT.TEXT', {
              count: reportStalenessTimer,
              units: reportStalenessTimerUnits,
            })}
          </span>
          <Tooltip content={t('AutomatedAnalysisCard.STALE_REPORT.TOOLTIP')} appendTo={portalRoot}>
            <OutlinedQuestionCircleIcon
              style={{ height: '0.85em', width: '0.85em', color: 'var(--pf-global--Color--100)' }}
            />
          </Tooltip>
        </Text>
      </TextContent>
    );
  }, [t, isLoading, usingArchivedReport, usingCachedReport, reportStalenessTimer, reportStalenessTimerUnits]);

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
                {t('CLEAR_FILTERS', { ns: 'common' })}
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

  const toolbar = React.useMemo(() => {
    return (
      <Toolbar
        id="automated-analysis-toolbar"
        aria-label={t('AutomatedAnalysisCard.TOOLBAR.LABEL')}
        clearAllFilters={handleClearFilters}
        clearFiltersButtonText={t('CLEAR_FILTERS', { ns: 'common' })}
        isFullHeight
      >
        <ToolbarContent>
          <AutomatedAnalysisFilters
            target={targetConnectURL}
            evaluations={categorizedEvaluation}
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
          <ToolbarGroup variant="icon-button-group">
            <ToolbarItem>
              <Tooltip content={t('AutomatedAnalysisCard.TOOLTIP.REFRESH_ANALYSIS')}>
                <Button
                  size="sm"
                  isDisabled={isLoading || usingCachedReport || usingArchivedReport}
                  isAriaDisabled={isLoading || usingCachedReport || usingArchivedReport}
                  aria-label={t('AutomatedAnalysisCard.TOOLBAR.REFRESH.LABEL')}
                  onClick={generateReport}
                  variant="control"
                  icon={<Spinner2Icon />}
                />
              </Tooltip>
              <Tooltip content={t('AutomatedAnalysisCard.TOOLTIP.CLEAR_ANALYSIS')}>
                <Button
                  size="sm"
                  isDisabled={isLoading}
                  isAriaDisabled={isLoading}
                  aria-label={t('AutomatedAnalysisCard.TOOLBAR.DELETE.LABEL')}
                  onClick={clearAnalysis}
                  variant="control"
                  icon={<TrashIcon />}
                />
              </Tooltip>
            </ToolbarItem>
          </ToolbarGroup>
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
    isLoading,
    showNAScores,
    showListView,
    targetConnectURL,
    categorizedEvaluation,
    targetAutomatedAnalysisFilters,
    usingArchivedReport,
    usingCachedReport,
    setShowNAScores,
    setShowListView,
    clearAnalysis,
    generateReport,
    handleClearFilters,
    updateFilters,
  ]);

  const errorView = React.useMemo(() => {
    return (
      <ErrorView
        title={t('AutomatedAnalysisCard.ERROR_TITLE')}
        message={
          <TextContent>
            <Text component={TextVariants.p}>{t('AutomatedAnalysisCard.ERROR_TEXT')}</Text>
            <Text component={TextVariants.small}>{errorMessage}</Text>
          </TextContent>
        }
        retryButtonMessage={getMessageAndRetry(errorMessage)[0]}
        retry={getMessageAndRetry(errorMessage)[1]}
      />
    );
  }, [t, getMessageAndRetry, errorMessage]);

  const handleConfigError = React.useCallback(
    (error) => {
      handleStateErrors(error.message);
    },
    [handleStateErrors],
  );

  const view = React.useMemo(() => {
    if (isLoading) {
      return <LoadingView />;
    }
    if (errorMessage) {
      if (isAuthFail(errorMessage)) {
        return errorView;
      }
      return (
        <AutomatedAnalysisConfigDrawer
          onCreate={generateReport}
          drawerContent={errorView}
          isContentAbove={true}
          onError={handleConfigError}
        />
      );
    } else if (usingArchivedReport || usingCachedReport) {
      return (
        <AutomatedAnalysisConfigDrawer
          onCreate={generateReport}
          drawerContent={filteredCategorizedLabels}
          isContentAbove={false}
          onError={handleConfigError}
        />
      );
    } else {
      return filteredCategorizedLabels;
    }
  }, [
    filteredCategorizedLabels,
    usingArchivedReport,
    usingCachedReport,
    isLoading,
    errorMessage,
    errorView,
    generateReport,
    handleConfigError,
  ]);

  const reportSource = React.useMemo(() => {
    if (isLoading || errorMessage) return undefined;
    return (
      <Label icon={<InfoCircleIcon />} color={'cyan'}>
        {`${usingArchivedReport ? 'Archived' : usingCachedReport ? 'Cached' : 'Active'} report name=${report}`}
      </Label>
    );
  }, [usingArchivedReport, usingCachedReport, report, isLoading, errorMessage]);

  const headerLabels = React.useMemo(() => {
    if (isLoading || errorMessage) return undefined;
    const filtered = results.filter((e) => e.score >= AutomatedAnalysisScore.ORANGE_SCORE_THRESHOLD);
    if (filtered.length === 0) return <AutomatedAnalysisHeaderLabel type="ok" />;
    const [warnings, errors] = _.partition(filtered, (e) => e.score < AutomatedAnalysisScore.RED_SCORE_THRESHOLD);
    return (
      <LabelGroup>
        {reportSource}
        {errors.length > 0 && <AutomatedAnalysisHeaderLabel type={'critical'} count={errors.length} />}
        {warnings.length > 0 && <AutomatedAnalysisHeaderLabel type={'warning'} count={warnings.length} />}
      </LabelGroup>
    );
  }, [isLoading, errorMessage, results, reportSource]);

  const header = React.useMemo(() => {
    return (
      <CardHeader
        actions={{ actions: <>{...props.actions || []}</>, hasNoOffset: false, className: undefined }}
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
            <CardTitle component="h4">{t('AutomatedAnalysisCard.CARD_TITLE')}</CardTitle>
          </FlexItem>
          <FlexItem>{headerLabels}</FlexItem>
        </Flex>
      </CardHeader>
    );
  }, [t, onCardExpand, isCardExpanded, headerLabels, props.actions]);

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
        <Stack hasGutter>
          <StackItem>{isLoading || errorMessage ? null : toolbar}</StackItem>
          <StackItem className="automated-analysis-score-filter-stack-item">
            {isLoading || errorMessage ? null : <AutomatedAnalysisScoreFilter />}
          </StackItem>
          <StackItem>
            <CardBody isFilled={true}>
              {reportStalenessText}
              {view}
            </CardBody>
          </StackItem>
        </Stack>
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
  const { t } = useTranslation();

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
  advancedConfig: <AutomatedAnalysisConfigForm />,
  icon: <ProcessAutomationIcon />,
  labels: [
    {
      content: 'Evaluation',
      color: 'blue',
    },
  ],
  preview: <AutomatedAnalysisCard span={12} dashboardId={0} isDraggable={false} isResizable={false} />,
};
