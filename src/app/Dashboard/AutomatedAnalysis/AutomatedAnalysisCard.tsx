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
import { BreadcrumbTrail } from '@app/BreadcrumbPage/BreadcrumbPage';
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
  Dropdown,
  Grid,
  GridItem,
  HelperText,
  HelperTextItem,
  KebabToggle,
  Label,
  LabelGroup,
  LabelProps,
  Spinner,
  Stack,
  StackItem,
  Text,
  TextContent,
  TextVariants,
  Tooltip,
} from '@patternfly/react-core';
import { useSubscriptions } from '@app/utils/useSubscriptions';
import { IconsIcon, InfoCircleIcon, PlusCircleIcon, PooIcon, Spinner2Icon, SpinnerIcon } from '@patternfly/react-icons';
import { ErrorView } from '@app/ErrorView/ErrorView';
import LoadingView from '@app/LoadingView/LoadingView';
import { concatMap, filter, finalize, first, map } from 'rxjs';
import { ORANGE_SCORE_THRESHOLD, RuleEvaluation } from '@app/Shared/Services/Report.service';
import { ClickableAutomatedAnalysisLabel } from './ClickableAutomatedAnalysisLabel';
import {
  ArchivedRecording,
  defaultAutomatedAnalysis,
  RecordingAttributes,
  RecordingOptions,
} from '@app/Shared/Services/Api.service';
import { NO_TARGET } from '@app/Shared/Services/Target.service';

interface AutomatedAnalysisCardProps {
  pageTitle: string;
}

