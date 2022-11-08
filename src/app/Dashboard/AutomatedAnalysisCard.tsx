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
import { BreadcrumbPage, BreadcrumbTrail } from '@app/BreadcrumbPage/BreadcrumbPage';
import { ServiceContext } from '@app/Shared/Services/Services';
import { TargetSelect } from '@app/TargetSelect/TargetSelect';
import { Card, CardActions, CardBody, CardHeader, CardTitle, Checkbox, Dropdown, Grid, GridItem, KebabToggle, Label, LabelGroup, LabelProps, Stack, StackItem, Tooltip } from '@patternfly/react-core';
import { useSubscriptions } from '@app/utils/useSubscriptions';
import { NO_TARGET } from '@app/Shared/Services/Target.service';
import { InfoCircleIcon, RulerVerticalIcon } from '@patternfly/react-icons';
import { number } from 'prop-types';

interface AutomatedAnalysisCardProps {
  pageTitle: string;
  compactSelect?: boolean;
  hideEmptyState?: boolean;
  breadcrumbs?: BreadcrumbTrail[];
}

export const AutomatedAnalysisCard: React.FunctionComponent<AutomatedAnalysisCardProps> = (props) => {
  const context = React.useContext(ServiceContext);
  const addSubscription = useSubscriptions();

  const [categorizedEvaluation, setCategorizedEvaluation] = React.useState<[string , RuleEvaluation[]][]>([] as [string, RuleEvaluation[]][]);
  const [criticalCategorizedEvaluation, setCriticalCategorizedEvaluation] = React.useState<[string , RuleEvaluation[]][]>([] as [string, RuleEvaluation[]][]);
  const [ruleLabels, setRuleLabels] = React.useState<RuleEvaluation[]>([]);
  const [isOpen, setIsOpen] = React.useState<boolean>(false);
  const [isChecked, setIsChecked] = React.useState<boolean>(false);

  const categorizeEvaluation = React.useCallback((arr: [string, RuleEvaluation][]) => {
    const map = new Map<string, RuleEvaluation[]>();
    arr.forEach(([name, evaluation]) => {
      const obj = map.get(evaluation.topic);
      if (obj === undefined) {
          map.set(evaluation.topic, [evaluation]);
      }
      else {
          obj.push(evaluation);
      }
    });
    setCategorizedEvaluation(Array.from(map) as [string, RuleEvaluation[]][]);
  }, [setCategorizedEvaluation]);

  const takeSnapshot = React.useCallback(() => {
    addSubscription(
        context.api.createSnapshotv2().subscribe((snapshot) => {
            addSubscription(
              context.reports.reportJson(snapshot)
                .subscribe((report) => {
                  const reportJson = JSON.parse(report);
                  const arr: [string, RuleEvaluation][] = Object.entries(reportJson);
                  categorizeEvaluation(arr);
                })
            )
        })
    );
  }, [addSubscription, context.api, categorizeEvaluation]);

  const showCriticalScores = React.useCallback(() => {
    console.log(categorizedEvaluation);
    const criticalScores = categorizedEvaluation.filter(d => d[1].some(e => e.score >= 50));
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
    setIsOpen(!isOpen);
  };
  const onClick = (checked: boolean) => {
    setIsChecked(checked);
  };

  const filteredCategorizedLabels = React.useMemo(() => {
    return criticalCategorizedEvaluation.map(([topic, evaluations]) => {
        return (
            <LabelGroup 
              categoryName={topic}
              isVertical
              numLabels={4}
              isCompact
              key={topic}
            >
              {
                evaluations
                  .filter((evaluation) => evaluation.score >= 0)
                  .map((evaluation) => {
                  return (
                    <Tooltip content={`${evaluation.name} Score:  ${evaluation.score}`} key={evaluation.name}>
                      <Label icon={<InfoCircleIcon />} color={evaluation.score < 10 ? 'green' : (evaluation.score < 50) ? 'orange' : 'red'} isCompact >
                        {evaluation.name}
                      </Label>
                    </Tooltip>
                  )
                })
              }
            </LabelGroup>
        )
      });
  }, [criticalCategorizedEvaluation]);

  interface IRule {
    name: string;
    evaluation: RuleEvaluation;
  }

  interface RuleEvaluation {
    name: string;
    description: string;
    score: number;
    topic: string;
  }


  return (
        <Card isRounded isCompact>
          <CardHeader>
            <CardTitle component='h4'>Automated Analysis</CardTitle>
            <CardActions>
              <Dropdown
                onSelect={onSelect}
                toggle={<KebabToggle onToggle={setIsOpen} />}
                isOpen={isOpen}
                isPlain
                dropdownItems={[]}
                position={'right'}
              />
              <Checkbox
                isChecked={isChecked}
                onChange={onClick}
                aria-label="card checkbox example"
                id="check-2"
                name="check2"
              />
            </CardActions>
        </CardHeader>
            <CardBody isFilled={true}>
              {filteredCategorizedLabels}
            </CardBody>
        </Card>
  );
};
