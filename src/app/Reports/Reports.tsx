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
import { BreadcrumbPage } from '@app/BreadcrumbPage/BreadcrumbPage';
import { AutomatedAnalysisResults } from '@app/Recordings/TargetAnalysis';
import {
  AggregateReport,
  AnalysisResult,
  CategorizedRuleEvaluations,
  NodeType,
  Target,
} from '@app/Shared/Services/api.types';
import { ServiceContext } from '@app/Shared/Services/Services';
import EntityDetails from '@app/Topology/Entity/EntityDetails';
import { useSubscriptions } from '@app/utils/hooks/useSubscriptions';
import { useCryostatTranslation } from '@i18n/i18nextUtil';
import {
  Bullseye,
  Button,
  Card,
  CardBody,
  EmptyState,
  EmptyStateActions,
  EmptyStateBody,
  EmptyStateFooter,
  EmptyStateHeader,
  EmptyStateIcon,
  Split,
  SplitItem,
} from '@patternfly/react-core';
import { SearchIcon } from '@patternfly/react-icons';
import * as React from 'react';
import { useNavigate } from 'react-router-dom-v5-compat';

export const Reports: React.FC = () => {
  const { t } = useCryostatTranslation();
  const navigate = useNavigate();
  const context = React.useContext(ServiceContext);
  const addSubscription = useSubscriptions();
  const [state, setState] = React.useState([] as { target: Target; hasSources: boolean; report: AggregateReport }[]);

  const doUpdate = React.useCallback(() => {
    addSubscription(context.api.getCurrentReportsForAllTargets(-1).subscribe((a) => setState(a)));
  }, [addSubscription, context.api, setState]);

  React.useEffect(() => {
    doUpdate();
  }, [doUpdate]);

  React.useEffect(() => {
    // TODO use notification target to update local state for only that target, rather than refreshing the entire state.
    // This query always hits cached data in the backend - new reports cannot be generated - so the performance hit isn't
    // too bad in this naive implementation.
    addSubscription(context.notificationChannel.messages('ReportSuccess').subscribe(() => doUpdate()));
  }, [addSubscription, context.notificationChannel, doUpdate]);

  const handleNavigate = React.useCallback(
    (target: Target) => {
      context.target.setTarget(target);
      navigate('/recordings#report');
    },
    [context.target, navigate],
  );

  // TODO refactor, this is copied from JvmDetailsCard.tsx
  const wrappedTarget = React.useCallback((target: Target) => {
    if (!target) {
      return undefined;
    }
    return {
      getData: () => ({
        name: target.alias,
        target,
        nodeType: NodeType.JVM,
        labels: target.labels,
      }),
    };
  }, []);

  // TODO refactor, this is copied from TargetAnalysis.tsx
  const categorizedEvaluations = React.useCallback((report: AggregateReport) => {
    const map = new Map<string, AnalysisResult[]>();
    console.log({ report });
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
  }, []);

  return (
    <BreadcrumbPage pageTitle="Reports">
      {state.map((s) => (
        <Card key={s.target.id} isCompact>
          <CardBody>
            <Split hasGutter>
              <SplitItem style={{ width: '35%' }}>
                <EntityDetails entity={wrappedTarget(s.target)} />
              </SplitItem>
              <SplitItem isFilled>
                {s.report?.aggregate?.count ? (
                  <AutomatedAnalysisResults
                    target={s.target}
                    hasSources={s.hasSources}
                    timestamp={s.report.lastUpdated}
                    analyses={categorizedEvaluations(s.report)}
                  />
                ) : (
                  <Bullseye style={{ minHeight: '30ch' }}>
                    <EmptyState>
                      <EmptyStateHeader
                        titleText={t('Reports.NoResults.TITLE')}
                        icon={<EmptyStateIcon icon={SearchIcon} />}
                        headingLevel="h4"
                      />
                      <EmptyStateBody>{t('Reports.NoResults.DESCRIPTION')}</EmptyStateBody>
                      <EmptyStateFooter>
                        <EmptyStateActions>
                          <Button variant="primary" onClick={() => handleNavigate(s.target)}>
                            {t('Reports.NoResults.ACTION_BUTTON_CONTENT')}
                          </Button>
                        </EmptyStateActions>
                      </EmptyStateFooter>
                    </EmptyState>
                  </Bullseye>
                )}
              </SplitItem>
            </Split>
          </CardBody>
        </Card>
      ))}
    </BreadcrumbPage>
  );
};

export default Reports;
