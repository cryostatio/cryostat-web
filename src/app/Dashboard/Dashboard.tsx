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
import { FeatureFlag } from '@app/Shared/FeatureFlag/FeatureFlag';
import { DashboardConfig } from '@app/Shared/Redux/Configurations/DashboardConfigSlice';
import {
  dashboardConfigDeleteCardIntent,
  dashboardConfigFirstRunIntent,
  dashboardConfigResizeCardIntent,
  RootState,
  StateDispatch,
} from '@app/Shared/Redux/ReduxStore';
import { ServiceContext } from '@app/Shared/Services/Services';
import { FeatureLevel } from '@app/Shared/Services/Settings.service';
import { TargetView } from '@app/TargetView/TargetView';
import { getFromLocalStorage } from '@app/utils/LocalStorage';
import { Grid, GridItem } from '@patternfly/react-core';
import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import { useHistory } from 'react-router-dom';
import { AddCard } from './AddCard';
import { ChartContext } from './Charts/ChartContext';
import { JFRMetricsChartController } from './Charts/jfr/JFRMetricsChartController';
import { MBeanMetricsChartController } from './Charts/mbean/MBeanMetricsChartController';
import { getCardDescriptorByName, validateCardConfig } from './dashboard-utils';
import { DashboardCardActionMenu } from './DashboardCardActionMenu';
import { DashboardLayoutToolbar } from './DashboardLayoutToolbar';
import { ErrorCard } from './ErrorCard';

export interface DashboardComponentProps {}

export const Dashboard: React.FC<DashboardComponentProps> = (_) => {
  const history = useHistory();
  const serviceContext = React.useContext(ServiceContext);
  const dispatch = useDispatch<StateDispatch>();
  const { t } = useTranslation();
  const dashboardConfigs: DashboardConfig = useSelector((state: RootState) => state.dashboardConfigs);
  const jfrChartController = React.useRef(
    new JFRMetricsChartController(
      serviceContext.api,
      serviceContext.target,
      serviceContext.notificationChannel,
      serviceContext.settings,
    ),
  );
  const mbeanChartController = React.useRef(
    new MBeanMetricsChartController(serviceContext.api, serviceContext.target, serviceContext.settings),
  );

  const currLayout = React.useMemo(() => {
    return dashboardConfigs.layouts[dashboardConfigs.current];
  }, [dashboardConfigs]);

  React.useEffect(() => {
    const layouts = getFromLocalStorage('DASHBOARD_CFG', {}) as DashboardConfig;
    if (layouts._version === undefined) {
      dispatch(dashboardConfigFirstRunIntent());
    }
  }, [dispatch]);

  const chartContext = React.useMemo(() => {
    return {
      jfrController: jfrChartController.current,
      mbeanController: mbeanChartController.current,
    };
  }, [jfrChartController, mbeanChartController]);

  React.useEffect(() => {
    const jfrController = jfrChartController.current;
    const mbeanController = mbeanChartController.current;
    return () => {
      jfrController._tearDown();
      mbeanController._tearDown();
    };
  }, []);

  const handleRemove = React.useCallback(
    (idx: number) => {
      dispatch(dashboardConfigDeleteCardIntent(idx));
    },
    [dispatch],
  );

  const handleResetSize = React.useCallback(
    (idx: number) => {
      const defaultSpan = getCardDescriptorByName(currLayout.cards[idx].name).cardSizes.span.default;
      if (defaultSpan === currLayout.cards[idx].span) {
        return;
      }
      dispatch(dashboardConfigResizeCardIntent(idx, defaultSpan));
    },
    [dispatch, currLayout],
  );

  const emptyLayout = React.useMemo(() => !currLayout.cards || !currLayout.cards.length, [currLayout.cards]);

  return (
    <TargetView pageTitle={t('Dashboard.PAGE_TITLE')} attachments={<DashboardLayoutToolbar />}>
      <ChartContext.Provider value={chartContext} data-full-height>
        {emptyLayout ? (
          <AddCard variant="card" />
        ) : (
          <Grid id={'dashboard-grid'} hasGutter>
            {currLayout.cards.map((cfg, idx) => {
              const result = validateCardConfig(cfg, idx);
              const invalid = result.errors && result.errors.length;

              const content = invalid ? (
                <ErrorCard validationResult={result} cardConfig={cfg} dashboardId={idx} actions={[]} span={cfg.span} />
              ) : (
                React.createElement(getCardDescriptorByName(cfg.name).component, {
                  span: cfg.span,
                  ...cfg.props,
                  dashboardId: idx,
                  actions: [
                    <DashboardCardActionMenu
                      key={`${cfg.name}-actions`}
                      onRemove={() => handleRemove(idx)}
                      onResetSize={() => handleResetSize(idx)}
                      onView={() => history.push(`/d-solo?layout=${currLayout.name}&cardId=${cfg.id}`)}
                    />,
                  ],
                })
              );

              // Always show invalid cards
              const featureLevel = invalid ? FeatureLevel.PRODUCTION : getCardDescriptorByName(cfg.name).featureLevel;

              return (
                <FeatureFlag level={featureLevel} key={`${cfg.id}-wrapper`}>
                  <GridItem span={cfg.span} key={cfg.id} order={{ default: idx.toString() }}>
                    {content}
                  </GridItem>
                </FeatureFlag>
              );
            })}
          </Grid>
        )}
      </ChartContext.Provider>
      <></>
    </TargetView>
  );
};

export default Dashboard;
