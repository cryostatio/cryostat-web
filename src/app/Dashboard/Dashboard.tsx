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
import { FeatureFlag } from '@app/Shared/FeatureFlag/FeatureFlag';
import { DashboardConfigState } from '@app/Shared/Redux/Configurations/DashboardConfigSlice';
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
  const dashboardConfigs: DashboardConfigState = useSelector((state: RootState) => state.dashboardConfigs);
  const jfrChartController = React.useRef(
    new JFRMetricsChartController(
      serviceContext.api,
      serviceContext.target,
      serviceContext.notificationChannel,
      serviceContext.settings
    )
  );
  const mbeanChartController = React.useRef(
    new MBeanMetricsChartController(serviceContext.api, serviceContext.target, serviceContext.settings)
  );

  const currLayout = React.useMemo(() => {
    return dashboardConfigs.layouts[dashboardConfigs.current];
  }, [dashboardConfigs]);

  React.useEffect(() => {
    const layouts = getFromLocalStorage('DASHBOARD_CFG', {}) as DashboardConfigState;
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
    [dispatch]
  );

  const handleResetSize = React.useCallback(
    (idx: number) => {
      const defaultSpan = getCardDescriptorByName(currLayout.cards[idx].name).cardSizes.span.default;
      if (defaultSpan === currLayout.cards[idx].span) {
        return;
      }
      dispatch(dashboardConfigResizeCardIntent(idx, defaultSpan));
    },
    [dispatch, currLayout]
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
