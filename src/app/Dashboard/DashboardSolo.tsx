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
import { RootState } from '@app/Shared/Redux/ReduxStore';
import { TargetView } from '@app/TargetView/TargetView';
import {
  Bullseye,
  Button,
  EmptyState,
  EmptyStateBody,
  EmptyStateIcon,
  EmptyStateHeader,
  EmptyStateFooter,
} from '@patternfly/react-core';
import { MonitoringIcon } from '@patternfly/react-icons';
import * as React from 'react';
import { useSelector } from 'react-redux';
import { useLocation, useNavigate } from 'react-router-dom';
import { CardConfig } from './types';
import { getCardDescriptorByName } from './utils';

export interface DashboardSoloProps {}

const DashboardSolo: React.FC<DashboardSoloProps> = () => {
  const { search } = useLocation();
  const navigate = useNavigate();

  const dashboardConfigs = useSelector((state: RootState) => state.dashboardConfigs);

  const layout = React.useMemo(() => {
    return new URLSearchParams(search).get('layout');
  }, [search]);

  const cardConfigs: CardConfig[] = React.useMemo(
    () =>
      (dashboardConfigs.layouts.find((l) => l.name === layout) ?? dashboardConfigs.layouts[dashboardConfigs.current])
        .cards,
    [dashboardConfigs, layout],
  );

  const cardConfig = React.useMemo(() => {
    const cardId = new URLSearchParams(search).get('cardId');
    return cardConfigs.find((config) => config.id === cardId);
  }, [search, cardConfigs]);

  const content = React.useMemo(() => {
    if (!cardConfig) {
      return (
        <Bullseye>
          <EmptyState variant="lg">
            <EmptyStateHeader
              titleText="Dashboard Card not found"
              icon={<EmptyStateIcon icon={MonitoringIcon} />}
              headingLevel="h3"
            />
            <EmptyStateBody>
              Provide valid <code>layout</code> and <code>cardId</code> query parameters and try again.
            </EmptyStateBody>
            <EmptyStateFooter>
              <Button variant="primary" onClick={() => navigate('/')}>
                Back to Dashboard
              </Button>
            </EmptyStateFooter>
          </EmptyState>
        </Bullseye>
      );
    } else {
      const { name, span, props } = cardConfig;
      return (
        // Use default chart controller
        <TargetView pageTitle={cardConfig.id} breadcrumbs={[{ path: '/', title: 'Dashboard' }]}>
          <div data-full-height style={{ height: '100%' }}>
            {React.createElement(getCardDescriptorByName(name).component, {
              span: span,
              ...props,
              isDraggable: false,
              isResizable: false,
              isFullHeight: true,
              dashboardId: 0,
            })}
          </div>
          <></>
        </TargetView>
      );
    }
  }, [cardConfig, navigate]);

  return content;
};

export default DashboardSolo;
