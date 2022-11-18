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
import * as React from 'react';
import { ServiceContext } from '@app/Shared/Services/Services';
import {
  Button,
  Card,
  CardActions,
  CardBody,
  CardExpandableContent,
  CardHeader,
  CardTitle,
  Checkbox,
  EmptyState,
  Grid,
  GridItem,
  LabelGroup,
  Text,
  TextContent,
  TextVariants,
  Toolbar,
  ToolbarContent,
  ToolbarGroup,
  ToolbarItem,
  Tooltip,
} from '@patternfly/react-core';
import { useSubscriptions } from '@app/utils/useSubscriptions';
import { PlusCircleIcon, Spinner2Icon, TrashIcon,  } from '@patternfly/react-icons';
import { ErrorView } from '@app/ErrorView/ErrorView';
import LoadingView from '@app/LoadingView/LoadingView';
import { concatMap, filter, finalize, first, map, tap, throwError } from 'rxjs';
import { FAILED_REPORT_MESSAGE, INTERNAL_ERROR_MESSAGE, NO_RECORDINGS_MESSAGE, ORANGE_SCORE_THRESHOLD, RECORDING_FAILURE_MESSAGE, RuleEvaluation } from '@app/Shared/Services/Report.service';
import { ClickableAutomatedAnalysisLabel } from './ClickableAutomatedAnalysisLabel';
import {
  ArchivedRecording,
  automatedAnalysisTag,
  defaultAutomatedAnalysisRecording,
  Recording,
} from '@app/Shared/Services/Api.service';
import { AutomatedAnalysisFilters, AutomatedAnalysisFiltersCategories, emptyAutomatedAnalysisFilters, filterAutomatedAnalysis } from './AutomatedAnalysisFilters';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, StateDispatch } from '@app/Shared/Redux/ReduxStore';
import { TargetAutomatedAnalysisFilters } from '@app/Shared/Redux/AutomatedAnalysisFilterReducer';
import { automatedAnalysisAddFilterIntent, automatedAnalysisAddTargetIntent, automatedAnalysisDeleteAllFiltersIntent, automatedAnalysisDeleteCategoryFiltersIntent, automatedAnalysisDeleteFilterIntent } from '@app/Shared/Redux/AutomatedAnalysisFilterActions';

interface AutomatedAnalysisCardProps {
  pageTitle: string;
}

