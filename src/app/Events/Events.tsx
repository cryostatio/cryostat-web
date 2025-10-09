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
import { ServiceContext } from '@app/Shared/Services/Services';
import { TargetContextSelector } from '@app/TargetView/TargetContextSelector';
import { useSubscriptions } from '@app/utils/hooks/useSubscriptions';
import { getActiveTab, switchTab } from '@app/utils/utils';
import { Card, CardBody, Tab, Tabs } from '@patternfly/react-core';
import * as React from 'react';
import { useLocation, useNavigate } from 'react-router-dom-v5-compat';
import { EventTemplates } from './EventTemplates';
import { EventTypes } from './EventTypes';

export const Events: React.FC = ({ ...props }) => {
  return (
    <>
      <TargetContextSelector />
      <BreadcrumbPage {...props} pageTitle="Events">
        <Card>
          <CardBody isFilled>
            <EventTabs />
          </CardBody>
        </Card>
      </BreadcrumbPage>
    </>
  );
};

enum EventTab {
  EVENT_TEMPLATE = 'event-template',
  EVENT_TYPE = 'event-type',
}

const EventTabs: React.FC = () => {
  const context = React.useContext(ServiceContext);
  const addSubscription = useSubscriptions();

  const { search, pathname } = useLocation();
  const navigate = useNavigate();

  const [targetSelected, setTargetSelected] = React.useState(false);

  React.useEffect(() => {
    addSubscription(context.target.target().subscribe((t) => setTargetSelected(!!t)));
  }, [addSubscription, context, context.target]);

  const activeTab = React.useMemo(() => {
    return getActiveTab(search, 'eventTab', Object.values(EventTab), EventTab.EVENT_TEMPLATE);
  }, [search]);

  const onTabSelect = React.useCallback(
    (_: React.MouseEvent, key: string | number) =>
      switchTab(navigate, pathname, search, { tabKey: 'eventTab', tabValue: `${key}` }),
    [navigate, pathname, search],
  );

  return (
    <Tabs activeKey={activeTab} onSelect={onTabSelect}>
      <Tab eventKey={EventTab.EVENT_TEMPLATE} title="Event Templates">
        <EventTemplates />
      </Tab>
      <Tab isAriaDisabled={!targetSelected} eventKey={EventTab.EVENT_TYPE} title="Event types">
        <EventTypes />
      </Tab>
    </Tabs>
  );
};
export default Events;