export const AutomatedAnalysisCard: React.FunctionComponent<AutomatedAnalysisCardProps> = (props) => {
  const context = React.useContext(ServiceContext);
  const addSubscription = useSubscriptions();

  const [categorizedEvaluation, setCategorizedEvaluation] = React.useState<[string, RuleEvaluation[]][]>(
    [] as [string, RuleEvaluation[]][]
  );
  const [criticalCategorizedEvaluation, setCriticalCategorizedEvaluation] = React.useState<
    [string, RuleEvaluation[]][]
  >([] as [string, RuleEvaluation[]][]);
  const [isExpanded, setIsExpanded] = React.useState<boolean>(true);
  const [isKebabOpen, setIsKebabOpen] = React.useState<boolean>(false);
  const [isChecked, setIsChecked] = React.useState<boolean>(false);
  const [isError, setIsError] = React.useState<boolean>(false);
  const [errorMessage, setErrorMessage] = React.useState<string>('');
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const [isTooltipOpen, setIsTooltipOpen] = React.useState<boolean>(false);
  const [reportStalenessTimer, setReportStalenessTimer] = React.useState<number>(0);
  const [reportStalenessTimerUnits, setReportStalenessTimerUnits] = React.useState<string>('seconds');
  const [reportTime, setReportTime] = React.useState<number>(0);
  const [usingArchivedReport, setUsingArchivedReport] = React.useState<boolean>(false);

  const SECOND_MILLIS = 1000;
  const MINUTE_MILLIS = 60 * SECOND_MILLIS;
  const HOUR_MILLIS = 60 * MINUTE_MILLIS;
  const DAY_MILLIS = 24 * HOUR_MILLIS;

  const categorizeEvaluation = React.useCallback(
    (arr: [string, RuleEvaluation][]) => {
      const map = new Map<string, RuleEvaluation[]>();
      arr.forEach(([_, evaluation]) => {
        const obj = map.get(evaluation.topic);
        if (obj === undefined) {
          map.set(evaluation.topic, [evaluation]);
        } else {
          obj.push(evaluation);
        }
      });
      setCategorizedEvaluation(Array.from(map) as [string, RuleEvaluation[]][]);
      setIsLoading(false);
    },
    [setCategorizedEvaluation, setIsLoading]
  );

  const queryTargetRecordings = React.useCallback(
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
    },
    [setErrorMessage, setIsError, setIsLoading, setUsingArchivedReport]
  );

  const handleLoading = React.useCallback(() => {
    setIsLoading(true);
    setIsError(false);
    setUsingArchivedReport(false);
  }, [setIsLoading, setIsError, setUsingArchivedReport]);

  const handleAnyArchivedRecordings = React.useCallback(
    (recordings: ArchivedRecording[]) => {
      const freshestRecording = recordings.reduce((prev, current) =>
        prev?.archivedTime > current?.archivedTime ? prev : current
      );
      context.reports
        .reportJson(freshestRecording)
        .pipe(first())
        .subscribe({
          next: (report) => {
            setUsingArchivedReport(true);
            setReportTime(freshestRecording.archivedTime);
            const arr = Object.entries(report) as [string, RuleEvaluation][];
            categorizeEvaluation(arr);
          },
          error: () => {
            handleStateErrors('Failed to load report from available archived recordings.');
          },
        });
    },
    [context.reports, categorizeEvaluation, handleStateErrors, setUsingArchivedReport, setReportTime]
  );

  const takeSnapshot = React.useCallback(() => {
    handleLoading();
    addSubscription(
      context.api.createSnapshotV2().subscribe({
        next: (snapshot) => {
          context.reports
            .reportJson(snapshot)
            .pipe(first())
            .subscribe({
              next: (report) => {
                const arr = Object.entries(report) as [string, RuleEvaluation][];
                categorizeEvaluation(arr);
              },
              error: (err) => {
                handleStateErrors(err.message);
              },
            });
        },
        error: (error) => {
          // check if any archived recordings to fallback to
          addSubscription(
            context.target
              .target()
              .pipe(
                filter((target) => target !== NO_TARGET),
                first(),
                concatMap((target) => queryTargetRecordings(target.connectUrl)),
                map((v) => v.data.archivedRecordings.data as ArchivedRecording[])
              )
              .subscribe({
                next: (recordings) => {
                  if (recordings.length > 0) {
                    handleAnyArchivedRecordings(recordings);
                  } else {
                    handleStateErrors(`Failed to take snapshot`);
                  }
                },
                error: () => {
                  handleStateErrors(error.message);
                },
              })
          );
        },
      })
    );
  }, [
    addSubscription,
    context.api,
    context.reports,
    categorizeEvaluation,
    queryTargetRecordings,
    handleAnyArchivedRecordings,
    handleLoading,
    handleStateErrors,
  ]);

  const startProfilingRecording = React.useCallback(() => {
    addSubscription(
      context.api
        .createRecording(defaultAutomatedAnalysis)
        .pipe(first())
        .subscribe((success) => {
          if (success) {
            takeSnapshot();
          } else {
            handleStateErrors(`Failed to start recording`);
          }
        })
    );
  }, [addSubscription, context.api, takeSnapshot, handleStateErrors]);

  const showCriticalScores = React.useCallback(() => {
    const criticalScores = categorizedEvaluation.map(([topic, evaluations]) => {
      return [topic, evaluations.filter((evaluation) => evaluation.score >= ORANGE_SCORE_THRESHOLD)] as [
        string,
        RuleEvaluation[]
      ];
    });
    setCriticalCategorizedEvaluation(criticalScores);
  }, [categorizedEvaluation, setCriticalCategorizedEvaluation]);

  React.useEffect(() => {
    takeSnapshot();
  }, [takeSnapshot]);

  React.useEffect(() => {
    if (isChecked) {
      showCriticalScores();
    } else {
      setCriticalCategorizedEvaluation(categorizedEvaluation);
    }
  }, [isChecked, showCriticalScores, setCriticalCategorizedEvaluation]);

  React.useEffect(() => {
    if (!usingArchivedReport || reportTime == 0) {
      return;
    }
    let now = Date.now();
    let interval, timerQuantity;

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
  }, [setReportStalenessTimer, setReportStalenessTimerUnits, reportTime, reportStalenessTimer, usingArchivedReport]);

  const onSelect = () => {
    setIsKebabOpen(!isKebabOpen);
  };
  const onClick = (checked: boolean) => {
    setIsChecked(checked);
  };

  const onExpand = (event: React.MouseEvent, id: string) => {
    setIsExpanded(!isExpanded);
  };

  const filteredCategorizedLabels = React.useMemo(() => {
    return (
      <Grid>
        {criticalCategorizedEvaluation
          .filter(([_, evaluations]) => evaluations.length > 0)
          .map(([topic, evaluations]) => {
            return (
              <GridItem span={3} key={`gridItem-${topic}`}>
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
  }, [criticalCategorizedEvaluation]);

  const reportStalenessText = React.useMemo(() => {
    if (!usingArchivedReport || isLoading) {
      return '';
    }
    return (
      <>
        <TextContent>
          <Text component={TextVariants.p}>
            Archived recording report analysis from {reportStalenessTimer} {reportStalenessTimerUnits} ago.
            <Tooltip content={'Automatically create active recording for updated analysis:'}>
              <Button variant="plain" isInline isSmall icon={<PlusCircleIcon />} onClick={startProfilingRecording} />
            </Tooltip>
          </Text>
        </TextContent>
      </>
    );
  }, [isLoading, usingArchivedReport, reportStalenessTimer, reportStalenessTimerUnits]);

  const view = React.useMemo(() => {
    if (isError) {
      return (
        <ErrorView
          title={'Automated Analysis Error'}
          message={`Cryostat was unable to generate an automated analysis report. ${errorMessage}`}
          retry={startProfilingRecording}
        />
      );
    } else if (isLoading) {
      return <LoadingView />;
    } else {
      return filteredCategorizedLabels;
    }
  }, [filteredCategorizedLabels, isError, isLoading]);

  return (
    <Card id="automated-analysis-card" isRounded isCompact isExpanded={isExpanded}>
      <CardHeader
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
          <Checkbox
            id="automated-analysis-check"
            label={'Show critical scores'}
            isDisabled={isError}
            aria-label="automated-analysis show-critical-scores"
            name="automated-analysis-critical-scores"
            isChecked={isChecked}
            onChange={onClick}
          />
          <Button
            isSmall
            isAriaDisabled={isLoading}
            aria-label="Refresh automated analysis"
            onClick={takeSnapshot}
            variant="control"
            icon={<Spinner2Icon />}
          />
          {/* <Dropdown
            isPlain
            onSelect={onSelect}
            toggle={<KebabToggle onToggle={setIsKebabOpen} />}
            isOpen={isKebabOpen}
            dropdownItems={[]}
            position={'right'}
          /> */}
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