export const AutomatedAnalysisCard: React.FunctionComponent<AutomatedAnalysisCardProps> = (props) => {
  const context = React.useContext(ServiceContext);
  const addSubscription = useSubscriptions();
  const dispatch = useDispatch<StateDispatch>();

  const [targetConnectURL, setTargetConnectURL] = React.useState('');
  const [categorizedEvaluation, setCategorizedEvaluation] = React.useState<[string, RuleEvaluation[]][]>(
    [] as [string, RuleEvaluation[]][]
  );
  const [filteredCategorizedEvaluation, setFilteredCategorizedEvaluation] = React.useState<
    [string, RuleEvaluation[]][]
  >([] as [string, RuleEvaluation[]][]);
  const [isExpanded, setIsExpanded] = React.useState<boolean>(true);
  const [isError, setIsError] = React.useState<boolean>(false);
  const [errorMessage, setErrorMessage] = React.useState<string>('');
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const [reportStalenessTimer, setReportStalenessTimer] = React.useState<number>(0);
  const [reportStalenessTimerUnits, setReportStalenessTimerUnits] = React.useState<string>('seconds');
  const [reportTime, setReportTime] = React.useState<number>(0);
  const [usingArchivedReport, setUsingArchivedReport] = React.useState<boolean>(false);
  const [usingCachedReport, setUsingCachedReport] = React.useState<boolean>(false);

  const SECOND_MILLIS = 1000;
  const MINUTE_MILLIS = 60 * SECOND_MILLIS;
  const HOUR_MILLIS = 60 * MINUTE_MILLIS;
  const DAY_MILLIS = 24 * HOUR_MILLIS;

  const targetAutomatedAnalysisFilters = useSelector((state: RootState) => {
    const filters = state.automatedAnalysisFilters.list.filter(
      (targetFilter: TargetAutomatedAnalysisFilters) => targetFilter.target === targetConnectURL
    );
    return filters.length > 0 ? filters[0].filters : emptyAutomatedAnalysisFilters;

  }) as AutomatedAnalysisFiltersCategories;

  const categorizeEvaluation = React.useCallback(
    (arr: [string, RuleEvaluation][]) => {
      const map = new Map<string, RuleEvaluation[]>();
      arr.forEach(([_, evaluation]) => {
        const topicValue = map.get(evaluation.topic);
        if (topicValue === undefined) {
          map.set(evaluation.topic, [evaluation]);
        } else {
          topicValue.push(evaluation);     
          topicValue.sort((a, b) => (b.score - a.score));
        }
      });
      setCategorizedEvaluation((Array.from(map) as [string, RuleEvaluation[]][]).sort());
      setIsLoading(false);
      setIsError(false);
    },
    [setCategorizedEvaluation, setIsLoading, setIsError]
  );

  // will do analysis on  the first ActiveRecording which has
  // name: 'automated-analysis' ; label: 'origin=automated-analysis'
  const queryActiveRecordings = React.useCallback(
    (connectUrl: string) => {
      return context.api.graphql<any>(
        `
      query ActiveRecordingsForAutomatedAnalysis($connectUrl: String) {
        targetNodes(filter: { name: $connectUrl }) {
          recordings {
            active (filter: {
              name: ${automatedAnalysisTag},
              labels: ["origin=${automatedAnalysisTag}"],
            }) {
              data {
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
    [context.api, context.api.graphql]
  );

  const queryArchivedRecordings = React.useCallback(
    (connectUrl: string) => {
      return context.api.graphql<any>(
        `
      query ArchivedRecordingsForAutomatedAnalysis($connectUrl: String) {
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
    [context.api, context.api.graphql]
  );

  const handleStateErrors = React.useCallback(
    (errorMessage: string) => {
      setErrorMessage(errorMessage);
      setIsError(true);
      setIsLoading(false);
      setUsingArchivedReport(false);
      setUsingCachedReport(false);
    },
    [setErrorMessage, setIsError, setIsLoading, setUsingArchivedReport, setUsingCachedReport]
  );

  const handleLoading = React.useCallback(() => {
    setIsLoading(true);
    setIsError(false);
    setUsingArchivedReport(false);
    setUsingCachedReport(false);
  }, [setIsLoading, setIsError, setUsingArchivedReport, setUsingCachedReport]);

  const handleArchivedRecordings = React.useCallback(
    (recordings: ArchivedRecording[]) => {
      const freshestRecording = recordings.reduce((prev, current) =>
        prev?.archivedTime > current?.archivedTime ? prev : current
      );
      addSubscription(
        context.target.target().subscribe((target) => {
          context.reports
          .reportJson(freshestRecording, target.connectUrl)
          .pipe(first())
          .subscribe({
            next: (report) => {
              setUsingArchivedReport(true);
              setReportTime(freshestRecording.archivedTime);
              categorizeEvaluation(report);
            },
            error: () => {
              handleStateErrors(INTERNAL_ERROR_MESSAGE);
            },
          });
        })
      );
    },
    [addSubscription, context.target, context.reports, categorizeEvaluation, handleStateErrors, setUsingArchivedReport, setReportTime]
  );

  const handleEmptyRecordings = React.useCallback((connectUrl: string) => {
    const cachedReportAnalysis = context.reports.getCachedAnalysisReport(connectUrl);
    if (cachedReportAnalysis.report.length > 0) {      
      setUsingCachedReport(true);
      setReportTime(cachedReportAnalysis.timestamp);
      categorizeEvaluation(cachedReportAnalysis.report);
    }
    else {
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
            error: () => {
              handleStateErrors(NO_RECORDINGS_MESSAGE);
            },
          })
      );
    }

    
  }, [addSubscription, context.reports, categorizeEvaluation, queryArchivedRecordings, handleArchivedRecordings, handleStateErrors, setUsingCachedReport, setReportTime]);

  const generateReport = React.useCallback(() => {
    addSubscription(
      context.target.target().subscribe((target) => {
        handleLoading();
        setTargetConnectURL(target.connectUrl);
        dispatch(automatedAnalysisAddTargetIntent(target.connectUrl));
        // query for designated automated-analysis profiling recording
        addSubscription(
          queryActiveRecordings(target.connectUrl)
          .pipe(
            first(),
            tap((v) => console.log(v)),
            map((v) => v.data.targetNodes[0].recordings.active.data[0] as Recording),
            tap((recording) => {
              if (recording == null) {
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
                    categorizeEvaluation(report);
                  },
                  error: (_) => {
                    handleStateErrors(FAILED_REPORT_MESSAGE);
                  },
                });
            },
            error: (_) => {
              // try generating report on cached or archived recordings
              handleEmptyRecordings(target.connectUrl);
            },
          })
        );
      })
    );
  }, [
    addSubscription,
    dispatch,
    context.api,
    context.target,
    context.reports,
    automatedAnalysisAddTargetIntent,
    categorizeEvaluation,
    queryActiveRecordings,
    handleEmptyRecordings,
    handleLoading,
    handleStateErrors,
  ]);

  const startProfilingRecording = React.useCallback(() => {
    addSubscription(
      context.api
        .createRecording(defaultAutomatedAnalysisRecording)
        .pipe(
          first(),
        )
        .subscribe((resp) => {
          if (resp.ok || resp.status === 400) { // in-case the recording already exists
            generateReport();
          } else {
            handleStateErrors(RECORDING_FAILURE_MESSAGE);
          }
        })
    );
  }, [addSubscription, context.api, generateReport, handleStateErrors]);

  const handleErrorView = React.useCallback((): [string, () => void] => {
    if (errorMessage === NO_RECORDINGS_MESSAGE) {
      return ['Start a recording for analysis', startProfilingRecording];
    } else if (errorMessage === RECORDING_FAILURE_MESSAGE) {
      return ['Retry starting recording', startProfilingRecording];
    } else if (errorMessage === FAILED_REPORT_MESSAGE) {
      return ['Retry loading report', generateReport];
    }
    else { // errorMessage === INTERNAL_ERROR_MESSAGE
      return ['Retry', generateReport];
    }
  }, [errorMessage, startProfilingRecording, generateReport]);

  React.useEffect(() => {
    addSubscription(
      context.target.authFailure().subscribe(() => {
        handleStateErrors("Authentication failure");        
      })
    );
  }, [addSubscription, context.target, handleStateErrors]);

  React.useEffect(() => {
    generateReport();
  }, [generateReport]);

  React.useEffect(() => {
    if (reportTime == 0 || !(usingArchivedReport || usingCachedReport)) {
      return;
    }
    let interval, timerQuantity;
    let now = Date.now();
    const reportMillis = now - reportTime;
    if (reportMillis < MINUTE_MILLIS) {
      timerQuantity = Math.round(reportMillis / SECOND_MILLIS);
      interval = SECOND_MILLIS - (reportMillis % SECOND_MILLIS);
      setReportStalenessTimerUnits('seconds');
    } else if (reportMillis < HOUR_MILLIS) {
      timerQuantity = Math.round(reportMillis / MINUTE_MILLIS);
      interval = MINUTE_MILLIS - (reportMillis % MINUTE_MILLIS);
      setReportStalenessTimerUnits('minutes');
    } else if (reportMillis < DAY_MILLIS) {
      timerQuantity = Math.round(reportMillis / HOUR_MILLIS);
      interval = HOUR_MILLIS - (reportMillis % HOUR_MILLIS);
      setReportStalenessTimerUnits('hours');
    } else {
      timerQuantity = Math.round(reportMillis / DAY_MILLIS);
      interval = DAY_MILLIS - reportMillis * DAY_MILLIS;
      setReportStalenessTimerUnits('days');
    }
    setReportStalenessTimer(timerQuantity);
    const timer = setInterval(() => {
      setReportStalenessTimer((reportStalenessTimer) => reportStalenessTimer + 1);
    }, interval);
    return () => clearInterval(timer);
  }, [setReportStalenessTimer, setReportStalenessTimerUnits, reportTime, reportStalenessTimer, usingArchivedReport, usingCachedReport]);

  React.useEffect(() => {
    setFilteredCategorizedEvaluation(filterAutomatedAnalysis(categorizedEvaluation, targetAutomatedAnalysisFilters));
  }, [categorizedEvaluation, targetAutomatedAnalysisFilters, filterAutomatedAnalysis, setFilteredCategorizedEvaluation]);

  const onExpand = (event: React.MouseEvent, id: string) => {
    setIsExpanded(!isExpanded);
  };

  const filteredCategorizedLabels = React.useMemo(() => {
    return (
      <Grid>
        {filteredCategorizedEvaluation
          .filter(([_, evaluations]) => evaluations.length > 0)
          .map(([topic, evaluations]) => {
            return (
              <GridItem className='automated-analysis-grid-item' span={3} key={`gridItem-${topic}`}>
                <LabelGroup categoryName={topic} isVertical numLabels={3} isCompact key={`topic-${topic}`}>
                  {evaluations.map((evaluation) => {
                    return <ClickableAutomatedAnalysisLabel label={evaluation} isSelected={false} />;
                  })}
                </LabelGroup>
              </GridItem>
            );
          })}
      </Grid>
    );
  }, [filteredCategorizedEvaluation]);

  const clearCachedReports = React.useCallback(() => {
    addSubscription(
      context.target.target().subscribe((target) => {
        context.reports.deleteCachedAnalysisReport(target.connectUrl);
        startProfilingRecording();
      })
    );
  }, [addSubscription, context.target, context.reports, startProfilingRecording]);

  const clearAnalysis = React.useCallback(() => {
    addSubscription(
      context.target.target().subscribe((target) => {
        context.reports.deleteCachedAnalysisReport(target.connectUrl);
      })
    );
    handleStateErrors(NO_RECORDINGS_MESSAGE);
  }, [addSubscription, context.target, context.reports]);

  const updateFilters = React.useCallback(
    (target, { filterValue, filterKey, deleted = false, deleteOptions }) => {
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
    [dispatch, automatedAnalysisDeleteCategoryFiltersIntent, automatedAnalysisDeleteFilterIntent, automatedAnalysisAddFilterIntent]
  );

  const handleClearFilters = React.useCallback(() => {
    dispatch(automatedAnalysisDeleteAllFiltersIntent(targetConnectURL));
  }, [dispatch, automatedAnalysisDeleteAllFiltersIntent, targetConnectURL]);

  const reportStalenessText = React.useMemo(() => {
    if (isLoading || !(usingArchivedReport || usingCachedReport)) {
      return '';
    }
    return (
      <TextContent>
        <Text component={TextVariants.p}>
          {(usingArchivedReport ? 'Showing archived report from ' : 'Showing cached report from ') + `from ${reportStalenessTimer} ${reportStalenessTimerUnits} ago. `} 
          <Tooltip content={(usingArchivedReport ? 'Automatically' : 'Clear cached report and automatically') + ' create active recording for updated analysis.'}>
            <Button variant="control" isInline isSmall icon={<PlusCircleIcon />} onClick={usingArchivedReport ? startProfilingRecording : clearCachedReports} />
          </Tooltip>

          {!usingArchivedReport && 
            <Tooltip content={"Clear report cache."}>
              <Button variant="control" isInline isSmall icon={<TrashIcon />} onClick={clearAnalysis} />  
            </Tooltip>
          }
        </Text>
      </TextContent>
    );
  }, [isLoading, usingArchivedReport, usingCachedReport, reportStalenessTimer, reportStalenessTimerUnits, clearCachedReports, clearAnalysis, startProfilingRecording]);

  const toolbar = React.useMemo(() => {
    if (isError) {
      return null;
    }
    return (
      <Toolbar
      id="automated-analysis-toolbar"
      aria-label="automated-analysis-toolbar"
      clearAllFilters={handleClearFilters}
      clearFiltersButtonText="Clear"
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
              isAriaDisabled={isLoading || usingCachedReport || usingArchivedReport}
              aria-label="Refresh automated analysis"
              onClick={generateReport}
              variant="control"
              icon={<Spinner2Icon />}
            />
          </ToolbarItem>
        </ToolbarGroup>
      </ToolbarContent>
    </Toolbar>
    );
  }, [isLoading, isError, targetConnectURL, categorizedEvaluation, targetAutomatedAnalysisFilters, generateReport, handleClearFilters, updateFilters]);

  const view = React.useMemo(() => {
    if (isError) {
      return (
        <ErrorView
          title={'Automated Analysis Error'}
          message={
            <TextContent>
              <Text component={TextVariants.p}>Cryostat was unable to generate an automated analysis report.</Text>
              <Text component={TextVariants.small}>{errorMessage}</Text>
            </TextContent>
          }
          retryButtonMessage={handleErrorView()[0]}
          retry={handleErrorView()[1]}
        />
      );
    } else if (isLoading) {
      return <LoadingView />;
    } else {
      return filteredCategorizedLabels;
    }
  }, [filteredCategorizedLabels, isError, isLoading, errorMessage, handleErrorView]);

  return (
    <Card id="automated-analysis-card" isRounded isCompact isExpanded={isExpanded}>
      <CardHeader
        isToggleRightAligned
        onExpand={onExpand}
        toggleButtonProps={{
          id: 'toggle-button1',
          'aria-label': 'Details',
          'aria-labelledby': 'automated-analysis-card-title toggle-button1',
          'aria-expanded': isExpanded,
        }}
      >
        <CardTitle component="h4">Automated Analysis</CardTitle>
        <CardActions>
          {toolbar}
        </CardActions>
      </CardHeader>
      <CardExpandableContent>
        <CardBody isFilled={true}>
          {reportStalenessText}
          {view}
        </CardBody>
      </CardExpandableContent>
    </Card>
  );
};
