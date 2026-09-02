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
import { getActiveTab, switchTab } from '@app/utils/utils';
import { useCryostatTranslation } from '@i18n/i18nextUtil';
import { Card, CardBody, Tab, Tabs, TabTitleText } from '@patternfly/react-core';
import * as React from 'react';
import { useLocation, useNavigate } from 'react-router-dom-v5-compat';
import { Queries } from './queries/Queries';

enum RecordingAnalyticsTab {
  QUERIES = 'queries',
}

export const RecordingAnalytics: React.FC = () => {
  const { t } = useCryostatTranslation();
  const { search, pathname } = useLocation();
  const navigate = useNavigate();

  const activeTab = React.useMemo(
    () => getActiveTab(search, 'tab', Object.values(RecordingAnalyticsTab), RecordingAnalyticsTab.QUERIES),
    [search],
  );

  const onTabSelect = React.useCallback(
    (_: React.MouseEvent, key: string | number) =>
      switchTab(navigate, pathname, search, { tabKey: 'tab', tabValue: `${key}` }),
    [navigate, pathname, search],
  );

  return (
    <BreadcrumbPage pageTitle="Analytics">
      <Card isFullHeight>
        <CardBody isFilled>
          <Tabs activeKey={activeTab} onSelect={onTabSelect}>
            <Tab
              eventKey={RecordingAnalyticsTab.QUERIES}
              title={<TabTitleText>{t('RecordingAnalytics.QUERIES_TAB_TITLE')}</TabTitleText>}
            >
              <Queries />
            </Tab>
          </Tabs>
        </CardBody>
      </Card>
    </BreadcrumbPage>
  );
};

export default RecordingAnalytics;
