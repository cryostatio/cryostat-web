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
import { CardConfig } from '@app/Shared/Redux/Configurations/DashboardConfigSlicer';
import { RootState } from '@app/Shared/Redux/ReduxStore';
import { TargetView } from '@app/TargetView/TargetView';
import { Bullseye, Button, EmptyState, EmptyStateBody, EmptyStateIcon, Title } from '@patternfly/react-core';
import { MonitoringIcon } from '@patternfly/react-icons';
import * as React from 'react';
import { useSelector } from 'react-redux';
import { useHistory, useLocation, withRouter } from 'react-router-dom';
import { getConfigByName } from './Dashboard';

export interface DashboardSoloProps {}

const DashboardSolo: React.FC<DashboardSoloProps> = ({ ..._props }) => {
  const { search } = useLocation();
  const history = useHistory();

  const cardConfigs: CardConfig[] = useSelector((state: RootState) => state.dashboardConfigs.list);

  const cardConfig = React.useMemo(() => {
    const cardId = new URLSearchParams(search).get('cardId');
    return cardConfigs.find((config) => config.id === cardId);
  }, [search, cardConfigs]);

  const content = React.useMemo(() => {
    if (!cardConfig) {
      return (
        <Bullseye>
          <EmptyState variant="large">
            <EmptyStateIcon variant="container" component={MonitoringIcon} />
            <Title headingLevel="h3" size="lg">
              Dashboard card not found
            </Title>
            <EmptyStateBody>
              Provide a valid <code style={{ color: '#000' }}>cardId</code> query parameter and try again.
            </EmptyStateBody>
            <Button variant="primary" onClick={() => history.push('/')}>
              Back to Dashboard
            </Button>
          </EmptyState>
        </Bullseye>
      );
    } else {
      const { id, name, span, props } = cardConfig;
      return (
        // Use default chart controller
        <TargetView pageTitle={cardConfig.id} breadcrumbs={[{ path: '/', title: 'Dashboard' }]}>
          <div data-full-height style={{ height: '100%' }}>
            {React.createElement(getConfigByName(name).component, {
              span: span,
              ...props,
              isDraggable: false,
              isResizable: false,
              isFullHeight: true,
              dashboardId: id,
            })}
          </div>
          <></>
        </TargetView>
      );
    }
  }, [cardConfig, history]);

  return content;
};

export default withRouter(DashboardSolo);
