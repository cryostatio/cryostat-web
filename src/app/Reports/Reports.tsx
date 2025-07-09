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
import { CryostatLink } from '@app/Shared/Components/CryostatLink';
import {
  AggregateReport,
  AnalysisResult,
  CategorizedRuleEvaluations,
  NodeType,
  NotificationCategory,
  Target,
} from '@app/Shared/Services/api.types';
import { ServiceContext } from '@app/Shared/Services/Services';
import { EntityDetails } from '@app/Topology/Entity/EntityDetails';
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
  Pagination,
  Spinner,
  Split,
  SplitItem,
  Stack,
  StackItem,
  TextContent,
  ToggleGroup,
  ToggleGroupItem,
} from '@patternfly/react-core';
import { ProcessAutomationIcon, SearchIcon } from '@patternfly/react-icons';
import * as React from 'react';
import { Trans } from 'react-i18next';
import { useNavigate } from 'react-router-dom-v5-compat';
import { concatMap, filter, first, map, tap } from 'rxjs';

type ReportEntry = { loading: boolean; target: Target; hasSources: boolean; report: AggregateReport };

export const Reports: React.FC = () => {
  const { t } = useCryostatTranslation();
  const navigate = useNavigate();
  const context = React.useContext(ServiceContext);
  const addSubscription = useSubscriptions();
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [state, setState] = React.useState([] as ReportEntry[]);
  const [minScore, setMinScore] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const [perPage, setPerPage] = React.useState(4);

  const doUpdateAll = React.useCallback(
    (pre?: () => void, onComplete?: () => void) => {
      if (pre) {
        pre();
      }
      addSubscription(
        context.api
          .getCurrentReportsForAllTargets(minScore)
          .pipe(
            first(),
            tap(() => {
              if (onComplete) {
                onComplete();
              }
            }),
            map((reports) => reports.sort((a, b) => a.target.id! - b.target.id!)),
            map((reports) => reports.map((r) => ({ ...r, loading: false }))),
          )
          .subscribe((a) => setState(a)),
      );
    },
    [addSubscription, context.api, minScore, setState],
  );

  const doRefresh = React.useCallback(() => {
    doUpdateAll(
      () => setRefreshing(true),
      () => setRefreshing(false),
    );
  }, [doUpdateAll, setRefreshing]);

  const doUpdate = React.useCallback(
    (jvmId: string) => {
      addSubscription(
        context.targets
          .targets()
          .pipe(
            map((a) => a.find((t) => t.jvmId === jvmId)),
            filter((v) => !!v),
            tap((t) =>
              setState((prev) => {
                const copy: ReportEntry[] = [...prev];
                for (let e of copy) {
                  e.loading = e.target.id === t.id;
                }
                return copy;
              }),
            ),
            concatMap((t) => context.api.getCurrentReportForTarget(t)),
          )
          .subscribe((report) => {
            setState((prev) => {
              const copy: ReportEntry[] = [...prev];
              for (let e of copy) {
                if (e.target.jvmId === jvmId) {
                  e.report = report;
                }
                e.loading = false;
              }
              return copy;
            });
          }),
      );
    },
    [addSubscription, context.targets, context.api, setState],
  );

  const onSetPage = React.useCallback(
    (_evt, newPage) => {
      setPage(newPage);
    },
    [setPage],
  );

  const onSetPerPage = React.useCallback(
    (_evt, newPerPage, newPage) => {
      setPage(newPage);
      setPerPage(newPerPage);
    },
    [setPage, setPerPage],
  );

  React.useEffect(() => {
    doUpdateAll(
      () => setLoading(true),
      () => setLoading(false),
    );
    addSubscription(
      context.notificationChannel
        .messages(NotificationCategory.ReportSuccess)
        .subscribe((m) => doUpdate(m.message.jvmId)),
    );
  }, [context.notificationChannel, addSubscription, doUpdate, doUpdateAll, setLoading]);

  const handleNavigate = React.useCallback(
    (target: Target) => {
      return () => {
        context.target.setTarget(target);
        navigate('/recordings#report');
      };
    },
    [context.target, navigate],
  );

  const handleScore = React.useCallback(
    (score: number) => {
      return () => setMinScore(score);
    },
    [setMinScore],
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
      <Card isCompact>
        <CardBody>
          <Stack hasGutter>
            <StackItem>
              <Split hasGutter>
                <SplitItem>
                  <Button isDisabled={minScore < 0} onClick={handleScore(-1)}>
                    {t('Reports.Score.SHOW_ALL')}
                  </Button>
                </SplitItem>
                <SplitItem>
                  <ToggleGroup>
                    <ToggleGroupItem
                      text={t('Reports.Score.AVAILABLE_ONLY')}
                      isSelected={minScore === 0}
                      onChange={handleScore(0)}
                    />
                    <ToggleGroupItem
                      text={t('Reports.Score.WARNING_ONLY')}
                      isSelected={minScore === 25}
                      onChange={handleScore(25)}
                    />
                    <ToggleGroupItem
                      text={t('Reports.Score.CRITICAL_ONLY')}
                      isSelected={minScore === 50}
                      onChange={handleScore(50)}
                    />
                  </ToggleGroup>
                </SplitItem>
                <SplitItem isFilled />
                <SplitItem>
                  <Button variant="plain" onClick={() => doRefresh()}>
                    <ProcessAutomationIcon />
                  </Button>
                </SplitItem>
              </Split>
            </StackItem>
            <StackItem>
              <TextContent>
                <Trans
                  t={t}
                  components={[<CryostatLink to={'/recordings#report'} />, <CryostatLink to={'/rules/create'} />]}
                >
                  Reports.DESCRIPTION
                </Trans>
              </TextContent>
            </StackItem>
          </Stack>
        </CardBody>
      </Card>
      {loading ? (
        <Bullseye>
          <Spinner />
        </Bullseye>
      ) : state.length ? (
        <Pagination
          perPage={perPage}
          itemCount={state.length}
          page={page}
          onSetPage={onSetPage}
          onPerPageSelect={onSetPerPage}
          perPageOptions={[
            {
              title: '1',
              value: 1,
            },
            {
              title: '2',
              value: 2,
            },
            {
              title: '4',
              value: 4,
            },
            {
              title: '8',
              value: 8,
            },
            {
              title: '16',
              value: 16,
            },
          ]}
        >
          <Stack hasGutter>
            {state.map((s) => (
              <StackItem>
                <Card key={s.target.id} isCompact isDisabled={refreshing}>
                  <CardBody>
                    <Split hasGutter>
                      <SplitItem style={{ width: '35%', minHeight: '40em' }}>
                        <EntityDetails entity={wrappedTarget(s.target)} />
                      </SplitItem>
                      <SplitItem isFilled>
                        {refreshing || s.loading ? (
                          <Bullseye>
                            <Spinner />
                          </Bullseye>
                        ) : s.report?.aggregate?.count ? (
                          // FIXME the automated analysis report card uses global redux intents for filter states,
                          // since it was originally designed to be unique on the Dashboard view. We now need a way
                          // to preserve that behaviour for the Dashboard and Target Analysis components so that
                          // preferences transfer between targets, as well as a way to set individual filters so that
                          // the multiple AutomatedAnalysisResults components that can appear within this view can have
                          // independent filter settings.
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
                                  <Button variant="primary" onClick={handleNavigate(s.target)}>
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
              </StackItem>
            ))}
          </Stack>
        </Pagination>
      ) : (
        <Card>
          <CardBody>
            <Bullseye>
              <EmptyState>
                <EmptyStateHeader
                  titleText={t('Reports.NoReports.TITLE')}
                  icon={<EmptyStateIcon icon={SearchIcon} />}
                  headingLevel="h4"
                />
                <EmptyStateBody>{t('Reports.NoReports.DESCRIPTION')}</EmptyStateBody>
              </EmptyState>
            </Bullseye>
          </CardBody>
        </Card>
      )}
    </BreadcrumbPage>
  );
};

export default Reports;
