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
import { authFailMessage, ErrorView, isAuthFail } from '@app/ErrorView/ErrorView';
import { LoadingView } from '@app/LoadingView/LoadingView';
import {
  automatedAnalysisAddGlobalFilterIntent,
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
  RootState,
  StateDispatch,
} from '@app/Shared/Redux/ReduxStore';
import {
  ArchivedRecording,
  automatedAnalysisRecordingName,
  isGraphQLAuthError,
  Recording,
} from '@app/Shared/Services/Api.service';
import {
  AutomatedAnalysisScore,
  CategorizedRuleEvaluations,
  FAILED_REPORT_MESSAGE,
  NO_RECORDINGS_MESSAGE,
  RECORDING_FAILURE_MESSAGE,
  RuleEvaluation,
  TEMPLATE_UNSUPPORTED_MESSAGE,
} from '@app/Shared/Services/Report.service';
import { ServiceContext } from '@app/Shared/Services/Services';
import { automatedAnalysisConfigToRecordingAttributes, FeatureLevel } from '@app/Shared/Services/Settings.service';
import { NO_TARGET } from '@app/Shared/Services/Target.service';
import { useSubscriptions } from '@app/utils/useSubscriptions';
import { calculateAnalysisTimer, portalRoot } from '@app/utils/utils';
import {
  Button,
  CardActions,
  CardBody,
  CardExpandableContent,
  CardHeader,
  CardTitle,
  Checkbox,
  EmptyState,
  EmptyStateBody,
  EmptyStateIcon,
  EmptyStateSecondaryActions,
  Grid,
  GridItem,
  Label,
  LabelGroup,
  Level,
  LevelItem,
  Stack,
  StackItem,
  Switch,
  Text,
  TextContent,
  TextVariants,
  Title,
  Toolbar,
  ToolbarContent,
  ToolbarGroup,
  ToolbarItem,
  Tooltip,
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
import { filter, first, map, tap } from 'rxjs';
import { DashboardCardDescriptor, DashboardCardProps, DashboardCardSizes } from '../Dashboard';
import { DashboardCard } from '../DashboardCard';
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

export interface AutomatedAnalysisCardProps extends DashboardCardProps {}

export const AutomatedAnalysisCard: React.FC<AutomatedAnalysisCardProps> = (props) => {
  const context = React.useContext(ServiceContext);
  const addSubscription = useSubscriptions();
  const dispatch = useDispatch<StateDispatch>();
  const { t } = useTranslation();

  const [targetConnectURL, setTargetConnectURL] = React.useState('');
  const [evaluations, setEvaluations] = React.useState<RuleEvaluation[]>([]);

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
    const filters = state.automatedAnalysisFilters.state.targetFilters.filter(
      (targetFilter: TargetAutomatedAnalysisFilters) => targetFilter.target === targetConnectURL
    );
    return filters.length > 0 ? filters[0].filters : emptyAutomatedAnalysisFilters;
  }) as AutomatedAnalysisFiltersCategories;

  const targetAutomatedAnalysisGlobalFilters = useSelector((state: RootState) => {
    return state.automatedAnalysisFilters.state.globalFilters.filters;
  }) as AutomatedAnalysisGlobalFiltersCategories;

  const categorizeEvaluation = React.useCallback(
    (arr: RuleEvaluation[]) => {
      setEvaluations(arr);
      const map = new Map<string, RuleEvaluation[]>();
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
    [setCategorizedEvaluation, setEvaluations]
  );

  // Will perform analysis on the first ActiveRecording which has
  // name: 'automated-analysis'; label: 'origin=automated-analysis'
  // Query NEEDS 'state' so that isActiveRecording(result) is valid
  const queryActiveRecordings = React.useCallback(
    (connectUrl: string) => {
      /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
      return context.api.graphql<any>(
        `
      query ActiveRecordingsForAutomatedAnalysis($connectUrl: String) {
        targetNodes(filter: { name: $connectUrl }) {
          recordings {
            active (filter: {
              name: "${automatedAnalysisRecordingName}",
              labels: ["origin=${automatedAnalysisRecordingName}"],
            }) {
              data {
                state
                name
                downloadUrl
                reportUrl
                metadata {
                  labels
                }
              }
            }
          }
        }
      }`,
        { connectUrl }
      );
    },
    [context.api]
  );

  const queryArchivedRecordings = React.useCallback(
    (connectUrl: string) => {
      /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
      return context.api.graphql<any>(
        `query ArchivedRecordingsForAutomatedAnalysis($connectUrl: String) {
        archivedRecordings(filter: { sourceTarget: $connectUrl }) {
          data {
            name
            downloadUrl
            reportUrl
            metadata {
              labels
            }
            size
            archivedTime
          }
        }
      }`,
        { connectUrl }
      );
    },
    [context.api]
  );

  const handleStateErrors = React.useCallback(
    (errorMessage: string) => {
      setErrorMessage(errorMessage);
      setIsLoading(false);
      setUsingArchivedReport(false);
      setUsingCachedReport(false);
    },
    [setErrorMessage, setIsLoading, setUsingArchivedReport, setUsingCachedReport]
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
        prev?.archivedTime > current?.archivedTime ? prev : current
      );
      addSubscription(
        context.target
          .target()
          .pipe(
            filter((target) => target !== NO_TARGET),
            first()
          )
          .subscribe((target) => {
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
          })
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
    ]
  );

  // try generating report on cached or archived recordings
  const handleEmptyRecordings = React.useCallback(
    (connectUrl: string) => {
      const cachedReportAnalysis = context.reports.getCachedAnalysisReport(connectUrl);
      if (cachedReportAnalysis.report.length > 0) {
        setReport(automatedAnalysisRecordingName);
        setUsingCachedReport(true);
        setReportTime(cachedReportAnalysis.timestamp);
        categorizeEvaluation(cachedReportAnalysis.report);
        setIsLoading(false);
      } else {
        addSubscription(
          queryArchivedRecordings(connectUrl)
            .pipe(
              first(),
              map((v) => v.data.archivedRecordings.data as ArchivedRecording[])
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
            })
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
    ]
  );

  const generateReport = React.useCallback(() => {
    handleLoading();
    addSubscription(
      context.target
        .target()
        .pipe(
          filter((target) => target !== NO_TARGET),
          first()
        )
        .subscribe((target) => {
          addSubscription(
            queryActiveRecordings(target.connectUrl)
              .pipe(
                first(),
                tap((resp) => {
                  if (resp.data == undefined) {
                    if (isGraphQLAuthError(resp)) {
                      context.target.setAuthFailure();
                      throw new Error(authFailMessage);
                    } else {
                      throw new Error(resp.errors[0].message);
                    }
                  }
                }),
                map((v) => v.data.targetNodes[0].recordings.active.data[0] as Recording),
                tap((recording) => {
                  if (recording === null || recording === undefined) {
                    throw new Error(NO_RECORDINGS_MESSAGE);
                  }
                })
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
                    handleEmptyRecordings(target.connectUrl);
                  }
                },
              })
          );
        })
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
      })
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
    [t, startProfilingRecording, generateReport]
  );

  React.useEffect(() => {
    addSubscription(context.target.authRetry().subscribe(generateReport));
  }, [addSubscription, context.target, generateReport]);

  React.useEffect(() => {
    context.target.target().subscribe((target) => {
      setTargetConnectURL(target.connectUrl);
      dispatch(automatedAnalysisAddTargetIntent(target.connectUrl));
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
        showNAScores
      )
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
        context.api.deleteRecording('automated-analysis').subscribe({
          next: () => {
            generateReport();
          },
          error: (error) => {
            handleStateErrors(error.message);
          },
        })
      );
    }
  }, [
    addSubscription,
    context.api,
    context.reports,
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
    [dispatch]
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
          <EmptyStateIcon icon={SearchIcon} />
          <Title headingLevel="h4" size="lg">
            {t(`AutomatedAnalysisCard.NO_RESULTS`)}
          </Title>
          <EmptyStateBody>{t('AutomatedAnalysisCard.NO_RESULTS_BODY')}</EmptyStateBody>
          <EmptyStateSecondaryActions>
            <Button variant="link" onClick={handleClearFilters}>
              {t('CLEAR_FILTERS', { ns: 'common' })}
            </Button>
            <Button variant="link" onClick={showUnavailableScores}>
              {t('AutomatedAnalysisCard.TOOLBAR.CHECKBOX.SHOW_NA.LABEL')}
            </Button>
            <Button variant="link" onClick={handleResetScoreFilter}>
              {t('AutomatedAnalysisScoreFilter.SLIDER.RESET0.LABEL')}
            </Button>
          </EmptyStateSecondaryActions>
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
                  return <ClickableAutomatedAnalysisLabel label={evaluation} key={clickableAutomatedAnalysisKey} />;
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
          <ToolbarGroup style={{ margin: '0.5em 0 0.5em 0' }}>
            <ToolbarItem>
              <Button
                isSmall
                isDisabled={isLoading || usingCachedReport || usingArchivedReport}
                isAriaDisabled={isLoading || usingCachedReport || usingArchivedReport}
                aria-label={t('AutomatedAnalysisCard.TOOLBAR.REFRESH.LABEL')}
                onClick={generateReport}
                variant="control"
                icon={<Spinner2Icon />}
              />
              <Button
                isSmall
                isDisabled={isLoading}
                isAriaDisabled={isLoading}
                aria-label={t('AutomatedAnalysisCard.TOOLBAR.DELETE.LABEL')}
                onClick={clearAnalysis}
                variant="control"
                icon={<TrashIcon />}
              />
            </ToolbarItem>
            <ToolbarItem>
              <Checkbox
                label={t('AutomatedAnalysisCard.TOOLBAR.CHECKBOX.SHOW_NA.LABEL')}
                isChecked={showNAScores}
                onChange={setShowNAScores}
                id="show-na-scores"
                name="show-na-scores"
              />
            </ToolbarItem>
            <ToolbarItem>
              <Switch
                label={t('AutomatedAnalysisCard.TOOLBAR.SWITCH.LIST_VIEW.LABEL')}
                isChecked={showListView}
                onChange={setShowListView}
                id="show-list-view"
              />
            </ToolbarItem>
          </ToolbarGroup>
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
    [handleStateErrors]
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
    const filtered = evaluations.filter((e) => e.score >= AutomatedAnalysisScore.ORANGE_SCORE_THRESHOLD);
    if (filtered.length === 0) return <AutomatedAnalysisHeaderLabel type="ok" />;
    const [warnings, errors] = _.partition(filtered, (e) => e.score < AutomatedAnalysisScore.RED_SCORE_THRESHOLD);
    return (
      <LabelGroup>
        {reportSource}
        {errors.length > 0 && <AutomatedAnalysisHeaderLabel type={'critical'} count={errors.length} />}
        {warnings.length > 0 && <AutomatedAnalysisHeaderLabel type={'warning'} count={errors.length} />}
      </LabelGroup>
    );
  }, [isLoading, errorMessage, evaluations, reportSource]);

  const header = React.useMemo(() => {
    return (
      <CardHeader
        onExpand={onCardExpand}
        toggleButtonProps={{
          id: 'automated-analysis-toggle-details',
          'aria-label': 'Details',
          'aria-labelledby': 'automated-analysis-card-title toggle-details',
          'aria-expanded': isCardExpanded,
        }}
      >
        <CardActions>{...props.actions || []}</CardActions>
        <Level hasGutter>
          <LevelItem>
            <CardTitle component="h4">{t('AutomatedAnalysisCard.CARD_TITLE')}</CardTitle>
          </LevelItem>
          <LevelItem>{headerLabels}</LevelItem>
        </Level>
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
