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
import { calculateAnalysisTimer } from '@app/utils/utils';
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
  Flex,
  FlexItem,
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
  SearchIcon,
  Spinner2Icon,
  TrashIcon,
} from '@patternfly/react-icons';
import { css } from '@patternfly/react-styles';
import {
  InnerScrollContainer,
  OuterScrollContainer,
  TableComposable,
  Tbody,
  Td,
  Th,
  Thead,
  ThProps,
  Tr,
} from '@patternfly/react-table';
import { t } from 'i18next';
import _ from 'lodash';
import * as React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { filter, first, map, tap } from 'rxjs';
import { DashboardCardDescriptor, DashboardCardProps, DashboardCardSizes } from '../Dashboard';
import { DashboardCard } from '../DashboardCard';
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
  const [showListView, setShowListView] = React.useState<boolean>(true);
  const [activeSortIndex, setActiveSortIndex] = React.useState<number | undefined>(undefined);
  const [activeSortDirection, setActiveSortDirection] = React.useState<'asc' | 'desc' | undefined>(undefined);

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

  // Will perform analysis on  the first ActiveRecording which has
  // name: 'automated-analysis' ; label: 'origin=automated-analysis'
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
          return ['Retry', generateReport];
        } else if (errorMessage === RECORDING_FAILURE_MESSAGE) {
          return ['Retry starting recording', startProfilingRecording];
        } else if (errorMessage === FAILED_REPORT_MESSAGE) {
          return ['Retry loading report', generateReport];
        } else if (errorMessage === TEMPLATE_UNSUPPORTED_MESSAGE) {
          return [undefined, undefined];
        } else {
          return ['Retry', generateReport];
        }
      }
      return [undefined, undefined];
    },
    [startProfilingRecording, generateReport]
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

  const handleNAScoreChange = React.useCallback(
    (checked: boolean) => {
      setShowNAScores(checked);
    },
    [setShowNAScores]
  );

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

  const icon = React.useCallback((score: number): JSX.Element => {
    return score == AutomatedAnalysisScore.NA_SCORE ? (
      <span className={css('pf-m-grey', 'pf-c-label__icon')}>
        <InfoCircleIcon />
      </span>
    ) : score < AutomatedAnalysisScore.ORANGE_SCORE_THRESHOLD ? (
      <span className={css('pf-m-green', 'pf-c-label__icon')}>
        <CheckCircleIcon />
      </span>
    ) : score < AutomatedAnalysisScore.RED_SCORE_THRESHOLD ? (
      <span className={css('pf-m-orange', 'pf-c-label__icon')}>
        <ExclamationTriangleIcon />
      </span>
    ) : (
      <span className={css('pf-m-red', 'pf-c-label__icon')}>
        <ExclamationCircleIcon />
      </span>
    );
  }, []);

  const getSortParams = React.useCallback(
    (columnIndex: number): ThProps['sort'] => ({
      sortBy: {
        index: activeSortIndex,
        direction: activeSortDirection,
      },
      onSort: (_event, index, direction) => {
        console.log('??');

        setActiveSortIndex(index);
        setActiveSortDirection(direction);
      },
      columnIndex,
    }),
    [setActiveSortIndex, setActiveSortDirection, activeSortIndex, activeSortDirection]
  );

  const reportStalenessText = React.useMemo(() => {
    if (isLoading || !(usingArchivedReport || usingCachedReport)) {
      return undefined;
    }
    return (
      <TextContent>
        <Text className="stale-report-text" component={TextVariants.p}>
          {`Most recent data from ${reportStalenessTimer} ${reportStalenessTimerUnits}${
            reportStalenessTimer > 1 ? 's' : ''
          } ago.`}
          &nbsp;
          <Tooltip
            content={
              'Report data is stale. Click the Create Recording button and choose an option to start an active recording to source automated reports from.'
            }
          >
            <OutlinedQuestionCircleIcon
              style={{ height: '0.85em', width: '0.85em', color: 'var(--pf-global--Color--100)' }}
            />
          </Tooltip>
        </Text>
      </TextContent>
    );
  }, [isLoading, usingArchivedReport, usingCachedReport, reportStalenessTimer, reportStalenessTimerUnits]);

  const filteredCategorizedLabels = React.useMemo(() => {
    const filtered = filteredCategorizedEvaluation.filter(([_, evaluations]) => evaluations.length > 0);
    if (filtered.length === 0) {
      return (
        <EmptyState>
          <EmptyStateIcon icon={SearchIcon} />
          <Title headingLevel="h4" size="lg">
            No Results Found
          </Title>
          <EmptyStateBody>
            No results match this filter criteria. Try removing filters, or resetting the severity score filter to 0 to
            show results.
          </EmptyStateBody>
          <EmptyStateSecondaryActions>
            <Button variant="link" onClick={handleClearFilters}>
              Clear all filters
            </Button>
          </EmptyStateSecondaryActions>
        </EmptyState>
      );
    }
    if (showListView) {
      const flatFiltered = filtered
        .flatMap(([_, evaluations]) => {
          return evaluations.map((evaluation) => evaluation);
        })
        .sort((a, b) => {
          const aValue = activeSortIndex === 0 ? a.name : a.score;
          const bValue = activeSortIndex === 0 ? b.name : b.score;
          if (typeof aValue === 'string' && typeof bValue === 'string') {
            if (activeSortDirection === 'asc') {
              return aValue.localeCompare(bValue);
            }
            return bValue.localeCompare(aValue);
          }
          if (typeof aValue === 'number' && typeof bValue === 'number') {
            if (activeSortDirection === 'asc') {
              if (aValue === bValue) {
                return a.name.localeCompare(b.name);
              }
              return aValue - bValue;
            } else {
              if (aValue === bValue) {
                return b.name.localeCompare(a.name);
              }
              return bValue - aValue;
            }
          }
          return 0;
        });
      return (
        <OuterScrollContainer>
          <InnerScrollContainer className="automated-analysis-data-list-scroll">
            <TableComposable aria-label={'automated-analysis-data-list'} gridBreakPoint={'grid-md'} isStickyHeader>
              <Thead>
                <Tr>
                  <Th sort={getSortParams(0)}>Result</Th>
                  <Th modifier="wrap" sort={getSortParams(1)}>
                    Score
                  </Th>
                  <Th modifier="wrap">Description</Th>
                </Tr>
              </Thead>
              <Tbody>
                {flatFiltered.map((evaluation) => {
                  return (
                    <Tr key={evaluation.name}>
                      <Td dataLabel="Result" width={20}>
                        {evaluation.name}
                      </Td>
                      <Td dataLabel="Score" modifier="wrap">
                        <Flex spaceItems={{ default: 'spaceItemsSm' }}>
                          <FlexItem>
                            {evaluation.score == AutomatedAnalysisScore.NA_SCORE ? 'N/A' : evaluation.score.toFixed(1)}
                          </FlexItem>
                          <FlexItem>{icon(evaluation.score)}</FlexItem>
                        </Flex>
                      </Td>
                      <Td dataLabel="Description">{evaluation.description}</Td>
                    </Tr>
                  );
                })}
              </Tbody>
            </TableComposable>
          </InnerScrollContainer>
        </OuterScrollContainer>
      );
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
                key={`topic-${topic}`}
              >
                {evaluations.map((evaluation) => {
                  return (
                    <ClickableAutomatedAnalysisLabel
                      label={evaluation}
                      isSelected={false}
                      key={clickableAutomatedAnalysisKey}
                    />
                  );
                })}
              </LabelGroup>
            </GridItem>
          );
        })}
      </Grid>
    );
  }, [
    handleClearFilters,
    getSortParams,
    icon,
    activeSortIndex,
    activeSortDirection,
    filteredCategorizedEvaluation,
    showListView,
  ]);

  const toolbar = React.useMemo(() => {
    return (
      <Toolbar
        id="automated-analysis-toolbar"
        aria-label="automated-analysis-toolbar"
        clearAllFilters={handleClearFilters}
        clearFiltersButtonText="Clear all filters"
        isFullHeight
      >
        <ToolbarContent>
          <AutomatedAnalysisFilters
            target={targetConnectURL}
            evaluations={categorizedEvaluation}
            filters={targetAutomatedAnalysisFilters}
            updateFilters={updateFilters}
          />
          <ToolbarGroup>
            <ToolbarItem>
              <Button
                isSmall
                isDisabled={isLoading || usingCachedReport || usingArchivedReport}
                isAriaDisabled={isLoading || usingCachedReport || usingArchivedReport}
                aria-label="Refresh automated analysis"
                onClick={generateReport}
                variant="control"
                icon={<Spinner2Icon />}
              />
              <Button
                isSmall
                isDisabled={isLoading}
                isAriaDisabled={isLoading}
                aria-label="Delete automated analysis"
                onClick={clearAnalysis}
                variant="control"
                icon={<TrashIcon />}
              />
            </ToolbarItem>
            <ToolbarItem>
              <Checkbox
                label="Show N/A scores"
                isChecked={showNAScores}
                onChange={handleNAScoreChange}
                id="show-na-scores"
                name="show-na-scores"
              />
            </ToolbarItem>
            <ToolbarItem>
              <Switch
                label="Toggle list view"
                isChecked={showListView}
                onChange={() => setShowListView(!showListView)}
                id="show-list-view"
              />
            </ToolbarItem>
          </ToolbarGroup>
        </ToolbarContent>
      </Toolbar>
    );
  }, [
    isLoading,
    showNAScores,
    showListView,
    targetConnectURL,
    categorizedEvaluation,
    targetAutomatedAnalysisFilters,
    usingArchivedReport,
    usingCachedReport,
    clearAnalysis,
    generateReport,
    handleClearFilters,
    handleNAScoreChange,
    updateFilters,
  ]);

  const errorView = React.useMemo(() => {
    return (
      <ErrorView
        title={'Automated Analysis Error'}
        message={
          <TextContent>
            <Text component={TextVariants.p}>Cryostat was unable to generate an automated analysis report.</Text>
            <Text component={TextVariants.small}>{errorMessage}</Text>
          </TextContent>
        }
        retryButtonMessage={getMessageAndRetry(errorMessage)[0]}
        retry={getMessageAndRetry(errorMessage)[1]}
      />
    );
  }, [errorMessage, getMessageAndRetry]);

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
    if (filtered.length === 0)
      return (
        <Label icon={<CheckCircleIcon />} color={'green'}>
          No problems
        </Label>
      );
    const [warnings, errors] = _.partition(filtered, (e) => e.score < AutomatedAnalysisScore.RED_SCORE_THRESHOLD);
    return (
      <LabelGroup>
        {reportSource}
        {errors.length > 0 && (
          <Label
            onClick={(e) => {
              e.stopPropagation;
              dispatch(automatedAnalysisAddGlobalFilterIntent('Score', 100));
            }}
            icon={<ExclamationCircleIcon />}
            color={'red'}
          >
            {t('AutomatedAnalysisCard.CRITICAL_RESULTS', { count: errors.length })}
          </Label>
        )}
        {warnings.length > 0 && (
          <Label
            onClick={(e) => {
              e.stopPropagation;
              dispatch(automatedAnalysisAddGlobalFilterIntent('Score', 50));
            }}
            icon={<ExclamationTriangleIcon />}
            color={'orange'}
          >
            {t('AutomatedAnalysisCard.WARNING_RESULTS', { count: warnings.length })}
          </Label>
        )}
      </LabelGroup>
    );
  }, [dispatch, isLoading, errorMessage, evaluations, reportSource]);

  return (
    <DashboardCard
      dashboardId={props.dashboardId}
      cardSizes={AutomatedAnalysisCardSizes}
      id="automated-analysis-card"
      isCompact
      isExpanded={isCardExpanded}
      cardHeader={
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
              <CardTitle component="h4">Automated Analysis</CardTitle>
            </LevelItem>
            <LevelItem>{headerLabels}</LevelItem>
          </Level>
        </CardHeader>
      }
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
  title: 'Automated Analysis',
  cardSizes: AutomatedAnalysisCardSizes,
  description: `
Assess common application performance and configuration issues.
    `,
  descriptionFull: `
Creates a recording and periodically evalutes various common problems in application configuration and performance.
Results are displayed with scores from 0-100 with colour coding and in groups.
This card should be unique on a dashboard.
      `,
  component: AutomatedAnalysisCard,
  propControls: [],
  advancedConfig: <AutomatedAnalysisConfigForm isSettingsForm={false}></AutomatedAnalysisConfigForm>,
};
