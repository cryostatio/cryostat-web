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
import { Button, Card, CardActions, CardBody, CardExpandableContent, CardHeader, CardTitle, Checkbox, Dropdown, Grid, GridItem, KebabToggle, Label, LabelGroup, LabelProps, Spinner, Stack, StackItem, Text, TextContent, Tooltip } from '@patternfly/react-core';
import { useSubscriptions } from '@app/utils/useSubscriptions';
import { InfoCircleIcon, Spinner2Icon, SpinnerIcon } from '@patternfly/react-icons';
import { ErrorView } from '@app/ErrorView/ErrorView';
import LoadingView from '@app/LoadingView/LoadingView';
import { finalize, first } from 'rxjs';
import { ORANGE_SCORE_THRESHOLD, RuleEvaluation } from '@app/Shared/Services/Report.service';
import { ClickableAutomatedAnalysisLabel } from './ClickableAutomatedAnalysisLabel';

interface AutomatedAnalysisCardProps {
  pageTitle: string;
}

export const AutomatedAnalysisCard: React.FunctionComponent<AutomatedAnalysisCardProps> = (props) => {
  const context = React.useContext(ServiceContext);
  const addSubscription = useSubscriptions();

  const [categorizedEvaluation, setCategorizedEvaluation] = React.useState<[string , RuleEvaluation[]][]>([] as [string, RuleEvaluation[]][]);
  const [criticalCategorizedEvaluation, setCriticalCategorizedEvaluation] = React.useState<[string , RuleEvaluation[]][]>([] as [string, RuleEvaluation[]][]);
  const [isExpanded, setIsExpanded] = React.useState<boolean>(true);
  const [isKebabOpen, setIsKebabOpen] = React.useState<boolean>(false);
  const [isChecked, setIsChecked] = React.useState<boolean>(false);
  const [error, setError] = React.useState<boolean>(false);
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const [isTooltipOpen, setIsTooltipOpen] = React.useState<boolean>(false);


  const categorizeEvaluation = React.useCallback((arr: [string, RuleEvaluation][]) => {
    const map = new Map<string, RuleEvaluation[]>();
    arr.forEach(([_, evaluation]) => {
      const obj = map.get(evaluation.topic);
      if (obj === undefined) {
          map.set(evaluation.topic, [evaluation]);
      }
      else {
          obj.push(evaluation);
      }
    });
    setCategorizedEvaluation(Array.from(map) as [string, RuleEvaluation[]][]);
    setIsLoading(false);
  }, [setCategorizedEvaluation, setIsLoading]);

  const takeSnapshot = React.useCallback(() => {
    setIsLoading(true);
    addSubscription(
      context.api.createSnapshotv2()
        .pipe(
          finalize(() => {
            setIsLoading(false);
          })  
        ).subscribe(
          {
            next: ((snapshot) => {              
              context.reports.reportJson(snapshot)
                .pipe(
                  finalize(() => setIsLoading(false)),
                  first()
                )  
                .subscribe({
                  next: (report) => {
                    const reportJson = JSON.parse(report);
                    const arr: [string, RuleEvaluation][] = Object.entries(reportJson);
                    categorizeEvaluation(arr);
                  },
                  error: () => {
                    setError(true);
                  },
                });
            }),
            error: () => {
                setError(true);
            },
        })
    );
  }, [addSubscription, context.api, context.reports, categorizeEvaluation, setIsLoading, setError]);

  const showCriticalScores = React.useCallback(() => {
    const criticalScores = categorizedEvaluation.map(([topic, evaluations]) => {
      return [topic, evaluations.filter(evaluation => evaluation.score >= ORANGE_SCORE_THRESHOLD)] as [string, RuleEvaluation[]];
    });
    setCriticalCategorizedEvaluation(criticalScores);
  }, [categorizedEvaluation, setCriticalCategorizedEvaluation]);

  React.useEffect(() => {
    takeSnapshot();
  }, [takeSnapshot]);

  React.useEffect(() => {
    if (isChecked) {
      showCriticalScores();
    }
    else {
      setCriticalCategorizedEvaluation(categorizedEvaluation);
    }
  }, [isChecked, showCriticalScores, setCriticalCategorizedEvaluation]);

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
        {
          criticalCategorizedEvaluation
            .filter(([_, evaluations]) => evaluations.length > 0)
            .map(([topic, evaluations]) => {
              return (
                <GridItem span={3} key={topic} > 
                  <LabelGroup 
                    categoryName={topic}
                    isVertical
                    numLabels={3}
                    isCompact
                    key={topic}
                  >
                    {
                      evaluations
                        .map((evaluation) => {
                          return (
                              <ClickableAutomatedAnalysisLabel 
                                label={evaluation} 
                                isSelected={false} 
                              />
                          )
                      })
                    }
                  </LabelGroup>
                </GridItem>
              )
            })
        }
      </Grid>);
  }, [criticalCategorizedEvaluation]);

  const view = React.useMemo(() => {
    if (error) {
      return <ErrorView
        title={'Error'}
        message={"Could not perform automated analysis"}
      />
    } else if (isLoading) {
      return <LoadingView />
    } else {
      return filteredCategorizedLabels;
    }
  }, [filteredCategorizedLabels, error, isLoading]);

  return (
    <Card id='automated-analysis-card' isRounded isCompact isExpanded={isExpanded}>
      <CardHeader           
        onExpand={onExpand}
        toggleButtonProps={{
          id: 'toggle-button1',
          'aria-label': 'Details',
          'aria-labelledby': 'automated-analysis-card-title toggle-button1',
          'aria-expanded': isExpanded
      }}>
        <CardTitle component='h4'>Automated Analysis</CardTitle>
        <CardActions>
          <Checkbox
              id="automated-analysis-check"
              label={'Show critical scores'}
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
          { view }
        </CardBody>
      </CardExpandableContent>
    </Card>
  );
};

